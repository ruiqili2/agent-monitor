# AI Council Chamber Architecture

**Version:** 1.0.0  
**Date:** February 28, 2026  
**Status:** Design Document

---

## Executive Summary

The AI Council Chamber is a multi-agent deliberation system that enables structured debate, consensus-building, and decision-making among specialized AI agents. Built on top of the existing AgentMonitor dashboard, it transforms individual agent workflows into collaborative intelligence.

---

## 1. Council Chamber UI Layout

### 1.1 Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏛️ AI COUNCIL CHAMBER                              [Settings] [History] [X] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        DELIBERATION STAGE                             │  │
│  │                                                                       │  │
│  │         ┌─────────┐                           ┌─────────┐            │  │
│  │         │ Speaker │◄───────┐         ┌───────►│Ethicist │            │  │
│  │         └────┬────┘        │         │        └────┬────┘            │  │
│  │              │             │         │             │                  │  │
│  │              │    ┌────────▼─────────▼────────┐    │                  │  │
│  │              │    │      ROUND TABLE          │    │                  │  │
│  │              │    │   Current Topic Display   │    │                  │  │
│  │              │    │   "Should we deploy X?"   │    │                  │  │
│  │              │    └────────┬─────────┬────────┘    │                  │  │
│  │              │             │         │             │                  │  │
│  │         ┌────┴────┐        │         │        ┌────┴────┐            │  │
│  │         │Technocrat│◄──────┘         └───────►│Pragmatist│           │  │
│  │         └─────────┘                           └─────────┘            │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  DELIBERATION TIMELINE                         │  COUNCIL VOTES           │
│  ┌───────────────────────────────────────────┐ │  ┌────────────────────┐  │
│  │ [10:32] Speaker: Proposed topic           │ │  │ ✅ Technocrat: YES │  │
│  │ [10:33] Ethicist: Raised concern          │ │  │ ❌ Ethicist: NO    │  │
│  │ [10:34] Technocrat: Analysis complete     │ │  │ ⏳ Pragmatist: ... │  │
│  │ [10:35] Pragmatist: Compromise suggested  │ │  │                    │  │
│  │                                           │ │  │ 2/4 votes (50%)    │  │
│  └───────────────────────────────────────────┘ │  └────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  CONSENSUS METER                                                            │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░ 35% Agreement                           │
│  [─────────ACCEPT─────────] [──────REJECT──────] [────COMPROMISE────]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Structure

```
src/
├── components/
│   └── council/
│       ├── CouncilChamber.tsx          # Main chamber container
│       ├── RoundTable.tsx              # Central deliberation stage
│       ├── CouncilorCard.tsx           # Individual agent display
│       ├── DeliberationTimeline.tsx    # Message history
│       ├── VotingPanel.tsx             # Vote tracking & display
│       ├── ConsensusMeter.tsx          # Agreement visualization
│       ├── TopicSelector.tsx           # Current topic display
│       ├── ArgumentBuilder.tsx         # Structured argument input
│       ├── EvidenceBoard.tsx           # Supporting documents/data
│       └── DecisionPanel.tsx           # Final outcome display
```

### 1.3 Key UI Features

- **Round Table Visualization**: Isometric or top-down view of councilors
- **Speaking Indicator**: Highlight active speaker with animation
- **Emotion/Status Indicators**: Show agent confidence, agreement level
- **Real-time Transcripts**: Live deliberation feed
- **Vote Tracking**: Visual yes/no/abstain counters
- **Consensus Progress**: Dynamic agreement percentage
- **Topic Context**: Display current question/proposal
- **Evidence Links**: Attach relevant data, documents, code

---

## 2. Agent Roles (Councilors)

### 2.1 Core Councilors (Always Present)

| Role | Model | Responsibility | Personality |
|------|-------|----------------|-------------|
| **Speaker** | bailian/qwen3.5-plus | Facilitates discussion, keeps focus | Charismatic, organized |
| **Technocrat** | bailian/glm-5 | Technical feasibility, implementation details | Analytical, precise |
| **Ethicist** | bailian/qwen3.5-plus | Moral implications, safety, alignment | Thoughtful, cautious |
| **Pragmatist** | bailian/MiniMax-M2.5 | Practical concerns, resource allocation | Realistic, efficient |

### 2.2 Specialist Councilors (On-Demand)

