const axios = require('axios');
const logger = require('../utils/logger');

/**
 * VALIDATIONG URLS BASED ON REGEX CONDITION
 *
 * @param {string}url - input from user
 * @returns {any} - the valid urls
 */
function isValidURLFormat(url) {
    try {
        const dotCount = (url.match(/\.{1,}/g) || []).length;
        const consecutiveDots = /\.{2,}/.test(url);

        if (url.startsWith('https://www')) {
            // If "www" is present in the URL immediately after "https://"
            const wwwMatch = url.match(/www/g);
            if (wwwMatch && wwwMatch.length === 1) {
                const urlValidator = /^https?:\/\/www\.([a-zA-Z]+\.?){2,256}\.{1}[a-z]{2,5}(\/[^\s]*){0,3}$/;
                const isValid = urlValidator.test(url) && dotCount <= 3 && !consecutiveDots;
                return isValid;
            }
            return false;
        }

        // If "www" is not present
        const urlValidator = /^(https:\/\/(?:www\.)?([a-zA-Z]+\.?){2,256}\.{1}[a-z]{2,5}(\/[^\s]*){0,3})$/;
        const isValid = urlValidator.test(url) && dotCount <= 3 && !consecutiveDots;
        return isValid;
    } catch (error) {
        return false; // Return false if an error occurs during validation
    }
}

function formatURL(urlArray) {
    // logger.info({ message: urlArray });
    const formattedURLs = urlArray.map((url) => {
        let formattedURL = url;

        if (!formattedURL.startsWith('https://')) {
            formattedURL = `https://${formattedURL}`;
        }
        // Add a comma before 'https://' if it is not at the beginning
        formattedURL = formattedURL.replace(/\r?\n/g, ',');
        formattedURL = formattedURL.replace(/([^,]|^)(https:\/\/)/g, '$1,$2');
        formattedURL = formattedURL.replace(/\n/g, ','); // Replace newline characters with commas
        formattedURL = formattedURL.replace(/;;+/g, ','); // Replace one or more consecutive semicolons with a single comma
        formattedURL = formattedURL.replace(/,+/g, ','); // Replace consecutive commas with a single comma
        formattedURL = formattedURL.replace(/^,/, ''); // Remove leading comma
        formattedURL = formattedURL.replace(/[,;]+$/, ''); // Remove trailing commas and semicolons

        return formattedURL;
    });

    const nonEmptyURLs = formattedURLs.flatMap((urls) => urls.split(',').filter((segment) => segment.trim() !== ''));

    return nonEmptyURLs;
}

async function checkfor404(url) {
    try {
        const response = await axios.head(url);
        if (response.status === 404) {
            return {
                error: true,
                type: '404',
                url,
            };
        }
        logger.info({ message: 'URL is accessible' });
        return {
            error: false,
            url,
        };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return {
                error: true,
                type: '404',
                url,
            };
        }
        // console.error('Error occurred while checking URL:', error.message);
        return {
            error: true,
            type: 'network',
            url,
        };
    }
}

// const countURLs = async (urls) => {
//     const seenURLs = new Set();
//     const formattedURLs = urls.map(formatURL);
//     console.log('Formatted URLs: ', formattedURLs);
//     const processedURLs = await Promise.all(
//         formattedURLs.map(async (formattedURL) => {
//             // console.log('Formatted URL: ', formattedURL);

//             // Check if URL is in valid format
//             const isValidFormat = isValidURLFormat(formattedURL);
//             if (!isValidFormat) {
//                 return { type: 'invalidFormat', url: formattedURL };
//             }

//             try {
//                 const { error } = await checkfor404(formattedURL);
//                 logger.info({ '404 error occured': error });
//                 // console.log(error);

//                 if (seenURLs.has(formattedURL)) {
//                     return { type: 'duplicate', url: formattedURL };
//                 }

//                 if (error) {
//                     return { type: 'pageNotFound', url: formattedURL };
//                 }

