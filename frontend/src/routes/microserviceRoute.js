const express = require('express');

const router = express.Router();
const multer = require('multer');
const microServiceController = require('../lib/microservice');
const Project = require('../models/projectdetails');
const logger = require('../utils/logger');
const { fetchMetadataFromS3Url } = require('../lib/uploadcontroller');
const ContentController = require('../lib/contentController1');
const Validate = require('../lib/validate');
const { deleteS3Objects, editS3Objects } = require('../lib/uploadcontroller');
const ContentSchema = require('../models/contentSchema');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route to Add new Project
router.post('/onboard', async (req, res) => {
    try {
        const data = req.body;
        const existingProject = await Project.findOne({ projectName: data.projectName.toLowerCase() });
        if (existingProject) {
            logger.error({
                message: 'Project name already exists.',
                // error: error.message,
            });
            return res.status(400).json({ error: 'Project name already exists.' });
        }

        const storedProject = await microServiceController.storeProjectDetails(data);
        logger.info({
            'Project Details stored successfully': storedProject,
        });
        return res.status(201).json({ message: 'Project Details stored successfully', storedProject });
    } catch (error) {
        logger.error({
            message: 'Error while onboarding project',
            error: error.message,
        });
        return res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// Route to fetch all project names
router.get('/projectname', async (req, res) => {
    try {
        const projects = await microServiceController.getAllProjectNames();
        logger.info({
            message: 'Project names Fetched successfully',
        });
        return res.status(200).json(projects);
    } catch (error) {
        logger.error({
            message: 'Error occured while fetching projectnames',
            // error: error.message,
        });
        return res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// Route to get all project details
router.get('/projects', async (req, res) => {
    try {
        const projects = await microServiceController.getAllProjectDetails();
        logger.info({
            message: 'Project details Fetched successfully',
        });
        return res.status(200).json(projects);
    } catch (error) {
        logger.error({
            message: 'Error occured while fetching project details',
            // error: error.message,
        });
        return res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// router.put('/update/:projectName', async (req, res) => {
//     try {
//         const { projectName } = req.params;
//         const { newProjectName } = req.body;

//         if (!newProjectName) {
//             return res.status(400).json({ error: 'New Project Name is required.' });
//         }

//         const existingProject = await Project.findOne({ projectName: newProjectName.toLowerCase() });

//         if (existingProject) {
//             return res.status(400).json({ error: 'Duplicate project name. Please choose a different name.' });
//         }

//         const isUpdated = await microServiceController.updateProjectName(projectName, newProjectName);

//         if (isUpdated) {
//             // Update S3 objects
//             const { editedObjectsCount } = await editS3Objects(projectName, newProjectName);
//             logger.info({"Value of editedObjectsCount": editedObjectsCount});
//             // Update ContentSchema
//             const contentSchemaS3 = await ContentSchema.updateMany({ projectName }, { projectName: newProjectName });
//            logger.info({"Value of contentSchemaS3": contentSchemaS3.acknowledged});

//             return res.status(200).json({ message: 'Project Name updated successfully', editedObjectsCount });
//         }

//         return res.status(404).json({ error: 'Project not found or update failed.' });
//     } catch (error) {
//         return res.status(500).json({ error: 'Internal Server Error.' });
//     }
// });

router.put('/update/:projectName', async (req, res) => {
    try {
        const { projectName } = req.params;
        const { newProjectName } = req.body;

        if (!newProjectName) {
            return res.status(400).json({ error: 'New Project Name is required.' });
        }

        const existingProject = await Project.findOne({ projectName: newProjectName.toLowerCase() });

        if (existingProject) {
            return res.status(400).json({ error: 'Duplicate project name. Please choose a different name.' });
        }

        const isUpdated = await microServiceController.updateProjectName(projectName, newProjectName);

        if (isUpdated) {
            // Update S3 objects
            const { editedObjectsCount } = await editS3Objects(projectName, newProjectName);

            // Update ContentSchema S3 URLs
            await ContentSchema.updateMany({ projectName }, { projectName: newProjectName });
            // Fetch documents matching the old project name and update their S3 URLs
            const documentsToUpdate = await ContentSchema.find({ projectName: newProjectName });
            // const updatePromises = documentsToUpdate.map(async (doc) => {
            //     // Replace the old project name with the new one in the S3Url field
            //     const updatedS3Url = doc.s3Url.replace(`pdfs/${projectName}`, `pdfs/${newProjectName}`);
            //     // console.log("updatedS3Url:",updatedS3Url)
            //     doc.s3Url = updatedS3Url;
            //     await doc.save();
            // });
            const updatePromises = documentsToUpdate.map(async (doc) => {
                // Replace the old project name with the new one in the S3Url field
                const updatedS3Url = doc.s3Url.replace(`pdfs/${projectName}`, `pdfs/${newProjectName}`);
                // Create a new object with the updated s3Url property
                const updatedDoc = { ...doc.toObject(), s3Url: updatedS3Url };
                // Save the updated document
                await ContentSchema.findByIdAndUpdate(doc._id, updatedDoc);
            });

            await Promise.all(updatePromises);

            return res.status(200).json({ message: 'Project Name updated successfully', editedObjectsCount });
        }

        return res.status(404).json({ error: 'Project not found or update failed.' });
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// Route to update project details based on id
router.put('/updateall/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { projectName } = req.body;

        if (!projectName) {
            return res.status(400).json({ error: 'Project Name is required.' });
        }

        const existingProject = await Project.findOne({ projectName: projectName.toLowerCase() });

        if (existingProject && existingProject._id.toString() !== projectId) {
            return res.status(400).json({ error: 'Duplicate project name. Please choose a different name.' });
        }

        const isUpdated = await microServiceController.updateProjectDetails(projectId, projectName);

        if (isUpdated) {
            return res.status(200).json({ message: 'Project details updated successfully' });
        }
        return res.status(404).json({ error: 'Project not found or update failed.' });
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error.' });
    }
});

router.put('/updatetoken/:projectName', async (req, res) => {
    try {
        const { projectName } = req.params;
        // console.log(projectName);
        const result = await microServiceController.updateProjectToken(projectName);

        if (result.success) {
            return res.status(200).json({
                message: 'Project token updated successfully',
                generatedToken: result.generatedToken,
            });
        }
        logger.error({
            message: 'Project not found or update failed.',
        });
        return res.status(404).json({ error: 'Project not found or update failed.' });
    } catch (error) {
        logger.error({
            message: 'Error occurred while regenerating token',
        });
        return res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// Route to delete project based on id
router.delete('/delete/:projectName', async (req, res) => {
    try {
        const { projectName } = req.params;

        const project = await Project.findOneAndDelete({ projectName });
        // console.log("Project deleted", project)
        logger.info({ 'Project deleted': project });

        if (!project) {
            logger.error({
                message: 'Project not found.',
                // error: error.message,
            });
            return res.status(404).json({ error: 'Project not found.' });
        }
        // Delete from S3
        const { deletedObjectsCount } = await deleteS3Objects(projectName);
        logger.info({ Deleted: deletedObjectsCount });

        const document = await ContentSchema.findOneAndDelete({ projectName });
        // console.log("Project deleted", project)
        logger.info({ 'Project deleted': document });

        if (!document) {
            logger.error({
                message: 'Project not found in Content Schema.',
                // error: error.message,
            });
            return res.status(404).json({ error: 'Project not found.' });
        }

        return res.status(200).json({ message: 'Project deleted successfully', deletedFromS3: deletedObjectsCount });
        // return res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        logger.error({
            message: 'Error occured while deleting project',
            // error: error.message,
        });
        return res.status(500).json({ error: 'Internal Server Error.' });
    }
});

/** FOR VALIDATION OF URL  */
// router.post('/validatecsv', upload.array('file'), async (req, res) => {
//     try {
//         const { selectedProjectName, projectToken } = req.body;
//         if (selectedProjectName) {
//             logger.info({
//                 'Project selected': selectedProjectName,
//             });
//         }
//         if (!selectedProjectName) {
//             logger.error({
//                 message: 'Missing projectname',
//             });
//             return res.status(400).json({ message: 'Missing projectname' });
//         }
//         const projectName = selectedProjectName;
//         const projectExists = await microServiceController.AuthenticateProject(projectName, projectToken);

//         if (projectExists) {
//             const { files } = req;
//             const invalidFiles = files.filter((file) => file.mimetype !== 'text/csv');

//             if (invalidFiles.length > 0) {
//                 const invalidFileNames = invalidFiles.map((file) => file.originalname);
//                 logger.error({
//                     message: 'Invalid file type! Only CSV files are allowed.',
//                     invalidFileNames,
//                 });
//                 return res.status(400).json({ message: 'Invalid file type! Only CSV files are allowed.', invalidFileNames });
//             }
//             // console.log('Uploaded Files:', req.files);
//             const duplicateFiles = files.filter(
//                 (file, index) => files.findIndex((f) => f.originalname === file.originalname && f.size === file.size) !== index
//             );
//             if (duplicateFiles.length > 0) {
//                 const duplicateFileNames = duplicateFiles.map((file) => file.originalname);
//                 logger.error({
//                     message: 'File Already Selected!!',
//                     duplicateFileNames,
//                     // error: error.message,
//                 });
//                 return res.status(400).json({ message: 'File Already Selected!!', duplicateFileNames });
//             }
//         }
//         return res.status(400).json({ message: 'Please ,Onboard Project' });
//     } catch (error) {
//         if (error.message === 'Please upload a file!') {
//             logger.error({
//                 message: 'Please upload a file!',
//                 // error: error.message,
//             });
//             return res.status(400).json({ message: error.message });
//         }
//         logger.error({
//             message: `Error occured in the route: ${error.message}`,
//             // error: error.message,
//         });
//         return res.status(500).json({ message: 'Error occured in the route', error: error.message });
//     }
// });

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

router.get('/request', async (req, res) => {
    try {
        const { s3Url } = req.query;
        const metadataResult = await fetchMetadataFromS3Url(s3Url);
        res.json(metadataResult.requestType);
    } catch (error) {
        logger.error('Error in fetch-metadata route:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// /**
//  * TO SAVE THE DATA IN DB
//  * All inputs are taken for validating and saving in DB
//  *
//  * @returns {any} - returns
//  */
// router.post('/data', upload.any(), async (req, res) => {
//     try {
//         const { selectedProjectName, projectToken } = req.body;
//         if (!selectedProjectName) {
//             logger.error({
//                 message: 'Missing projectname',
//             });
//             return res.status(400).json({ message: 'Missing projectname' });
//         }
//         if (!projectToken) {
//             logger.error({
//                 message: 'Missing project Token. Please add project token.',
//             });
//             return res.status(401).json({ message: 'Missing project Token. Please add project token.' });
//         }
//         const projectExists = await microServiceController.AuthenticateProject(selectedProjectName, projectToken);
//         if (projectExists) {
//             const { files } = req;
//             if (files && files.length > 0) {
//                 const selectedFileName = files[0].originalname;
//                 // Check if selectedFileName is provided
//                 if (!selectedFileName) {
//                     logger.error({
//                         message: 'Missing selectedFileName',
//                     });
//                     return res.status(400).json({ message: 'Missing selectedFileName' });
//                 }

//                 const { conversionType } = req.body;
//                 const projectName = selectedProjectName.toLowerCase();
//                 const requestType = req.originalUrl;

//                 // Call validation function for CSV file
//                 const data = await Validate.countValidURLs(files);
//                 const validURLs = Validate.extractValidURLs(data);
//                 const csvFiles = await ContentController.createCSVFromURLs(validURLs, selectedFileName, res);

//                 const uploadedFile = await ContentController.uploadFile(projectName, selectedFileName, csvFiles, conversionType, requestType, res);
//                 return res.status(200).json({
//                     message: 'Request Submitted Successfully',
//                     urls: uploadedFile.urls.map((urlObj) => urlObj.url),
//                 });
//             }
//             const { urls, conversionType } = req.body;
//             let { selectedFileName } = req.body;
//             selectedFileName += '.csv';

//             const projectName = selectedProjectName.toLowerCase();
//             const requestType = req.originalUrl;
//             const data = await Validate.countURLs(urls);
//             const { validURLs } = data[0];
//             const csvFiles = await ContentController.createCSVFromURLs(validURLs, selectedFileName, res);
//             logger.info({ message: 'csvFile created' });
//             const uploadedFile = await ContentController.uploadFile(projectName, selectedFileName, csvFiles, conversionType, requestType, res);
//             return res.status(200).json({
//                 message: 'Request Submitted Successfully',
//                 urls: uploadedFile.urls.map((urlObj) => urlObj.url),
//             });
//         }
//     } catch (error) {
//         logger.error({
//             message: `Error occurred: ${error.message}`,
//         });
//         return res.status(500).json({ message: error.message });
//     }
//     return null;
// });

/**
 * TO SAVE THE DATA IN DB
 * All inputs are taken for validating and saving in DB
 *
 * @returns {any} - returns
 */
// router.post('/data', upload.any(), async (req, res) => {
//     try {
//         const { selectedProjectName, projectToken } = req.body;
//         if (!selectedProjectName) {
//             logger.error({
//                 message: 'Missing projectname',
//             });
//             return res.status(400).json({ message: 'Missing projectname' });
//         }
//         if (!projectToken) {
//             logger.error({
//                 message: 'Missing project Token. Please add project token.',
//             });
//             return res.status(401).json({ message: 'Missing project Token. Please add project token.' });
//         }
//         const projectExists = await microServiceController.AuthenticateProject(selectedProjectName, projectToken);
//         if (projectExists) {
//             const { files } = req;
//             if (files && files.length > 0) {
//                 const selectedFileName = files[0].originalname;
//                 // Check if selectedFileName is provided
//                 if (!selectedFileName) {
//                     logger.error({
//                         message: 'Missing selectedFileName',
//                     });
//                     return res.status(400).json({ message: 'Missing selectedFileName' });
//                 }

//                 const { conversionType } = req.body;
//                 const projectName = selectedProjectName.toLowerCase();
//                 const requestType = req.originalUrl;

//                 // Call validation function for CSV file
//                 const data = await Validate.countValidURLs(files);
//                 const validURLs = Validate.extractValidURLs(data);
//                 const csvFiles = await ContentController.createCSVFromURLs(validURLs, selectedFileName, res);

//                 const uploadedFile = await ContentController.uploadFile(projectName, selectedFileName, csvFiles, conversionType, requestType, res);
//                 return res.status(200).json({
//                     message: 'Request Submitted Successfully',
//                     urls: uploadedFile.urls.map((urlObj) => urlObj.url),
//                 });
//             }
//             const { urls, conversionType } = req.body;
//             let { selectedFileName } = req.body;
//             selectedFileName += '.csv';

//             const projectName = selectedProjectName.toLowerCase();
//             const requestType = req.originalUrl;
//             const data = await Validate.countURLs(urls);
//             const { validURLs } = data[0];
//             const csvFiles = await ContentController.createCSVFromURLs(validURLs, selectedFileName, res);
//             logger.info({ message: csvFiles });
//             const uploadedFile = await ContentController.uploadFile(projectName, selectedFileName, csvFiles, conversionType, requestType, res);
//             return res.status(200).json({
//                 message: 'Request Submitted Successfully',
//                 urls: uploadedFile.urls.map((urlObj) => urlObj.url),
//             });
//         }
//     } catch (error) {
//         logger.error({
//             message: `Error occurred: ${error.message}`,
//         });
//         return res.status(500).json({ message: error.message });
//     }
//     return null;
// });
router.post('/data', upload.any(), async (req, res) => {
    try {
        const { selectedProjectName, projectToken } = req.body;
        if (!selectedProjectName) {
            logger.error({
                message: 'Missing projectname',
            });
            return res.status(400).json({ message: 'Missing projectname' });
        }
        if (!projectToken) {
            logger.error({
                message: 'Missing project Token. Please add project token.',
            });
            return res.status(401).json({ message: 'Missing project Token. Please add project token.' });
        }
        const projectExists = await microServiceController.AuthenticateProject(selectedProjectName, projectToken);
        if (projectExists) {
            const { files } = req;
            if (files && files.length > 0) {
                const selectedFileName = files[0].originalname;
                // Check if selectedFileName is provided
                if (!selectedFileName) {
                    logger.error({
                        message: 'Missing selectedFileName',
                    });
                    return res.status(400).json({ message: 'Missing selectedFileName' });
                }

                const { conversionType } = req.body;
                const projectName = selectedProjectName.toLowerCase();
                const requestType = req.originalUrl;

                // Call validation function for CSV file
                const data = await Validate.countValidURLs(files);
                const validURLs = Validate.extractValidURLs(data);
                const csvFiles = await ContentController.createCSVFromURLs(validURLs, selectedFileName, res);

                const uploadedFile = await ContentController.uploadFile(projectName, selectedFileName, csvFiles, conversionType, requestType, res);
                return res.status(200).json({
                    message: 'Request Submitted Successfully',
                    urls: uploadedFile.urls.map((urlObj) => urlObj.url),
                });
            }
            const { urls, conversionType } = req.body;
            let { selectedFileName } = req.body;
            selectedFileName += '.csv';

            const projectName = selectedProjectName.toLowerCase();
            const requestType = req.originalUrl;
            const data = await Validate.countURLs(urls);
            const { validURLs } = data[0];
            const csvFiles = await ContentController.createCSVFromURLs(validURLs, selectedFileName, res);
            logger.info({ message: csvFiles });
            const uploadedFile = await ContentController.uploadFile(projectName, selectedFileName, csvFiles, conversionType, requestType, res);
            return res.status(200).json({
                message: 'Request Submitted Successfully',
                urls: uploadedFile.urls.map((urlObj) => urlObj.url),
            });
        }
        return res.status(401).json({ message: 'Project authentication failed.' });
    } catch (error) {
        logger.error({
            message: `Error occurred: ${error.message}`,
        });
        return res.status(500).json({ message: error.message });
    }
});

module.exports = router;
