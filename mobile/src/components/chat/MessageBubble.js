import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import theme from '../../styles/theme';

const MessageBubble = ({ message, isOwnMessage, onDelete, showSenderName = false }) => {
  const handleLongPress = () => {
    if (isOwnMessage && onDelete) {
      Alert.alert(
        'Delete Message',
        'Are you sure you want to delete this message?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(message._id) },
        ]
      );
    }
  };

  const formatTime = (date) => {
    return format(new Date(date), 'h:mm a');
  };

  const getStatusIcon = () => {
    if (!isOwnMessage) return null;

    const iconColor = isOwnMessage ? 'rgba(255, 255, 255, 0.7)' : theme.colors.text.tertiary;

    switch (message.status) {
      case 'sending':
        return <Ionicons name="time-outline" size={14} color={iconColor} />;
      case 'sent':
        return <Ionicons name="checkmark" size={14} color={iconColor} />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={14} color={iconColor} />;
      case 'read':
        return <Ionicons name="checkmark-done" size={14} color="#4FC3F7" />;
      default:
        return <Ionicons name="checkmark" size={14} color={iconColor} />;
    }
  };

  // Get message content based on structure
  const getMessageContent = () => {
    const contentType = message.content?.type || message.contentType || 'text';
    const contentText = message.content?.text || message.text || '';
    const fileUrl = message.content?.fileUrl;

    switch (contentType) {
      case 'image':
        return (
          <View>
            <Image
              source={{ uri: fileUrl || contentText }}
              style={styles.imageContent}
              resizeMode="cover"
            />
            {contentText && contentText !== fileUrl && (
              <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
                {contentText}
              </Text>
            )}
          </View>
        );
      case 'file':
        return (
          <View style={styles.fileContainer}>
            <Ionicons
              name="document-outline"
              size={24}
              color={isOwnMessage ? '#FFFFFF' : theme.colors.text.primary}
            />
            <Text style={[styles.fileName, isOwnMessage && styles.ownMessageText]} numberOfLines={1}>
              {message.content?.fileName || 'File'}
            </Text>
          </View>
        );
      default:
        return (
          <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
            {contentText}
          </Text>
        );
    }
  };

  // System message styling
  if (message.contentType === 'system' || message.content?.type === 'system') {
    return (
      <View style={styles.systemMessageContainer}>
        <Text style={styles.systemMessageText}>
          {message.content?.text || message.text}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
      style={[styles.container, isOwnMessage ? styles.ownMessage : styles.otherMessage]}
    >
      <View style={[styles.bubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
        {showSenderName && !isOwnMessage && (
          <Text style={styles.senderName}>
            {message.sender?.name || 'Unknown'}
          </Text>
        )}

        {getMessageContent()}

        <View style={[styles.footer, isOwnMessage && styles.ownFooter]}>
          <Text style={[styles.timestamp, isOwnMessage && styles.ownTimestamp]}>
            {formatTime(message.createdAt)}
          </Text>
          {getStatusIcon()}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    minWidth: 80,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  ownBubble: {
    backgroundColor: theme.colors.brand.main,
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border || 'rgba(255, 255, 255, 0.1)',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.brand.main,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: theme.colors.text.primary,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  ownFooter: {
    justifyContent: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  imageContent: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  fileName: {
    fontSize: 14,
    color: theme.colors.text.primary,
    flex: 1,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  systemMessageText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default MessageBubble;
