const TypingIndicator = ({ typingUsers }) => {
  const typingUserNames = Object.values(typingUsers);

  if (typingUserNames.length === 0) return null;

  const displayText =
    typingUserNames.length === 1
      ? `${typingUserNames[0]} is typing`
      : typingUserNames.length === 2
      ? `${typingUserNames[0]} and ${typingUserNames[1]} are typing`
      : `${typingUserNames.length} people are typing`;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-2 px-4">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs italic">{displayText}...</span>
    </div>
  );
};

export default TypingIndicator;
