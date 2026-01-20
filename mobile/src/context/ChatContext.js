import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import * as chatApi from '../api/chatService';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const { socket, isConnected } = useSocket();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const messagesEndRef = useRef(null);

  // Load conversations when authenticated (only after auth check is complete)
  useEffect(() => {
    // Wait for auth check to complete before fetching
    // This prevents 401 errors during app launch
    if (authLoading) return;

    if (isAuthenticated && user) {
      loadConversations();
      loadNotifications();
    } else {
      // Clear state when logged out
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, user, authLoading]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // New message received
    const handleNewMessage = (data) => {
      // Handle both wrapped and unwrapped message formats from backend
      const messageData = data.message || data;
      const conversationId = data.conversationId || messageData.conversation;

      console.log('📩 New message received:', messageData._id);

      // Check if this is our own message (server confirmation of optimistic update)
      const isOwnMessage = messageData.sender?._id === user._id ||
                          messageData.sender === user._id;

      // Add/update message if it's for the active conversation
      if (activeConversation && conversationId === activeConversation._id) {
        setMessages((prev) => {
          // If this is our own message, replace the optimistic message with server version
          if (isOwnMessage) {
            // Find and replace any temp message with matching content
            const hasTemp = prev.some(msg => msg._id?.startsWith('temp-'));
            if (hasTemp) {
              // Replace the first matching temp message
              let replaced = false;
              return prev.map((msg) => {
                if (!replaced && msg._id?.startsWith('temp-') &&
                    msg.content?.text === messageData.content?.text) {
                  replaced = true;
                  return { ...messageData, status: 'sent' };
                }
                return msg;
              });
            }
          }

          // Check if message already exists (prevent duplicates)
          const exists = prev.some(msg => msg._id === messageData._id);
          if (exists) {
            // Update existing message status
            return prev.map(msg =>
              msg._id === messageData._id
                ? { ...messageData, status: messageData.status || 'sent' }
                : msg
            );
          }

          // Add new message
          return [...prev, { ...messageData, status: messageData.status || 'sent' }];
        });
      }

      // Update conversation list with last message
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId
            ? {
                ...conv,
                lastMessage: {
                  sender: messageData.sender,
                  text: messageData.content?.text || '',
                  timestamp: messageData.createdAt,
                  type: messageData.content?.type || 'text',
                },
                updatedAt: messageData.createdAt,
              }
            : conv
        )
      );

      // Increment unread count only for messages from others and not in active conversation
      if (!isOwnMessage) {
        const isActiveConv = activeConversation && conversationId === activeConversation._id;
        if (!isActiveConv) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    };

    // User typing
    const handleUserTyping = ({ userId, conversationId }) => {
      if (activeConversation && conversationId === activeConversation._id) {
        setTypingUsers((prev) => ({ ...prev, [userId]: true }));
      }
    };

    // User stopped typing
    const handleUserStopTyping = ({ userId, conversationId }) => {
      if (activeConversation && conversationId === activeConversation._id) {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }
    };

    // Message read receipt - only update status to 'read' if someone else read our message
    const handleMessageRead = ({ messageId, readBy: readByUserId }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id !== messageId) return msg;

          // Safety check: Only mark as 'read' if the reader is NOT the sender
          // This prevents our own messages from showing as "read" prematurely
          const senderId = msg.sender?._id || msg.sender;
          const shouldMarkAsRead = senderId === user._id && readByUserId !== user._id;

          return {
            ...msg,
            readBy: [...(msg.readBy || []), { user: readByUserId, readAt: new Date() }],
            status: shouldMarkAsRead ? 'read' : msg.status,
          };
        })
      );
    };

    // Conversation blocked
    const handleConversationBlocked = ({ conversationId }) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId ? { ...conv, status: 'blocked' } : conv
        )
      );

      if (activeConversation && activeConversation._id === conversationId) {
        setActiveConversation((prev) => ({ ...prev, status: 'blocked' }));
      }
    };

    // Conversation unblocked
    const handleConversationUnblocked = ({ conversationId }) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId ? { ...conv, status: 'active' } : conv
        )
      );

      if (activeConversation && activeConversation._id === conversationId) {
        setActiveConversation((prev) => ({ ...prev, status: 'active' }));
      }
    };

    // Message deleted
    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    // New notification
    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    // Register event listeners
    socket.on('message:new', handleNewMessage);
    socket.on('user:typing', handleUserTyping);
    socket.on('user:stop-typing', handleUserStopTyping);
    socket.on('message:read-receipt', handleMessageRead);
    socket.on('conversation:blocked', handleConversationBlocked);
    socket.on('conversation:unblocked', handleConversationUnblocked);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('notification:new', handleNewNotification);

    // Cleanup
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('user:typing', handleUserTyping);
      socket.off('user:stop-typing', handleUserStopTyping);
      socket.off('message:read-receipt', handleMessageRead);
      socket.off('conversation:blocked', handleConversationBlocked);
      socket.off('conversation:unblocked', handleConversationUnblocked);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, isConnected, activeConversation, user]);

  // Helper function to check if a conversation has unread messages for the current user
  const isConversationUnread = (conv, currentUserId) => {
    if (!conv.lastMessage) return false;

    // Get the sender of the last message
    const lastMessageSenderId = conv.lastMessage.sender?._id || conv.lastMessage.sender;

    // If the current user sent the last message, it's not unread for them
    if (lastMessageSenderId === currentUserId) return false;

    // Check if last message time is after the user's last read time
    const participant = conv.participants.find(
      (p) => (p.user?._id || p.user) === currentUserId
    );
    const lastMessageTime = new Date(conv.lastMessage?.timestamp || 0);
    const lastReadTime = new Date(participant?.lastReadAt || 0);

    return lastMessageTime > lastReadTime;
  };

  // Load all conversations
  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await chatApi.getConversations();
      const nextConversations = data.data || [];
      setConversations(nextConversations);

      // Calculate unread count - only count if last message was NOT sent by current user
      const unread = nextConversations.reduce((acc, conv) => {
        return isConversationUnread(conv, user._id) ? acc + 1 : acc;
      }, 0);
      setUnreadCount(unread);

      return nextConversations;
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load messages for a conversation
  const loadMessages = async (conversationId) => {
    try {
      setMessagesLoading(true);
      const data = await chatApi.getMessages(conversationId);
      const loadedMessages = (data.data || []).map(msg => ({
        ...msg,
        status: msg.status || 'sent'
      }));
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Mark a conversation as read (update local state and emit socket event)
  const markConversationAsRead = useCallback((conversationId) => {
    if (!socket || !isConnected || !user) return;

    // Emit socket event to mark all messages as read
    socket.emit('conversation:mark-read', conversationId);

    // Update local conversation state and recalculate unread count
    setConversations((prev) => {
      const updated = prev.map((conv) =>
        conv._id === conversationId
          ? {
              ...conv,
              participants: conv.participants.map((p) =>
                (p.user?._id || p.user) === user._id
                  ? { ...p, lastReadAt: new Date().toISOString() }
                  : p
              ),
            }
          : conv
      );

      // Recalculate unread count using the helper function
      const newUnread = updated.reduce((acc, conv) => {
        return isConversationUnread(conv, user._id) ? acc + 1 : acc;
      }, 0);
      setUnreadCount(newUnread);

      return updated;
    });
  }, [socket, isConnected, user]);

  // Mark a single message as read
  const markMessageAsRead = useCallback((messageId, conversationId) => {
    if (!socket || !isConnected) return;

    socket.emit('message:read', { messageId, conversationId });
  }, [socket, isConnected]);

  // Create or get conversation
  const createOrGetConversation = async (productId, vendorId) => {
    try {
      setLoading(true);
      const data = await chatApi.createConversation({ productId, vendorId });
      const conversation = data.data;

      // Add to conversations list if not exists
      setConversations((prev) => {
        const exists = prev.find((c) => c._id === conversation._id);
        return exists ? prev : [conversation, ...prev];
      });

      return conversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Send message via socket
  const sendMessage = useCallback(
    (conversationId, text, type = 'text', fileData = null) => {
      if (!socket || !isConnected) {
        console.warn('Cannot send message: Socket not connected');
        return;
      }

      const messageData = {
        conversationId,
        text,
        type,
        fileData,
      };

      socket.emit('message:send', messageData);

      // Optimistically add message to UI
      const optimisticMessage = {
        _id: `temp-${Date.now()}`,
        conversation: conversationId,
        sender: { _id: user._id, name: user.name },
        senderRole: user.role,
        content: { text, type, fileData },
        status: 'sending',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);
    },
    [socket, isConnected, user]
  );

  // Archive conversation
  const archiveConversation = async (conversationId) => {
    try {
      await chatApi.archiveConversation(conversationId);
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId ? { ...conv, status: 'archived' } : conv
        )
      );
    } catch (error) {
      console.error('Failed to archive conversation:', error);
      throw error;
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId) => {
    try {
      await chatApi.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((conv) => conv._id !== conversationId));

      if (activeConversation && activeConversation._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    try {
      await chatApi.deleteMessage(messageId);
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    try {
      const data = await chatApi.getNotifications();
      setNotifications(data.data || []);
      const unreadNotifications = (data.data || []).filter((n) => !n.read).length;
      setUnreadCount(unreadNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  // Mark notification as read
  const markNotificationRead = async (notificationId) => {
    try {
      await chatApi.markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsRead = async () => {
    try {
      await chatApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Wrapper to check if conversation is unread for the current user
  const checkConversationUnread = useCallback((conv) => {
    return isConversationUnread(conv, user?._id);
  }, [user]);

  const value = {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    notifications,
    unreadCount,
    typingUsers,
    loading,
    messagesLoading,
    loadConversations,
    loadMessages,
    createOrGetConversation,
    sendMessage,
    archiveConversation,
    deleteConversation,
    deleteMessage,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    markConversationAsRead,
    markMessageAsRead,
    checkConversationUnread,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
