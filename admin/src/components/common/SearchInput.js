import React, { useState, useEffect, useRef } from 'react';

export default function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  const [local, setLocal] = useState(value || '');
  const timer = useRef(null);

  useEffect(() => { setLocal(value || ''); }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocal(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(val), 300);
  };

  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        type="search"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
      />
    </div>
  );
}
