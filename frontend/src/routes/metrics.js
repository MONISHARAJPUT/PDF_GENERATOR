const express = require('express');
const client = require('prom-client');

const router = express.Router();

router.get('/', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.status(200).send(await client.register.metrics());
});

module.exports = router;
