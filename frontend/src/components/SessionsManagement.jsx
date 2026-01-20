import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const SessionsManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const { showToast } = useToast();

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sessions');
      setSessions(response.data.data.sessions);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to load sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = async (sessionId) => {
    if (!confirm('Are you sure you want to revoke this session? This will log out that device.')) {
      return;
    }

    try {
      setActionLoading(sessionId);
      await api.delete(`/sessions/${sessionId}`);
      showToast('Session revoked successfully', 'success');
      fetchSessions();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to revoke session', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('Are you sure you want to log out all other devices? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading('all');
      const response = await api.post('/sessions/revoke-all');
      showToast(response.data.message, 'success');
      fetchSessions();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to revoke sessions', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTrustSession = async (sessionId) => {
    try {
      await api.put(`/sessions/${sessionId}/trust`);
      showToast('Session marked as trusted', 'success');
      fetchSessions();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to trust session', 'error');
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'Mobile':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'Tablet':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="spinner-large"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="heading-2">Active Sessions</h2>
          <p className="text-body mt-1">
            Manage devices where you're currently logged in
          </p>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAllSessions}
            disabled={actionLoading === 'all'}
            className="btn-outline"
          >
            {actionLoading === 'all' ? (
              <span className="flex items-center gap-2">
                <span className="spinner"></span>
                Logging Out...
              </span>
            ) : (
              'Log Out All Others'
            )}
          </button>
        )}
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="bg-surface rounded-lg border border-surface-light p-8 text-center">
            <svg
              className="w-16 h-16 mx-auto text-text-tertiary mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <p className="text-text-secondary">No active sessions found</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`bg-surface rounded-lg border ${
                session.isCurrent ? 'border-primary-500' : 'border-surface-light'
              } p-6 transition-all hover:shadow-card`}
            >
              <div className="flex items-start gap-4">
                {/* Device Icon */}
                <div
                  className={`p-3 rounded-lg ${
                    session.isCurrent
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'bg-secondary-700 text-text-secondary'
                  }`}
                >
                  {getDeviceIcon(session.deviceType)}
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-text-primary">
                      {session.deviceName}
                    </h3>
                    {session.isCurrent && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-primary-500/20 text-primary-400 rounded-full">
                        This Device
                      </span>
                    )}
                    {session.isTrusted && !session.isCurrent && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded-full">
                        Trusted
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-text-secondary">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>{session.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>Last active {session.lastActive}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Signed in {session.loginDate}</span>
                    </div>
                    {session.ipAddress !== 'Unknown' && (
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                          />
                        </svg>
                        <span>{session.ipAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!session.isCurrent && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={actionLoading === session.id}
                      className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      {actionLoading === session.id ? (
                        <span className="flex items-center gap-2">
                          <span className="spinner-sm"></span>
                          Revoking...
                        </span>
                      ) : (
                        'Revoke'
                      )}
                    </button>
                    {!session.isTrusted && (
                      <button
                        onClick={() => handleTrustSession(session.id)}
                        className="px-4 py-2 text-sm font-medium text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded-lg transition-colors"
                      >
                        Trust
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Security Tips */}
      <div className="bg-surface rounded-lg border border-surface-light p-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <div className="text-sm text-text-secondary">
            <p className="font-semibold text-text-primary mb-2">Security Tips</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>If you see a session you don't recognize, revoke it immediately</li>
              <li>Mark trusted devices to identify them easily later</li>
              <li>Regularly review your active sessions for security</li>
              <li>Sessions automatically expire after 7 days of inactivity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionsManagement;
