import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ChatNotificationBadge = () => {
  const { unreadCount } = useChat();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (!user) return;
    // Navigate to dedicated chat page for all roles
    navigate('/chat');
  };

  if (!user) return null;

  return (
    <button
      onClick={handleClick}
      className="relative text-sm font-medium text-text-secondary hover:text-primary-500 transition-colors duration-200 group"
      title="Chat Messages"
    >
      {/* Chat Message Icon instead of Bell */}
      <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-neon-red animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default ChatNotificationBadge;
