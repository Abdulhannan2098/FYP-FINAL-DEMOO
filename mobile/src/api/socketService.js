/**
 * Socket.IO Service
 *
 * This file contains the Socket.IO client setup for real-time features like chat.
 */

import io from 'socket.io-client';
import { SOCKET_URL } from './config';
import { getToken } from '../utils/storage';

let socket = null;

// Initialize Socket.IO connection
export const initializeSocket = async () => {
  const token = await getToken();

  if (!token) {
    console.warn('Cannot initialize socket without authentication token');
    return null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('🔴 Socket connection error:', error.message);
  });

  return socket;
};

// Disconnect Socket.IO
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket disconnected manually');
  }
};

// Get current socket instance
export const getSocket = () => socket;

// ==================== Chat Event Listeners ====================

export const onNewMessage = (callback) => {
  if (socket) {
    socket.on('message:new', callback);
  }
};

export const onTyping = (callback) => {
  if (socket) {
    socket.on('user:typing', callback);
  }
};

export const onStopTyping = (callback) => {
  if (socket) {
    socket.on('user:stop-typing', callback);
  }
};

export const onMessageRead = (callback) => {
  if (socket) {
    socket.on('message:read-receipt', callback);
  }
};

export const onConversationBlocked = (callback) => {
  if (socket) {
    socket.on('conversation:blocked', callback);
  }
};

export const onConversationUnblocked = (callback) => {
  if (socket) {
    socket.on('conversation:unblocked', callback);
  }
};

export const onMessageDeleted = (callback) => {
  if (socket) {
    socket.on('message:deleted', callback);
  }
};

export const onUserOnline = (callback) => {
  if (socket) {
    socket.on('user:online', callback);
  }
};

export const onUserOffline = (callback) => {
  if (socket) {
    socket.on('user:offline', callback);
  }
};

export const onUsersOnline = (callback) => {
  if (socket) {
    socket.on('users:online', callback);
  }
};

export const onNotification = (callback) => {
  if (socket) {
    socket.on('notification:new', callback);
  }
};

// ==================== Chat Event Emitters ====================

export const sendMessage = (data) => {
  if (socket) {
    socket.emit('message:send', data);
  } else {
    console.warn('Socket not connected. Cannot send message.');
  }
};

export const emitTyping = (conversationId) => {
  if (socket) {
    socket.emit('typing:start', conversationId);
  }
};

export const emitStopTyping = (conversationId) => {
  if (socket) {
    socket.emit('typing:stop', conversationId);
  }
};

export const joinConversation = (conversationId) => {
  if (socket) {
    socket.emit('conversation:join', conversationId);
    console.log('🔵 Joined conversation:', conversationId);
  }
};

export const leaveConversation = (conversationId) => {
  if (socket) {
    socket.emit('conversation:leave', conversationId);
    console.log('🔴 Left conversation:', conversationId);
  }
};

export const markMessageAsRead = (messageId, conversationId) => {
  if (socket) {
    socket.emit('message:read', { messageId, conversationId });
  }
};

export const markConversationAsRead = (conversationId) => {
  if (socket) {
    socket.emit('conversation:mark-read', conversationId);
  }
};

// Remove specific event listener
export const removeListener = (eventName, callback) => {
  if (socket) {
    socket.off(eventName, callback);
  }
};

// Remove all listeners for an event
export const removeAllListeners = (eventName) => {
  if (socket) {
    socket.removeAllListeners(eventName);
  }
};
