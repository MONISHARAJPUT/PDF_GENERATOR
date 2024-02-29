const authorization = require('../../lib/authorization');
const logger = require('../../utils/logger');

const authorizeJWTMiddleware = async (req, res, next) => {
    try {
        if (!req.headers.authorization) {
            return res.json({ message: 'No Authorization token passed', statusCode: 403 });
            // return next(new Error({ message: 'No Authorization token passed', statusCode: 403 }));
        }
        const payload = await authorization.verifyJWT(req.headers.authorization);
        req.userId = payload.sub;
        req.orgId = payload.org_id;
        return next();
    } catch (error) {
        logger.error({ message: 'Could not validate JWT', error: error.message, headers: req.headers, body: req.body, url: req.originalUrl });
        return res.json({ message: 'Invalid JWT', statusCode: 403 });
        // return next(new Error({ message: 'Invalid JWT', statusCode: 403 }));
    }
};

module.exports = authorizeJWTMiddleware;
