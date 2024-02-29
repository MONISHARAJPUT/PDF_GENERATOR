const { S3Client, ListObjectsV2Command, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../utils/logger');

require('dotenv').config();

const { S3_BUCKET, AWS_ACCESS_KEY, AWS_SECRET, AWS_REGION } = process.env;
// const getRandomProgress = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET,
    },
});
// async function uploadFinalPdfToS3(fileStream, fileName, projectName,conversionType) {
//     try {
//         let folder;
//         console.log(fileStream, fileName, projectName, conversionType)

//         if (conversionType === 'full') {
//             folder = `pdfs/${projectName}/full_conversion/`;
//         } else if (conversionType === 'text') {
//             folder = `pdfs/${projectName}/text_conversion/`;
//         } else {
//             throw new Error('Invalid conversion type');
//         }
//         const uploadParams = {
//             Bucket: S3_BUCKET,
//             Key: `${folder}${fileName}`,
//             Body: fileStream,
//             ACL: 'public-read',
//             ContentType: "application/pdf", // Set the content type if needed
//             ACL: "public-read", // Set the ACL if needed
//         };
//         const uploadCommand = new PutObjectCommand(uploadParams);
//         const uploadResult = await s3Client.send(uploadCommand);
//         console.log("Upload result:", uploadResult);
//         return result.Location; // Return the URL of the uploaded file
//     } catch (error) {
//         console.error("Error uploading to S3:", error);
//         throw error;
//     }
// }
// async function uploadFinalPdfToS3(fileStream, fileName, projectName, conversionType) {
//     try {
//         let folder;
//         console.log(fileStream, fileName, projectName, conversionType)

//         if (conversionType === 'full') {
//             folder = `pdfs/${projectName}/full_conversion/`;
//         } else if (conversionType === 'text') {
//             folder = `pdfs/${projectName}/text_conversion/`;
//         } else {
//             throw new Error('Invalid conversion type');
//         }

//         // if (requestType === '/api/upload' || requestType === '/api/text' || requestType === '/api/url' || requestType === '/api/urltxt') {
//         //     metadata = 'application';
//         // } else if (
//         //     requestType === '/service/upload' ||
//         //     requestType === '/service/text' ||
//         //     requestType === '/service/url' ||
//         //     requestType === '/service/utxt'
//         // ) {
//         //     metadata = 'microservice';
//         // } else {
//         //     throw new Error('Invalid request type');
//         // }

//         const uploadParams = {
//             Bucket: S3_BUCKET,
//             Key: `${folder}${fileName}`,
//             Body: fileStream,
//             ACL: 'public-read',
//             ContentType: "application/pdf"
//             // Metadata: {
//             //     'x-amz-meta-request-type': metadata,
//             // },
//         };
//         console.log(uploadParams,"uploadParams")
//         const uploadCommand = new PutObjectCommand(uploadParams);
//         await s3Client.send(uploadCommand);
//         console.log(uploadCommand,"uploadCommand")

//         const data = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${folder}${fileName}`;
//         console.log(data)
//         logger.info({ message: 'Successfully Uploaded PDF to S3' });

//         return data;
//     } catch (error) {
//         logger.error({
//             message: `Error occurred while uploading PDF to S3: ${error.message}`,
//         });
//         throw new Error(error.message);
//     }
// }

/**
 * Uploads a merged PDF buffer to the specified S3 bucket.
 *
 * @param {Buffer} buffer - The merged PDF data in buffer format.
 * @param {string} fileName - The name of the file in S3.
 * @param {string} projectName - The Id of the project where pdf is to be stored.
 * @param {string} conversionType - The types of conversion for the pdf.
 * @returns {Promise<string>} The public URL of the uploaded PDF.
 */
