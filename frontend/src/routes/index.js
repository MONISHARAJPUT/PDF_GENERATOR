const express = require('express');
const performanceTimer = require('../middleware/end-performance-timer');
const asyncHandler = require('../utils/async-handler');
const httpOperations = require('../lib/http-operations');
const cronJobController = require('../lib/cronJobController1');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/', (req, res) => {
    res.status(200).json({ ok: true });
});

router.post(
    '/job-events',
    asyncHandler(async (req, res, next) => {
        req.setTimeout(20 * 60 * 1000);
        try {
            logger.info({ message: 'Received message', body: req.body.id || '' });
            const { id, url, clientData } = req.body;
            // console.log('Before:', { id, url, clientData });
            if (id && url && clientData && clientData.clientId === 'helios' && clientData.listeningAttribute === 'pdf-generator') {
                // TODO further Proccess from this when new event receive
                const responseData = await cronJobController.getJsonData(id);
                logger.info({ message: 'Response received in job-events' });
                await cronJobController.saveDataToMongo(responseData);
                // console.log('In job-events:', { id, url, clientData });
            }
            res.status(200).send({ ok: true });
            req.routeTimer({ statusCode: 200 });
            return next;
        } catch (error) {
            logger.error({
                message: 'Error occurred.',
                error: error.message,
                body: req.body,
                stack: error.stack,
            });
            req.routeTimer({ statusCode: 200 });
            res.status(200).send({ ok: true });
            return next;
        }
    })
);

router.post(
    '/',
    asyncHandler(async (req, res, next) => {
        try {
            const data = await httpOperations.makeHttpCall(req.body);
            logger.info({ message: 'Post request made successfully' });
            res.status(200).send(data);
            req.routeTimer({ statusCode: 200 });
            return next();
        } catch (error) {
            logger.error({
                message: 'Error occurred.',
                companyId: 'CompanyID',
                error: error.message,
            });
            req.routeTimer({ statusCode: 500 });
            return next(error);
        }
    }),
    performanceTimer
);

module.exports = router;
