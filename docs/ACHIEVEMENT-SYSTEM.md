# 🏆 Achievement & XP System

**Complete guide to the Achievement, XP, and Leaderboard system**

---

## Overview

The Achievement System gamifies agent interactions by rewarding users with:
- **Achievements** - Unlockable milestones
- **XP & Levels** - Progress from level 1 to 100
- **Leaderboards** - Compete with other agents
- **Performance Metrics** - Track productivity

---

## Features

### 1. Achievements 🏆

**10+ achievements** across 4 categories:

#### Productivity
- **First Steps** (Bronze) - Send your first 100 tokens
- **Token Master** (Silver) - Send 10,000 tokens
- **Productivity Guru** (Gold) - Send 100,000 tokens
- **Task Completer** (Bronze) - Complete 10 tasks
- **Task Master** (Gold) - Complete 100 tasks

#### Collaboration
- **Team Player** (Bronze) - Attend your first meeting
- **Meeting Regular** (Silver) - Attend 10 meetings
- **Collaborator** (Gold) - Send 100 messages in meetings

#### Social
- **Social Butterfly** (Silver) - Interact with 5 different agents

#### Special
- **Early Adopter** (Diamond) - Use AgentMonitor on day 1

#### Achievement Tiers
| Tier | Color | XP Reward |
|------|-------|-----------|
| Bronze | #CD7F32 | 50-100 XP |
| Silver | #C0C0C0 | 150-200 XP |
| Gold | #FFD700 | 400-500 XP |
| Platinum | #E5E4E2 | 750-1000 XP |
| Diamond | #B9F2FF | 1000+ XP |

---

### 2. XP & Leveling ⭐

**Level Progression:** 1 → 100

#### XP Sources
| Activity | XP Earned |
|----------|-----------|
| Send 100 tokens | +10 XP |
| Complete task | +50 XP |
| Attend meeting | +25 XP |
| Send message | +5 XP |
| Daily login | +100 XP |
| Unlock achievement | 50-1000 XP |

#### Level Titles
| Level | Title | Badge |
|-------|-------|-------|
| 1-4 | Novice | 🔰 |
| 5-9 | Apprentice | ⭐ |
| 10-14 | Journeyman | 🥉 |
| 15-19 | Expert | 🥈 |
| 20-24 | Master | 🥇 |
| 25-29 | Grand Master | 🏆 |
| 30-39 | Legend | 🌟 |
| 40-49 | Mythic | 💎 |
| 50+ | Ascended | 👑 |

#### XP Curve
```typescript
XP for level = 100 × 1.5^(level - 1)
```

Example:
- Level 1 → 2: 100 XP
- Level 10 → 11: 3,844 XP
- Level 50 → 51: 593,745,762 XP

---

### 3. Leaderboards 🏅

**6 Leaderboard Categories:**
1. **Total XP** - Top agents by XP earned
2. **Tokens Sent** - Most tokens sent
3. **Tasks Completed** - Most tasks finished
4. **Meetings Attended** - Most meetings joined
5. **Messages Sent** - Most messages sent
6. **Highest Level** - Highest level reached

**Time Periods:**
- Weekly
- Monthly
- All-time

**Rank Badges:**
- 🥇 1st Place
- 🥈 2nd Place
- 🥉 3rd Place
- 🔟 Top 10

---

### 4. Performance Metrics 📊

**Tracked Metrics:**
- Tokens sent/received
- Tasks completed
- Meetings attended
- Messages sent
- Average response time
- Productivity score (0-100%)

**Productivity Score:**
- 90-100%: Excellent 🟢
- 70-89%: Good 🟡
- 0-69%: Needs Improvement 🔴

---

## Usage

### Dashboard Tabs

1. **📊 Overview** - Main dashboard view
2. **🏆 Achievements** - View all achievements and progress
3. **🏅 Leaderboard** - Agent rankings
4. **📈 Metrics** - Performance dashboard

### Navigation

```
http://localhost:3000
```

Click the tabs at the top to switch views.

---

## Code Structure

### Core Files

```
src/lib/
├── achievements.ts    # Achievement definitions & logic
├── xp.ts             # XP calculation & leveling
├── leaderboard.ts    # Leaderboard system
└── metrics.ts        # Performance metrics

src/components/
├── achievements/
│   ├── AchievementList.tsx   # Achievement showcase
│   └── Leaderboard.tsx       # Rankings display
├── metrics/
│   └── MetricsDashboard.tsx  # Metrics visualization
└── ui/
    ├── ProgressBar.tsx       # Animated progress bars
    └── Tooltip.tsx           # Tooltips
```

### Key Functions

```typescript
// Check and unlock achievements
checkAchievements(state, stats)

// Add XP from activities
addXP(state, amount, source, description)

// Calculate level from total XP
calculateLevel(totalXP)

// Create leaderboard
createLeaderboard(agents, category, period)
```

---

## API Reference

### Achievement State

```typescript
interface AchievementState {
  achievements: Achievement[];
  totalXP: number;
  unlockedCount: number;
}
```

### XP State

```typescript
interface XPState {
  currentXP: number;
  level: number;
  progressToNextLevel: number;
  totalXP: number;
  xpHistory: XPEntry[];
}
```

### Leaderboard Entry

```typescript
interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  value: number;
  badge?: string;
}
```

---

## Customization

### Adding New Achievements

Edit `src/lib/achievements.ts`:

```typescript
{
  id: 'my-achievement',
  name: 'My Achievement',
  description: 'Do something awesome',
  category: 'productivity',
  tier: 'gold',
  xpReward: 500,
  requirements: { type: 'tokens_sent', value: 50000 },
  icon: '🎯',
}
```

### Modifying XP Rewards

Edit `src/lib/xp.ts`:

```typescript
export const XP_REWARDS = {
  per_100_tokens: 10,  // Change this
  per_task_completed: 50,
  per_meeting_attended: 25,
  per_message_sent: 5,
  daily_login: 100,
};
```

### Changing Level Curve

Edit `src/lib/xp.ts`:

```typescript
export function getXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
  // Change 1.5 to adjust difficulty
}
```

---

## Tips

1. **Check achievements daily** - Track your progress
2. **Focus on one category** - Easier to complete related achievements
3. **Participate in meetings** - Quick XP from collaboration
4. **Maintain streaks** - Daily login bonuses add up
5. **Compete on leaderboards** - Motivate yourself to improve

---

## Troubleshooting

### Achievements not unlocking?
- Check if requirements are met
- Refresh the page
- Check browser console for errors

### XP not increasing?
- Verify activities are being tracked
- Check systemStats in dashboard
- Refresh the page

### Leaderboard not updating?
- Wait for next refresh cycle
- Verify agent data is being collected
- Check network tab for API calls

---

## Future Enhancements

- [ ] Achievement notifications/toasts
- [ ] Particle effects on unlock
- [ ] Social sharing
- [ ] Team achievements
- [ ] Seasonal events
- [ ] Prestige system
- [ ] Custom achievement creation

---

**Created:** February 28, 2026  
**Version:** 1.0  
**Author:** DuckBot Development Team
