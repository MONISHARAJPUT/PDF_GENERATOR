const stream = require('stream');
const logger = require('../utils/logger');
const ContentSchema = require('../models/contentSchema');

function generateJobId() {
    return Math.floor(10000 + Math.random() * 90000);
}

/**
 * PROCESSING THE CSV FILE
 *
 * @param {string} selectedProjectName - selected project name
 * @param {string} selectedFileName - The name of the file
 * @param {string} files -  the files to process
 * @param {string} conversionType - conversion type selected
 * @param {any}requestType - the type of request
 * @param {any} reqUserName - the user name who made the request
 * @returns {string} - the result
 */
const uploadFile = async (selectedProjectName, selectedFileName, files, conversionType, requestType, reqUserName) => {
    try {
        this.selectedProjectName = selectedProjectName;
        this.conversionType = conversionType;
        this.requestType = requestType === '/content/data' ? 'Application' : 'Microservice';
        this.FileName = selectedFileName;
        this.userName = reqUserName;

        const filesArray = Array.isArray(files) || files === undefined ? files : [files];
        const urlArrays = [];

        // Iterate over each file object in the array
        filesArray.forEach((file) => {
            if (file && file.buffer) {
                urlArrays.push({
                    fileName: file.originalname,
                    urls: file.buffer.toString(),
                });
            }
        });

        if (urlArrays.length === 0) {
            logger.error({
                message: 'No valid URLs found!',
            });
            throw new Error('No valid URLs found in CSV');
        }

        const mainURLs = urlArrays.flatMap((urlArray) => {
            // Split the urls string into an array of URLs
            const urls = urlArray.urls.split('\n');
            // Filter out empty URLs and map them to an object with status and jobId
            return urls.filter((url) => url.trim() !== '').map((url) => ({ url, status: 'waiting', jobId: generateJobId() }));
        });
        if (mainURLs.length === 0) {
            throw new Error('No valid URLs found');
        }

        const newFile = new ContentSchema({
            urls: mainURLs,
            projectName: selectedProjectName,
            fileName: selectedFileName,
            conversionType,
            requestType: this.requestType,
            userName: this.userName,
        });
        await newFile.save();
        return newFile;
    } catch (error) {
        logger.error({
            message: 'Error in uploadFile',
            error: error.message,
        });
        throw error;
    }
};

const createCSVFromURLs = async (urls, fileName) => {
    try {
        const passThroughStream = new stream.PassThrough();
        passThroughStream.write('', 'utf8');
        urls.forEach((url) => {
            passThroughStream.write(`${url}\n`, 'utf8');
        });
        passThroughStream.end();
        await new Promise((resolve, reject) => {
            passThroughStream.on('finish', resolve);
            passThroughStream.on('error', reject);
        });
        const chunks = [];
        passThroughStream.on('data', (chunk) => {
            chunks.push(chunk);
        });
        await new Promise((resolve, reject) => {
            passThroughStream.on('end', () => {
                resolve();
            });
            passThroughStream.on('error', reject);
        });
        const buffer = Buffer.concat(chunks);
        return {
            fieldname: 'file',
            originalname: fileName,
            encoding: '7bit',
            mimetype: 'text/csv',
            buffer,
            size: buffer.length,
        };
    } catch (error) {
        logger.error({
            message: `Error creating CSVs${error.message}`,
        });
        throw new Error('Failed to create CSV');
    }
};

module.exports = {
    uploadFile,
    createCSVFromURLs,
};
