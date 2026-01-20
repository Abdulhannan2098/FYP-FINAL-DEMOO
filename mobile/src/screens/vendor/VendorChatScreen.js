import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import ChatHeader from '../../components/chat/ChatHeader';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import theme from '../../styles/theme';

const Stack = createStackNavigator();

// Conversations List Screen
const ConversationsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { conversations, loadConversations, loading, unreadCount } = useChat();
  const { isUserOnline } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    loadConversations();
  }, []);

  const handleConversationPress = (conversation) => {
    navigation.navigate('ChatWindow', { conversation });
  };

  const handleRefresh = () => {
    loadConversations();
  };

  if (loading && conversations.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['left', 'right', 'bottom']}>
        <ActivityIndicator size="large" color={theme.colors.brand.main} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={[styles.listHeaderOuter, { paddingTop: insets.top }]}>
        <View style={styles.listHeaderInner}>
          <View style={styles.listHeaderContent}>
            <Text style={styles.listHeaderTitle}>Customer Messages</Text>
            <Text style={styles.listHeaderSubtitle}>
              {conversations.length === 0
                ? 'No customer inquiries yet'
                : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.unreadCountBadge}>
              <Ionicons name="mail-unread" size={14} color="#FFFFFF" />
              <Text style={styles.unreadCountText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
      <ConversationList
        conversations={conversations}
        onConversationPress={handleConversationPress}
        onRefresh={handleRefresh}
        refreshing={loading}
        currentUserId={user._id}
        isUserOnline={isUserOnline}
      />
    </SafeAreaView>
  );
};

// Chat Window Screen
const ChatWindowScreen = ({ route, navigation }) => {
  const { conversation } = route.params;
  const [currentConversation, setCurrentConversation] = useState(conversation);

  const {
    messages,
    loadMessages,
    sendMessage,
    deleteMessage,
    messagesLoading,
    setActiveConversation,
    markConversationAsRead,
  } = useChat();

  const {
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    isUserOnline,
  } = useSocket();

  const { user } = useAuth();

  // Get the other participant (customer)
  // Match web app logic: participants array contains { user: { _id, name, ... }, role: ... }
  const getOtherParticipant = () => {
    if (!currentConversation?.participants || !user?._id) {
      return { name: 'Unknown', _id: null };
    }

    // Find participant where user._id !== current user's _id
    const otherParticipantEntry = currentConversation.participants.find((p) => {
      // p.user can be a populated object or just an ID string
      const participantUserId = p.user?._id || p.user;
      const currentUserId = user._id;
      return participantUserId?.toString() !== currentUserId?.toString();
    });

    // Return the populated user object, or a fallback
    if (otherParticipantEntry?.user && typeof otherParticipantEntry.user === 'object') {
      return otherParticipantEntry.user;
    }

    return { name: 'Unknown', _id: null };
  };

  const otherParticipant = getOtherParticipant();

  useEffect(() => {
    // Set active conversation
    setActiveConversation(currentConversation);

    // Join conversation via socket
    joinConversation(currentConversation._id);

    // Load messages
    loadMessages(currentConversation._id);

    // Mark conversation as read when opening
    markConversationAsRead(currentConversation._id);

    // Cleanup
    return () => {
      leaveConversation(currentConversation._id);
      setActiveConversation(null);
    };
  }, [currentConversation._id]);

  const handleSendMessage = (text) => {
    sendMessage(currentConversation._id, text, 'text');
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleTypingStart = () => {
    startTyping(currentConversation._id);
  };

  const handleTypingStop = () => {
    stopTyping(currentConversation._id);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isOnline = isUserOnline(otherParticipant._id);
  const isBlocked = currentConversation.status === 'blocked';

  // Get product name from conversation context
  const productName = currentConversation.context?.product?.name || null;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ChatHeader
        userName={otherParticipant.name}
        isOnline={isOnline}
        onBack={handleBack}
        productName={productName}
      />
      <ChatWindow
        messages={messages}
        currentUserId={user._id}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        loading={messagesLoading}
        disabled={isBlocked}
      />
    </SafeAreaView>
  );
};

// Main Vendor Chat Screen with Navigation
const VendorChatScreen = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Conversations"
        component={ConversationsScreen}
      />
      <Stack.Screen
        name="ChatWindow"
        component={ChatWindowScreen}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.primary,
  },
  listHeaderOuter: {
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  listHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  listHeaderContent: {
    flex: 1,
  },
  listHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  listHeaderSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  unreadCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.brand.main,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  unreadCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default VendorChatScreen;
