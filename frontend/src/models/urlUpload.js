const mongoose = require('mongoose');

const { Schema } = mongoose;

const urlSchema = new Schema({
    urls: {
        type: [String],
        default: [],
    },
    s3Url: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    content: {
        type: Buffer,
    },
});

const UrlModel = mongoose.model('UrlModel', urlSchema);

module.exports = UrlModel;
