const axios = require('axios');
const logger = require('../../utils/logger');

const getAccessToken = async () => {
    try {
        const response = await axios.post(`${process.env.AUTH0_URL}/oauth/token`, {
            grant_type: 'client_credentials',
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            audience: process.env.AUDIENCE,
        });
        // logger.info({ route: `${process.env.AUTH_URL}/oauth/token` });
        const accessToken = response.data.access_token;
        return accessToken;
    } catch (error) {
        logger.error({ 'Error retrieving access token': error });
        throw error;
    }
};

module.exports = { getAccessToken };
