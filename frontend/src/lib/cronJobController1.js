const cron = require('node-cron');
const axios = require('axios');
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
const ResultSchema = require('../models/resultSchema');
const ContentSchema = require('../models/contentSchema');
const logger = require('../utils/logger');
const { uploadFinalPdfToS3 } = require('./uploadcontroller');
require('dotenv').config();

async function processUrlsWithData(data) {
    try {
        if (data.length === 0) {
            logger.info({ message: 'No more URLs to process.' });
            return;
        }
        const urlData = data.pop();
        const requestBody = {
            url: urlData.url,
            type: 'ARTICLE',
            clientData: {
                clientId: process.env.INFO_API_CLIENT_ID,
                listeningAttribute: process.env.INFO_API_LISTENING_ATTRIBUTE,
                // correlationId: 'pdf123',
            },
        };
        logger.info({ 'Request URL:': requestBody.url });

        axios
            .post(process.env.INFO_API, requestBody)
            .then(async (response) => {
                // logger.info({ Response: response.data });
                const responseId = response.data.request.id;
                logger.info({ 'Response ID:': responseId });

                await ContentSchema.updateMany(
                    { _id: urlData.fileId },
                    {
                        $set: {
                            'urls.$[elem].status': 'running',
                            'urls.$[elem].isPassedtoCron': true,
                            'urls.$[elem].isIdUpdated': true,
                            'urls.$[elem].jobId': responseId,
                        },
                    },
                    { arrayFilters: [{ 'elem._id': urlData.urlId }] }
                );
            })
            .catch(async (error) => {
                logger.error({
                    message: `Error processing URls:${error.message}`,
                });
                // Update status to failed
                await ContentSchema.findOneAndUpdate(
                    { _id: urlData.fileId, 'urls._id': urlData.urlId },
                    { $set: { 'urls.$.status': 'failed', 'urls.$.isPassedtoCron': false } }
                );

                processUrlsWithData(data);
            });
    } catch (error) {
        logger.error({
            message: `Error processing URLs:${error.message}`,
        });
        throw error;
    }
}

/**
 * Updates the 'isResponseReceivedforAll' field for a document with the given ID.
 *
 * @param {string} documentId The ID of the document to update.
 * @returns {Promise<object>} A Promise that resolves with the result of the update operation.
 */
async function updateIsResponseReceivedForAll(documentId) {
    try {
        const doc = await ContentSchema.findById(documentId);
        const isAllTrue = doc.urls.every((url) => url.isResponseReceived === true);
        if (isAllTrue) {
            const result = await ContentSchema.updateOne({ _id: documentId }, { $set: { isResponseReceivedforAll: true } });
            return result;
        }
        return isAllTrue;
    } catch (error) {
        logger.error({
            message: `Error occurred while updating ResponseReceivedForAll:${error.message}`,
        });
        throw error;
    }
}

async function checkAllUrlsFetched() {
    try {
        const aggregationPipeline = [
            {
                $unwind: '$urls',
            },
            {
                $lookup: {
                    from: 'ResultSchema',
                    localField: 'urls.jobId',
                    foreignField: 'request.jobId',
                    as: 'matchedResults',
                },
            },
            {
                $group: {
                    _id: '$_id',
                    totalUrls: { $sum: 1 },
                    totalMatchedUrls: {
                        $sum: {
                            $cond: [{ $eq: ['$urls.isResponseReceived', true] }, 1, 0],
                        },
                    },
                    objectId: { $first: '$_id' },
                    isResponseReceivedforAll: { $first: '$isResponseReceivedforAll' },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalUrls: 1,
                    totalMatchedUrls: 1,
                    objectId: 1,
                    isResponseReceivedforAll: {
                        $eq: ['$totalUrls', '$totalMatchedUrls'],
                    },
                },
            },
        ];

        const aggregationResult = await ContentSchema.aggregate(aggregationPipeline);
        const updateResults = await Promise.all(
            aggregationResult.map(async (result) => {
                const { objectId } = result;
                const updateResult = await updateIsResponseReceivedForAll(objectId);
                return updateResult;
            })
        );
        // console.log('Documents updated successfully.', updateResults);
        return updateResults;
    } catch (error) {
        logger.error({
            message: `Error occurred while checking if all URLs fetched:${error.message}`,
        });
        throw error;
    }
}