async function uploadFinalPdfToS3(buffer, fileName, projectName, conversionType) {
    try {
        let folder;

        if (conversionType === 'Full Conversion') {
            folder = `pdfs/${projectName}/full_conversion/`;
        } else if (conversionType === 'Text-Only Conversion') {
            folder = `pdfs/${projectName}/text_conversion/`;
        } else {
            throw new Error('Invalid conversion type');
        }

        const uploadParams = {
            Bucket: S3_BUCKET,
            Key: `${folder}${fileName}`,
            Body: buffer,
            ACL: 'public-read',
        };

        const uploadCommand = new PutObjectCommand(uploadParams);
        await s3Client.send(uploadCommand);

        const data = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${folder}${fileName}`;
        logger.info({ message: 'Successfully Uploaded PDF to S3' });
        return data;
    } catch (error) {
        logger.error({
            message: `Error occurred while uploading PDF to S3: ${error.message}`,
        });
        throw new Error(error.message);
    }
}

/**
 * Lists the contents (object keys) of the specified S3 bucket.
 *
 *
 *
 * @returns {Promise<void>} A Promise that resolves when the operation is complete.
 */
async function listS3BucketContents() {
    try {
        const params = {
            Bucket: process.env.S3_BUCKET,
        };

        const data = await s3Client.send(new ListObjectsV2Command(params));
        return data;
    } catch (error) {
        logger.error({
            message: `Error occurred while Fetching  S3 bucket contents: ${error.message}`,
            // error: error.message,
        });
        throw new Error(error.message);
    }
}

/**
 * Lists the contents (object keys) of the specified S3 bucket.
 *
 * @param {string} selectedProjectName - selected projectName
 * @returns {Promise<void>} A Promise that resolves when the operation is complete.
 */
async function listS3BucketObjectURLs(selectedProjectName) {
    try {
        const getObjectMetadata = async (key) => {
            const metadataParams = {
                Bucket: process.env.S3_BUCKET,
                Key: key,
            };

            const metadataResponse = await s3Client.send(new HeadObjectCommand(metadataParams));
            const lastModified = metadataResponse.LastModified;
            const contentLength = metadataResponse.ContentLength;

            return { lastModified, contentLength };
        };

        const getObjectURLsAndMetadata = async (prefix) => {
            const params = {
                Bucket: process.env.S3_BUCKET,
                Prefix: `pdfs/${selectedProjectName}/${prefix}/`,
            };
            const data = await s3Client.send(new ListObjectsV2Command(params));

            const objectUrls = await Promise.all(
                (data.Contents || []).map(async (object) => {
                    const url = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${object.Key}`;
                    const metadata = await getObjectMetadata(object.Key);
                    return { url, metadata };
                })
            );

            const objectCount = objectUrls.length;
            return { objectUrls, objectCount };
        };

        const fullConversion = await getObjectURLsAndMetadata('full_conversion');
        const textConversion = await getObjectURLsAndMetadata('text_conversion');

        const totalUrlsCount = fullConversion.objectCount + textConversion.objectCount;

        return {
            fullConversion: {
                objectUrls: fullConversion.objectUrls,
                objectCount: fullConversion.objectCount,
            },
            textConversion: {
                objectUrls: textConversion.objectUrls,
                objectCount: textConversion.objectCount,
            },
            totalUrlsCount,
        };
    } catch (error) {
        logger.error({
            message: `Error occurred while Fetching  S3URLs: ${error.message}`,
            // error: error.message,
        });
        throw error;
    }
}

/**
 * Lists the contents (object keys) of the specified project.
 *
 * @param {string} projectId - Unique value
 * @returns {string} objecturl
 */
async function getPdfsByProjectId(projectId) {
    try {
        const objectKeyPrefix = `projects/${projectId}`;
        const params = {
            Bucket: process.env.S3_BUCKET,
            Prefix: objectKeyPrefix,
        };

        const data = await s3Client.send(new ListObjectsV2Command(params));
        const objectUrls = data.Contents.map((object) => `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${object.Key}`);
        return { objectUrls };
    } catch (error) {
        logger.error({
            message: `Error occurred while Fetching  S3URLs based on project selected: ${error.message}`,
            // error: error.message,
        });
        throw new Error(error.message);
    }
}
/**
 * FETCHING THE TOTAL NUMBER OF FILES IN A
 * FOLDER
 *
 *@returns {any} fileCounts -  count of file
 */
async function getFileCountInFolder() {
    const folderPath = 'pdfs';
    const listObjectsCommand = new ListObjectsV2Command({
        Bucket: 'pdf-generator-fulltext',
        Prefix: folderPath,
    });

    const listObjectsResponse = await s3Client.send(listObjectsCommand);

    const fileCounts = listObjectsResponse.Contents.reduce((accumulator, object) => {
        const subfolder = object.Key.split('/')[1];
        accumulator[subfolder] = (accumulator[subfolder] || 0) + 1;
        return accumulator;
    }, {});

    return fileCounts;
}
/**
 * RETRIEVING THE LAST MODIFIED TIME OF FOLDERS
 *
 * @param {string} folderName - Name of the files
 * @returns {string} - the time of last modified
 */
async function getLastModifiedDateForFolder(folderName) {
    const folderPath = `pdfs/${folderName}/`;
    const listObjectsCommand = new ListObjectsV2Command({
        Bucket: 'pdf-generator-fulltext',
        Prefix: folderPath,
    });

    const listObjectsResponse = await s3Client.send(listObjectsCommand);

    if (listObjectsResponse.Contents.length > 0) {
        const sortedObjects = listObjectsResponse.Contents.sort((a, b) => {
            return b.LastModified - a.LastModified;
        });

        return sortedObjects[0].LastModified;
    }
    return null;
}
function getObjectKeyFromUrl(url) {
    const urlParts = url.split('/');
    urlParts.shift();
    urlParts.shift();
    urlParts.shift();
    const objectKey = urlParts.join('/');
    return objectKey;
}
/**
 * Function to fetch and display object details
 *
 * @param {string} s3Url - to fetch and display object details based on pf url
 * @returns {any} - The uploaded time
 */
