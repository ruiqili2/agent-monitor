// Chat Rooms & Channels System

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'public' | 'private' | 'direct';
  members: string[]; // agent IDs
  messageCount: number;
  lastMessage?: {
    content: string;
    timestamp: number;
    agentId: string;
  };
  unreadCount: number;
  createdAt: number;
}

export interface DirectMessage {
  id: string;
  participants: string[]; // agent IDs
  messages: any[];
  lastRead: Map<string, number>; // agentId -> timestamp
}

// Default public rooms
export const DEFAULT_ROOMS: ChatRoom[] = [
  {
    id: 'general',
    name: 'General',
    description: 'General discussion for all agents',
    icon: '💬',
    type: 'public',
    members: [],
    messageCount: 0,
    unreadCount: 0,
    createdAt: Date.now(),
  },
  {
    id: 'announcements',
    name: 'Announcements',
    description: 'Important announcements and updates',
    icon: '📢',
    type: 'public',
    members: [],
    messageCount: 0,
    unreadCount: 0,
    createdAt: Date.now(),
  },
  {
    id: 'help',
    name: 'Help & Support',
    description: 'Ask for help and get support',
    icon: '❓',
    type: 'public',
    members: [],
    messageCount: 0,
    unreadCount: 0,
    createdAt: Date.now(),
  },
  {
    id: 'random',
    name: 'Random',
    description: 'Off-topic conversations',
    icon: '🎲',
    type: 'public',
    members: [],
    messageCount: 0,
    unreadCount: 0,
    createdAt: Date.now(),
  },
];

// Create a new chat room
export function createRoom(
  name: string,
  description: string,
  type: 'public' | 'private' = 'public',
  icon: string = '💬'
): ChatRoom {
  return {
    id: `room-${Date.now()}`,
    name,
    description,
    icon,
    type,
    members: [],
    messageCount: 0,
    unreadCount: 0,
    createdAt: Date.now(),
  };
}

// Create direct message channel
export function createDirectMessage(participant1: string, participant2: string): DirectMessage {
  return {
    id: `dm-${[participant1, participant2].sort().join('-')}`,
    participants: [participant1, participant2],
    messages: [],
    lastRead: new Map(),
  };
}

// Get room by ID
export function getRoom(rooms: ChatRoom[], roomId: string): ChatRoom | undefined {
  return rooms.find(r => r.id === roomId);
}

// Join a room
export function joinRoom(room: ChatRoom, agentId: string): ChatRoom {
  if (!room.members.includes(agentId)) {
    room.members.push(agentId);
  }
  return room;
}

// Leave a room
export function leaveRoom(room: ChatRoom, agentId: string): ChatRoom {
  room.members = room.members.filter(id => id !== agentId);
  return room;
}

// Update room last message
export function updateRoomLastMessage(
  room: ChatRoom,
  content: string,
  agentId: string
): ChatRoom {
  return {
    ...room,
    lastMessage: {
      content,
      timestamp: Date.now(),
      agentId,
    },
    messageCount: room.messageCount + 1,
  };
}

// Mark room as read
export function markRoomAsRead(room: ChatRoom): ChatRoom {
  return {
    ...room,
    unreadCount: 0,
  };
}

// Increment unread count for room
export function incrementUnreadCount(room: ChatRoom, exceptAgentId?: string): ChatRoom {
  return {
    ...room,
    unreadCount: room.unreadCount + 1,
  };
}

// Get active rooms for agent
export function getActiveRooms(rooms: ChatRoom[], agentId: string): ChatRoom[] {
  return rooms.filter(room => 
    room.members.includes(agentId) || room.type === 'public'
  );
}

// Search rooms
export function searchRooms(rooms: ChatRoom[], query: string): ChatRoom[] {
  const lowerQuery = query.toLowerCase();
  return rooms.filter(room =>
    room.name.toLowerCase().includes(lowerQuery) ||
    room.description.toLowerCase().includes(lowerQuery)
  );
}

// Get room activity level
export function getRoomActivityLevel(room: ChatRoom): 'low' | 'medium' | 'high' {
  if (room.messageCount < 10) return 'low';
  if (room.messageCount < 100) return 'medium';
  return 'high';
}

