import { useState } from 'react';

const StarRating = ({
  rating = 0,
  totalStars = 5,
  size = 'md',
  interactive = false,
  onChange = null,
  showCount = false,
  reviewCount = 0
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  const handleClick = (index) => {
    if (interactive && onChange) {
      onChange(index + 1);
    }
  };

  const handleMouseEnter = (index) => {
    if (interactive) {
      setHoverRating(index + 1);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[...Array(totalStars)].map((_, index) => {
          const isFilled = index < Math.floor(displayRating);
          const isHalfFilled = !isFilled && index < displayRating && displayRating % 1 !== 0;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleClick(index)}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
              disabled={!interactive}
              className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform duration-150`}
            >
              {isHalfFilled ? (
                // Half star
                <svg className={sizes[size]} viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id={`half-${index}`}>
                      <stop offset="50%" stopColor="#F59E0B" />
                      <stop offset="50%" stopColor="#D1D5DB" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill={`url(#half-${index})`}
                  />
                </svg>
              ) : (
                // Full or empty star
                <svg
                  className={sizes[size]}
                  fill={isFilled ? '#F59E0B' : '#D1D5DB'}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {showCount && (
        <span className="text-sm text-text-secondary ml-1">
          ({reviewCount})
        </span>
      )}
    </div>
  );
};

export default StarRating;
