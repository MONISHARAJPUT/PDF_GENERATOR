const express = require('express');

const router = express.Router();
const multer = require('multer');
const uploadController = require('../lib/uploadcontroller');
const FileModel = require('../models/upload');
const logger = require('../utils/logger');
const Validate = require('../lib/validate');
const ContentSchema = require('../models/contentSchema');

const storage = multer.memoryStorage();
const upload = multer({ storage });

/** INPUT URL FOR COUNT OF VALID URL  */
router.post('/validateurl', async (req, res) => {
    try {
        const { selectedProjectName } = req.body;
        if (!selectedProjectName) {
            logger.error({
                message: 'Missing projectname',
            });
            return res.status(400).json({ message: 'Missing projectname' });
        }
        logger.info({
            'Project selected': selectedProjectName,
        });
        const projectName = selectedProjectName.toLowerCase();
        logger.info({
            'Project name': projectName,
        });
        const receivedUrls = req.body.urls;
        // logger.info({
        //     receivedUrls,
        // });
        const processedUrl = await Validate.countURLs(receivedUrls);
        // logger.info({ message: 'Processed URLs' });
        return res.status(200).json({ success: true, processedUrl });
    } catch (error) {
        if (error.message === 'Please upload a file!') {
            logger.error({
                message: 'Please upload a file!',
                error: error.message,
            });
            return res.status(400).json({ message: error.message });
        }
        if (error.message === 'No valid URLs found') {
            logger.error({
                message: 'No valid URLs found',
                error: error.message,
            });
            return res.status(500).json({ message: 'No valid URLs found', error });
        }
        logger.error({
            message: 'No valid URLs found',
            error: error.message,
        });
        return res.status(500).json({ message: 'No valid URLs found' });
    }
});

/** LISTING THE OVERALL CONTENTS IN S3 BUCKET */
router.get('/list', async (req, res) => {
    try {
        const s3list = await uploadController.listS3BucketContents(req);
        logger.info({ message: 'List Generated' });
        res.status(200).json({ success: true, message: 'List generated', s3list });
    } catch (error) {
        logger.error({
            message: `Error occured in the route!: ${error.message}`,
            // error: error.message,
        });
        res.status(500).json({ success: false, message: error.message });
    }
});

/** LISTING THE OBJECTS IN S3 BUCKET */
router.get('/objects', async (req, res) => {
    try {
        const s3list = await uploadController.listS3BucketObjectURLs();
        logger.info({ message: 'List Generated' });
        res.status(200).json({ success: true, message: 'List generated', s3list });
    } catch (error) {
        logger.error({
            message: `Error occured in the route!: ${error.message}`,
            // error: error.message,
        });
        res.status(500).json({ success: false, message: error.message });
    }
});

/** RETRIVEING THE OBJECTS IN S3 BUCKET */
router.get('/object', async (req, res) => {
    try {
        const { selectedProjectName } = req.query;
        if (!selectedProjectName) {
            logger.error({
                message: 'Missing projectname',
            });
            return res.status(400).json({ message: 'Missing projectname' });
        }
        logger.info({
            'Project selected': selectedProjectName,
        });
        if (!selectedProjectName) {
            logger.error({
                message: 'Project name is required.',
                // error: error.message,
            });
            return res.status(400).json({ success: false, message: 'Project name is required.' });
        }
        const s3Urls = await uploadController.listS3BucketObjectURLs(selectedProjectName);
        logger.info({ message: 'S3 URLs for the selected project retrieved successfully' });
        return res.status(200).json({ success: true, message: 'S3 URLs retrieved successfully', s3Urls });
    } catch (error) {
        logger.error({
            message: `Error occured in the route!: ${error.message}`,
            // error: error.message,
        });
        return res.status(500).json({ success: false, message: error.message });
    }
});

/** RETRIVEING THE OBJECTS IN DATABASE USING PROJECT ID  */
router.get('/object/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        logger.info({
            'Project ID to retrive objects from mongo': projectId,
        });
        const objectUrls = await uploadController.getPdfsByProjectId(projectId);
        if (!objectUrls || !Array.isArray(objectUrls)) {
            logger.error({
                message: 'Invalid response from server',
                // error: error.message,
            });
            return res.status(500).json({ success: false, message: 'Invalid response from server' });
        }
        logger.info({ message: 'List Generated' });
        return res.status(200).json({ success: true, message: 'List generated', objectUrls });
    } catch (error) {
        logger.error({
            message: `Error occured in the route!: ${error.message}`,
            // error: error.message,
        });
        return res.status(500).json({ success: false, message: error.message });
    }
});

