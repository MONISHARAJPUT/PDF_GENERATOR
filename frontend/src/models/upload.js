const mongoose = require('mongoose');

const { Schema } = mongoose;

const fileSchema = new Schema({
    s3Url: {
        type: String,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    requestType: {
        type: String,
    },
});

const FileModel = mongoose.model('FileModel', fileSchema);

module.exports = FileModel;