/** CRON-JOB SETUP */
function setupCronJob() {
    cron.schedule('*/10 * * * * *', async () => {
        logger.info({ message: 'SETUP Cron Job Started' });
        try {
            const filesToProcess = await ContentSchema.find({
                'urls.status': 'waiting',
            });

            const allPromises = filesToProcess.map(async (file) => {
                const fileId = file._id;
                const validUrls = file.urls.filter((url) => url.status === 'waiting');

                const promises = validUrls.map(async (url) => {
                    const urlId = url._id;

                    await ContentSchema.findOneAndUpdate({ _id: fileId, 'urls._id': urlId }, { $set: { 'urls.$.isPassedtoCron': true } });

                    return { fileId, urlId, url: url.url, isPassedtoCron: true };
                });

                return Promise.all(promises);
            });

            const processedData = await Promise.all(allPromises);
            processUrlsWithData(processedData.flat());
            checkAllUrlsFetched();
        } catch (error) {
            logger.error({
                message: `Error occurred while processing files:${error.message}`,
            });
            throw error;
        }
    });
}

/**
 * Fetches JSON data for a given job ID.
 *
 * @param {string} id - Job ID passed to check.
 * @returns {Promise<object>} A Promise that resolves with the JSON data fetched.
 */
async function getJsonData(id) {
    try {
        const response = await axios.get(`${process.env.INFO_API}/${id}/result`);
        await checkAllUrlsFetched();
        await ContentSchema.updateMany({ 'urls.jobId': id }, { $set: { 'urls.$.isResponseReceived': true } });
        return response.data;
    } catch (error) {
        logger.error({
            message: `Error occurred while fetching JSON data:${error.message}`,
        });
        throw error;
    }
}

/**
 * SAVE THE RESPONSE TO DB
 *
 * @param {object} data Data passed by getJsonData()
 * @returns {string} The ID of the saved result.
 */
async function saveDataToMongo(data) {
    try {
        const newData = { ...data };
        if (newData && newData.request && newData.request.id) {
            newData.request.jobId = newData.request.id;
            delete newData.request.id;
        }
        const result = new ResultSchema(newData);
        const savedResult = await result.save();
        logger.info({ 'DB ID of response received': savedResult._id });
        return savedResult._id;
    } catch (error) {
        logger.error({
            message: `Error occurred while saving data to DB:${error.message}`,
        });
        throw error;
    }
}

function formatDate(dateString) {
    const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}$/;

    if (pattern.test(dateString)) {
        const date = new Date(dateString);
        const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
        const day = date.getDate().toString().padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const amOrPm = hours >= 12 ? 'pm' : 'am';
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedMinutes = minutes.toString().padStart(2, '0');
        return `${dayOfWeek} ${day} ${month} ${year} at ${formattedHours}:${formattedMinutes}${amOrPm}`;
    }
    return dateString;
}

pdfMake.vfs = pdfFonts.pdfMake.vfs;

