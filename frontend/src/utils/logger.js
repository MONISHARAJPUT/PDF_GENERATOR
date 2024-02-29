/* eslint-disable no-console */

const logger = {
    /**
     * Send logs to stdout as a DEBUG level
     *
     * @function
     * @param {string} message A JSON string of message to log
     */
    debug: (message) => {
        const logMessage = JSON.parse(message);
        console.debug(JSON.stringify({ ...logMessage, LEVEL: 'DEBUG' }));
    },
    /**
     * Send logs to stderr as an ERROR level
     *
     * @function
     * @param {object} errorLog A JS object that will get destructured and stringified
     */
    error: (errorLog) => {
        console.error(JSON.stringify({ ...errorLog, LEVEL: 'ERROR' }));
    },
    /**
     * Send logs to stderr as an INFO level
     *
     * @function
     * @param {object} logMessage A JS object that will get destructured and stringified
     */
    info: (logMessage) => {
        console.log(JSON.stringify({ ...logMessage, LEVEL: 'INFO' }));
    },
};

module.exports = logger;
