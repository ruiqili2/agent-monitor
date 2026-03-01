// Chat Mentions System

export interface Mention {
  agentId: string;
  agentName: string;
  messageId: string;
  timestamp: number;
}

export interface ChatReaction {
  emoji: string;
  agentIds: string[];
  count: number;
}

// Extract mentions from message content
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

// Format message with mention highlights
export function formatMentions(content: string, agents: {id: string, name: string, color: string}[]): string {
  let formatted = content;
  
  agents.forEach(agent => {
    const mentionRegex = new RegExp(`@${agent.name}`, 'g');
    formatted = formatted.replace(
      mentionRegex,
      `<span style="color: ${agent.color}; font-weight: bold;">@${agent.name}</span>`
    );
  });
  
  return formatted;
}

// Check if user was mentioned
export function wasMentioned(content: string, userName: string): boolean {
  return content.includes(`@${userName}`);
}

// Get unread mentions count
export function getUnreadMentionsCount(messages: any[], userName: string, readMessages: Set<string>): number {
  return messages.filter(msg => 
    !readMessages.has(msg.id) && 
    wasMentioned(msg.content, userName)
  ).length;
}

// Add reaction to message
export function addReaction(
  reactions: Map<string, ChatReaction[]>,
  messageId: string,
  emoji: string,
  agentId: string
): Map<string, ChatReaction[]> {
  const newReactions = new Map(reactions);
  const messageReactions = newReactions.get(messageId) || [];
  
  const existingReaction = messageReactions.find(r => r.emoji === emoji);
  
  if (existingReaction) {
    if (!existingReaction.agentIds.includes(agentId)) {
      existingReaction.agentIds.push(agentId);
      existingReaction.count = existingReaction.agentIds.length;
    }
  } else {
    messageReactions.push({
      emoji,
      agentIds: [agentId],
      count: 1,
    });
  }
  
  newReactions.set(messageId, messageReactions);
  return newReactions;
}

// Remove reaction from message
export function removeReaction(
  reactions: Map<string, ChatReaction[]>,
  messageId: string,
  emoji: string,
  agentId: string
): Map<string, ChatReaction[]> {
  const newReactions = new Map(reactions);
  const messageReactions = newReactions.get(messageId) || [];
  
  const existingReaction = messageReactions.find(r => r.emoji === emoji);
  
  if (existingReaction) {
    existingReaction.agentIds = existingReaction.agentIds.filter(id => id !== agentId);
    existingReaction.count = existingReaction.agentIds.length;
    
    if (existingReaction.count === 0) {
      const index = messageReactions.indexOf(existingReaction);
      if (index > -1) {
        messageReactions.splice(index, 1);
      }
    }
  }
  
  if (messageReactions.length === 0) {
    newReactions.delete(messageId);
  } else {
    newReactions.set(messageId, messageReactions);
  }
  
  return newReactions;
}

// Get reaction count for message
export function getReactionCount(reactions: Map<string, ChatReaction[]>, messageId: string): number {
  const messageReactions = reactions.get(messageId) || [];
  return messageReactions.reduce((sum, r) => sum + r.count, 0);
}

// Popular emoji for reactions
export const POPULAR_EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '😡',
  '🎉', '🔥', '✨', '💯', '✅', '❌',
  '👀', '🚀', '💡', '⭐', '🏆', '💬',
];

