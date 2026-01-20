import { useState } from 'react';
import { FiMessageCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import OnlineStatus from './OnlineStatus';
import ChatWindow from './ChatWindow';

const ChatButton = ({ product }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { createOrGetConversation, setActiveConversation } = useChat();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Get vendor from product (can be 'vendor' or 'vendorId' depending on populate)
  const vendor = product.vendor || product.vendorId;

  // Don't show button if user is not logged in or is the vendor
  if (!user || !vendor || user.id === vendor._id) {
    return null;
  }

  // Don't show for vendor/admin viewing their own products
  if (user.role !== 'customer') {
    return null;
  }

  const handleChatClick = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/products/${product._id}` } });
      return;
    }

    if (!vendor || !vendor._id) {
      console.error('Vendor information not available');
      showToast('Unable to start chat. Vendor information not available.', 'error');
      return;
    }

    try {
      setLoading(true);
      const conversation = await createOrGetConversation(product._id, vendor._id);
      setActiveConversation(conversation);
      setIsOpen(true);
    } catch (error) {
      console.error('Error starting chat:', error);
      showToast('Failed to start chat. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const vendorName = vendor?.name || 'Vendor';
  const vendorId = vendor?._id;

  return (
    <>
      <button
        onClick={handleChatClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
      >
        <FiMessageCircle className="w-5 h-5" />
        <div className="flex items-center gap-2">
          <span>{loading ? 'Opening chat...' : `Chat with ${vendorName}`}</span>
          {vendorId && <OnlineStatus userId={vendorId} size="sm" />}
        </div>
      </button>

      {isOpen && (
        <ChatWindow
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default ChatButton;
