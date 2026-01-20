import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import ConversationList from '../components/chat/ConversationList.jsx';
import ChatWindow from '../components/chat/ChatWindow.jsx';
import { useChat } from '../context/ChatContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner';

const Chat = () => {
  const { user } = useAuth();
  const { conversations, activeConversation, setActiveConversation, loading } = useChat();
  const location = useLocation();
  const navigate = useNavigate();
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'blocked', 'unread'

  useEffect(() => {
    // If no user, redirect to login
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Check if a conversation ID was passed from product page
    if (location.state?.conversationId) {
      const conv = conversations.find(c => c._id === location.state.conversationId);
      if (conv) {
        setActiveConversation(conv);
        setShowChatWindow(true);
      }
    }
  }, [location.state, conversations, setActiveConversation]);

  const handleConversationSelect = (conversation) => {
    setActiveConversation(conversation);
    setShowChatWindow(true);
  };

  const handleCloseChat = () => {
    setShowChatWindow(false);
    setActiveConversation(null);
  };

  // ✅ HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Calculate stats for admin
  const activeConversationsCount = useMemo(() =>
    conversations.filter(c => c.status === 'active').length,
    [conversations]
  );

  const blockedConversationsCount = useMemo(() =>
    conversations.filter(c => c.status === 'blocked').length,
    [conversations]
  );

  const unreadConversationsCount = useMemo(() => {
    return conversations.filter(c => {
      const myParticipant = c.participants?.find(p => p.user?._id === user?.id || p.user === user?.id);
      return myParticipant && c.lastMessage && (
        !myParticipant.lastReadAt ||
        new Date(c.lastMessage.timestamp) > new Date(myParticipant.lastReadAt)
      );
    }).length;
  }, [conversations, user?.id]);

  // Filter conversations based on selected status - MEMOIZED to prevent infinite loops
  const filteredConversations = useMemo(() => {
    if (statusFilter === 'all') {
      return conversations;
    } else if (statusFilter === 'unread') {
      return conversations.filter(c => {
        const myParticipant = c.participants?.find(p => p.user?._id === user?.id || p.user === user?.id);
        return myParticipant && c.lastMessage && (
          !myParticipant.lastReadAt ||
          new Date(c.lastMessage.timestamp) > new Date(myParticipant.lastReadAt)
        );
      });
    } else {
      // Filter by status ('active' or 'blocked')
      return conversations.filter(c => c.status === statusFilter);
    }
  }, [conversations, statusFilter, user?.id]);

  // ✅ NOW WE CAN DO EARLY RETURNS AFTER ALL HOOKS
  if (loading && conversations.length === 0) {
    return (
      <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading conversations..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-900 py-8">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(
                  user?.role === 'customer' ? '/dashboard/customer' :
                  user?.role === 'vendor' ? '/dashboard/vendor' :
                  '/dashboard/admin'
                )}
                className="p-2 hover:bg-surface-light rounded-lg transition-colors group"
                title="Back to Dashboard"
              >
                <svg className="w-6 h-6 text-text-secondary group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="heading-1 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent flex items-center gap-3">
                  {user?.role === 'customer' ? 'My Chats' :
                   user?.role === 'vendor' ? 'Customer Inquiries' :
                   'Chat Monitoring'}
                  {user?.role === 'admin' && (
                    <span className="px-3 py-1 bg-purple-900/30 border border-purple-600 text-purple-400 text-sm font-medium rounded-full">
                      Admin View
                    </span>
                  )}
                </h1>
                <p className="text-text-secondary mt-1">
                  {user?.role === 'customer'
                    ? 'Chat with vendors about products and orders'
                    : user?.role === 'vendor'
                    ? 'Respond to customer inquiries and product questions'
                    : 'Monitor all platform conversations in read-only mode'}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Stats Dashboard - Now Clickable */}
          {user?.role === 'admin' && conversations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <button
                onClick={() => setStatusFilter('all')}
                className={`bg-gradient-to-br from-surface via-surface to-surface-light border rounded-xl p-4 transition-all text-left ${
                  statusFilter === 'all'
                    ? 'border-primary-500 ring-2 ring-primary-500/30'
                    : 'border-primary-500/20 hover:border-primary-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-text-primary">{conversations.length}</p>
                    <p className="text-sm text-text-secondary">All Conversations</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setStatusFilter('active')}
                className={`bg-gradient-to-br from-surface via-surface to-surface-light border rounded-xl p-4 transition-all text-left ${
                  statusFilter === 'active'
                    ? 'border-green-500 ring-2 ring-green-500/30'
                    : 'border-green-500/20 hover:border-green-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-green-400">{activeConversationsCount}</p>
                    <p className="text-sm text-text-secondary">Active</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setStatusFilter('unread')}
                className={`bg-gradient-to-br from-surface via-surface to-surface-light border rounded-xl p-4 transition-all text-left ${
                  statusFilter === 'unread'
                    ? 'border-red-500 ring-2 ring-red-500/30'
                    : 'border-red-500/20 hover:border-red-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-red-400">{unreadConversationsCount}</p>
                    <p className="text-sm text-text-secondary">Unread</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setStatusFilter('blocked')}
                className={`bg-gradient-to-br from-surface via-surface to-surface-light border rounded-xl p-4 transition-all text-left ${
                  statusFilter === 'blocked'
                    ? 'border-yellow-500 ring-2 ring-yellow-500/30'
                    : 'border-yellow-500/20 hover:border-yellow-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-yellow-400">{blockedConversationsCount}</p>
                    <p className="text-sm text-text-secondary">Blocked</p>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Chat Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation List */}
          <div className="lg:col-span-1">
            <div className="bg-surface border border-surface-light rounded-xl overflow-hidden">
              <div className="p-4 border-b border-surface-light bg-surface-light">
                <h2 className="font-display font-bold text-text-primary flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {user?.role === 'admin' ? (
                    <span>
                      {statusFilter === 'all' && `All Conversations (${filteredConversations.length})`}
                      {statusFilter === 'active' && `Active Conversations (${filteredConversations.length})`}
                      {statusFilter === 'unread' && `Unread Conversations (${filteredConversations.length})`}
                      {statusFilter === 'blocked' && `Blocked Conversations (${filteredConversations.length})`}
                    </span>
                  ) : (
                    `Conversations (${conversations.length})`
                  )}
                </h2>
              </div>
              <div className="h-[calc(100vh-300px)] overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <svg className="w-16 h-16 text-text-tertiary mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      {statusFilter === 'blocked' ? 'No blocked conversations' :
                       statusFilter === 'unread' ? 'No unread conversations' :
                       statusFilter === 'active' ? 'No active conversations' :
                       'No conversations yet'}
                    </h3>
                    <p className="text-text-secondary text-sm">
                      {statusFilter === 'blocked'
                        ? 'Blocked conversations will appear here'
                        : statusFilter === 'unread'
                        ? 'Unread conversations will appear here'
                        : statusFilter === 'active'
                        ? 'Active conversations will appear here'
                        : user?.role === 'customer'
                        ? 'Start a conversation with a vendor from a product page'
                        : user?.role === 'vendor'
                        ? 'Customer conversations will appear here'
                        : 'All platform conversations will appear here for monitoring'}
                    </p>
                  </div>
                ) : (
                  <ConversationList
                    conversations={filteredConversations}
                    onSelectConversation={handleConversationSelect}
                    filter="all"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2">
            {showChatWindow && activeConversation ? (
              <div className="bg-surface border border-surface-light rounded-xl overflow-hidden h-[calc(100vh-200px)]">
                <ChatWindow
                  isOpen={showChatWindow}
                  onClose={handleCloseChat}
                  inline={true}
                  readOnly={user?.role === 'admin'}
                />
              </div>
            ) : (
              <div className="bg-surface border border-surface-light rounded-xl h-[calc(100vh-200px)] flex items-center justify-center">
                <div className="text-center p-8">
                  <svg className="w-20 h-20 text-text-tertiary mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-xl font-display font-bold text-text-primary mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-text-secondary">
                    Choose a conversation from the list to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions for Customers */}
        {user?.role === 'customer' && (
          <div className="mt-8 bg-surface border border-surface-light rounded-xl p-6">
            <h3 className="text-lg font-display font-bold text-text-primary mb-4">Need help?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/products')}
                className="flex items-center gap-3 p-4 bg-surface-light hover:bg-surface-lighter border border-surface-light rounded-lg transition-all group"
              >
                <svg className="w-10 h-10 text-primary-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <div className="text-left">
                  <p className="font-semibold text-text-primary">Browse Products</p>
                  <p className="text-sm text-text-tertiary">Find items to chat about</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/dashboard/customer')}
                className="flex items-center gap-3 p-4 bg-surface-light hover:bg-surface-lighter border border-surface-light rounded-lg transition-all group"
              >
                <svg className="w-10 h-10 text-primary-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <div className="text-left">
                  <p className="font-semibold text-text-primary">View Orders</p>
                  <p className="text-sm text-text-tertiary">Check order status</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="flex items-center gap-3 p-4 bg-surface-light hover:bg-surface-lighter border border-surface-light rounded-lg transition-all group"
              >
                <svg className="w-10 h-10 text-primary-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div className="text-left">
                  <p className="font-semibold text-text-primary">Contact Support</p>
                  <p className="text-sm text-text-tertiary">General inquiries</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
