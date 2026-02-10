// ============================================================================
// ConnectionStatus — Gateway connection indicator
// ============================================================================

'use client';

interface ConnectionStatusProps {
  connected: boolean;
  demoMode: boolean;
  error?: string | null;
  compact?: boolean;
}

export default function ConnectionStatus({ connected, demoMode, error, compact = false }: ConnectionStatusProps) {
  const dotColor = connected ? '#66BB6A' : demoMode ? '#FFCA28' : '#EF5350';
  const label = connected ? 'Connected' : demoMode ? 'Demo Mode' : 'Disconnected';
  const bgColor = connected
    ? 'rgba(102,187,106,0.1)'
    : demoMode
      ? 'rgba(255,202,40,0.1)'
      : 'rgba(239,83,80,0.1)';

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5" title={error ?? label}>
        <span className="relative flex h-2 w-2">
          {connected && (
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: dotColor }}
            />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${!connected && !demoMode ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: dotColor }}
          />
        </span>
        <span className="text-xs font-mono" style={{ color: dotColor }}>{label}</span>
      </span>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-mono"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${dotColor}30`,
        color: dotColor,
      }}
    >
      <span className="relative flex h-2.5 w-2.5">
        {connected && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: dotColor }}
          />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${!connected && !demoMode ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: dotColor }}
        />
      </span>
      <span>{label}</span>
      {error && <span className="text-[10px] opacity-70">({error})</span>}
    </div>
  );
}
