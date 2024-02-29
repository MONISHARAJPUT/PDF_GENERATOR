const mongoose = require('mongoose');

const mergedPdfSchema = new mongoose.Schema({
    data: {
        type: Buffer,
        required: true,
    },
    fileName: {
        type: String,
    },
});

const MergedPDF = mongoose.model('MergedPDF', mergedPdfSchema);

module.exports = MergedPDF;
