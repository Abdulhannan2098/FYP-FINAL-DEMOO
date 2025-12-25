import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import * as chatApi from '../services/chatApi';

const ChatContext = createContext(null);

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

  const { socket, isConnected, markConversationAsRead } = useSocket();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Use refs to avoid socket listener re-creation on state changes
  const activeConversationRef = useRef(activeConversation);
  const userRef = useRef(user);

  // Keep refs in sync with state
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ==================== LOAD CONVERSATIONS ====================
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Load all conversations (active, blocked, archived)
      const response = await chatApi.getMyConversations();
      setConversations(response.data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      showToast('Failed to load conversations', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  // ==================== LOAD MESSAGES ====================
  const loadMessages = useCallback(async (conversationId) => {
    try {
      setLoading(true);
      const response = await chatApi.getMessages(conversationId);
      setMessages(response.data || []);
      
      // Mark conversation as read
      if (socket && isConnected) {
        markConversationAsRead(conversationId);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      showToast('Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  }, [socket, isConnected, markConversationAsRead, showToast]);

  // ==================== CREATE OR GET CONVERSATION ====================
  const createOrGetConversation = useCallback(async (productId, vendorId) => {
    try {
      const response = await chatApi.createOrGetConversation(productId, vendorId);
      const conversation = response.data;
      
      // Add to conversations list if not already there
      setConversations(prev => {
        const exists = prev.find(c => c._id === conversation._id);
        if (exists) return prev;
        return [conversation, ...prev];
      });
      
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      showToast('Failed to create conversation', 'error');
      throw error;
    }
  }, [showToast]);

  // ==================== SEND MESSAGE ====================
  const sendMessage = useCallback((conversationId, text, type = 'text', fileData = null) => {
    if (!socket || !isConnected) {
      showToast('Not connected to chat server', 'error');
      return;
    }

    const messageData = {
      conversationId,
      text,
      type,
      ...(fileData && { fileData })
    };

    socket.emit('message:send', messageData);
  }, [socket, isConnected, showToast]);

  // ==================== ARCHIVE CONVERSATION ====================
  const archiveConversation = useCallback(async (conversationId) => {
    try {
      await chatApi.archiveConversation(conversationId);
      
      // Remove from conversations list
      setConversations(prev => prev.filter(c => c._id !== conversationId));
      
      // Clear active conversation if it was archived
      if (activeConversation?._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
      
      showToast('Conversation archived successfully', 'success');
    } catch (error) {
      console.error('Error archiving conversation:', error);
      showToast('Failed to archive conversation', 'error');
    }
  }, [activeConversation, showToast]);

  // ==================== BLOCK CONVERSATION ====================
  const blockConversation = useCallback(async (conversationId, reason) => {
    try {
      console.log('🚫 Blocking conversation:', conversationId);
      const response = await chatApi.blockConversation(conversationId, reason);
      const blockedConversation = response.data;

      console.log('✅ Block API response received:', {
        id: blockedConversation._id,
        status: blockedConversation.status,
        hasParticipants: !!blockedConversation.participants,
        participantsCount: blockedConversation.participants?.length
      });

      if (!blockedConversation._id) {
        console.error('❌ Invalid conversation data - missing _id!');
        return;
      }

      // Update conversation in state immediately (socket event will be ignored if same data)
      setConversations(prev => {
        console.log('📝 API UPDATE - Before:', prev.length);
        const updated = prev.map(c =>
          c._id === conversationId ? blockedConversation : c
        );
        console.log('📝 API UPDATE - After:', updated.length);
        return updated;
      });

      // Update active conversation if it's the blocked one
      if (activeConversation?._id === conversationId) {
        setActiveConversation(blockedConversation);
      }

      showToast('Conversation blocked successfully', 'success');
    } catch (error) {
      console.error('❌ Error blocking conversation:', error);
      showToast('Failed to block conversation', 'error');
    }
  }, [activeConversation, showToast]);

  // ==================== UNBLOCK CONVERSATION ====================
  const unblockConversation = useCallback(async (conversationId) => {
    try {
      const response = await chatApi.unblockConversation(conversationId);
      const unblockedConversation = response.data;

      // Update conversation status with full conversation data from backend
      setConversations(prev =>
        prev.map(c => c._id === conversationId ? unblockedConversation : c)
      );

      // Update active conversation if it's the one being unblocked
      if (activeConversation?._id === conversationId) {
        setActiveConversation(unblockedConversation);
      }

      showToast('Conversation unblocked successfully', 'success');
    } catch (error) {
      console.error('Error unblocking conversation:', error);
      showToast('Failed to unblock conversation', 'error');
    }
  }, [activeConversation, showToast]);

  // ==================== DELETE CONVERSATION ====================
  const deleteConversation = useCallback(async (conversationId) => {
    try {
      await chatApi.deleteConversation(conversationId);
      
      // Remove from conversations list
      setConversations(prev => prev.filter(c => c._id !== conversationId));
      
      // Clear active conversation if it was deleted
      if (activeConversation?._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
      
      showToast('Conversation deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      showToast('Failed to delete conversation', 'error');
    }
  }, [activeConversation, showToast]);

  // ==================== DELETE MESSAGE ====================
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await chatApi.deleteMessage(messageId);
      
      // Remove message from list
      setMessages(prev => prev.filter(m => m._id !== messageId));
      
      showToast('Message deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting message:', error);
      showToast('Failed to delete message', 'error');
    }
  }, [showToast]);

  // ==================== LOAD NOTIFICATIONS ====================
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const response = await chatApi.getNotifications({ unreadOnly: false });
      setNotifications(response.data || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [user]);

  // ==================== MARK NOTIFICATION AS READ ====================
  const markNotificationRead = useCallback(async (notificationId) => {
    try {
      await chatApi.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // ==================== SOCKET EVENT LISTENERS ====================
  useEffect(() => {
    if (!socket || !isConnected) return;

    // New message received
    const handleNewMessage = async (data) => {
      const { message, conversationId } = data;
      const currentActiveConversation = activeConversationRef.current;
      const currentUser = userRef.current;

      // Add message to messages if in active conversation
      if (currentActiveConversation?._id === conversationId) {
        setMessages(prev => [...prev, message]);
      }

      // Check if conversation exists in list
      setConversations(prev => {
        const existingConv = prev.find(conv => conv._id === conversationId);

        if (existingConv) {
          // Update existing conversation
          return prev.map(conv =>
            conv._id === conversationId
              ? {
                  ...conv,
                  lastMessage: {
                    text: message.content.text,
                    timestamp: message.createdAt,
                    sender: message.sender
                  }
                }
              : conv
          );
        } else {
          // Conversation not in list - fetch it and add to the beginning
          chatApi.getMyConversations().then(response => {
            const newConv = response.data?.find(c => c._id === conversationId);
            if (newConv) {
              setConversations(current => [newConv, ...current]);
            }
          }).catch(err => console.error('Error fetching new conversation:', err));

          return prev;
        }
      });

      // Play notification sound if not in active conversation
      if (currentActiveConversation?._id !== conversationId && message.sender._id !== currentUser?.id) {
        // You can add notification sound here
        showToast(`New message from ${message.sender.name}`, 'info');
      }
    };

    // User typing
    const handleUserTyping = (data) => {
      const { userId, userName, conversationId } = data;
      const currentActiveConversation = activeConversationRef.current;
      if (currentActiveConversation?._id === conversationId) {
        setTypingUsers(prev => ({ ...prev, [userId]: userName }));
      }
    };

    // User stopped typing
    const handleUserStopTyping = (data) => {
      const { userId, conversationId } = data;
      const currentActiveConversation = activeConversationRef.current;
      if (currentActiveConversation?._id === conversationId) {
        setTypingUsers(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }
    };

    // New notification
    const handleNewNotification = (data) => {
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast
      showToast(data.title || 'New notification', 'info');
    };

    // Message read receipt
    const handleReadReceipt = (data) => {
      const { messageId } = data;
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId
            ? { ...msg, status: 'read' }
            : msg
        )
      );
    };

    // Conversation blocked
    const handleConversationBlocked = (data) => {
      const currentActiveConversation = activeConversationRef.current;
      console.log('🔔 Socket event: conversation blocked', data);

      setConversations(prev => {
        const conversation = prev.find(c => c._id === data.conversationId);

        // If conversation already blocked, skip update to prevent duplication
        if (conversation && conversation.status === 'blocked') {
          console.log('⏭️  Socket event ignored - conversation already blocked');
          return prev;
        }

        console.log('📝 SOCKET UPDATE - Before:', prev.length);
        const updated = prev.map(c => {
          if (c._id === data.conversationId) {
            // Preserve ALL existing data, only update status
            return {
              ...c,
              status: 'blocked',
              adminActions: {
                ...c.adminActions,
                blockedAt: new Date(),
                flaggedReason: data.reason
              }
            };
          }
          return c;
        });
        console.log('📝 SOCKET UPDATE - After:', updated.length);
        console.log('📋 Updated statuses:', updated.map(c => ({ id: c._id, status: c.status })));
        return updated;
      });

      // Show toast only if not already shown by API call
      showToast(`Conversation blocked by admin`, 'warning');

      if (currentActiveConversation?._id === data.conversationId) {
        setActiveConversation(prev => {
          if (prev.status === 'blocked') {
            return prev; // Already blocked
          }
          return {
            ...prev,
            status: 'blocked',
            adminActions: {
              ...prev.adminActions,
              blockedAt: new Date(),
              flaggedReason: data.reason
            }
          };
        });
      }
    };

    // Conversation unblocked
    const handleConversationUnblocked = (data) => {
      const currentActiveConversation = activeConversationRef.current;
      console.log('🔔 Socket event: conversation unblocked', data);

      setConversations(prev => {
        const conversation = prev.find(c => c._id === data.conversationId);

        // If conversation already active, skip update to prevent duplication
        if (conversation && conversation.status === 'active') {
          console.log('⏭️  Socket event ignored - conversation already active');
          return prev;
        }

        const updated = prev.map(c => {
          if (c._id === data.conversationId) {
            // Preserve ALL existing data, only update status
            return {
              ...c,
              status: 'active',
              adminActions: {
                ...c.adminActions,
                blockedAt: null,
                blockedBy: null,
                flaggedReason: null
              }
            };
          }
          return c;
        });
        return updated;
      });

      showToast(`Conversation unblocked by admin`, 'success');

      if (currentActiveConversation?._id === data.conversationId) {
        setActiveConversation(prev => {
          if (prev.status === 'active') {
            return prev; // Already active
          }
          return {
            ...prev,
            status: 'active',
            adminActions: {
              ...prev.adminActions,
              blockedAt: null,
              blockedBy: null,
              flaggedReason: null
            }
          };
        });
      }
    };

    // Message deleted
    const handleMessageDeleted = (data) => {
      const { messageId } = data;
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    };

    // Attach listeners
    socket.on('message:new', handleNewMessage);
    socket.on('user:typing', handleUserTyping);
    socket.on('user:stop-typing', handleUserStopTyping);
    socket.on('notification:new', handleNewNotification);
    socket.on('message:read-receipt', handleReadReceipt);
    socket.on('conversation:blocked', handleConversationBlocked);
    socket.on('conversation:unblocked', handleConversationUnblocked);
    socket.on('message:deleted', handleMessageDeleted);

    // Cleanup
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('user:typing', handleUserTyping);
      socket.off('user:stop-typing', handleUserStopTyping);
      socket.off('notification:new', handleNewNotification);
      socket.off('message:read-receipt', handleReadReceipt);
      socket.off('conversation:blocked', handleConversationBlocked);
      socket.off('conversation:unblocked', handleConversationUnblocked);
      socket.off('message:deleted', handleMessageDeleted);
    };
  }, [socket, isConnected, showToast]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
      loadNotifications();
    }
  }, [user, loadConversations, loadNotifications]);

  // Calculate unread count from conversations (only count messages from others)
  const calculateUnreadCount = useCallback(() => {
    if (!user || !conversations) return 0;

    return conversations.reduce((count, conversation) => {
      // Find current user's participant info
      const myParticipant = conversation.participants?.find(
        p => p.user?._id === user.id || p.user === user.id
      );

      if (!myParticipant || !conversation.lastMessage) return count;

      // Check if last message is from someone else
      const lastMessageSenderId = conversation.lastMessage.sender?._id || conversation.lastMessage.sender;
      const isFromOther = lastMessageSenderId !== user.id;

      // Check if message is unread (sent after user's last read time)
      const lastReadAt = myParticipant.lastReadAt ? new Date(myParticipant.lastReadAt) : null;
      const messageTime = new Date(conversation.lastMessage.timestamp);
      const isUnread = !lastReadAt || messageTime > lastReadAt;

      // Count if message is from someone else AND unread
      return (isFromOther && isUnread) ? count + 1 : count;
    }, 0);
  }, [user, conversations]);

  // Get the calculated unread count
  const calculatedUnreadCount = calculateUnreadCount();

  const value = {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    notifications,
    unreadCount: calculatedUnreadCount, // Use calculated count instead of notification count
    typingUsers,
    loading,
    loadConversations,
    loadMessages,
    createOrGetConversation,
    sendMessage,
    loadNotifications,
    markNotificationRead,
    archiveConversation,
    blockConversation,
    unblockConversation,
    deleteConversation,
    deleteMessage
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
