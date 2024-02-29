const express = require('express');
const logger = require('../utils/logger');
const performanceTimer = require('../middleware/end-performance-timer');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();

const { getAccessToken } = require('../lib/token/index');

router.get(
    '/token',
    asyncHandler(async (req, res, next) => {
        try {
            const auth0Token = await getAccessToken();
            logger.info({ message: 'Token fetched successfully' });
            res.status(200).json(auth0Token);
            req.routeTimer({ statusCode: 200 });

            return next();
        } catch (error) {
            logger.error({
                message: `Error occurred while fetching auth0 Token: ${error.message}`,
                // error: error.message,
            });
            req.routeTimer({ statusCode: 500 });
            return next(error);
        }
    }),
    performanceTimer
);

module.exports = router;
