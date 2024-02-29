const { GridFSBucket } = require('mongodb');
const { mongoose } = require('mongoose');
const logger = require('../utils/logger');
const IndividualPDF = require('../models/pdfSchema');
const MergedPDF = require('../models/mergedpdf');

// DATABASE OPERATIONS ON FULL CONVERSION
/**
 * Saves the merged PDF to MongoDB.
 *
 * @param {Buffer} mergedPdfBytes - The generated individual PDF as a Buffer.
 * @param {string} fileName - The name of the generated individual PDF.
 * @returns {Promise<string>} A Promise that resolves with the ID of the saved merged PDF.
 * @throws {Error} throws error during the saving process.
 */
async function saveMergedpdftomongo(mergedPdfBytes, fileName) {
    try {
        const { db } = mongoose.connection;
        const bucket = new GridFSBucket(db, { bucketName: 'merged_pdfs' });
        const uploadStream = bucket.openUploadStream(fileName);
        if (!uploadStream) {
            throw new Error('Upload stream is undefined');
        }

        uploadStream.write(mergedPdfBytes);
        uploadStream.end();

        const uploadStreamId = uploadStream._id ? uploadStream._id.toString() : null;
        return uploadStreamId || '';
    } catch (error) {
        logger.error({
            message: `Error occurred in saveMergedpdftomongo function:${error.message}`,
        });
        throw new Error(error.message);
    }
}
/**
 * DELETES ALL THE INDIVIDUAL PDFS IF ERRORS OCCURS IN SAVING INDIVIDUAL PDFS
 *
 * @returns {any} - deleted
 */
async function deleteAllPdfFromMongoDB() {
    try {
        await IndividualPDF.deleteMany({});
        logger.info({
            message: 'Deleted all individual PDFs from MongoDB.',
        });
    } catch (err) {
        logger.error({
            message: `Error occurred in deleteAllPdfFromMongoDB function: ${err.message}`,
        });
        throw new Error(`Error Message: ${err.message}`);
    }
}
/**
 * SAVING INDIVIDUAL PDF TO MONGO
 *
 * @param {any}pdfData - pdf data
 * @param {string}fileName - file name
 * @returns {string} - object id
 */
async function savePdfToMongoDB(pdfData, fileName) {
    let storedPdf;
    try {
        storedPdf = new IndividualPDF({ data: pdfData, fileName });
        await storedPdf.save();
        logger.info({
            Saved_PDF_Id: storedPdf._id.toString(),
        });
        return storedPdf._id;
    } catch (err) {
        logger.error({
            message: `Error occurred in savePdfToMongoDB function: ${err.message}`,
        });

        // If an error occurs during saving, delete all individual PDFs
        await deleteAllPdfFromMongoDB();
        logger.info({
            message: 'Deleted all individual PDFs due to an error during saving.',
        });

        if (storedPdf && storedPdf._id) {
            logger.info({
                message: `Deleted individual PDF with ID: ${storedPdf._id} due to an error during saving.`,
            });
        }

        throw new Error(`Error Message: ${err.message}`);
    }
}

/**
 * DELETING INDIVIDUAL PDF TO MONGO
 *
 * @param {string }pdfId - Id of the merged pdf
 * @returns {string}- returns null
 */
const deletePdfFromMongoDB = async (pdfId) => {
    try {
        const result = await IndividualPDF.deleteOne({ _id: pdfId });
        if (result.deletedCount === 1) {
            logger.info({
                message: 'Result of deletePdfFromMongoDB ',
                result: result?.acknowledged || null,
            });
            return result;
        }
        logger.error({
            message: 'PDF not found or not deleted successfully',
            // error: error.message,
        });
        return { message: 'PDF not found or not deleted successfully' };
    } catch (error) {
        logger.error({
            message: `Error occured in deletePdfFromMongoDB function:${error.message}`,
            // error: error.message,
        });
        throw new Error(error.message);
    }
};

/**
 * DELETING MERGED PDF TO MONGO
 *
 * @param {string }pdfId - Id of the merged pdf
 * @returns {string}- returns null
 */
