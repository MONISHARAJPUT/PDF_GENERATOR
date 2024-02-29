require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const Sentry = require('@sentry/node');

// const cron = require('node-cron');
const packageJson = require('../package.json');
const metrics = require('./metrics');
const logger = require('./utils/logger');

const routeTimerMiddleware = require('./middleware/route-timer');
const performanceTimer = require('./middleware/start-performance-timer');

const indexRouter = require('./routes/index');
const metricsRouter = require('./routes/metrics');
const { router: conversionRouter } = require('./routes/uploadRoute');
const contentRouter = require('./routes/contentRoute');

const serviceRouter = require('./routes/microserviceRoute');
const authTokenRoute = require('./routes/authTokenRoute');
const authorizeMiddleware = require('./middleware/auth/index1');
const { pdfCronJob } = require('./lib/pdfCronJobController');
const { setupCronJob } = require('./lib/cronJobController1');

const app = express();

Sentry.init({
    dsn: process.env.SENTRY_DSN_KEY,
    attachStacktrace: true,
    environment: process.env.APP_ENVIRONMENT,
    integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
    ],
    autoSessionTracking: false,
    tracesSampleRate: 0.1, // only sample 10% of all requests
    beforeSend: (event, hint) => {
        // If some events should be filtered out before sending to sentry, here is where you should edit it
        // return null, to filter the event out
        if (hint === 'dont_send') {
            return null;
        }
        metrics.sentryUsageHistogram.observe({ applicationName: packageJson.name }, 1);
        return event;
    },
});

app.use(Sentry.Handlers.requestHandler());

morgan.format('customFormat', (req, res) => {
    const requestBody = req.body;
    // Redact all sensitive information from logs. Authorization Tokens, etc
    if (requestBody['sensitive-information']) {
        requestBody['sensitive-information'] = 'REDACTED';
    }
    return JSON.stringify({
        method: req.method,
        body: requestBody,
        url: req.originalUrl || req.url,
        remoteAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        httpVersionMajor: req.httpVersionMajor,
        httpVersionMinor: req.httpVersionMinor,
        statusCode: res.statusCode,
        contentLength: res.getHeader('content-length'),
        referrer: req.headers.referer || req.headers.referrer,
        userAgent: req.headers['user-agent'],
    });
});

app.use(
    morgan(':customFormat', {
        stream: {
            write(log) {
                logger.debug(log);
            },
        },
        skip: (req, res) => {
            return res.statusCode < 400;
        },
    })
);

app.use(
    cors({
        origin: [
            '*',
            'http://localhost:4200', // Frontend URL
            'https://pdf-generator-dev.meltwater.io', // Development
            'https://helios-starter.solutions.meltwater.io', // Production
        ],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    })
);

// Required for parsing json bodies.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Attach route timer to all requests
app.use('*', routeTimerMiddleware, performanceTimer);

// Default route
app.use('/', indexRouter);
app.use('/metrics', metricsRouter);
// Route for generating PDF using Application
app.use('/api', authorizeMiddleware, conversionRouter);
// Route for generating PDF - microservice
app.use('/content', authorizeMiddleware, contentRouter);
app.use('/service', authorizeMiddleware, serviceRouter);
app.use('/tokenApi', authorizeMiddleware, authTokenRoute);

setupCronJob();
pdfCronJob();

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    logger.error({ message: 'Route failed', error: error.message });
    res.locals.message = error.message;
    res.locals.error = error;
    res.setHeader('X-Sentry-Id', res.sentry);
    res.status(error.status || 500).json({ error: error.message });
});

// 404 handler
app.use((req, res) => {
    res.status(404).send('Route not found');
});

module.exports = app;
