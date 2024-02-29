const got = require('got');

const logger = require('../../utils/logger');

/**
 * Makes a http call. This function is only to demo the stubs in sinon
 *
 * @param {object} options Refer below
 * @param {string} options.title Fake title
 * @param {string} options.body Fake body
 * @param {number} options.userId Fake userId
 * @returns {Promise<object>} object
 */
const makeHttpCall = async ({ title, body, userId }) => {
    try {
        const result = await got.post('https://jsonplaceholder.typicode.com/posts', {
            json: {
                title,
                body,
                userId,
            },
            responseType: 'json',
        });
        return result.body;
    } catch (error) {
        logger.error({
            message: 'Could not fetch details from API',
            error: error.message,
        });
        throw error;
    }
};

module.exports = { makeHttpCall };
