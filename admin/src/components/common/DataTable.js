import React from 'react';

// Columns: { key, label, render?(row), align?: 'right', className? }
export default function DataTable({ columns, data, loading, onRowClick, emptyMessage = 'Nothing here yet', emptyDescription }) {
  if (loading) {
    return (
      <div className="divide-y divide-gray-100" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
            <div className="h-3 flex-1 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm font-medium text-gray-700">{emptyMessage}</p>
        {emptyDescription && <p className="mt-1 text-sm text-gray-500">{emptyDescription}</p>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`whitespace-nowrap px-5 py-2.5 text-xs font-medium text-gray-500 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
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
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer transition-colors hover:bg-gray-50' : ''}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-5 py-3 text-sm text-gray-700 ${col.align === 'right' ? 'text-right tabular-nums' : ''} ${col.className || ''}`}
                >
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