async function fetchImage(imageUrl, caption) {
    try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');
        return [
            { image: `data:image/jpeg;base64,${imageBase64}`, width: 450, height: 270, margin: [5, 0, 0, 5], alignment: 'center' },
            { text: caption, fontSize: 7, alignment: 'center', margin: [0, 0, 0, 5], color: 'grey', bold: true, italics: true },
        ];
    } catch (error) {
        logger.error('An error occurred while fetching image:', error);
        return null;
    }
}
const generatePDF = async (fileId, responses, projectName, conversionType) => {
    const docDefinition = {
        content: [],
        defaultStyle: {
            font: 'Roboto',
        },
    };
    let firstTwoWords = 'no_title';
    const responsesWithTitle = [];
    const responsesWithoutTitle = [];

    await responses.reduce(async (prevPromise, response) => {
        await prevPromise;
        const { article, request } = response;
        if (!article) {
            logger.error(`Error: article is null for response with request URL: ${request.url}`);
            return;
        }

        if (article.title) {
            responsesWithTitle.push(response);
        } else {
            responsesWithoutTitle.push(response);
        }
    }, Promise.resolve());

    const sortedResponses = [...responsesWithTitle, ...responsesWithoutTitle];
    await sortedResponses.reduce(async (prevPromise, response, index) => {
        await prevPromise;

        const { article } = response;
        if (index === 0 && article.title) {
            const titleWords = article.title.split(' ');
            firstTwoWords = titleWords.slice(0, 2).join('_');
        }

        if (index !== 0) {
            docDefinition.content.push({ text: '', pageBreak: 'before' });
        }

        docDefinition.content.push({ text: article.title || 'No Title', fontSize: 24, bold: true, margin: [35, 0, 35, 10] });
        const author = article.authors.length > 0 ? `Author: ${article.authors[0].name}` : 'Author: N/A';
        const datePublished = article.datePublished ? `Published Date: ${formatDate(article.datePublished.dateline)}` : 'Date Published: N/A';
        docDefinition.content.push({ text: author, fontSize: 10, margin: [35, 0, 35, 0] });
        docDefinition.content.push({ text: datePublished, fontSize: 10, margin: [35, 0, 35, 10] });

        if (conversionType === 'Full Conversion') {
            if (article.images && article.images.length > 0) {
                const image = article.images[0];
                try {
                    const imageData = await fetchImage(image.url, image.caption);
                    if (imageData !== null) {
                        docDefinition.content.push(imageData);
                    } else {
                        logger.error(`Skipping image for URL: ${response.request.url} due to fetch error.`);
                    }
                } catch (error) {
                    logger.error({
                        message: `Error occurred while fetching image:${error.message}`,
                    });
                    throw error;
                }
            }
        }

        docDefinition.content.push({ text: article.content, fontSize: 12, alignment: 'justify', margin: [35, 0, 35, 10] });

        if (article.keywords && !article.title) {
            const keywords = `Keywords: ${article.keywords}`;
            docDefinition.content.push({ text: keywords, fontSize: 8, margin: [35, 0, 35, 10], color: 'grey', bold: true, italics: true });
        }

        if (article.title === 'No Title' || article.title === undefined) {
            docDefinition.content.push({
                text: 'Note: URLs are omitted due to legal restrictions.',
                fontSize: 10,
                margin: [35, 0, 35, 10],
                bold: true,
                italics: true,
            });
            docDefinition.content.push({ text: `URL: ${response.request.url}`, fontSize: 10, margin: [35, 0, 35, 10] });
        } else {
            logger.error(`Article title is not 'No Title' for response: ${response}`);
        }
    }, Promise.resolve());

    try {
        const pdfDoc = pdfMake.createPdf(docDefinition);

        const pdfData = new Promise((resolve, reject) => {
            pdfDoc.getBase64(async (data) => {
                const timestamp = Date.now();
                const filename = `${firstTwoWords}_${timestamp}.pdf`;
                try {
                    const buffer = Buffer.from(data, 'base64');
                    const S3Url = await uploadFinalPdfToS3(buffer, filename, projectName, conversionType);
                    const updateResult = await ContentSchema.updateOne({ _id: fileId }, { $set: { isPdfGenerated: true, isUploadedtoS3: true } });
                    logger.info({ 'Updated isPdfGenerated, isUploadedtoS3 :': updateResult.acknowledged });
                    resolve(S3Url);
                } catch (error) {
                    logger.error({
                        message: `Error occurred while uploading PDF to S3:${error.message}`,
                    });
                    reject(error);
                }
            });
        });

        return await pdfData;
    } catch (error) {
        logger.error({
            message: `Error occurred while generating PDF:${error.message}`,
        });
        throw error;
    }
};

/**
 * Checks if a PDF is generated and uploaded to S3.
 * This function continuously checks for the conditions until met, with a 4-second interval.
 *
 * @returns {Promise<{success: boolean, file: any}>} A Promise that resolves with an object containing success status and the file content if conditions are met.
 */
async function checkIfPDFGeneratedandUploadedtoS3() {
    try {
        const checkCondition = async () => {
            const content = await ContentSchema.findOne({ isResponseReceivedforAll: true, isPdfGenerated: false, isUploadedtoS3: false });
            if (!content) {
                await new Promise((resolve) => setTimeout(resolve, 4000)); // Wait for 4 second before checking again
                return checkCondition(); // Recursively call the function to continue checking
            }
            return { success: true, file: content };
        };

        return await checkCondition();
    } catch (error) {
        logger.error({
            message: `Error occurred while checking if PDF is uploaded to S3:${error.message}`,
        });
        return { success: false, file: null };
    }
}

module.exports = { setupCronJob, getJsonData, saveDataToMongo, checkIfPDFGeneratedandUploadedtoS3, generatePDF, updateIsResponseReceivedForAll };
