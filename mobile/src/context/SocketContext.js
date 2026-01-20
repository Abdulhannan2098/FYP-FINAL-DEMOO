import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../api/config';
import { useAuth } from './AuthContext';
import { getToken } from '../utils/storage';

const SocketContext = createContext();

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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize socket connection when user is authenticated (only after auth check is complete)
  useEffect(() => {
    // Wait for auth check to complete before connecting
    // This prevents connection errors during app launch
    if (authLoading) return;

    if (isAuthenticated && user) {
      initializeSocket();
    } else {
      disconnectSocket();
    }

    // Cleanup on unmount
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user, authLoading]);

  const initializeSocket = async () => {
    try {
      const token = await getToken();

      if (!token) {
        console.warn('Cannot initialize socket without authentication token');
        return;
      }

      // Disconnect existing socket if any
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Create new socket connection
      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 30000,
        pingTimeout: 60000,
        pingInterval: 25000,
        forceNew: false,
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        setIsConnected(true);
        reconnectAttempts.current = 0;
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('🔴 Socket connection error:', error.message);
        reconnectAttempts.current += 1;

        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached. Giving up.');
          newSocket.disconnect();
        }
      });

      // Online users events
      newSocket.on('users:online', (users) => {
        console.log('👥 Online users received:', users);
        setOnlineUsers(users || []);
      });

      newSocket.on('user:online', (data) => {
        console.log('✅ User came online:', data);
        setOnlineUsers((prev) => {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        });
      });

      newSocket.on('user:offline', (data) => {
        // Handle both object and string formats from backend
        const userId = typeof data === 'object' ? data.userId : data;
        console.log('❌ User went offline:', userId);
        setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting socket manually');
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers([]);
    }
  };

  // Socket helper methods
  const joinConversation = (conversationId) => {
    if (socketRef.current && isConnected) {
      console.log('🔵 Joining conversation:', conversationId);
      socketRef.current.emit('conversation:join', conversationId);
    }
  };

  const leaveConversation = (conversationId) => {
    if (socketRef.current && isConnected) {
      console.log('🔴 Leaving conversation:', conversationId);
      socketRef.current.emit('conversation:leave', conversationId);
    }
  };

  const sendMessage = (data) => {
    if (socketRef.current && isConnected) {
      console.log('📤 Sending message:', data);
      socketRef.current.emit('message:send', data);
    } else {
      console.warn('Cannot send message: Socket not connected');
    }
  };

  const startTyping = (conversationId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:start', conversationId);
    }
  };

  const stopTyping = (conversationId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:stop', conversationId);
    }
  };

  const markMessageAsRead = (messageId, conversationId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('message:read', { messageId, conversationId });
    }
  };

  const markConversationAsRead = (conversationId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('conversation:mark-read', conversationId);
    }
  };

  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  const value = {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markMessageAsRead,
    markConversationAsRead,
    isUserOnline,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
