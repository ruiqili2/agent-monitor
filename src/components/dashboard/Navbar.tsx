// ============================================================================
// Navbar — Top navigation bar
// ============================================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ConnectionStatus from '@/components/shared/ConnectionStatus';

interface NavbarProps {
  connected: boolean;
  demoMode: boolean;
  onSettingsClick: () => void;
}

export default function Navbar({ connected, demoMode, onSettingsClick }: NavbarProps) {
  const pathname = usePathname();
  const isOffice = pathname === '/office';
  const isDashboard = pathname === '/';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 border-b"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-lg">🏢</span>
          <span className="font-pixel text-base tracking-wider" style={{ color: 'var(--accent-primary)' }}>
            AgentMonitor
          </span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center gap-1">
        <Link
          href="/"
          className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
            isDashboard ? 'text-white' : ''
          }`}
          style={{
            backgroundColor: isDashboard ? 'var(--accent-primary)20' : 'transparent',
            color: isDashboard ? 'var(--accent-primary)' : 'var(--text-secondary)',
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
        <Link
          href="/council"
          className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
            pathname === '/council' ? 'text-white' : ''
          }`}
          style={{
            backgroundColor: pathname === '/council' ? 'var(--accent-primary)20' : 'transparent',
            color: pathname === '/council' ? 'var(--accent-primary)' : 'var(--text-secondary)',
          }}
        >
          🏛️ Council
        </Link>
        </Link>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
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
    </nav>
  );
}
