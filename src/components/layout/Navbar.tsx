'use client';

import { useState } from 'react';
import Link from 'next/link';
import { navbarItems } from '@/lib/sidebar';
import SearchBar from './SearchBar';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg no-underline">
            <img src="/img/logo.svg" alt="doboku-note" className="h-8 w-8" />
            doboku-note
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navbarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-gray-700 hover:text-primary no-underline transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/about"
              className="text-sm text-gray-700 hover:text-primary no-underline transition-colors"
            >
              About
            </Link>
            <SearchBar />
            <a
              href="https://github.com/uruhayato373"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-700 hover:text-primary no-underline transition-colors"
            >
              GitHub
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-2">
            <div className="px-4 py-2">
              <SearchBar />
            </div>
            {navbarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-50 no-underline"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/about"
              className="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-50 no-underline"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <a
              href="https://github.com/uruhayato373"
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-50 no-underline"
            >
              GitHub
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
