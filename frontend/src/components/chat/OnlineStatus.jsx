import { useSocket } from '../../context/SocketContext';

const OnlineStatus = ({ userId, showLabel = false, size = 'sm' }) => {
  const { isUserOnline } = useSocket();
  const isOnline = isUserOnline(userId);

  const sizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`${sizeClasses[size]} rounded-full ${
          isOnline ? 'bg-green-500' : 'bg-gray-400'
        } ${isOnline ? 'animate-pulse' : ''}`}
        title={isOnline ? 'Online' : 'Offline'}
      />
      {showLabel && (
        <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
};

export default OnlineStatus;
