# Agent Monitor — Morning Bug Handoff

Date: 2026-03-08
Repo: `/Users/duckets/.openclaw/workspace/agent-monitor`

## Summary
Three parallel bug-check passes were completed. The biggest remaining issues are around:
- per-agent autowork policy saves
- duplicated/dead SSE handler logic in `useAgents.ts`
- live relay timing / stale behavior transitions
- token/context display correctness
- a few still-derived metrics and UX inconsistencies

This is the ranked fix list for the morning.

---

## Highest-Priority Fixes

### 1) Per-agent autowork save path is still effectively broken
**Severity:** High

**Problem:**
The per-agent policy save path in the dashboard was flagged as non-functional / not fully wired.

**Likely area:**
- `src/components/dashboard/AutoworkPanel.tsx`
- `src/app/page.tsx`
- `src/app/api/gateway/autowork/route.ts`

**What to verify/fix:**
- `onSavePolicy` is not a no-op
- per-agent save includes `sessionKey`
- backend applies and persists the specific policy instead of silently ignoring it
- UI reflects saved state after reload

**Acceptance check:**
- change a single agent’s interval/directive
- press Save
- reload page
- confirm only that agent’s policy persisted

---

### 2) `useAgents.ts` still has duplicated / dead SSE handler logic
**Severity:** High

**Problem:**
The hook still contains duplicated handler logic / dead code paths for SSE state handling. This is a cleanup and correctness issue and can cause future drift or relay weirdness.

**Likely area:**
- `src/hooks/useAgents.ts`

**What to verify/fix:**
- remove unused dead handler code
- keep only one real SSE `state` event path
- ensure cleanup is deterministic
- make sure reconnects do not accumulate listeners

**Acceptance check:**
- inspect file and confirm one source of truth for state event handling
- reload dashboard multiple times
- no duplicate feed spam from the same state transition

---

### 3) Relay timing / active state freshness still needs cleanup
**Severity:** High

**Problem:**
The dashboard can lag or show “working” late because of how live state transitions are mapped and applied.

**Likely area:**
- `src/hooks/useAgents.ts`
- `src/lib/state-mapper.ts`
- `src/app/api/gateway/events/route.ts`

**What to verify/fix:**
- ensure behavior refs update in the right order
- ensure tool/lifecycle states surface immediately
- confirm active work is visible during execution, not just after final event

**Acceptance check:**
- start a real subagent
- confirm card changes from idle to working quickly
- confirm feed updates during work, not only after completion

---

### 4) Token/context display semantics still need tightening
**Severity:** Medium

**Problem:**
Token display is much better now, but context/token max semantics may still be misleading.

**Likely area:**
- `src/components/dashboard/AgentCard.tsx`
- `src/components/TokenTracker.tsx`
- `src/lib/types.ts`
- gateway mapping in `src/app/api/gateway/route.ts`

**What to verify/fix:**
- token bars should use actual context max, not current usage as max
- unknown subagent usage should stay “not reported”, never fake zero
- cost estimate should not imply precision it does not have

**Acceptance check:**
- main agent token bar matches actual context behavior
- subagents with missing usage show unknown/not reported
- no fake output zeros or fake percentages

---

### 5) Metrics / leaderboard / achievements are improved but still partly inferred
**Severity:** Medium

**Problem:**
The obvious placeholders were removed, but some values are still inferred from local feed/task heuristics instead of hard gateway-backed truth.

**Likely area:**
- `src/app/page.tsx`
- `src/hooks/useMetrics.ts`
- `src/lib/metrics.ts`
- `src/lib/achievements.ts`

**What to verify/fix:**
- avoid `Math.max(...)` style stitched stats where possible
- document clearly which metrics are gateway-backed vs derived
- time range support should actually filter metrics if exposed
- task leaderboard should use reliable task sources only

**Acceptance check:**
- numbers across overview, metrics, achievements, and leaderboard agree more closely
- no obviously fake constants remain

---

## Additional Findings

### 6) Activity feed can still double-log or over-log on init/reconnect
**Severity:** Medium

**What to verify/fix:**
- dedupe repeated state entries
- reduce duplicate “idle” spam on reconnect / initial sync

---

### 7) Gateway request lifecycle could be cleaner
**Severity:** Medium

**Likely area:**
- `src/lib/gateway-connection.ts`

**What to verify/fix:**
- avoid too-eager ephemeral fallback requests
- prevent duplicate connection/request behavior during startup

---

### 8) Config save behavior could use debounce / clearer UX
**Severity:** Low

**Problem:**
Config writes are immediate and frequent.

**What to verify/fix:**
- debounce save to local storage
- make local-only overrides visually explicit

---

## Already Fixed Tonight
Do **not** re-fix these unless regressions appear:
- Activity feed no longer sits empty on first load
- local dashboard origin allowed for autowork actions (`127.0.0.1` etc.)
- subagents no longer falsely show token usage as `0`
- inline agent edit button added to cards
- inline edits now persist across refresh by overlaying local config on live agents
- token widget no longer hardcodes output `0`
- autowork default disabled on server
- `/agents` SSR `window` build crash fixed

---

## Recommended Morning Order
1. Fix per-agent autowork save path
2. Clean up duplicated SSE handler logic in `useAgents.ts`
3. Tighten real-time relay state updates / freshness
4. Fix token/context max semantics
5. Refine metrics/leaderboard correctness and time-range handling

---

## Validation Checklist
- [ ] change one agent autowork policy and reload
- [ ] trigger one real subagent and confirm immediate working state
- [ ] confirm feed updates during execution, not only at end
- [ ] confirm no duplicate idle spam on reconnect
- [ ] confirm main token/context bar uses sane max
- [ ] confirm subagent usage shows “not reported” when missing
- [ ] compare overview vs metrics vs leaderboard for consistency

---

## Note
ACP fix lanes were attempted after bug-check, but ACP runtime was unavailable at the time. Morning plan is to resume with ACP first if available.