//                 seenURLs.add(formattedURL);
//                 return { type: 'valid', url: formattedURL };
//             } catch (error) {
//                 logger.error({
//                     message: `Error occurred while checking URL:${error.message}`,
//                     // error: error.message,
//                 });
//                 console.error('Error occurred while checking URL:', error);
//                 return { type: 'invalid', url: formattedURL };
//             }
//         })
//     );

//     const counts = processedURLs.reduce(
//         (acc, { type }) => {
//             acc[`${type}URLCount`] = (acc[`${type}URLCount`] || 0) + 1;
//             if (type === 'invalidFormat' || type === 'pageNotFound') {
//                 acc.invalidURLCount += 1;
//             }
//             return acc;
//         },
//         {
//             totalURLCount: processedURLs.length,
//             validURLCount: 0,
//             invalidURLCount: 0,
//             duplicateURLCount: 0,
//             invalidFormatURLCount: 0,
//             pageNotFoundURLCount: 0,
//         }
//     );

//     const categorizedURLs = processedURLs.reduce(
//         (acc, { type, url }) => {
//             if (type === 'invalidFormat' || type === 'pageNotFound') {
//                 acc.invalidURLs = acc.invalidURLs || {};
//                 acc.invalidURLs[`${type}URLs`] = acc.invalidURLs[`${type}URLs`] || [];
//                 acc.invalidURLs[`${type}URLs`].push(url);
//             } else {
//                 acc[`${type}URLs`] = acc[`${type}URLs`] || [];
//                 acc[`${type}URLs`].push(url);
//             }
//             return acc;
//         },
//         { validURLs: [], invalidURLs: {}, duplicateURLs: [] }
//     );

//     return { ...counts, ...categorizedURLs };
// };

// const countURLs = async (urls) => {
//     const seenURLs = new Set();
//     const processedURLs = await Promise.all(
//         urls.map(async (url) => {
//             // Format the URL to get an array of URLs
//             const formattedURLs = formatURL(url);

//             return Promise.all(
//                 formattedURLs.map(async (formattedURL) => {
//                     // Check if URL is in a valid format
//                     const isValidFormat = isValidURLFormat(formattedURL);
//                     if (!isValidFormat) {
//                         return { type: 'invalidFormat', url: formattedURL };
//                     }
//                     try {
//                         const { error } = await checkfor404(formattedURL);

//                         if (seenURLs.has(formattedURL)) {
//                             return { type: 'duplicate', url: formattedURL };
//                         }

//                         if (error) {
//                             return { type: 'pageNotFound', url: formattedURL };
//                         }
//                         seenURLs.add(formattedURL);
//                         return { type: 'valid', url: formattedURL };
//                     } catch (error) {
//                         return { type: 'invalid', url: formattedURL };
//                     }
//                 })
//             );
//         })
//     );

//     // Flatten the array of arrays into a single array
//     const flattenedProcessedURLs = processedURLs.flat();

//     const counts = flattenedProcessedURLs.reduce(
//         (acc, { type }) => {
//             acc[`${type}URLCount`] = (acc[`${type}URLCount`] || 0) + 1;
//             if (type === 'invalidFormat' || type === 'pageNotFound') {
//                 acc.invalidURLCount += 1;
//             }
//             return acc;
//         },
//         {
//             totalURLCount: flattenedProcessedURLs.length,
//             validURLCount: 0,
//             invalidURLCount: 0,
//             duplicateURLCount: 0,
//             invalidFormatURLCount: 0,
//             pageNotFoundURLCount: 0,
//         }
//     );

//     const categorizedURLs = flattenedProcessedURLs.reduce(
//         (acc, { type, url }) => {
//             if (type === 'invalidFormat' || type === 'pageNotFound') {
//                 acc.invalidURLs = acc.invalidURLs || {};
//                 acc.invalidURLs[`${type}URLs`] = acc.invalidURLs[`${type}URLs`] || [];
//                 acc.invalidURLs[`${type}URLs`].push(url);
//             } else {
//                 acc[`${type}URLs`] = acc[`${type}URLs`] || [];
//                 acc[`${type}URLs`].push(url);
//             }
//             return acc;
//         },
//         { validURLs: [], invalidURLs: {}, duplicateURLs: [] }
//     );

