const express = require('express');

const { getVendorOptions } = require('../controllers/vendorsController');

const router = express.Router();

router.get('/', getVendorOptions);

module.exports = router;
