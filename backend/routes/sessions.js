const express = require('express');
const router = express.Router();
const {
  getSessions,
  revokeSession,
  revokeAllSessions,
  logout,
  updateActivity,
  getSessionStatus,
  trustSession,
} = require('../controllers/sessionController');
const { protect } = require('../middlewares/authMiddleware');

// All session routes require authentication
router.use(protect);

// Get all active sessions
router.get('/', getSessions);

// Get session status and time remaining
router.get('/status', getSessionStatus);

// Update session activity
router.post('/activity', updateActivity);

// Logout from current session
router.post('/logout', logout);

// Revoke all sessions except current
router.post('/revoke-all', revokeAllSessions);

// Revoke specific session
router.delete('/:sessionId', revokeSession);

// Trust a session
router.put('/:sessionId/trust', trustSession);

module.exports = router;
