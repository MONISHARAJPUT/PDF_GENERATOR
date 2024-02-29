const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
    // Project name
    projectName: {
        type: String,
        required: true,
        // unique: true,
    },
    // File name
    fileName: {
        type: [String],
        required: true,
    },
    // URLs for conversion
    urls: [
        {
            url: {
                type: String,
                required: true,
            },
            status: {
                type: String,
                enum: ['waiting', 'running', 'failed', 'done'],
                default: 'waiting',
            },
            jobId: {
                type: String,
                unique: true,
            },
            isIdUpdated: {
                type: Boolean,
                default: false,
            },
            isPassedtoCron: {
                type: Boolean,
                default: false,
            },
            isResponseReceived: {
                type: Boolean,
                default: false,
            },
        },
    ],
    // //Unique User ID for UM
    // userId: {
    //     type: String,
    //     // unique: true,
    // },
    requestType: {
        type: String,
    },
    // Conversion Type for PDF
    conversionType: {
        type: String,
        required: true,
        enum: ['Full Conversion', 'Text-Only Conversion'],
    },
    // Request Submission date
    timestamp: {
        type: Date,
        default: Date.now,
    },
    isResponseReceivedforAll: {
        type: Boolean,
        default: false,
    },
    isPdfGenerated: {
        type: Boolean,
        default: false,
    },
    isUploadedtoS3: {
        type: Boolean,
        default: false,
    },
    userName: {
        type: String,
    },
    s3Url: {
        type: String,
    },
});
const ContentSchema = mongoose.model('ContentSchema', contentSchema);
module.exports = ContentSchema;

// const contentSchema = new mongoose.Schema({
//     // Project name
//     projectName: {
//         type: String,
//         required: true,
//         // unique: true,
//     },

//     // File name
//     fileName: {
//         type: String,
//         required: true,
//     },

//     // Unique ID for the Job

//     // URLs for conversion
//     urls: [
//         {
//             url: {
//                 type: String,
//                 required: true,
//             },
//             status: {
//                 type: String,
//                 enum: ['waiting', 'cancelled', 'running', 'failed', 'done'],
//                 default: 'waiting',
//             },
//             jobId: {
//                 type: String,
//                 unique: true,
//             },

//             isIdUpdated:{
//                 type: Boolean,
//                 default:false
//             },
//             isValid: {
//                 type: Boolean,
//                 default: false,
//             },

//             isPassedtoCron: {
//                 type: Boolean,
//                 default: false,
//             },
//         },
//     ],

//     // //Unique User ID for UM
//     // userId: {
//     //     type: String,
//     //     // unique: true,
//     // },

//     // Conversion Type for PDF
//     conversionType: {
//         type: String,
//         required: true,
//         enum: ['full', 'text'],
//     },

//     // Request Submission date
//     timestamp: {
//         type: Date,
//         default: Date.now,
//     },
// });

// const ContentSchema = mongoose.model('ContentSchema', contentSchema);

// module.exports = ContentSchema;

// // const mongoose = require('mongoose');

// // const contentSchema = new mongoose.Schema({
// //     projectName: {
// //         type: String,
// //         required: true,
// //     },
// //     fileName: {
// //         type: String,
// //         required: true,
// //     },
// //     // Cronjob unique id for process
// //     jobId: {
// //         type: String,
// //         unique: true,
// //         required: true,
// //     },

// //     // Contents for pdf generation
// //     urls: [
// //         {
// //             url: {
// //                 type: String,
// //                 required: true,
// //             },
// //             isValid: {
// //                 type: Boolean,
// //                 default: false,
// //             },
// //             status: {
// //                 type: String,
// //                 enum: ['pending', 'in progress', 'done'],
// //                 default: 'pending',
// //             },
// //             isCheckCron: {
// //                 type: Boolean,
// //                 default: false,
// //             },
// //         },
// //     ],

// //     // Type of pdf to be generated
// //     conversionType: {
// //         type: String,
// //         required: true,
// //         enum: ['full', 'text'],
// //     },
// //     // Uploaded time of request
// //     timestamp: {
// //         type: Date,
// //         default: Date.now,
// //     },
// //     // Checking for Url validation

// //     // // CronJob updated response => false when the job is completed
// //     // isPending: {
// //     //     type: Boolean,
// //     //     default: true,
// //     // },
// //     // // CronJob response is yet to be received => false when the job is completed
// //     // isProcessing: {
// //     //     type: Boolean,
// //     //     default: true,
// //     // },
// //     // // CronJob response received => true when the job is completed
// //     // isDone: {
// //     //     type: Boolean,
// //     //     default: false,
// //     // },
// //     //  // CronJob response not received for a particular data => false when the job is completed
// //     // isPassing: {
// //     //     type: Boolean,
// //     //     default: true,
// //     // },
// // });

// // const ContentSchema = mongoose.model('ContentSchema', contentSchema);

// // module.exports = ContentSchema;
