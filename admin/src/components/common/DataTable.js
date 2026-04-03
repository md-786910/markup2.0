import React from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function DataTable({ columns, data, loading, onRowClick, emptyMessage = 'No data found' }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, idx) => (
            <tr
              key={row._id || row.id || idx}
              onClick={() => onRowClick && onRowClick(row)}
              className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
            >
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4 text-sm text-gray-700">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
