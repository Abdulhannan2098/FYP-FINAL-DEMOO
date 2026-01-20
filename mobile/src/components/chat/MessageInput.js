import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

const MessageInput = ({ onSend, onTypingStart, onTypingStop, disabled = false, placeholder = 'Type a message...' }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup: stop typing on unmount
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping && onTypingStop) {
        onTypingStop();
      }
    };
  }, [isTyping]);

  const handleTextChange = (text) => {
    setMessage(text);

    // Typing indicator logic
    if (text.trim().length > 0 && !isTyping) {
      setIsTyping(true);
      if (onTypingStart) {
        onTypingStart();
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (onTypingStop) {
        onTypingStop();
      }
    }, 3000);
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0 || disabled) return;

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      if (onTypingStop) {
        onTypingStop();
      }
    }

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send message
    onSend(trimmedMessage);

    // Clear input
    setMessage('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.tertiary}
          multiline
          maxLength={5000}
          editable={!disabled}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.sendButton,
          (message.trim().length === 0 || disabled) && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={message.trim().length === 0 || disabled}
      >
        <Ionicons
          name="send"
          size={20}
          color={message.trim().length > 0 && !disabled ? '#FFFFFF' : theme.colors.text.tertiary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface,
    gap: 10,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    color: theme.colors.text.primary,
    fontSize: 15,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.brand.main,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.brand.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default MessageInput;
