import { useEffect } from 'react';

const Toast = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeStyles = {
    success: {
      gradient: 'from-green-600/90 via-green-700/90 to-emerald-800/90',
      border: 'border-green-500/30',
      iconBg: 'bg-green-500/20',
      glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]',
    },
    error: {
      gradient: 'from-red-600/90 via-red-700/90 to-red-800/90',
      border: 'border-red-500/30',
      iconBg: 'bg-red-500/20',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
    },
    warning: {
      gradient: 'from-yellow-600/90 via-yellow-700/90 to-orange-700/90',
      border: 'border-yellow-500/30',
      iconBg: 'bg-yellow-500/20',
      glow: 'shadow-[0_0_20px_rgba(234,179,8,0.3)]',
    },
    info: {
      gradient: 'from-blue-600/90 via-blue-700/90 to-blue-800/90',
      border: 'border-blue-500/30',
      iconBg: 'bg-blue-500/20',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    },
  };

  const icons = {
    success: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const style = typeStyles[type];

  return (
    <div
      className={`
        relative flex items-center gap-4 px-5 py-4 rounded-xl
        bg-gradient-to-r ${style.gradient}
        backdrop-blur-md border ${style.border}
        ${style.glow}
        text-white animate-slide-in
        transform transition-all duration-300 hover:scale-105
      `}
    >
      {/* Icon Container */}
      <div className={`flex-shrink-0 p-2 rounded-lg ${style.iconBg}`}>
        {icons[type]}
      </div>

      {/* Message */}
      <p className="flex-1 text-sm font-semibold tracking-wide">{message}</p>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:bg-white/20 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
        aria-label="Close notification"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default Toast;
