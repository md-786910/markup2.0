import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        isScrolled ? 'py-4' : 'py-6'
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <nav 
          className={`flex items-center justify-between px-6 py-3 transition-all duration-300 rounded-[24px] ${
            isScrolled 
              ? 'glass-white shadow-[0_8px_32px_rgba(0,0,0,0.05)] border-white/50' 
              : 'bg-transparent border-transparent'
          } border`}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6 shadow-lg shadow-gray-900/10">
              <span className="text-white font-black text-lg">M</span>
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">Markup</span>
          </Link>

          {/* Navigation */}
          <div className="hidden items-center gap-10 lg:flex">
            {['Product', 'Pricing', 'Showcase', 'About'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-[15px] font-bold text-gray-500 transition-colors hover:text-gray-900 relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-500 transition-all group-hover:w-full" />
              </a>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <Link 
              to="/login"
              className="px-6 py-2.5 text-[15px] font-bold text-gray-600 transition-colors hover:text-gray-900"
            >
              Log in
            </Link>
            <Link 
              to="/signup"
              className="rounded-2xl bg-gray-900 px-7 py-2.5 text-[15px] font-bold text-white transition-all hover:bg-brand-600 hover:-translate-y-0.5 shadow-lg shadow-gray-950/10 active:scale-95"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