//     return { ...counts, ...categorizedURLs };
// };
// const countURLs = async (csvDataArray) => {
//     console.log(csvDataArray)
//     try {
//         const countsArray = await Promise.all(
//             csvDataArray.map(async (csvData) => {
//                 const seenURLs = new Set();
//                 const urls = extractURLsFromCSV(csvData);

//                 const processedURLs = await Promise.all(
//                     urls.map(async (url) => {
//                         // Format the URL to get an array of URLs
//                         const formattedURLs = formatURL(url);

//                         return Promise.all(
//                             formattedURLs.map(async (formattedURL) => {
//                                 // Check if URL is in a valid format
//                                 const isValidFormat = isValidURLFormat(formattedURL);
//                                 if (!isValidFormat) {
//                                     return { type: 'invalidFormat', url: formattedURL };
//                                 }
//                                 try {
//                                     const { error } = await checkfor404(formattedURL);

//                                     if (seenURLs.has(formattedURL)) {
//                                         return { type: 'duplicate', url: formattedURL };
//                                     }

//                                     if (error) {
//                                         return { type: 'pageNotFound', url: formattedURL };
//                                     }
//                                     seenURLs.add(formattedURL);
//                                     return { type: 'valid', url: formattedURL };
//                                 } catch (error) {
//                                     return { type: 'invalid', url: formattedURL };
//                                 }
//                             })
//                         );
//                     })
//                 );

//                 // Flatten the array of arrays into a single array
//                 const flattenedProcessedURLs = processedURLs.flat().flat();

//                 const counts = flattenedProcessedURLs.reduce(
//                     (acc, { type }) => {
//                         acc[`${type}URLCount`] = (acc[`${type}URLCount`] || 0) + 1;
//                         if (type === 'invalidFormat' || type === 'pageNotFound') {
//                             acc.invalidURLCount += 1;
//                         }
//                         return acc;
//                     },
//                     {
//                         totalURLCount: flattenedProcessedURLs.length,
//                         validURLCount: 0,
//                         invalidURLCount: 0,
//                         duplicateURLCount: 0,
//                         invalidFormatURLCount: 0,
//                         pageNotFoundURLCount: 0,
//                     }
//                 );

//                 const categorizedURLs = flattenedProcessedURLs.reduce(
//                     (acc, { type, url }) => {
//                         if (type === 'invalidFormat' || type === 'pageNotFound') {
//                             acc.invalidURLs = acc.invalidURLs || {};
//                             acc.invalidURLs[`${type}URLs`] = acc.invalidURLs[`${type}URLs`] || [];
//                             acc.invalidURLs[`${type}URLs`].push(url);
//                         } else {
//                             acc[`${type}URLs`] = acc[`${type}URLs`] || [];
//                             acc[`${type}URLs`].push(url);
//                         }
//                         return acc;
//                     },
//                     { validURLs: [], invalidURLs: {}, duplicateURLs: [] }
//                 );

//                 return { ...counts, ...categorizedURLs };
//             })
//         );

//         return countsArray;
//     } catch (error) {
//         // Handle errors if necessary
//         throw error;
//     }
// };
/**
 * Count valid, invalid, and duplicate URLs from an array of URLs.
 *
 * @param {string[]} fileDataArray - array of urls
 * @returns {object} - Object containing counts of valid, invalid, and duplicate URLs.
 */
// const countURLs = async (fileDataArray) => {
//     logger.info({ message: 'URLs passed for validation' });

