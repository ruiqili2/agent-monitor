// ============================================================================
// MiniOffice — Small office preview for the dashboard
// ============================================================================

'use client';

import Link from 'next/link';
import type { AgentConfig, AgentDashboardState, OwnerConfig, ThemeName } from '@/lib/types';
import { useOffice } from '@/hooks/useOffice';
import OfficeCanvasInner from './OfficeCanvas';

interface MiniOfficeProps {
  agents: AgentConfig[];
  agentStates: Record<string, AgentDashboardState>;
  ownerConfig: OwnerConfig;
  theme: ThemeName;
}

export default function MiniOffice({ agents, agentStates, ownerConfig, theme: _theme }: MiniOfficeProps) {
  const { officeState, tick } = useOffice(agents, agentStates);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-pixel text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>🏢</span>
          <span>Office</span>
        </h2>
        <Link
          href="/office"
          className="text-xs font-mono px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
          style={{ color: 'var(--accent-primary)' }}
        >
          Full View →
        </Link>
      </div>
      <Link href="/office" className="block group flex justify-center">
        <div
          className="relative rounded-xl overflow-hidden transition-all duration-300 group-hover:ring-2"
          style={{ border: '1px solid var(--border)', maxWidth: 900 }}
        >
          {/* Render at full resolution (1100x620) but display scaled down */}
          <OfficeCanvasInner
            officeState={officeState}
            agents={agents}
            owner={ownerConfig}
            onTick={tick}
            width={1100}
            height={620}
            displayWidth={900}
            displayHeight={510}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
            <span className="text-xs font-mono px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--accent-primary)', color: '#000' }}>
              Click to expand
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
