const Redis = require('redis');
const { promisifyAll } = require('bluebird');
const logger = require('./logger');

promisifyAll(Redis);

const CACHE_TTL = 300;

const client = Redis.createClient({
    url: process.env.REDIS_URL,
    tls: {},
    no_ready_check: false,
    // disable tls for localhost
});

const setCache = async (cacheKey, result) => {
    try {
        const data = await client.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
        return data;
    } catch (error) {
        return error;
    }
};

const getCache = async (cacheKey) => {
    try {
        const data = await client.get(cacheKey);
        return data;
    } catch (error) {
        return error;
    }
};

const cacheHandlerWithFunction = async (functionName, actualFunction, args) => {
    try {
        const cacheKey = JSON.stringify({ functionName, ...args }).replace(/"/g, "'");
        const value = await client.get(cacheKey);
        if (value !== null) {
            return JSON.parse(value);
        }
        const result = await actualFunction({ ...args });
        if (result) {
            await setCache(cacheKey, result);
        }
        return result;
    } catch (error) {
        logger.error({ message: 'Something went wrong while invoking a function with cache', error: error.message, stack: error.stack });
        throw error;
    }
};

module.exports = { setCache, getCache, cacheHandlerWithFunction, client };