const deleteMergedPdfFromMongoDB = async (pdfId) => {
    try {
        const result = await MergedPDF.deleteOne({ _id: pdfId });
        if (result.deletedCount === 1) {
            logger.info({
                message: 'Result of deleteMergedPdfFromMongoDB ',
                result: result?.acknowledged || null,
            });
            return result;
        }

        logger.error({
            message: 'PDF not found or not deleted successfully',
            // error: error.message,
        });
        return { message: 'PDF not found or not deleted successfully' };
    } catch (error) {
        logger.error({
            message: `Error occured in deleteMergedPdfFromMongoDB function:${error.message}`,
            // error: error.message,
        });
        throw new Error(error.message);
    }
};

// DATABASE OPERATIONS ON TEXT CONVERSION
/**
 * SAVING MERGED PDF TO DATABASE
 *
 * @param {any} mergedPdfBytes - The number of bytes
 * @param {any} fileName - The name of the file to be merged
 * @returns {any} the merged PDF file id
 * @throws {Error} If there is an error during the saving process.
 */
const saveMergedpdftoDATABASE = async (mergedPdfBytes, fileName) => {
    try {
        const mergedPdfBuffer = Buffer.from(mergedPdfBytes);

        const mergedPdf = new MergedPDF({
            data: mergedPdfBuffer,
            fileName,
        });

        await mergedPdf.save();
        logger.info({
            Merged_PDF_Id: mergedPdf._id.toString(),
        });
        return mergedPdf._id.toString();
    } catch (error) {
        logger.error({
            message: `Error saving Merged PDF to DATABASE':${error.message}`,
            // error: error.message,
        });
        throw new Error(error.message);
    }
};

/**
 * SAVING INDIVIDUAL PDF TO DATABASE
 *
 * @param {any} pdfData - the individually created PDF object
 * @param {string}fileName - the file name of the document
 * @returns {string} - the saved pdf id
 * @throws {Error} If there is an error during the saving process.
 */
const savePdfToDATABASE = async (pdfData, fileName) => {
    try {
        const storedPdf = new IndividualPDF({ data: pdfData, fileName });
        await storedPdf.save();
        logger.info({
            Saved_PDF_Id: storedPdf._id.toString(),
        });
        return storedPdf._id;
    } catch (error) {
        logger.error({
            message: `Error saving individual PDF to DATABASE:${error.message}`,
            // error: error.message,
        });
        throw error;
    }
};

/**
 * DELETING INDIVIDUAL PDF TO DATABASE
 *
 * @param {string} pdfId - the deleted individual PDF id
 * @returns {string} - the deleted individual PDF id
 * @throws {Error} If there is an error during the saving process.
 */
const deletePdfFromDATABASE = async (pdfId) => {
    try {
        const result = await IndividualPDF.deleteOne({ _id: pdfId });
        if (result.deletedCount === 1) {
            logger.info({
                message: 'Result of deletePdfFromDATABASE',
                result: result?.acknowledged || null,
            });
            return result;
        }
        // If result.deletedCount is not 1
        logger.error({
            message: 'PDF not found or not deleted successfully',
        });
        return { error: 'PDF not found or not deleted successfully' };
    } catch (error) {
        logger.error({
            message: `Error deleting individual PDFs from DATABASE:${error.message}`,
            // error: error.message,
        });
        throw error;
    }
};

/**
 * DELETING MERGED PDF TO DATABASE
 *
 * @param {string} pdfId -  the deleted merged PDF id
 * @returns {any} Returns the deleted merged PDF id
 * @throws {Error} If there is an error during the deleting process.
 */
const deleteMergedPdfFromDATABASE = async (pdfId) => {
    try {
        const result = await MergedPDF.deleteOne({ _id: pdfId });
        if (result.deletedCount === 1) {
            logger.info({
                message: 'Result of deleteMergedPdfFromDATABASE ',
                result: result?.acknowledged || null,
            });
            return result;
        }
        logger.error({
            message: 'PDF not found or not deleted successfully',
            // error: error.message,
        });

        return { message: 'PDF not found or not deleted successfully' };
    } catch (error) {
        logger.error({
            message: `Error deleting Merged PDF from DATABASE:${error.message}`,
            // error: error.message,
        });
        throw error;
    }
};

module.exports = {
    saveMergedpdftoDATABASE,
    saveMergedpdftomongo,
    savePdfToDATABASE,
    savePdfToMongoDB,
    deleteAllPdfFromMongoDB,
    deleteMergedPdfFromDATABASE,
    deleteMergedPdfFromMongoDB,
    deletePdfFromDATABASE,
    deletePdfFromMongoDB,
};
