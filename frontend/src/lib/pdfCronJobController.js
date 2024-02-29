const cron = require('node-cron');
const { generatePDF } = require('./cronJobController1');
const ContentSchema = require('../models/contentSchema');
const ResultSchema = require('../models/resultSchema');
const logger = require('../utils/logger');

async function processPdfCronJob(documentId) {
    try {
        const document = await ContentSchema.findOne({ _id: documentId });
        if (!document) {
            logger.error({ content: `No document found with ID: ${documentId}` });
            return [];
        }
        // Extracting the job IDs from the urls array of the fetched document
        const contentJobIds = document.urls.flatMap((urlData) => urlData.jobId);
        const results = await Promise.all(
            contentJobIds.map(async (jobId) => {
                const contentDocument = await ResultSchema.findOne({ 'request.jobId': jobId });
                const { article, request } = contentDocument;
                return { jobId, article, request };
            })
        );
        return results;
    } catch (error) {
        logger.error({ content: 'Error processing PDF cron job:', error });
        throw error; // Re-throw the error for the caller to handle
    }
}

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
                return checkCondition();
            }
            return { success: true, file: content };
        };

        return await checkCondition();
    } catch (error) {
        logger.error({ content: 'Error checking if PDF generated and uploaded to S3:', error });
        return { success: false, file: null };
    }
}

async function deleteResponse(jobId) {
    try {
        const content = await ContentSchema.findOne({ 'urls.jobId': jobId });
        // console.log('Content:', content);
        if (content) {
            const hasDoneStatus = content.urls.some((url) => url.status === 'done');
            // console.log(hasDoneStatus, content.isPdfGenerated, content.isUploadedtoS3);
            if (hasDoneStatus && content.isPdfGenerated && content.isUploadedtoS3) {
                // logger.info({ JobId: jobId });
                const deleted = await ResultSchema.deleteOne({ jobId: content.jobId });
                logger.info({ 'Content document deleted successfully ': deleted });
                // console.log(`Document with jobId ${jobId} deleted successfully.`, deleted);
            } else {
                // console.log(`Document with jobId ${jobId} does not meet deletion criteria.`);
            }
        } else {
            // console.log(`Content document with jobId ${jobId} not found.`);
            logger.error({
                message: `Content document not found for JobID :${jobId}`,
            });
        }
    } catch (error) {
        logger.error({
            message: `Error deleting document::${error.message}`,
        });
        throw error;
    }
}

/**
 * Runs a cron job to generate PDFs periodically.
 *
 * @returns {Promise} A promise that resolves when the cron job is started.
 */
function pdfCronJob() {
    return new Promise((resolve, reject) => {
        cron.schedule('*/90 * * * * *', async () => {
            logger.info({ message: 'PDF Cron Job Started' });
            const conditionsMet = await checkIfPDFGeneratedandUploadedtoS3();
            if (conditionsMet.success) {
                try {
                    const fileId = conditionsMet.file._id;
                    const deleteID = conditionsMet.file.urls[0].jobId;
                    const nestedDocumentId = conditionsMet.file.urls[0]._id;
                    const { projectName, conversionType } = conditionsMet.file;
                    const articleData = await processPdfCronJob(fileId);
                    const pdfGenerated = await generatePDF(fileId, articleData, projectName, conversionType);
                    // console.log('PDF Generated', pdfGenerated);

                    if (pdfGenerated) {
                        // Update the status in the nested document within the array
                        const updateResult = await ContentSchema.updateOne(
                            { _id: fileId, 'urls._id': nestedDocumentId },
                            { $set: { isPdfGenerated: true, 'urls.$.status': 'done', isUploadedtoS3: true, s3Url: pdfGenerated } }
                        );
                        logger.info({ 'Updated Status: ': updateResult.acknowledged });
                        logger.info({ 'deleteID value ': deleteID });

                        const deletedata = await deleteResponse(deleteID);
                        resolve(deletedata);
                    } else {
                        // If pdfGenerated is falsy, log an error
                        logger.error({ message: 'PDF not generated' });
                        resolve(null);
                    }
                } catch (error) {
                    logger.error({ message: `Error processing PDF cron job: ${error.message}` });
                    reject(error);
                }
            } else {
                // If conditionsMet.success is false, log an error
                logger.error({ message: 'Conditions for PDF generation not met' });
                resolve(null);
            }
        });
    });
}

module.exports = { pdfCronJob };
