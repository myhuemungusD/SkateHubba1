export interface User {
  uid: string;
  handle: string;
  avatarUrl: string;
  fcmToken?: string;
  stats: {
    wins: number;
    losses: number;
    streak: number;
  };
}

export interface Game {
  id: string;
  playerA: string; // uid
  playerB: string; // uid
  status: "pending" | "in_progress" | "finished";
  currentTurn: "A" | "B";
  turns: string[]; // Array of turnIds
  winnerId?: string;
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

export interface Turn {
  id: string;
  gameId: string;
  playerId: string;
  videoUrl: string;
  trickName: string;
  result: "landed" | "bailed" | "pending";
  letter: string; // The letter assigned if bailed (e.g., "S", "K", etc.) or empty if landed
  createdAt: number; // Timestamp
}

export interface Follow {
  followerId: string;
  targetId: string;
}
