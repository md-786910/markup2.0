import React, { useState, useRef } from 'react';
import { PROJECT_STATUSES, PROJECT_TYPES, OWNERSHIP_OPTIONS } from '../../utils/projectConstants';
import { FilterMenu, SearchField, ClearFilters, useDismiss } from '../ui';

const DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'month', label: 'Month' },
  { value: 'custom', label: 'Custom' },
];

export function DateFilterDropdown({ value, onChange, isOpen, onToggle, onClose }) {
  const ref = useRef(null);
  const dateRange = value || { preset: null, start: '', end: '' };
  const selectedLabel = DATE_OPTIONS.find((o) => o.value === dateRange.preset)?.label;
  const isActive = !!dateRange.preset;
  useDismiss(ref, isOpen, onClose);

  const updateDateRange = (next) => {
    onChange({ ...dateRange, ...next });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`
          flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-label border transition-colors duration-150
          ${isActive
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
          }
        `}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M5.25 5.25h13.5A1.5 1.5 0 0120.25 6.75v12a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-12a1.5 1.5 0 011.5-1.5z" />
        </svg>
        <span>{selectedLabel || 'Date'}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''} ${isActive ? 'text-blue-500' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 animate-scale-in z-40">
          <button
            onClick={() => { onChange({ preset: null, start: '', end: '' }); onClose(); }}
            className={`w-full text-left px-3.5 py-2 text-body-sm flex items-center justify-between transition-colors ${
              !dateRange.preset ? 'text-blue-700 bg-blue-50/60' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>All time</span>
            {!dateRange.preset && (
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <div className="border-t border-gray-100 my-1" />
          {DATE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange({
                  preset: option.value === dateRange.preset ? null : option.value,
                  start: option.value === 'custom' ? dateRange.start : '',
                  end: option.value === 'custom' ? dateRange.end : '',
                });
                if (option.value !== 'custom') onClose();
              }}
              className={`w-full text-left px-3.5 py-2 text-body-sm flex items-center justify-between transition-colors ${
                option.value === dateRange.preset ? 'text-blue-700 bg-blue-50/60' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{option.label}</span>
              {option.value === dateRange.preset && (
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}

          {dateRange.preset === 'custom' && (
            <div className="border-t border-gray-100 mt-1 px-3.5 py-3 space-y-2">
              <div>
                <label className="block text-label text-gray-500 mb-1">Start date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => updateDateRange({ preset: 'custom', start: e.target.value })}
                  className="w-full px-3 py-2 text-body border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-label text-gray-500 mb-1">End date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => updateDateRange({ preset: 'custom', end: e.target.value })}
                  className="w-full px-3 py-2 text-body border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({ filters, onFiltersChange, activeFilterCount, dateOnly = false }) {
  const [dateOpen, setDateOpen] = useState(false);

  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    if (dateOnly) {
      onFiltersChange({ ...filters, dateRange: { preset: null, start: '', end: '' } });
      return;
    }
    onFiltersChange({ status: null, type: null, ownership: null, search: '', dateRange: { preset: null, start: '', end: '' } });
  };

  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {!dateOnly && (
        <>
          <FilterMenu
            label="Status"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            options={PROJECT_STATUSES}
            value={filters.status}
            onChange={(val) => updateFilter('status', val)}
            renderOption={(option) => (
              <>
                <div className={`w-2 h-2 rounded-full ${option.dot} shrink-0`} />
                {option.label}
              </>
            )}
          />
          <FilterMenu
            label="Type"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
              </svg>
            }
            options={PROJECT_TYPES}
            value={filters.type}
            onChange={(val) => updateFilter('type', val)}
          />
          <FilterMenu
            label="Ownership"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            }
            options={OWNERSHIP_OPTIONS}
            value={filters.ownership}
            onChange={(val) => updateFilter('ownership', val)}
          />
        </>
      )}

      <DateFilterDropdown
        value={filters.dateRange}
        onChange={(val) => updateFilter('dateRange', val)}
        isOpen={dateOpen}
        onToggle={() => setDateOpen((o) => !o)}
        onClose={() => setDateOpen(false)}
      />

      <ClearFilters count={activeFilterCount} onClear={clearAllFilters} />

      {!dateOnly && (
        <div className="ml-auto flex items-center">
          <SearchField value={filters.search} onChange={(v) => updateFilter('search', v)} placeholder="Search projects..." label="Search projects" />
        </div>
      )}
    </div>
  );
}
