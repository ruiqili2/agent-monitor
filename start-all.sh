#!/bin/bash
# Start AgentMonitor + AI Council Chamber

set -e

echo "🚀 Starting AgentMonitor + AI Council..."

# Start AgentMonitor
echo "📊 Starting AgentMonitor on port 3000..."
cd ~/agent-monitor-openclaw-dashboard
npm run dev > /tmp/agent-monitor.log 2>&1 &
AGENT_MONITOR_PID=$!

# Wait for AgentMonitor to start
sleep 5

# Start AI Council
echo "🏛️ Starting AI Council Chamber on port 5174..."
cd ~/AI-Bot-Council-Concensus
npm run dev > /tmp/ai-council.log 2>&1 &
AI_COUNCIL_PID=$!

# Wait for Council to start
sleep 5

echo ""
echo "✅ Both services started!"
echo ""
echo "📊 AgentMonitor: http://localhost:3000"
echo "🏛️ AI Council:    http://localhost:5174"
echo "🏛️ Integrated:    http://localhost:3000/council"
echo ""
echo "PIDs:"
echo "  AgentMonitor: $AGENT_MONITOR_PID"
echo "  AI Council:   $AI_COUNCIL_PID"
echo ""
echo "To stop: kill $AGENT_MONITOR_PID $AI_COUNCIL_PID"

# Wait for both processes
wait
