import { useEffect, useState } from 'react';
import { FiX, FiMinimize2, FiMaximize2, FiMoreVertical, FiAlertCircle, FiTrash2 } from 'react-icons/fi';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import OnlineStatus from './OnlineStatus';

const ChatWindow = ({ isOpen, onClose, readOnly = false, inline = false }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();
  const {
    activeConversation,
    messages,
    loadMessages,
    typingUsers,
    blockConversation,
    unblockConversation,
    deleteConversation,
    deleteMessage,
  } = useChat();
  const { joinConversation, leaveConversation } = useSocket();

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation._id);
      joinConversation(activeConversation._id);

      return () => {
        leaveConversation(activeConversation._id);
      };
    }
  }, [activeConversation, loadMessages, joinConversation, leaveConversation]);

  if (!isOpen || !activeConversation) return null;

  const otherParticipant = activeConversation.participants.find(
    (p) => p.user._id !== user.id
  );
  const recipientUser = otherParticipant?.user;
  const isBlocked = activeConversation.status === 'blocked';

  // Get typing users for this conversation (excluding self)
  const currentTypingUsers = Object.entries(typingUsers || {})
    .filter(([userId]) => userId !== user.id)
    .map(([_, userName]) => userName);

  const handleBlock = async () => {
    // Capture the current status BEFORE showing confirm dialog
    // This prevents race conditions where socket events change status during confirmation
    const currentlyBlocked = activeConversation.status === 'blocked';

    if (currentlyBlocked) {
      // Unblock conversation
      if (window.confirm('Unblock this conversation? This will allow participants to send messages again.')) {
        await unblockConversation(activeConversation._id);
        setShowMenu(false);
      }
    } else {
      // Block conversation
      if (window.confirm('Block this conversation? This will prevent further messages from both participants.')) {
        await blockConversation(activeConversation._id, 'Blocked by administrator');
        setShowMenu(false);
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this entire conversation? This action cannot be undone and will delete all messages.')) {
      await deleteConversation(activeConversation._id);
      setShowMenu(false);
      onClose();
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Delete this message?')) {
      await deleteMessage(messageId);
    }
  };

  // Inline mode for dedicated chat page
  if (inline) {
    return (
      <div className="flex flex-col h-full bg-surface">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-light bg-surface-light">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-lg">
                {recipientUser?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1">
                <OnlineStatus userId={recipientUser?._id} size="sm" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-text-primary truncate">{recipientUser?.name}</h3>
              {activeConversation.context?.product && (
                <p className="text-sm text-text-secondary truncate flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {activeConversation.context.product.name}
                </p>
              )}
            </div>
          </div>

          {/* Admin Actions for inline mode */}
          {readOnly && user.role === 'admin' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBlock}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  isBlocked
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                title={isBlocked ? 'Unblock this conversation' : 'Block this conversation'}
              >
                <FiAlertCircle className="w-4 h-4" />
                {isBlocked ? 'Unblock' : 'Block'}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                title="Delete this conversation"
              >
                <FiTrash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}

          {/* Close button for inline mode */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-lighter rounded-lg transition-colors"
              title="Close chat"
            >
              <FiX className="w-5 h-5 text-text-secondary" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <MessageList
            messages={messages}
            conversationId={activeConversation._id}
            typingUsers={currentTypingUsers}
            onDeleteMessage={readOnly ? undefined : handleDeleteMessage}
            readOnly={readOnly}
          />
        </div>

        {/* Blocked Banner - Shows for all users when conversation is blocked */}
        {isBlocked && (
          <div className="p-6 border-t border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/10">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <FiAlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-red-600 mb-1">Conversation Blocked</h4>
                <p className="text-sm text-text-secondary max-w-md">
                  This conversation has been blocked by an administrator. You can view previous messages but cannot send new messages.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Admin Read-Only Notice */}
        {!isBlocked && readOnly && (
          <div className="p-4 border-t border-surface-light bg-surface-light/50">
            <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="font-medium">Monitoring Mode</span>
              <span className="text-text-tertiary">•</span>
              <span>You are viewing this conversation in read-only mode</span>
            </div>
          </div>
        )}

        {/* Message Input - Only show if NOT blocked and NOT read-only */}
        {!isBlocked && !readOnly && (
          <MessageInput
            conversationId={activeConversation._id}
            recipientId={recipientUser?._id}
          />
        )}
      </div>
    );
  }

  // Modal mode for dashboards
  return (
    <>
      {/* Overlay - Semi-transparent, clickable to minimize */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={(e) => {
          // Allow clicking on background - just minimize instead of close
          e.stopPropagation();
          setIsMinimized(true);
        }}
        style={{ pointerEvents: isMinimized ? 'none' : 'auto' }}
      />

      {/* Chat Window */}
      <div
        className={`fixed bottom-0 right-4 z-50 bg-surface border-l border-t border-surface-light rounded-t-xl shadow-2xl transition-all duration-300 ${
          isMinimized ? 'h-16' : 'h-[600px]'
        } w-full max-w-md flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-t-xl">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Recipient Info */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative">
                <div className="w-10 h-10 bg-white text-primary-600 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                  {recipientUser?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <OnlineStatus userId={recipientUser?._id} size="sm" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{recipientUser?.name}</h3>
                {activeConversation.context?.product && (
                  <p className="text-xs text-primary-100 truncate flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    {activeConversation.context.product.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* More Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
                title="More options"
              >
                <FiMoreVertical className="w-5 h-5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-12 bg-surface border border-surface-light rounded-xl shadow-2xl py-2 min-w-[180px] z-10">
                  {user.role === 'admin' && (
                    <button
                      onClick={handleBlock}
                      className="w-full px-4 py-2 text-left hover:bg-red-500/10 flex items-center gap-2 text-red-600 transition-colors"
                    >
                      <FiAlertCircle className="w-4 h-4" />
                      {isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  )}
                  {/* Allow all users to delete conversations */}
                  <button
                    onClick={handleDelete}
                    className={`w-full px-4 py-2 text-left hover:bg-red-500/10 flex items-center gap-2 text-red-600 transition-colors ${user.role === 'admin' ? 'border-t border-surface-light' : ''}`}
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Delete Conversation
                  </button>
                </div>
              )}
            </div>

            {/* Minimize/Maximize */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-primary-500/20 rounded-lg transition-colors"
              title={isMinimized ? 'Maximize' : 'Minimize'}
            >
              {isMinimized ? (
                <FiMaximize2 className="w-5 h-5" />
              ) : (
                <FiMinimize2 className="w-5 h-5" />
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
              title="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <MessageList
                messages={messages}
                conversationId={activeConversation._id}
                typingUsers={currentTypingUsers}
                onDeleteMessage={handleDeleteMessage}
                readOnly={readOnly}
              />
            </div>

            {/* Blocked Banner - Shows for all users when conversation is blocked */}
            {isBlocked && (
              <div className="p-6 border-t border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/10">
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                    <FiAlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-red-600 mb-1">Conversation Blocked</h4>
                    <p className="text-sm text-text-secondary max-w-md">
                      This conversation has been blocked by an administrator. You can view previous messages but cannot send new messages.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Read-Only Notice */}
            {!isBlocked && readOnly && (
              <div className="p-4 border-t border-surface-light bg-surface-light/50">
                <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="font-medium">Monitoring Mode</span>
                  <span className="text-text-tertiary">•</span>
                  <span>You are viewing this conversation in read-only mode</span>
                </div>
              </div>
            )}

            {/* Message Input - Only show if NOT blocked and NOT read-only */}
            {!isBlocked && !readOnly && (
              <MessageInput
                conversationId={activeConversation._id}
                recipientId={recipientUser?._id}
              />
            )}
          </>
        )}
      </div>
    </>
  );
};

export default ChatWindow;
