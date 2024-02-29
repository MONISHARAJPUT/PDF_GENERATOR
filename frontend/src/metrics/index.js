const client = require('prom-client');

const METRICS_NAME_PREFIX = 'helios_starter_bff';

const routeHandlerHistogram = new client.Histogram({
    name: `${METRICS_NAME_PREFIX}_route_handler_histogram`,
    help: 'Histogram to track route times',
    labelNames: ['endpoint', 'statusCode'],
    buckets: [0.2, 0.5, 1, 2, 4, 7, 10, 15, 30],
});

const sentryUsageHistogram = new client.Histogram({
    name: `helios_sentry_usage_histogram`,
    help: 'Histogram to track sentry usage for sentry',
    labelNames: ['applicationName'],
    buckets: [1],
});

module.exports = {
    routeHandlerHistogram,
    sentryUsageHistogram,
};
