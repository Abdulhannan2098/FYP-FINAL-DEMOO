import { useEffect, useRef, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { FiCheck, FiCheckCircle, FiDownload, FiTrash2, FiArrowDown } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import TypingIndicator from './TypingIndicator';

const MessageList = ({ messages, conversationId, typingUsers = [], onDeleteMessage, readOnly = false }) => {
  const { user } = useAuth();
  const { markMessageAsRead } = useSocket();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousMessageCount = useRef(messages.length);

  // Smart auto-scroll: only scroll if user is at bottom or sent a message
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    const isNewMessage = messages.length > previousMessageCount.current;
    const lastMessage = messages[messages.length - 1];
    const isOwnMessage = lastMessage?.sender?._id === user.id;

    // Auto-scroll only if:
    // 1. User sent the message (always scroll for own messages)
    // 2. User is already at the bottom (not scrolling up to read history)
    // 3. It's the initial load (previousMessageCount is 0)
    if (isNewMessage && (isOwnMessage || isAtBottom || previousMessageCount.current === 0)) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      setShowScrollButton(false);
      setUnreadCount(0);
    } else if (isNewMessage && !isAtBottom) {
      // Show scroll-to-bottom button for new messages when user is scrolled up
      setShowScrollButton(true);
      setUnreadCount(prev => prev + 1);
    }

    previousMessageCount.current = messages.length;
  }, [messages, user.id]);

  // Handle scroll to detect if user is scrolling up
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isAtBottom) {
      setShowScrollButton(false);
      setUnreadCount(0);
    } else if (messages.length > 0) {
      setShowScrollButton(true);
    }
  };

  // Scroll to bottom button handler
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
    setUnreadCount(0);
  };

  // Mark messages as read when they come into view
  useEffect(() => {
    // Don't mark as read in read-only mode (admin monitoring)
    if (!messages.length || readOnly) return;

    const unreadMessages = messages.filter(
      (msg) => msg.sender._id !== user.id && !msg.readBy.includes(user.id)
    );

    unreadMessages.forEach((msg) => {
      // Only mark as read if message and messageId exist
      if (msg && msg._id) {
        markMessageAsRead(conversationId, msg._id);
      }
    });
  }, [messages, conversationId, user.id, markMessageAsRead, readOnly]);

  const formatMessageTime = (date) => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) {
      return format(messageDate, 'h:mm a');
    } else if (isYesterday(messageDate)) {
      return `Yesterday ${format(messageDate, 'h:mm a')}`;
    } else {
      return format(messageDate, 'MMM d, h:mm a');
    }
  };

  const renderMessageContent = (message) => {
    // Handle nested content object structure from backend
    const contentType = message.content?.type || message.contentType || 'text';
    const contentText = message.content?.text || message.content;
    const fileUrl = message.content?.fileUrl;
    
    switch (contentType) {
      case 'image':
        return (
          <div className="max-w-xs">
            <img
              src={fileUrl || contentText}
              alt="Shared image"
              className="rounded-lg w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(fileUrl || contentText, '_blank')}
            />
          </div>
        );

      case 'file':
        return (
          <a
            href={fileUrl || contentText}
            download
            className="flex items-center gap-2 px-4 py-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
          >
            <FiDownload className="w-5 h-5" />
            <span className="text-sm">{message.content?.fileName || (fileUrl || contentText).split('/').pop()}</span>
          </a>
        );

      case 'system':
        return (
          <div className="text-center w-full">
            <p className="inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm">
              {contentText}
            </p>
          </div>
        );

      default:
        return (
          <p className="whitespace-pre-wrap break-words">{contentText}</p>
        );
    }
  };

  const renderReadReceipt = (message) => {
    if (message.sender._id !== user.id) return null;

    const isRead = message.readBy.length > 1; // More than just the sender

    return (
      <div className="flex items-center gap-1 text-xs mt-1">
        {isRead ? (
          <FiCheckCircle className="w-3 h-3 text-blue-500" title="Read" />
        ) : (
          <FiCheck className="w-3 h-3 text-gray-400" title="Sent" />
        )}
      </div>
    );
  };

  if (messages.length === 0 && typingUsers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-gray-500 mb-2">No messages yet</p>
          <p className="text-sm text-gray-400">Start the conversation by sending a message</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col">
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-surface-light/30 to-surface/50"
        style={{ scrollbarWidth: 'thin' }}
      >
      {messages.map((message) => {
        const isOwnMessage = message.sender._id === user.id;
        const isSystemMessage = message.contentType === 'system';

        // For admin view: determine if sender is customer or vendor
        const senderRole = message.sender?.role || message.senderRole;
        const isCustomer = senderRole === 'customer';
        const isVendor = senderRole === 'vendor';

        if (isSystemMessage) {
          return (
            <div key={message._id} className="flex justify-center my-4">
              {renderMessageContent(message)}
            </div>
          );
        }

        // For admin viewing: show customer on left (blue), vendor on right (green)
        const alignRight = readOnly ? isVendor : isOwnMessage;
        const alignLeft = readOnly ? isCustomer : !isOwnMessage;

        return (
          <div
            key={message._id}
            className={`flex ${alignRight ? 'justify-end' : 'justify-start'} group`}
          >
            <div className={`max-w-[70%] ${alignRight ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              {/* Sender Name with Role Badge */}
              {(readOnly || !isOwnMessage) && (
                <div className="flex items-center gap-2 px-3">
                  <span className="text-xs font-medium text-text-primary">
                    {message.sender.name}
                  </span>
                  {readOnly && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isCustomer
                        ? 'bg-blue-900/30 border border-blue-600 text-blue-400'
                        : isVendor
                        ? 'bg-green-900/30 border border-green-600 text-green-400'
                        : 'bg-gray-900/30 border border-gray-600 text-gray-400'
                    }`}>
                      {isCustomer ? 'Customer' : isVendor ? 'Vendor' : 'User'}
                    </span>
                  )}
                </div>
              )}

              {/* Message Bubble with Role-Based Colors for Admin */}
              <div
                className={`relative px-4 py-3 rounded-2xl shadow-md ${
                  readOnly
                    ? isCustomer
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-bl-sm shadow-blue-500/20'
                      : isVendor
                      ? 'bg-gradient-to-br from-green-600 to-green-700 text-white rounded-br-sm shadow-green-500/20'
                      : 'bg-gradient-to-br from-gray-600 to-gray-700 text-white rounded-sm shadow-gray-500/20'
                    : isOwnMessage
                    ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-br-sm shadow-primary-500/20'
                    : 'bg-surface text-text-primary border border-surface-light rounded-bl-sm'
                }`}
              >
                {renderMessageContent(message)}

                {/* Message Actions (delete) - show on hover - NOT for admin */}
                {!readOnly && isOwnMessage && message.contentType !== 'system' && (
                  <button
                    onClick={() => onDeleteMessage?.(message._id)}
                    className="absolute -left-8 top-1/2 -translate-y-1/2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Delete message"
                  >
                    <FiTrash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Timestamp and Read Receipt */}
              <div className={`flex items-center gap-2 px-3 ${alignRight ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="text-xs text-text-tertiary">
                  {formatMessageTime(message.createdAt)}
                </span>
                {!readOnly && renderReadReceipt(message)}
                {message.edited && (
                  <span className="text-xs text-text-tertiary italic">(edited)</span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="flex justify-start">
          <TypingIndicator users={typingUsers} />
        </div>
      )}

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>

    {/* Scroll to Bottom Button with Unread Count */}
    {showScrollButton && (
      <button
        onClick={scrollToBottom}
        className="absolute bottom-6 right-6 p-3 bg-primary-600 text-white rounded-full shadow-2xl shadow-primary-500/30 hover:bg-primary-700 hover:scale-110 transition-all duration-200 z-10 animate-bounce"
        title="Scroll to bottom"
      >
        <FiArrowDown className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    )}
  </div>
  );
};

export default MessageList;
