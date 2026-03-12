import { useState } from 'react';

const ImageWithFallback = ({ 
  src, 
  alt, 
  className = '', 
  fallbackText = 'No Image',
  aspectRatio = 'square', // 'square', 'video', 'auto'
  showLoading = true,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
  };

  const Placeholder = ({ text, isError = false }) => (
    <div className={`w-full h-full flex flex-col items-center justify-center ${
      isError ? 'text-red-400 bg-red-50' : 'text-gray-400 bg-gray-100'
    } ${aspectClasses[aspectRatio]} rounded-lg`}>
      <svg className="w-16 h-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {isError ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        )}
      </svg>
      <span className="text-xs font-medium">{text}</span>
    </div>
  );

  // No source provided
  if (!src || src.trim() === '') {
    return <Placeholder text={fallbackText} />;
  }

  // Image load error
  if (hasError) {
    return <Placeholder text="Ảnh lỗi" isError />;
  }

  return (
    <div className={`relative ${aspectClasses[aspectRatio]}`}>
      {/* Loading state */}
      {showLoading && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Image */}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        loading="lazy"
      />
    </div>
  );
};

export default ImageWithFallback;