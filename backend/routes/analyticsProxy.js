/**
 * analyticsProxy.js
 *
 * Additive Express router — exposes the Python Analytics microservice
 * to the frontend via the monolith's existing API gateway.
 *
 * All routes are NEW (none of the existing routes are modified).
 * If the analytics microservice is unreachable, a clear 503 is returned
 * so the frontend can degrade gracefully.
 *
 * Mounted at: /api/microservices/analytics
 * Protected:  Bearer JWT (same auth middleware used elsewhere)
 */

const express        = require('express');
const { getJson }    = require('../utils/microserviceClient');
const { protect }    = require('../middlewares/authMiddleware');

const router = express.Router();

const ANALYTICS_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8002';
const ANALYTICS_KEY = process.env.ANALYTICS_SERVICE_API_KEY || 'autosphere-internal-analytics-key';

const _proxy = (path) => async (req, res) => {
  const qs      = new URLSearchParams(req.query).toString();
  const fullUrl = `${ANALYTICS_URL}${path}${qs ? '?' + qs : ''}`;

  const result = await getJson(fullUrl, ANALYTICS_KEY);

  if (result.success) {
    return res.json({ success: true, ...result.data });
  }

  const isDown = result.error?.includes('ECONNREFUSED') || result.error?.includes('timeout');
  const status = isDown ? 503 : 502;
  return res.status(status).json({
    success: false,
    message: isDown
      ? 'Analytics service is currently unavailable.'
      : 'Analytics service returned an error.',
    detail: result.error,
  });
};

// All routes require a valid JWT — admin-only check can be added per-route if needed
router.use(protect);

router.get('/health',   _proxy('/health'));
router.get('/overview', _proxy('/api/analytics/overview'));
router.get('/orders',   _proxy('/api/analytics/orders'));
router.get('/products', _proxy('/api/analytics/products'));
router.get('/users',    _proxy('/api/analytics/users'));
router.get('/revenue',  _proxy('/api/analytics/revenue'));

module.exports = router;
