// ============================================================================
// Zone Definitions — Named areas in the office
// ============================================================================

import type { Zone, ZoneId } from '@/lib/types';

// ---------------------------------------------------------------------------
// Zone templates
// ---------------------------------------------------------------------------

export const ZONES_TEMPLATE: Record<ZoneId, Omit<Zone, 'id'>> = {
  desk_0: { label: 'Desk 0', emoji: '🖥️', center: { col: 4, row: 3 }, minCol: 2, maxCol: 5, minRow: 2, maxRow: 4 },
  desk_1: { label: 'Desk 1', emoji: '🖥️', center: { col: 4, row: 6 }, minCol: 2, maxCol: 5, minRow: 5, maxRow: 7 },
  desk_2: { label: 'Desk 2', emoji: '🖥️', center: { col: 4, row: 9 }, minCol: 2, maxCol: 5, minRow: 8, maxRow: 10 },
  desk_3: { label: 'Desk 3', emoji: '🖥️', center: { col: 8, row: 3 }, minCol: 6, maxCol: 9, minRow: 2, maxRow: 4 },
  desk_4: { label: 'Desk 4', emoji: '🖥️', center: { col: 8, row: 6 }, minCol: 6, maxCol: 9, minRow: 5, maxRow: 7 },
  desk_5: { label: 'Desk 5', emoji: '🖥️', center: { col: 8, row: 9 }, minCol: 6, maxCol: 9, minRow: 8, maxRow: 10 },
  boss_office: { label: 'Boss Office', emoji: '👔', center: { col: 14, row: 3 }, minCol: 12, maxCol: 16, minRow: 1, maxRow: 4 },
  break_room: { label: 'Break Room', emoji: '☕', center: { col: 20, row: 3 }, minCol: 18, maxCol: 22, minRow: 1, maxRow: 5 },
  meeting_room: { label: 'Meeting Room', emoji: '🤝', center: { col: 14, row: 7 }, minCol: 12, maxCol: 16, minRow: 6, maxRow: 9 },
  whiteboard: { label: 'Whiteboard', emoji: '📝', center: { col: 10, row: 12 }, minCol: 9, maxCol: 11, minRow: 11, maxRow: 13 },
  library: { label: 'Library', emoji: '📚', center: { col: 10, row: 15 }, minCol: 9, maxCol: 12, minRow: 14, maxRow: 17 },
  lounge: { label: 'Lounge', emoji: '🛋️', center: { col: 20, row: 14 }, minCol: 18, maxCol: 22, minRow: 12, maxRow: 16 },
  server_room: { label: 'Server Room', emoji: '🖧', center: { col: 20, row: 9 }, minCol: 18, maxCol: 22, minRow: 7, maxRow: 10 },
  entrance: { label: 'Entrance', emoji: '🚪', center: { col: 2, row: 18 }, minCol: 1, maxCol: 4, minRow: 17, maxRow: 19 },
};

// ---------------------------------------------------------------------------
// Build zone map for N agents
// ---------------------------------------------------------------------------

export function buildZoneMap(agentCount: number): Record<ZoneId, Zone> {
  const zones: Partial<Record<ZoneId, Zone>> = {};
  for (const [id, tmpl] of Object.entries(ZONES_TEMPLATE)) {
    const zoneId = id as ZoneId;
    // Only include desks that have agents
    if (zoneId.startsWith('desk_')) {
      const idx = parseInt(zoneId.replace('desk_', ''), 10);
      if (idx >= agentCount) continue;
    }
    zones[zoneId] = { id: zoneId, ...tmpl };
  }
  return zones as Record<ZoneId, Zone>;
}

// ---------------------------------------------------------------------------
// Get zone by id
// ---------------------------------------------------------------------------

export function getZone(id: ZoneId, agentCount: number): Zone | undefined {
  const zones = buildZoneMap(agentCount);
  return zones[id];
}

// ---------------------------------------------------------------------------
// Get a random walkable point within a zone
// ---------------------------------------------------------------------------

export function getRandomPointInZone(zone: Zone): { col: number; row: number } {
  const col = zone.minCol + Math.floor(Math.random() * (zone.maxCol - zone.minCol + 1));
  const row = zone.minRow + Math.floor(Math.random() * (zone.maxRow - zone.minRow + 1));
  return { col, row };
}
