const Sentry = require('@sentry/node');

const startPerformanceTimer = async (req, res, next) => {
    const sentryTransaction = Sentry.startTransaction({
        op: `${req.method} ${req.baseUrl}${req.path}`,
        name: `${req.method} ${req.baseUrl}${req.path}`,
    });
    req.sentryTransaction = sentryTransaction;
    return next();
};

module.exports = startPerformanceTimer;
