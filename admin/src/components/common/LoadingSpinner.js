import React from 'react';

export default function LoadingSpinner({ size = 'md' }) {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`${sizeMap[size]} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin`} />
  );
}
