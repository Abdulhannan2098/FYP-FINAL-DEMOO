import { useEffect } from 'react';
import { FiMessageCircle, FiArchive } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import OnlineStatus from './OnlineStatus';

const ConversationList = ({ conversations: conversationsProp, onSelectConversation, filter = 'all' }) => {
  const { user } = useAuth();
  const { conversations: conversationsFromContext, loadConversations, setActiveConversation, loading } = useChat();

  // Use prop conversations if provided, otherwise use context conversations
  const conversations = conversationsProp || conversationsFromContext;

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleConversationClick = (conversation) => {
    setActiveConversation(conversation);
    onSelectConversation?.(conversation);
  };

  // Filter and sort conversations based on type
  const filteredConversations = conversations
    .filter((conv) => {
      if (filter === 'archived') {
        return conv.status === 'archived';
      }
      if (filter === 'active') {
        return conv.status === 'active';
      }
      return true; // 'all'
    })
    .sort((a, b) => {
      // Sort by last message timestamp, newest first
      const aTime = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const bTime = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return bTime - aTime; // Descending order (newest first)
    });

  const getOtherParticipant = (conversation) => {
    return conversation.participants.find((p) => p.user._id !== user.id)?.user;
  };

  const getUnreadCount = (conversation) => {
    const myParticipant = conversation.participants.find((p) => p.user._id === user.id);
    return myParticipant?.unreadCount || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (filteredConversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FiMessageCircle className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500">No conversations yet</p>
        <p className="text-sm text-gray-400 mt-1">
          {filter === 'archived'
            ? 'Archived conversations will appear here'
            : 'Start chatting with vendors or customers'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredConversations.map((conversation) => {
        const otherUser = getOtherParticipant(conversation);
        const unreadCount = getUnreadCount(conversation);
        const isBlocked = conversation.status === 'blocked';
        const isArchived = conversation.status === 'archived';

        return (
          <div
            key={conversation._id}
            onClick={() => handleConversationClick(conversation)}
            className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all hover:shadow-md ${
              unreadCount > 0
                ? 'bg-primary-500/10 border-l-4 border-primary-500 shadow-lg shadow-primary-500/20 animate-pulse-subtle ring-2 ring-primary-500/30'
                : 'bg-surface border border-surface-light hover:bg-surface-light'
            } ${isBlocked ? 'opacity-50' : ''}`}
          >
            {/* Avatar with Online Status */}
            <div className="relative flex-shrink-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${
                unreadCount > 0
                  ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-gradient-to-br from-primary-800 to-primary-700 text-white'
              }`}>
                {otherUser?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1">
                <OnlineStatus userId={otherUser?._id} size="sm" />
              </div>
            </div>

            {/* Conversation Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className={`font-semibold truncate ${
                  unreadCount > 0 ? 'font-bold text-text-primary' : 'text-text-primary'
                }`}>
                  {otherUser?.name}
                </h4>
                {conversation.lastMessage?.timestamp && (
                  <span className={`text-xs flex-shrink-0 ${
                    unreadCount > 0 ? 'text-primary-500 font-semibold' : 'text-text-tertiary'
                  }`}>
                    {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>

              {/* Product Context */}
              {conversation.product && (
                <p className="text-xs text-primary-500 mb-1 truncate">
                  📦 {conversation.product.name}
                </p>
              )}

              {/* Last Message */}
              {conversation.lastMessage && (
                <p className={`text-sm truncate ${
                  unreadCount > 0 ? 'font-semibold text-text-primary' : 'text-text-secondary'
                }`}>
                  {conversation.lastMessage.sender === user.id && 'You: '}
                  {conversation.lastMessage.contentType === 'image' && '📷 Image'}
                  {conversation.lastMessage.contentType === 'file' && '📎 File'}
                  {conversation.lastMessage.contentType === 'text' && conversation.lastMessage.content}
                  {conversation.lastMessage.contentType === 'system' && '🔔 ' + conversation.lastMessage.content}
                </p>
              )}

              {/* Status Badges */}
              <div className="flex items-center gap-2 mt-2">
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-primary-500 text-white text-xs font-semibold rounded-full shadow-neon-red animate-pulse">
                    {unreadCount} new
                  </span>
                )}
                {isArchived && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-900/30 border border-yellow-600 text-yellow-400 text-xs rounded-full">
                    <FiArchive className="w-3 h-3" />
                    Archived
                  </span>
                )}
                {isBlocked && (
                  <span className="px-2 py-0.5 bg-red-900/30 border border-red-600 text-red-400 text-xs rounded-full">
                    Blocked
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.01);
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};

export default ConversationList;