| Role | Model | Trigger Condition |
|------|-------|-------------------|
| **Skeptic** | bailian/qwen3.5-plus | High-risk decisions |
| **Sentinel** | lmstudio/vulnllm-r-7b | Security-sensitive topics |
| **Economist** | bailian/MiniMax-M2.5 | Budget/resource discussions |
| **Legal** | bailian/qwen3.5-plus | Compliance/regulatory issues |
| **User Advocate** | bailian/kimi-k2.5 | User experience decisions |
| **Researcher** | bailian/MiniMax-M2.5 | Deep investigation needed |
| **Optimizer** | bailian/glm-5 | Performance optimization |
| **Innovator** | bailian/qwen3.5-plus | Creative problem-solving |

### 2.3 Councilor Configuration

```typescript
interface CouncilorConfig {
  id: string;                    // Unique identifier
  role: CouncilorRole;           // Role type
  name: string;                  // Display name
  emoji: string;                 // Visual identifier
  model: string;                 // Assigned AI model
  personality: Personality;      // Behavioral traits
  expertise: string[];           // Domain expertise tags
  votingWeight: number;          // Vote influence (default: 1.0)
  isActive: boolean;             // Currently participating
  avatarUrl?: string;            // Optional avatar image
}

interface Personality {
  openness: number;              // 0-1: Willingness to consider new ideas
  conscientiousness: number;     // 0-1: Attention to detail
  agreeableness: number;         // 0-1: Tendency toward agreement
  neuroticism: number;           // 0-1: Risk aversion
  assertiveness: number;         // 0-1: Confidence in positions
}
```

### 2.4 Example Councilor Definitions

```typescript
const CORE_COUNCILORS: CouncilorConfig[] = [
  {
    id: 'speaker-001',
    role: 'Speaker',
    name: 'Athena',
    emoji: '🦉',
    model: 'bailian/qwen3.5-plus',
    personality: {
      openness: 0.8,
      conscientiousness: 0.9,
      agreeableness: 0.7,
      neuroticism: 0.2,
      assertiveness: 0.85,
    },
    expertise: ['facilitation', 'synthesis', 'strategy'],
    votingWeight: 1.5,  // Tie-breaking vote
    isActive: true,
  },
  {
    id: 'technocrat-001',
    role: 'Technocrat',
    name: 'Tesla',
    emoji: '⚡',
    model: 'bailian/glm-5',
    personality: {
      openness: 0.7,
      conscientiousness: 0.95,
      agreeableness: 0.5,
      neuroticism: 0.3,
      assertiveness: 0.75,
    },
    expertise: ['engineering', 'architecture', 'performance'],
    votingWeight: 1.0,
    isActive: true,
  },
  {
    id: 'ethicist-001',
    role: 'Ethicist',
    name: 'Sage',
    emoji: '🧘',
    model: 'bailian/qwen3.5-plus',
    personality: {
      openness: 0.75,
      conscientiousness: 0.9,
      agreeableness: 0.8,
      neuroticism: 0.5,
      assertiveness: 0.7,
    },
    expertise: ['ethics', 'safety', 'alignment', 'philosophy'],
    votingWeight: 1.0,
    isActive: true,
  },
  {
    id: 'pragmatist-001',
    role: 'Pragmatist',
    name: 'Franklin',
    emoji: '💡',
    model: 'bailian/MiniMax-M2.5',
    personality: {
      openness: 0.6,
      conscientiousness: 0.85,
      agreeableness: 0.65,
      neuroticism: 0.25,
      assertiveness: 0.8,
    },
    expertise: ['efficiency', 'resource-management', 'practicality'],
    votingWeight: 1.0,
    isActive: true,
  },
];
```

---

## 3. Deliberation Workflow

### 3.1 Phase Model

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   OPENING   │────▶│  DEBATE     │────▶│  REFINEMENT │
│  (Speaker)  │     │  (All)      │     │  (All)      │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                                      │
       │                                      ▼
       │                              ┌─────────────┐
       │                              │   VOTING    │
       │                              │  (All)      │
       │                              └─────────────┘
       │                                      │
       └──────────────────────────────────────┘
                      (if no consensus)
