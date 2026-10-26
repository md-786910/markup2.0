import React from 'react';

export default function FilterDropdown({ value, onChange, options, placeholder = 'All', label }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label={label || placeholder}
      className={`h-9 rounded-lg border bg-white px-3 pr-8 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 ${
        value ? 'border-blue-200 text-blue-700' : 'border-gray-200 text-gray-700'
      }`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
