import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      {/* Thumbnail placeholder */}
      <div className="h-36 bg-gray-100" />
      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-gray-200" />
            <div className="w-7 h-7 rounded-full bg-gray-200" />
            <div className="w-7 h-7 rounded-full bg-gray-200" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
      </div>
    </div>
  );
}