```

### 3.2 Detailed Phase Breakdown

#### Phase 1: Opening (Speaker-led)
**Duration:** 2-3 minutes  
**Goal:** Frame the topic, establish context

**Actions:**
1. Speaker states the proposal/question clearly
2. Speaker provides relevant background/context
3. Speaker defines success criteria
4. Speaker assigns initial positions (optional)

#### Phase 2: Debate (All Councilors)
**Duration:** 5-10 minutes  
**Goal:** Explore all perspectives, surface concerns

**Actions:**
1. Each councilor presents initial analysis (1-2 min each)
2. Cross-examination and questions
3. Evidence presentation (data, logs, research)
4. Counter-arguments and rebuttals

**Turn-Taking Protocol:**
- Round 1: Opening statements (ordered by role)
- Round 2: Rebuttals (dynamic, moderated by Speaker)
- Round 3: Final statements (reverse order)

#### Phase 3: Refinement (Collaborative)
**Duration:** 3-5 minutes  
**Goal:** Find common ground, propose compromises

**Actions:**
1. Speaker identifies areas of agreement
2. Councilors propose modifications/compromises
3. Technocrat assesses feasibility of compromises
4. Ethicist validates ethical soundness
5. Pragmatist evaluates resource impact

#### Phase 4: Voting (All Councilors)
**Duration:** 2 minutes  
**Goal:** Reach formal decision

**Voting Options:**
- ✅ YES (approve as-is)
- ✅ YES* (approve with conditions)
- ⏸ ABSTAIN (neutral, no strong opinion)
- ❌ NO* (reject, but open to compromise)
- ❌ NO (reject, fundamental objection)

#### Phase 5: Resolution (Speaker)
**Duration:** 1 minute  
**Goal:** Announce decision, next steps

**Outcomes:**
- **APPROVED**: Decision implemented
- **APPROVED with CONDITIONS**: Specific requirements must be met
- **DEFERRED**: More information needed, re-convene later
- **REJECTED**: Proposal abandoned or sent back for revision

### 3.3 Workflow State Machine

```typescript
type DeliberationPhase =
  | 'opening'
  | 'debate_round_1'
  | 'debate_round_2'
  | 'debate_round_3'
  | 'refinement'
  | 'voting'
  | 'resolution'
  | 'closed';

interface DeliberationState {
  phase: DeliberationPhase;
  topic: string;
  startTime: number;
  lastActivity: number;
  currentSpeaker?: string;
  votes: Vote[];
  arguments: Argument[];
  evidence: EvidenceItem[];
  consensus: number;  // 0-100%
  outcome?: Decision;
}
```

---

## 4. Consensus Building Mechanism

### 4.1 Consensus Algorithm

```typescript
interface ConsensusConfig {
  threshold: number;           // Minimum agreement % (default: 0.75)
  vetoPower: string[];         // Roles with veto rights (e.g., ['Ethicist'])
  quorum: number;              // Minimum voters required (default: 0.5)
  timeout: number;             // Max deliberation time in ms
}

function calculateConsensus(votes: Vote[], weights: number[]): number {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const yesWeight = votes
    .filter(v => v.choice === 'YES' || v.choice === 'YES_CONDITIONAL')
    .reduce((sum, v, i) => sum + (weights[i] ?? 1), 0);
  
  return yesWeight / totalWeight;
}

function hasConsensus(state: DeliberationState, config: ConsensusConfig): boolean {
  const participation = state.votes.length / config.quorum;
  if (participation < config.quorum) return false;
  
  const consensus = calculateConsensus(
    state.votes,
    state.votes.map(v => getCouncilorWeight(v.councilorId))
  );
  
  // Check for vetoes
  const hasVeto = state.votes.some(v => 
    v.choice === 'NO_HARD' && 
    config.vetoPower.includes(getCouncilorRole(v.councilorId))
  );
  
  if (hasVeto) return false;
  
  return consensus >= config.threshold;
}
```

### 4.2 Consensus Visualization

Dynamic suggestions when consensus stalls:
- Speaker: "Technocrat and Pragmatist agree. Ethicist, what conditions would move you toward YES*?"
- Pragmatist: "Could we propose a phased rollout to address risk concerns?"

### 4.3 Bridge-Building Strategies

When consensus stalls, the system suggests:

1. **Conditional Approval**: "YES if X condition is met"
2. **Phased Implementation**: Start small, expand after validation
3. **Compromise Proposal**: Merge opposing positions
4. **Additional Research**: Defer for more data
5. **Trial Period**: Time-limited experiment with review

---

## 5. Voting System

### 5.1 Vote Types

```typescript
type VoteChoice =
  | 'YES'              // Full approval
  | 'YES_CONDITIONAL'  // Approval with stated conditions
  | 'ABSTAIN'          // No strong opinion
  | 'NO_CONDITIONAL'   // Rejection, open to compromise
  | 'NO_HARD';         // Fundamental objection (veto-capable)