//     const result = [];
//     const seenURLs = new Set();
//     const fileResult = {
//         totalURLCount: 0,
//         validURLCount: 0,
//         invalidURLCount: 0,
//         duplicateURLCount: 0,
//         invalidFormatURLCount: 0,
//         pageNotFoundURLCount: 0,
//         validURLs: [],
//         invalidURLs: { invalidFormatURLs: [], pageNotFoundURLs: [] },
//         duplicateURLs: [],
//     };

//     const urlArray = Array.isArray(fileDataArray) ? fileDataArray : [fileDataArray];
//     const formattedURLs = await formatURL(urlArray);

//     await Promise.all(
//         formattedURLs.map(async (formattedURL) => {
//             const isValidFormat = isValidURLFormat(formattedURL);
//             if (!isValidFormat) {
//                 fileResult.invalidFormatURLCount += 1;
//                 fileResult.invalidURLs.invalidFormatURLs.push(formattedURL);
//             } else {
//                 try {
//                     const { error } = await checkfor404(formattedURL);

//                     if (seenURLs.has(formattedURL)) {
//                         fileResult.duplicateURLCount += 1;
//                         fileResult.duplicateURLs.push(formattedURL);
//                     } else if (error) {
//                         fileResult.pageNotFoundURLCount += 1;
//                         fileResult.invalidURLCount += 1;
//                         fileResult.invalidURLs.pageNotFoundURLs.push(formattedURL);
//                     } else {
//                         seenURLs.add(formattedURL);
//                         fileResult.validURLCount += 1;
//                         fileResult.validURLs.push(formattedURL);
//                     }
//                 } catch (error) {
//                     fileResult.invalidURLCount += 1;
//                     fileResult.invalidURLs.pageNotFoundURLs.push(formattedURL);
//                 }
//             }
//         })
//     );

//     fileResult.totalURLCount =
//         fileResult.validURLCount + fileResult.invalidURLCount + fileResult.duplicateURLCount + fileResult.invalidFormatURLCount;
//     // Calculate the count of invalid URLs
//     fileResult.invalidURLCount = fileResult.invalidFormatURLCount + fileResult.pageNotFoundURLCount;

//     // // Flatten the nested arrays in invalidFormatURLs and invalidURLs
//     // fileResult.invalidURLs.invalidFormatURLs = fileResult.invalidURLs.invalidFormatURLs.flat();
//     // fileResult.invalidURLs.invalidURLs = fileResult.invalidURLs.invalidURLs.flat();

//     // Push the file result into result array
//     result.push(fileResult);

//     // console.log(result);
//     return result;
// };
const countURLs = async (fileDataArray) => {
    logger.info({ message: 'URLs passed for validation' });

    try {
        const result = [];
        const seenURLs = new Set();
        const fileResult = {
            totalURLCount: 0,
            validURLCount: 0,
            invalidURLCount: 0,
            duplicateURLCount: 0,
            invalidFormatURLCount: 0,
            pageNotFoundURLCount: 0,
            validURLs: [],
            invalidURLs: { invalidFormatURLs: [], pageNotFoundURLs: [] },
            duplicateURLs: [],
        };

        const urlArray = Array.isArray(fileDataArray) ? fileDataArray : [fileDataArray];
        const formattedURLs = await formatURL(urlArray);

        await Promise.all(
            formattedURLs.map(async (formattedURL) => {
                const isValidFormat = isValidURLFormat(formattedURL);
                if (!isValidFormat) {
                    fileResult.invalidFormatURLCount += 1;
                    fileResult.invalidURLs.invalidFormatURLs.push(formattedURL);
                } else {
                    try {
                        const { error } = await checkfor404(formattedURL);

                        if (seenURLs.has(formattedURL)) {
                            fileResult.duplicateURLCount += 1;
                            fileResult.duplicateURLs.push(formattedURL);
                        } else if (error) {
                            fileResult.pageNotFoundURLCount += 1;
                            fileResult.invalidURLCount += 1;
                            fileResult.invalidURLs.pageNotFoundURLs.push(formattedURL);
                        } else {
                            seenURLs.add(formattedURL);
                            fileResult.validURLCount += 1;
                            fileResult.validURLs.push(formattedURL);
                        }
                    } catch (error) {
                        fileResult.invalidURLCount += 1;
                        fileResult.invalidURLs.pageNotFoundURLs.push(formattedURL);
                    }
                }
            })
        );

        fileResult.totalURLCount =
            fileResult.validURLCount + fileResult.invalidURLCount + fileResult.duplicateURLCount + fileResult.invalidFormatURLCount;
        // Calculate the count of invalid URLs
        fileResult.invalidURLCount = fileResult.invalidFormatURLCount + fileResult.pageNotFoundURLCount;

        // // Flatten the nested arrays in invalidFormatURLs and invalidURLs
        // fileResult.invalidURLs.invalidFormatURLs = fileResult.invalidURLs.invalidFormatURLs.flat();
        // fileResult.invalidURLs.invalidURLs = fileResult.invalidURLs.invalidURLs.flat();

        // Push the file result into result array
        result.push(fileResult);

        // console.log(result);
        return result;
    } catch (error) {
        logger.error({ message: `Error occurred while counting URLs: ${error.message}` });
        throw error;
    }
};

