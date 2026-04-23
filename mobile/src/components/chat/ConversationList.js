import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import OnlineStatus from './OnlineStatus';
import { useChat } from '../../context/ChatContext';
import theme from '../../styles/theme';

const ConversationList = ({
  conversations,
  onConversationPress,
  onRefresh,
  refreshing = false,
  currentUserId,
  isUserOnline,
}) => {
  const { checkConversationUnread } = useChat();
  const formatTimestamp = (date) => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) {
      return format(messageDate, 'h:mm a');
    } else if (isYesterday(messageDate)) {
      return 'Yesterday';
    } else {
      return format(messageDate, 'MMM d');
    }
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation?.participants || !currentUserId) {
      return { name: 'Unknown', _id: null };
    }

    // Find participant where user._id !== current user's _id
    const otherParticipantEntry = conversation.participants.find((p) => {
      // p.user can be a populated object or just an ID string
      const participantUserId = p.user?._id || p.user;
      return participantUserId?.toString() !== currentUserId?.toString();
    });

    // Return the populated user object, or a fallback
    if (otherParticipantEntry?.user && typeof otherParticipantEntry.user === 'object') {
      return otherParticipantEntry.user;
    }

    return { name: 'Unknown', _id: null };
  };

  const getUnreadCount = (conversation) => {
    // Use the context's helper function which properly checks
    // if the last message was sent by the current user
    return checkConversationUnread(conversation) ? 1 : 0;
  };

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const renderConversation = ({ item }) => {
    const otherUser = getOtherParticipant(item);
    const unreadCount = getUnreadCount(item);
    const isOnline = isUserOnline(otherUser._id);
    const isBlocked = item.status === 'blocked';

    // Get product name for context
    const productName = item.context?.product?.name;

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          unreadCount > 0 && styles.conversationItemUnread,
          isBlocked && styles.conversationItemBlocked,
        ]}
        onPress={() => onConversationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, unreadCount > 0 && styles.avatarUnread]}>
            <Text style={styles.avatarText}>{getInitials(otherUser.name)}</Text>
          </View>
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, unreadCount > 0 && styles.userNameUnread]} numberOfLines={1}>
              {otherUser.name}
            </Text>
            {item.lastMessage?.timestamp && (
              <Text style={[styles.timestamp, unreadCount > 0 && styles.timestampUnread]}>
                {formatTimestamp(item.lastMessage.timestamp)}
              </Text>
            )}
          </View>

          {productName && (
            <Text style={styles.productContext} numberOfLines={1}>
              Re: {productName}
            </Text>
          )}

          <View style={styles.messagePreviewContainer}>
            <Text style={[styles.messagePreview, unreadCount > 0 && styles.messagePreviewUnread]} numberOfLines={1}>
              {item.lastMessage?.text || 'No messages yet'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
            {isBlocked && (
              <View style={styles.blockedBadge}>
                <Text style={styles.blockedText}>Blocked</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No Conversations</Text>
      <Text style={styles.emptySubtitle}>
        Start a conversation by messaging a vendor about a product
      </Text>
    </View>
  );

  return (
    <FlatList
      data={conversations}
      renderItem={renderConversation}
      keyExtractor={(item) => item._id}
      contentContainerStyle={[
        conversations.length === 0 && styles.emptyList,
        styles.listContainer
      ]}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.brand.main}
          colors={[theme.colors.brand.main]}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
    backgroundColor: theme.colors.background.primary,
  },
  conversationItemUnread: {
    backgroundColor: `${theme.colors.brand.main}10`,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.brand.main,
  },
  conversationItemBlocked: {
    opacity: 0.6,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.brand.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUnread: {
    backgroundColor: theme.colors.brand.main,
    shadowColor: theme.colors.brand.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: theme.colors.background.primary,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginRight: 8,
  },
  userNameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  timestampUnread: {
    color: theme.colors.brand.main,
    fontWeight: '600',
  },
  productContext: {
    fontSize: 12,
    color: theme.colors.brand.main,
    marginBottom: 4,
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  messagePreview: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginRight: 8,
  },
  messagePreviewUnread: {
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.brand.main,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  blockedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  blockedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyList: {
    flexGrow: 1,
  },
  listContainer: {
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ConversationList;
