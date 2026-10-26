import React from 'react';

export default function Pagination({ page, totalPages, total, pageSize = 20, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = total ? Math.min(page * pageSize, total) : page * pageSize;

  const button = 'h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
      <p className="text-sm text-gray-500">
        {total ? <>Showing <span className="font-medium text-gray-700">{from}–{to}</span> of {total}</> : <>Page {page} of {totalPages}</>}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={button}>Previous</button>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className={button}>Next</button>
      </div>
    </div>
  );
}