/** RETRIVEING THE REQUESTED TIME IN MONGO  */
router.get('/getTime', async (req, res) => {
    try {
        const { pdfUrl } = req.query;
        if (!pdfUrl) {
            logger.error({
                message: 'PDF URL parameter is missing',
                // error: error.message,
            });
            return res.status(400).json({ error: 'PDF URL parameter is missing' });
        }
        const document = await FileModel.findOne({ s3Url: pdfUrl.trim() });
        if (!document) {
            logger.error({
                message: 'Document not found',
                // error: error.message,
            });
            return res.status(404).json({ error: 'Document not found' });
        }
        const { timestamp } = document;
        const istTimestamp = new Date(timestamp).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
        });
        // logger.info({
        //     istTimestamp,
        // });
        return res.json({ timestamp: istTimestamp });
    } catch (error) {
        logger.error({
            message: `Error occured in the route!: ${error.message}`,
            // error: error.message,
        });
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get('/getTimes', async (req, res) => {
    const { s3Url } = req.query;

    try {
        const lastModifiedTimes = await uploadController.listObjectsInBucket(s3Url);
        return res.status(200).json(lastModifiedTimes);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error.', error });
    }
});
/** RETRIVEING THE TOTAL FILE COUNT IN MONGO */
router.get('/total', async (req, res) => {
    try {
        const count = await uploadController.getFileCountInFolder();
        return res.status(200).json({ fileCounts: count });
    } catch (error) {
        logger.error({
            message: `Error occured in the route!: ${error.message}`,
            // error: error.message,
        });
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});
/** RETRIVEING THE LAST MODIFIED FILE COUNT IN MONGO */

router.get('/last', async (req, res) => {
    try {
        const { projectName } = req.query;
        const last = await uploadController.getLastModifiedDateForFolder(projectName);
        return res.status(200).json({ LastModified: last });
    } catch (error) {
        logger.error({
            message: `Error occured in the route!: ${error.message}`,
            // error: error.message,
        });
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});
router.get('/getData', async (req, res) => {
    try {
        const projectName = req.query.selectedProjectName.toLowerCase();
        const query = projectName ? { projectName } : {};

        // Fetch files based on the query
        const files = await ContentSchema.find(query);

        // Define a function to check if all three conditions are true for a given document
        const isAllConditionsTrue = (file) => {
            return file.isResponseReceivedforAll && file.isPdfGenerated && file.isUploadedtoS3;
        };

        // Check if all three conditions are true for every document
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
                requestedTime,
                s3Url: file.s3Url,
                urlCount,
            };
        });
        // logger.info({ 'Request data': filesWithTimestamps });

        res.json({ status, files: filesWithTimestamps });
    } catch (error) {
        logger.error({ message: `Error fetching data`, error: error.message });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// router.get('/getData', async (req, res) => {
//     try {
//         const files = await ContentSchema.find();
//         const isAllConditionsTrue = (file) => {
//             return file.isResponseReceivedforAll && file.isPdfGenerated && file.isUploadedtoS3;
//         };
//         const status = files.every(isAllConditionsTrue) ? "done" : "in progress";

//         const filesWithTimestamps = files.map(file => {
//             return {
//                 projectName: file.projectName,
//                 fileName: file.fileName,
//                 requestType: file.requestType || "Not available",
//                 conversionType: file.conversionType,
//                 status: isAllConditionsTrue(file) ? "done" : "in progress",
//                 timestamp: new Date(file.timestamp).toLocaleString()
//             };
//         });

//         res.json({ status, files: filesWithTimestamps });
//     } catch (error) {
//         console.error("Error getting data:", error);
//         res.status(500).json({ error: "Internal Server Error" }); // Return an error status object
//     }
// });

router.get('/requestType', async (req, res) => {
    const { projectName } = req.query;
    try {
        const files = await ContentSchema.find({ projectName });

        if (files.length > 0) {
            const filesWithTimestamps = files.map((file) => {
                return {
                    projectName: file.projectName,
                    fileName: file.fileName,
                    requestType: file.requestType,
                    conversionType: file.conversionType,
                    status: file.urls.$.status,
                    timestamp: new Date(file.timestamp).toLocaleString(),
                };
            });
            res.json({ files: filesWithTimestamps });
        } else {
            res.status(404).json({ error: 'Project not found' });
        }
    } catch (error) {
        logger.error({ message: `Error`, error: error.message });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/** FOR VALIDATION OF CSV  */
router.post('/validatecsv', upload.array('file'), async (req, res) => {
    try {
        // console.log('requestbody:', req.body);
        const { selectedProjectName } = req.body;
        if (selectedProjectName) {
            logger.info({
                'Project selected': selectedProjectName,
            });
        }
        if (!selectedProjectName) {
            logger.error({
                message: 'Missing projectname',
            });
            return res.status(400).json({ message: 'Missing projectname' });
        }
        // const projectName = selectedProjectName;
        const { files } = req;
        // console.log(files, 'files');
        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No files provided.' });
        }

        const processedFiles = await Validate.countValidURLs(files);
        return res.status(200).json({ success: true, processedFiles });
    } catch (error) {
        if (error.message === 'Please upload a file!') {
            logger.error({
                message: 'Please upload a file!',
                // error: error.message,
            });
            return res.status(400).json({ message: error.message });
        }
        logger.error({
            message: `Error occured in the route: ${error.message}`,
            // error: error.message,
        });
        return res.status(500).json({ message: 'Error occured in the route', error: error.message });
    }
});
router.delete('/delete', async (req, res) => {
    try {
        const { selectedProjectName } = req.body;
        if (!selectedProjectName) {
            return res.status(400).json({ success: false, message: 'Missing parameters: selectedProjectName' });
        }
        const deletionResult = await uploadController.deleteS3Objects(selectedProjectName);
        logger.info({ message: 'Objects Deleted' });
        return res.status(200).json({ success: true, message: 'Objects deleted', deletionResult });
    } catch (error) {
        logger.error({
            message: `Error occurred in the delete route!: ${error.message}`,
        });
        return res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/edit', async (req, res) => {
    try {
        const { selectedProjectName } = req.body;

        const { newProjectName } = req.body;

        if (!selectedProjectName || !newProjectName) {
            return res.status(400).json({ success: false, message: 'Missing parameters: selectedProjectName or newProjectName' });
        }

        const editingResult = await uploadController.editS3Objects(selectedProjectName, newProjectName);

        logger.info({ message: 'Objects Edited' });

        return res.status(200).json({ success: true, message: 'Objects edited', editingResult });
    } catch (error) {
        logger.error({
            message: `Error occurred in the edit route!: ${error.message}`,
        });

        return res.status(500).json({ success: false, message: error.message });
    }
});

// module.exports = { router, socketEvents };
module.exports = { router };
