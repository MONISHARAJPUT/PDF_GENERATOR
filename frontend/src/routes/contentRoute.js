const express = require('express');

const router = express.Router();
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const ContentController = require('../lib/contentController1');
const logger = require('../utils/logger');
const ContentSchema = require('../models/contentSchema');

router.post('/data', upload.any(), async (req, res) => {
    try {
        const { selectedProjectName, selectedFileName, userName: reqUserName } = req.body;
        const { files, body } = req;

        if (!selectedProjectName) {
            logger.error({
                message: 'Missing projectname',
            });
            return res.status(400).json({ message: 'Missing projectname' });
        }
        let uploadedFile;
        if (files && files.length > 0) {
            const { conversionType } = body;
            logger.info({
                'Project selected': selectedProjectName,
                'user Name': reqUserName,
            });
            const projectName = selectedProjectName.toLowerCase();
            const requestType = req.originalUrl;
            uploadedFile = await ContentController.uploadFile(projectName, selectedFileName, files, conversionType, requestType, reqUserName, res);
        } else {
            const { urls, conversionType } = body;
            logger.info({ message: 'URLs Passed', reqUserName });

            const projectName = selectedProjectName.toLowerCase();

            // const timestamp = new Date().getTime();
            // const selectedFileName = `${'pdf'}_${timestamp}.csv`;
            const csvfiles = await ContentController.createCSVFromURLs(urls, selectedFileName, res);
            logger.info({ message: 'Created .csv file ' });
            const requestType = req.originalUrl;
            uploadedFile = await ContentController.uploadFile(projectName, selectedFileName, csvfiles, conversionType, requestType, reqUserName, res);
        }

        return res.status(200).json({ message: 'Validated csv file(s).', file: uploadedFile });
    } catch (error) {
        logger.error({
            message: `Error occurred: ${error.message}`,
        });
        return res.status(500).json({ message: error.message });
    }
});

/**
 * FETCHING DATA F0R RECENT REQUEST IN DB
 *
 */
router.get('/request', async (req, res) => {
    try {
        const files = await ContentSchema.find();

        const isAllConditionsTrue = (file) => {
            return file.isResponseReceivedforAll && file.isPdfGenerated && file.isUploadedtoS3;
        };
        const status = files.every(isAllConditionsTrue) ? 'Done' : 'In Progress';
        const filesWithTimestamps = files.map((file) => {
            const urlCount = file.urls ? file.urls.length : 0;
            const requestedTime = new Date(file.timestamp).toLocaleString('en-IN');
            return {
                projectName: file.projectName,
                fileName: file.fileName,
                requestType: file.requestType || 'Not available',
                conversionType: file.conversionType,
                status: isAllConditionsTrue(file) ? 'Done' : 'In Progress',
                requestedTime: requestedTime.toUpperCase(),
                urlCount,
                userName: file.userName || 'Not available',
                s3Url: file.s3Url,
            };
        });

        res.json({ status, files: filesWithTimestamps });
    } catch (error) {
        logger.error({ message: `Error fetching data`, error: error.message });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
module.exports = router;