/**
 * COUNTING THE URL FROM CSV
 *
 * @param {string} files - contents of the file
 * @returns {Promise<{ urlsCount: number, fileName: string }[]>} - A promise that resolves to an array of objects containing URL count and file names.
 */
// const countValidURLs = async (files) => {
//     if (!files || files.length === 0) {
//         throw new Error('No files provided.');
//     }

//     return Promise.all(
//         files.map(async (file) => {
//             if (!file || !file.buffer) {
//                 throw new Error('Invalid file provided.');
//             }

//             const csvData = file.buffer.toString();
//             const lines = csvData.split(/\r?\n/);
//             const allURLs = [];

//             for (let index = 0; index < lines.length; index += 1) {
//                 const line = lines[index];
//                 const urls = line.split(',').map((url) => url.trim());
//                 allURLs.push(...urls.filter((url) => url !== ''));
//             }

//             try {
//                 const result = await countURLs(allURLs);
//                 return { fileName: file.originalname, result };
//             } catch (error) {
//                 return { fileName: file.originalname, error: error.message };
//             }
//         })
//     );
// };
const countValidURLs = async (files) => {
    try {
        if (!files || files.length === 0) {
            throw new Error('No files provided.');
        }

        return Promise.all(
            files.map(async (file) => {
                if (!file || !file.buffer) {
                    throw new Error('Invalid file provided.');
                }

                const csvData = file.buffer.toString();
                const lines = csvData.split(/\r?\n/);
                const allURLs = [];

                for (let index = 0; index < lines.length; index += 1) {
                    const line = lines[index];
                    const urls = line.split(',').map((url) => url.trim());
                    allURLs.push(...urls.filter((url) => url !== ''));
                }

                try {
                    const result = await countURLs(allURLs);
                    return { fileName: file.originalname, result };
                } catch (error) {
                    return { fileName: file.originalname, error: error.message };
                }
            })
        );
    } catch (error) {
        logger.error({
            message: `Error occurred in countValidURLs :${error.message}`,
        });
        throw error;
    }
};

/**
 * EXTRACT THE VALIDATE URLS FOR MICROSERVICE
 *
 * @param {string}data - extracting validURLS from file
 * @returns {string} - returns the valid urls
 */
function extractValidURLs(data) {
    try {
        const validURLs = [];
        data.forEach((fileData) => {
            if (fileData.result && fileData.result.length > 0) {
                const validUrlsFromResult = fileData.result[0].validURLs;
                validURLs.push(...validUrlsFromResult);
            }
        });
        return validURLs;
    } catch (error) {
        logger.error({
            message: 'Error in extractValidURLs',
            error: error.message,
        });
        throw error; // Re-throw the error to propagate it to the caller
    }
}

module.exports = {
    countURLs,
    countValidURLs,
    extractValidURLs,
};
