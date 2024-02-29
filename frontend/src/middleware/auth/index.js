const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
// const authorization = require('../../lib/token/index');

const client = jwksClient({
    jwksUri: process.env.AUTH0_JWKS_URI,
});
// eslint-disable-next-line consistent-return
const authmiddleware = (req, res, next) => {
    const authorizationHeader = req.headers.authorization;
    // console.log('Request Headers:', req.headers);
    // console.log('Request:', req);
    if (!authorizationHeader) {
        return res.json({
            success: false,
            message: 'Token Missing',
        });
    }

    const token = req.headers.authorization.split(' ')[1];
    // console.log('Received Token:', token);

    if (token === 'undefined' || token === null) {
        return res.json({
            success: false,
            message: 'Token Invalid',
        });
    }

    try {
        const decodeToken = jwt.decode(token, {
            complete: true,
        });
        // console.log('Decoded Token:', decodeToken);
        if (decodeToken === 'undefined' || decodeToken === null) {
            return res.json({
                success: false,
                message: 'Failed to decode token',
            });
        }
        client.getSigningKey(decodeToken.header.kid, (_err, key) => {
            const signingKey = key.getPublicKey();
            // console.log('Signing Key:', signingKey);
            if (signingKey !== null) {
                // eslint-disable-next-line consistent-return
                jwt.verify(token, signingKey, { algorithms: ['RS256'] }, (err, decoded) => {
                    if (err) {
                        if (err.name === 'TokenExpiredError') {
                            return res.json({
                                success: false,
                                message: 'Token expired',
                                expiredAt: err.expiredAt,
                            });
                        }
                        return res.json({
                            success: false,
                            message: 'Invalid Token',
                            error: err,
                        });
                    }
                    decodeToken.payload = decoded;
                    if (typeof decodeToken.payload.exp === 'undefined' || decodeToken.payload.exp * 1000 > new Date().getTime()) {
                        next();
                    } else {
                        return res.json({
                            success: false,
                            message: 'Token expired',
                        });
                    }
                });
            }
        });
    } catch (err) {
        return res.json({
            success: false,
            message: 'authentication failed',
            error: err.message,
        });
    }
};
module.exports = authmiddleware;
