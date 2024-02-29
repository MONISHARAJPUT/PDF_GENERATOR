const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema(
    {
        name: String,
    },
    { _id: false }
);
const resultSchema = new mongoose.Schema({
    request: {
        jobId: {
            type: String,
            unique: true,
            alias: 'id',
        },
        url: String,
        startedAt: Date,
        finishedAt: Date,
    },
    article: {
        ingress: String,
        content: String,
        datePublished: {
            dateline: String,
        },
        authors: [authorSchema],
        keywords: [String],
        images: [
            {
                url: String,
                caption: String,
            },
        ],
        title: String,
    },
});
const ResultSchema = mongoose.model('ResultSchema', resultSchema);
module.exports = ResultSchema;
