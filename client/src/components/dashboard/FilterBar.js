import React, { useState, useRef, useEffect } from 'react';
import { PROJECT_STATUSES, PROJECT_TYPES, OWNERSHIP_OPTIONS } from '../../utils/projectConstants';

function FilterDropdown({ label, icon, options, value, onChange, isOpen, onToggle, onClose, renderOption }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const escHandler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [isOpen, onClose]);

  const selectedLabel = options.find((o) => o.value === value)?.label;
  const isActive = value !== null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all duration-150
          ${isActive
            ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium shadow-sm'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 shadow-sm'
          }
        `}
      >
        {icon}
        <span>{selectedLabel || label}</span>
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
        <div className="absolute left-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 animate-scale-in z-40">
          {/* "All" option to clear this filter */}
          <button
            onClick={() => { onChange(null); onClose(); }}
            className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between transition-colors rounded-md mx-0 ${
              value === null ? 'text-blue-700 bg-blue-50/60' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>All</span>
            {value === null && (
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <div className="border-t border-gray-100 my-1" />
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value === value ? null : option.value); onClose(); }}
              className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between transition-colors ${
                option.value === value ? 'text-blue-700 bg-blue-50/60' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {renderOption ? renderOption(option) : option.label}
              </span>
              {option.value === value && (
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({ filters, onFiltersChange, activeFilterCount }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  const toggleDropdown = (name) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({ status: null, type: null, ownership: null, search: '' });
    setSearchExpanded(false);
  };

  return (
    <div className="flex items-center gap-2.5 mb-6 flex-wrap">
      {/* Filter icon + label */}
      <div className="flex items-center gap-2 mr-1">
        <div className="flex items-center gap-1.5 text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
        </div>
        <span className="text-sm font-medium text-gray-500 hidden sm:inline">Filter by</span>
      </div>

      {/* Status dropdown */}
      <FilterDropdown
        label="Status"
        icon={
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        options={PROJECT_STATUSES}
        value={filters.status}
        onChange={(val) => updateFilter('status', val)}
        isOpen={openDropdown === 'status'}
        onToggle={() => toggleDropdown('status')}
        onClose={() => setOpenDropdown(null)}
        renderOption={(option) => (
          <>
            <div className={`w-2 h-2 rounded-full ${option.dot} shrink-0`} />
            {option.label}
          </>
        )}
      />

      {/* Type dropdown */}
      <FilterDropdown
        label="Type"
        icon={
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
          </svg>
        }
        options={PROJECT_TYPES}
        value={filters.type}
        onChange={(val) => updateFilter('type', val)}
        isOpen={openDropdown === 'type'}
        onToggle={() => toggleDropdown('type')}
        onClose={() => setOpenDropdown(null)}
      />

      {/* Ownership dropdown */}
      <FilterDropdown
        label="Ownership"
        icon={
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        }
        options={OWNERSHIP_OPTIONS}
        value={filters.ownership}
        onChange={(val) => updateFilter('ownership', val)}
        isOpen={openDropdown === 'ownership'}
        onToggle={() => toggleDropdown('ownership')}
        onClose={() => setOpenDropdown(null)}
      />

      {/* Active filter count badge + clear */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearAllFilters}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
        >
          <span className="w-4.5 h-4.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center" style={{ width: '18px', height: '18px' }}>
            {activeFilterCount}
          </span>
          <span>Clear all</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Right side - Search */}
      <div className="ml-auto flex items-center">
        {searchExpanded ? (
          <div className="flex items-center gap-2 animate-scale-in">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search projects..."
                className="w-56 pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              />
              {filters.search && (
                <button
                  onClick={() => updateFilter('search', '')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={() => { setSearchExpanded(false); updateFilter('search', ''); }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchExpanded(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
            title="Search projects"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
