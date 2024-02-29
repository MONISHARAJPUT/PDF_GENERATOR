const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    projectName: {
        type: String,
        unique: true,
        required: true,
    },

    projectToken: {
        type: String,
        required: true,
    },
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