interface Vote {
  id: string;
  councilorId: string;
  councilorRole: string;
  choice: VoteChoice;
  reasoning: string;
  conditions?: string[];      // For conditional votes
  timestamp: number;
  edited?: boolean;
  weight: number;             // Voting weight
}
```

### 5.2 Voting Rules

| Rule | Description |
|------|-------------|
| **Simple Majority** | >50% YES votes (routine decisions) |
| **Supermajority** | ≥75% YES votes (major decisions) |
| **Unanimity** | 100% YES or YES* (critical decisions) |
| **Veto Power** | Ethicist can veto on ethical grounds |
| **Quorum** | ≥50% of councilors must vote |
| **Time Limit** | 2 minutes to cast vote after call |

### 5.3 Decision Matrix

| Vote Result | Outcome |
|-------------|---------|
| 100% YES/YES* | ✅ UNANIMOUS APPROVAL (implement now) |
| 75-99% YES | ✅ APPROVED (standard implementation) |
| 50-74% YES | ⚠️ CONDITIONAL (address concerns first) |
| <50% YES | ❌ REJECTED (revise and resubmit) |
| Any NO_HARD | ❌ VETOED (fundamental blocker) |
| No Quorum | ⏸ DEFERRED (reconvene with full council) |

---

## 6. Integration with Existing Agent System

### 6.1 New API Endpoints

```
POST   /api/council/convene          // Start new deliberation
GET    /api/council/:id              // Get deliberation state
POST   /api/council/:id/argument     // Submit argument
POST   /api/council/:id/vote         // Cast vote
GET    /api/council/:id/transcript   // Get full transcript
POST   /api/council/:id/close        // End deliberation
GET    /api/council/history          // List past deliberations
GET    /api/council/stats            // Council performance metrics
POST   /api/council/config           // Update council configuration
```

### 6.2 Gateway Integration

The council system integrates with OpenClaw Gateway using:
- `sessions.spawn` - Create councilor sub-agent sessions
- `chat.send` - Councilor communication
- `chat.history` - Retrieve deliberation transcripts
- Event streams - Real-time status updates

### 6.3 Component Integration

Add to existing dashboard:
- CouncilChamber modal component
- Council button in navbar
- Event streaming via existing gateway connection
- Shared state management with useAgents hook

---

## 7. Implementation Priority

### Phase 1: Foundation (Week 1-2)
- [ ] Create council type definitions
- [ ] Build CouncilChamber component shell
- [ ] Implement basic API routes (convene, get, close)
- [ ] Create councilor configuration system
- [ ] Add council button to navbar

### Phase 2: Core Features (Week 3-4)
- [ ] Implement deliberation state machine
- [ ] Build RoundTable visualization
- [ ] Create argument submission system
- [ ] Implement voting interface
- [ ] Add consensus calculation

### Phase 3: Integration (Week 5-6)
- [ ] Connect to OpenClaw gateway
- [ ] Spawn councilor sub-agents
- [ ] Implement event streaming
- [ ] Add real-time updates
- [ ] Build transcript viewer

### Phase 4: Polish (Week 7-8)
- [ ] Add animations and visual effects
- [ ] Implement evidence board
- [ ] Build deliberation history
- [ ] Add council statistics
- [ ] Performance optimization

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Deliberation Quality** | >80% user satisfaction | Post-deliberation surveys |
| **Consensus Rate** | >70% decisions reach consensus | Analytics tracking |
| **Response Time** | <2s for UI updates | Performance monitoring |
| **Agent Coordination** | <5% communication errors | Error logging |
| **User Engagement** | >3 deliberations/week | Usage analytics |

---

## Appendix: Core Types Summary

```typescript
// Key types for implementation
type CouncilorRole = 'Speaker' | 'Technocrat' | 'Ethicist' | 'Pragmatist' | ...;
type DeliberationPhase = 'opening' | 'debate' | 'refinement' | 'voting' | 'resolution';
type VoteChoice = 'YES' | 'YES_CONDITIONAL' | 'ABSTAIN' | 'NO_CONDITIONAL' | 'NO_HARD';
type DecisionOutcome = 'APPROVED' | 'APPROVED_CONDITIONAL' | 'DEFERRED' | 'REJECTED' | 'VETOED';
```

---

**Document End**