async function listObjectsInBucket(s3Url) {
    const objectKey = getObjectKeyFromUrl(s3Url);

    const headObjectCommand = new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: objectKey,
    });

    const headObjectResponse = await s3Client.send(headObjectCommand);

    if (headObjectResponse.LastModified) {
        return {
            S3Url: s3Url,
            Key: objectKey,
            LastModified: headObjectResponse.LastModified,
        };
    }
    return null;
}
/**
 * Function to fetch metadata of request type
 *
 * @param {string} key - to fetch and display object details based on pf url
 * @returns {any} - The recent request type
 */
async function getObjectMetadata1(key) {
    try {
        const metadataParams = {
            Bucket: S3_BUCKET,
            Key: key,
        };

        const metadataResponse = await s3Client.send(new HeadObjectCommand(metadataParams));

        const userDefinedMetadata = metadataResponse.Metadata;

        const requestType = userDefinedMetadata['x-amz-meta-request-type'];

        return { userDefinedMetadata, requestType };
    } catch (error) {
        logger.error('Error fetching object metadata from S3:', error);
        throw new Error(error.message);
    }
}
/**
 * Function to extract the object key
 *
 * @param {string} s3Url - to fetch and display object details based on pf url
 * @returns {any} - the object key
 */
async function fetchMetadataFromS3Url(s3Url) {
    try {
        const key = s3Url.split('com/')[1];
        const metadata = await getObjectMetadata1(key);
        return metadata;
    } catch (error) {
        logger.error('Error fetching metadata from S3:', error);

        if (error.name === 'NotFound') {
            logger.error('Object not found.', error.message);
        }

        throw new Error(error.message);
    }
}

/**
 * DELETING THE PROJECT FOLDER IN S3
 *
 * @param {string} selectedProjectName - the folder name that has to be deleted
 * @returns {any} - list of deleted objects
 */
async function deleteS3Objects(selectedProjectName) {
    try {
        const params = {
            Bucket: process.env.S3_BUCKET,
            Prefix: `pdfs/${selectedProjectName}/`,
        };

        const data = await s3Client.send(new ListObjectsV2Command(params));

        const deletePromises = (data.Contents || []).map(async (object) => {
            const deleteParams = {
                Bucket: process.env.S3_BUCKET,
                Key: object.Key,
            };
            await s3Client.send(new DeleteObjectCommand(deleteParams));
            return object.Key;
        });
        const deletedObjects = await Promise.all(deletePromises);
        // logger.info({ Deleted: deletedObjects });
        const deletedObjectsCount = deletedObjects.length;

        return { deletedObjects, deletedObjectsCount };
    } catch (error) {
        logger.error({
            message: `Error occurred while deleting S3 objects: ${error.message}`,
        });

        throw error;
    }
}

/**
 * EDITING PROJECT NAME IN S3
 *
 * @param {string} selectedProjectName - the existing project name
 * @param {string} newProjectName -  the new edited project name
 * @returns {any} - the list of editing s3 pdf urls
 */
async function editS3Objects(selectedProjectName, newProjectName) {
    // console.log("In edit S3 objects",selectedProjectName,newProjectName);
    try {
        const params = {
            Bucket: process.env.S3_BUCKET,
            Prefix: `pdfs/${selectedProjectName}/`,
        };
        const data = await s3Client.send(new ListObjectsV2Command(params));
        const editPromises = (data.Contents || []).map(async (object) => {
            const oldKey = object.Key;
            const newKey = oldKey.replace(`pdfs/${selectedProjectName}`, `pdfs/${newProjectName}`);

            await s3Client.send(
                new CopyObjectCommand({
                    Bucket: process.env.S3_BUCKET,
                    CopySource: `${process.env.S3_BUCKET}/${oldKey}`,
                    Key: newKey,
                    ACL: 'public-read',
                })
            );
            // Delete original object
            await s3Client.send(
                new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET,
                    Key: oldKey,
                })
            );
            return { oldKey, newKey };
        });
        const editedObjects = await Promise.all(editPromises);
        logger.info({ Updating: editedObjects });
        const editedObjectsCount = editedObjects.length;
        return { editedObjects, editedObjectsCount };
    } catch (error) {
        logger.error({
            message: `Error occurred while editing S3 objects: ${error.message}`,
        });
        throw error;
    }
}

module.exports = {
    uploadFinalPdfToS3,
    listS3BucketContents,
    listS3BucketObjectURLs,
    getPdfsByProjectId,
    getFileCountInFolder,
    getLastModifiedDateForFolder,
    listObjectsInBucket,
    fetchMetadataFromS3Url,
    deleteS3Objects,
    editS3Objects,
};
