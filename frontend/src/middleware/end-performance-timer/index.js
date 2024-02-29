const endPerformanceTimer = async (req) => {
    req.sentryTransaction.finish();
};

module.exports = endPerformanceTimer;
