import { useState, useRef } from 'react';
import { FiSend, FiPaperclip, FiX } from 'react-icons/fi';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const MessageInput = ({ conversationId, recipientId }) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { sendMessage, startTyping, stopTyping } = useSocket();
  const { user } = useAuth();

  const handleTyping = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Start typing indicator
    if (value && !isTyping) {
      setIsTyping(true);
      startTyping(conversationId);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        stopTyping(conversationId);
      }
    }, 2000);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim() && !file) return;

    try {
      if (isTyping) {
        setIsTyping(false);
        stopTyping(conversationId);
      }

      if (file) {
        setUploading(true);
        // Upload file via HTTP endpoint
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversationId', conversationId);
        formData.append('receiverId', recipientId);
        if (message.trim()) {
          formData.append('content', message.trim());
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/messages/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('File upload failed');
        }

        setUploading(false);
        setMessage('');
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        // Send text message via Socket.io
        sendMessage({
          conversationId,
          text: message.trim(),
          type: 'text',
        });

        setMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
      setUploading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-surface-light bg-surface p-4">
      {/* File Preview */}
      {file && (
        <div className="mb-3 flex items-center gap-3 p-3 bg-primary-500/10 border border-primary-500/30 rounded-xl animate-slideIn">
          <div className="p-2 bg-primary-500/20 rounded-lg">
            {file.type.startsWith('image/') ? (
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : (
              <FiPaperclip className="w-5 h-5 text-primary-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
            <p className="text-xs text-text-secondary">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="p-1.5 hover:bg-red-500/20 rounded-full transition-all group"
            title="Remove file"
          >
            <FiX className="w-5 h-5 text-text-secondary group-hover:text-red-500 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-3">
        {/* File Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-3 text-text-secondary hover:bg-surface-light hover:text-primary-500 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          title="Attach file (images, PDF, documents)"
        >
          <FiPaperclip className="w-6 h-6 group-hover:rotate-45 transition-transform duration-200" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
        />

        {/* Message Input */}
        <textarea
          value={message}
          onChange={handleTyping}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows="1"
          disabled={uploading}
          className="flex-1 resize-none border border-surface-light rounded-xl px-4 py-3 bg-surface-light focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 disabled:bg-surface-lighter disabled:cursor-not-allowed text-text-primary placeholder-text-tertiary transition-all"
          style={{ minHeight: '48px', maxHeight: '120px' }}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!message.trim() && !file) || uploading}
          className="p-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 hover:shadow-lg hover:shadow-primary-500/30 transition-all duration-200 disabled:from-surface-light disabled:to-surface-light disabled:text-text-tertiary disabled:cursor-not-allowed disabled:shadow-none group"
          title="Send message"
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <FiSend className="w-6 h-6 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-xs text-text-tertiary">
          <kbd className="px-1.5 py-0.5 bg-surface-light rounded text-xs font-mono">Enter</kbd> to send •
          <kbd className="px-1.5 py-0.5 bg-surface-light rounded text-xs font-mono ml-1">Shift+Enter</kbd> for new line
        </p>
        <p className="text-xs text-text-tertiary">Max: 5MB</p>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}} />
    </form>
  );
};

export default MessageInput;
