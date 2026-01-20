import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { user } = useAuth();
  const socketRef = useRef(null); // Track socket to prevent recreation

  useEffect(() => {
    // Only connect if user is authenticated
    if (!user?.id) {
      // Clear socket if user logs out
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket - user logged out');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('⚠️ No token found, skipping socket connection');
      return;
    }

    // Don't create a new socket if one already exists for this user
    if (socketRef.current && socketRef.current.connected) {
      console.log('✅ Socket already connected, skipping reconnection');
      return;
    }

    console.log('🔄 Creating new socket connection for user:', user.id);

    // Create socket connection
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ Socket.io connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket.io disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error.message);
      setIsConnected(false);
    });

    // Online users tracking
    newSocket.on('users:online', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('user:online', (data) => {
      setOnlineUsers(prev => {
        if (!prev.includes(data.userId)) {
          return [...prev, data.userId];
        }
        return prev;
      });
    });

    newSocket.on('user:offline', (data) => {
      setOnlineUsers(prev => prev.filter(id => id !== data.userId));
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup only on unmount
    return () => {
      if (newSocket) {
        console.log('🔌 Disconnecting socket on cleanup');
        newSocket.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id]); // Only depend on user.id to prevent reconnections

  // Helper function to check if user is online
  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  // Helper function to join a conversation room
  const joinConversation = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('conversation:join', conversationId);
    }
  };

  // Helper function to leave a conversation room
  const leaveConversation = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('conversation:leave', conversationId);
    }
  };

  // Helper function to send a message
  const sendMessage = (data) => {
    if (socket && isConnected) {
      socket.emit('message:send', data);
    }
  };

  // Helper function to send typing indicator
  const startTyping = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('typing:start', conversationId);
    }
  };

  const stopTyping = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('typing:stop', conversationId);
    }
  };

  // Helper function to mark message as read
  const markMessageAsRead = (messageId, conversationId) => {
    if (socket && isConnected) {
      socket.emit('message:read', { messageId, conversationId });
    }
  };

  // Helper function to mark all messages in conversation as read
  const markConversationAsRead = (conversationId) => {
    if (socket && isConnected) {
      socket.emit('conversation:mark-read', conversationId);
    }
  };

  const value = {
    socket,
    isConnected,
    onlineUsers,
    isUserOnline,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markMessageAsRead,
    markConversationAsRead
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
