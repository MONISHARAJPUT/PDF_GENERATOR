const bcrypt = require('bcrypt');
const Project = require('../models/projectdetails');
const FileModel = require('../models/upload');
const logger = require('../utils/logger');

/**
 * GENERATING TOKEN
 *
 * @returns {string} the generated token for the project
 */
async function generateToken() {
    const generatedToken = Math.random().toString(36).substring(2, 14);
    return generatedToken;
}

/**
 * STORING PROJECT DETAILS IN DATABASE
 *
 * @param {string}data - input from user
 * @returns {string} - prpject details
 */
async function storeProjectDetails(data) {
    const { projectName } = data;
    const projectToken = await generateToken();
    const hashedToken = await bcrypt.hash(projectToken, 10);
    const projectData = new Project({
        projectName: projectName.toLowerCase(),
        projectToken: hashedToken,
    });

    const details = await projectData.save();
    logger.info({ 'Project details stored in DATABASE': projectData.projectName });
    return {
        projectDetails: {
            projectName: details.projectName,
            projectToken,
        },
    };
}

/**
 * FETCHING ALL THE PROJECT NAMES
 *
 *@returns {string} -  List of all the project names
 */
async function getAllProjectNames() {
    try {
        const projects = await Project.find({}, '_id projectName projectToken');
        if (!projects || projects.length === 0) {
            return [];
        }
        const projectData = projects.map((project) => {
            logger.info({ message: 'Fetched project details from DATABASE' });

            return {
                _id: project._id.toString(),
                projectName: project.projectName.toUpperCase(),
                projectToken: project.projectToken,
            };
        });
        return projectData;
    } catch (error) {
        logger.error({
            message: 'Error fetching project names',
        });
        throw error;
    }
}

/**
 * VERIFYING THE TOKEN IS A MATCH OR NOT
 *
 * @param {string} token - the value pass by the user
 * @param {string} projectToken - the encrypted value stored in the db
 * @returns {boolean} - verifies the token
 * @throws {Error} - throws an error for invalid token
 */
async function decryptAndValidateToken(token, projectToken) {
    try {
        const match = await bcrypt.compare(token, projectToken);

        if (!match) {
            throw new Error('Invalid token');
        }

        return match;
    } catch (error) {
        throw new Error('Invalid token');
    }
}

/**
 * VALIDATING THE PROJECT DETAILS
 *
 * @param {string} projectName - the name of the project
 * @param {string} projectToken - unique identifier of the particular project
 * @returns {boolean} - whether true or false for project exist or not
 * @throws {Error} - throws an error for invalid project or token
 */
async function AuthenticateProject(projectName, projectToken) {
    const selectedProject = projectName.toLowerCase();
    try {
        const existingProject = await Project.findOne({ projectName: selectedProject });
        if (!existingProject) {
            throw new Error('Invalid project');
        }

        const decryptedToken = await decryptAndValidateToken(projectToken, existingProject.projectToken);
        return decryptedToken;
    } catch (error) {
        logger.error({
            message: `Cannot authenticate project : ${error.message}`,
            // error: error.message,
        });
        throw error;
    }
}
/**
 * UPDATING THE PROJECT NAME
 *
 * @param {string} projectName - name of the project to update
 * @param {string} newProjectName - New name for the project
 * @returns {boolean} - true if the project details were updated successfully, false otherwise
 */
// Update project details
async function updateProjectName(projectName, newProjectName) {
    try {
        if (projectName) {
            const updatedProject = await Project.findOneAndUpdate({ projectName }, { projectName: newProjectName }, { new: true });
            return updatedProject !== null;
        }
        return false;
    } catch (error) {
        logger.error({
            message: ' updateProjectName error!',
        });
        throw error;
    }
}

/**
 * UPDATE FUNCTION FOR PROJECT NAME
 *
 * @param {string} projectId - unique id for project to update
 * @param {string} newProjectName - project name to update
 * @returns {string} - returns the updated project details
 */
async function updateProjectDetails(projectId, newProjectName) {
    try {
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            {
                projectName: newProjectName,
                projectToken: await generateToken(),
            },
            { new: true }
        );
        if (updatedProject !== null) {
            return updatedProject !== null;
        }
        return false;
    } catch (error) {
        logger.error({
            message: ' updateProjectDetails error!',
        });
        throw error;
    }
}

/**
 * UPDATING THE PROJECT TOKEN AND RETURN NEW TOKEN
 *
 * @param {string} projectName - Unique ProjectName
 * @returns {object} - Object containing the generated token and a success message
 */
async function updateProjectToken(projectName) {
    // console.log('Updating project token for', projectName);
    try {
        const generatedToken = await generateToken();
        const hashedToken = await bcrypt.hash(generatedToken, 10);

        const updatedProject = await Project.findOneAndUpdate({ projectName }, { projectToken: hashedToken }, { new: true });
        // console.log('Updated project token for', updatedProject);

        return {
            success: updatedProject !== null,
            generatedToken,
        };
    } catch (error) {
        logger.error({
            message: 'updateProjectToken error!',
            error: error.message,
        });
        throw error;
    }
}

/**
 * FETCH ALL PROJECT DETAILS FROM DATABASE
 *
 * @returns {Promise<object[]>} - Array of objects containing project details
 */
async function getAllProjectDetails() {
    const projects = await Project.find({}, '_id projectName projectToken');
    return projects.map((project) => ({
        _id: project._id.toString(),
        projectName: project.projectName,
        projectToken: project.projectToken,
    }));
}
/**
 * FETCHING DATA
 *
 * @param {any}req - input from user
 * @param {any}res - res
 * @returns {string} response
 */
async function fetchData(req, res) {
    try {
        const files = await FileModel.find();
        res(200).json({ files });
    } catch (error) {
        logger.error({
            message: `Error occurred while fetching data :${error.message}`,
            // error: error.message,
        });
        res(500).json({ message: error.message });
    }
}
module.exports = {
    fetchData,
    storeProjectDetails,
    getAllProjectNames,
    AuthenticateProject,
    updateProjectName,
    updateProjectDetails,
    updateProjectToken,
    generateToken,
    getAllProjectDetails,
    // AutheticateProject,
};
