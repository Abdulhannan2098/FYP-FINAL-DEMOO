const LoadingSpinner = ({ size = 'md', message = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4 animate-fadeIn">
      <div className={`${sizeClasses[size]} border-primary-500 border-t-transparent rounded-full animate-spin`}></div>
      {message && <p className="text-text-secondary text-sm font-medium animate-pulse">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
