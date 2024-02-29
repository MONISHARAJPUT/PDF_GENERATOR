const { routeHandlerHistogram } = require('../../metrics');

const routeTimerMiddleware = async (req, res, next) => {
    req.routeTimer = routeHandlerHistogram.startTimer({
        endpoint: `${req.method} ${req.baseUrl}${req.path}`,
    });
    return next();
};

module.exports = routeTimerMiddleware;
