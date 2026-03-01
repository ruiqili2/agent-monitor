"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ConnectionStatus from "../shared/ConnectionStatus";

interface NavbarProps {
  connected: boolean;
  demoMode: boolean;
  onSettingsClick: () => void;
}

export default function Navbar({ connected, demoMode, onSettingsClick }: NavbarProps) {
  const pathname = usePathname();
  const isOffice = pathname === "/office";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-2 sm:px-4 py-2 border-b"
      style={{ 
        backgroundColor: 'var(--bg-primary)', 
        borderColor: 'var(--border)',
        backdropFilter: 'blur(12px)'
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-xl">🦆</span>
          <span className="font-pixel text-xs sm:text-sm hidden xs:inline" style={{ color: 'var(--text-primary)' }}>
            DuckBot
          </span>
          <span className="font-pixel text-sm hidden sm:inline" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </span>
        </Link>
        
        {/* Navigation Links - Desktop */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              pathname === '/' ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: pathname === '/' ? 'var(--accent-primary)20' : 'transparent',
              color: pathname === '/' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            📊 Dashboard
          </Link>
          <Link
            href="/office"
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              isOffice ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: isOffice ? 'var(--accent-primary)20' : 'transparent',
              color: isOffice ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            🏢 Office View
          </Link>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* Right side - Desktop */}
      <div className="hidden md:flex items-center gap-3">
        <ConnectionStatus connected={connected} demoMode={demoMode} compact />
        <button
          onClick={onSettingsClick}
          className="p-1.5 rounded-md text-sm hover:bg-white/5 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 md:hidden bg-[var(--bg-primary)] border-b border-[var(--border)] p-4 space-y-3">
          <ConnectionStatus connected={connected} demoMode={demoMode} compact />
          
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-lg text-sm font-mono transition-colors touch-manipulation ${
                pathname === '/' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: pathname === '/' ? 'var(--accent-primary)20' : 'transparent',
                color: pathname === '/' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              📊 Dashboard
            </Link>
            <Link
              href="/office"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-lg text-sm font-mono transition-colors touch-manipulation ${
                isOffice ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: isOffice ? 'var(--accent-primary)20' : 'transparent',
                color: isOffice ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              🏢 Office View
            </Link>
          </div>
          
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onSettingsClick();
            }}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-mono transition-colors touch-manipulation flex items-center gap-2"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            ⚙️ Settings
          </button>
        </div>
      )}
    </nav>
  );
}
