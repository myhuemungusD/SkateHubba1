export type GameState = {
  p1Letters: number; // 0..5
  p2Letters: number; // 0..5
  turn: string | null;
  status: "PENDING_ACCEPT" | "ACTIVE" | "COMPLETED" | "DECLINED";
};

export type Game = {
  id: string;
  players: [string, string];
  createdBy: string;
  createdAt: any;       // Firestore Timestamp type
  lastActionAt: any;
  state: GameState;
  winnerId?: string | null;
  finishedAt?: any | null;
};

export type Round = {
  id: string;
  gameId: string;
  index: number;
  attackerId: string;
  defenderId: string;
  attackerVideoUrl: string;
  defenderVideoUrl?: string | null;
  defenderResult: "PENDING" | "MAKE" | "BAIL" | "TIMEOUT";
  deadlineReplyAt: any;
  status: "AWAITING_DEFENDER" | "COMPLETE";
  disputeStatus?: "NONE" | "OPEN" | "RESOLVED";
  createdAt: any;
  updatedAt: any;
};
