const Session = require('../models/Session');
const { formatSessionDisplay } = require('../utils/sessionHelper');

// @desc    Get all active sessions for current user
// @route   GET /api/sessions
// @access  Private
exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({
      user: req.user.id,
      isActive: true,
    }).sort({ lastActivity: -1 });

    // Format sessions for display
    const formattedSessions = sessions.map(session => {
      const formatted = formatSessionDisplay(session);
      // Mark current session
      if (session.token === req.token) {
        formatted.isCurrent = true;
      }
      return formatted;
    });

    res.status(200).json({
      success: true,
      data: {
        sessions: formattedSessions,
        total: formattedSessions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke a specific session
// @route   DELETE /api/sessions/:sessionId
// @access  Private
exports.revokeSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.sessionId,
      user: req.user.id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if trying to revoke current session
    if (session.token === req.token) {
      return res.status(400).json({
        success: false,
        message: 'Cannot revoke current session. Use logout instead.',
      });
    }

    // Revoke the session
    await session.revoke();

    res.status(200).json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke all sessions except current
// @route   POST /api/sessions/revoke-all
// @access  Private
exports.revokeAllSessions = async (req, res, next) => {
  try {
    const result = await Session.revokeAllExcept(req.user.id, req.token);

    res.status(200).json({
      success: true,
      message: `Revoked ${result.modifiedCount} session(s) successfully`,
      data: {
        revokedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout from current session
// @route   POST /api/sessions/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      user: req.user.id,
      token: req.token,
      isActive: true,
    });

    if (session) {
      await session.revoke();
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update session activity (called periodically by frontend)
// @route   POST /api/sessions/activity
// @access  Private
exports.updateActivity = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      user: req.user.id,
      token: req.token,
      isActive: true,
    });

    if (session) {
      await session.updateActivity();
    }

    res.status(200).json({
      success: true,
      message: 'Activity updated',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get session status and time remaining
// @route   GET /api/sessions/status
// @access  Private
exports.getSessionStatus = async (req, res, next) => {
  try {
    const session = req.session;

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    const inactivityMs = session.inactivityTimeout * 60 * 1000;
    const timeSinceActivity = Date.now() - new Date(session.lastActivity).getTime();
    const timeRemaining = Math.max(0, inactivityMs - timeSinceActivity);
    const minutesRemaining = Math.floor(timeRemaining / 60000);
    const secondsRemaining = Math.floor((timeRemaining % 60000) / 1000);

    res.status(200).json({
      success: true,
      data: {
        isActive: session.isActive,
        lastActivity: session.lastActivity,
        inactivityTimeout: session.inactivityTimeout,
        timeRemaining: {
          total: timeRemaining,
          minutes: minutesRemaining,
          seconds: secondsRemaining,
        },
        willExpireAt: new Date(new Date(session.lastActivity).getTime() + inactivityMs),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark session as trusted
// @route   PUT /api/sessions/:sessionId/trust
// @access  Private
exports.trustSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.sessionId,
      user: req.user.id,
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    session.isTrusted = true;
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Session marked as trusted',
    });
  } catch (error) {
    next(error);
  }
};
