const mongoose = require('mongoose');

const IndividualfileSchema = new mongoose.Schema({
    data: Buffer,
    fileName: String,
    status: {
        type: Boolean,
        default: true,
    },
    created_at: { type: Date, default: Date.now },
});

const IndividualPdf = mongoose.model('Individualfile', IndividualfileSchema);

module.exports = IndividualPdf;
