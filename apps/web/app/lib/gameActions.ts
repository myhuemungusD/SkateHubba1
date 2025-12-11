import type { Game, Round } from "@skatehubba/types";

export type GamePrimaryAction =
  | { kind: "acceptOrDecline" }
  | { kind: "replyToTrick"; round: Round }
  | { kind: "setTrick" }
  | { kind: "waiting" }
  | { kind: "completed"; winnerId: string | null };

export function computePrimaryAction(
  game: Game,
  rounds: Round[],
  currentUserId: string
): GamePrimaryAction {
  const [p1, p2] = game.players;
  const isP1 = currentUserId === p1;
  const isP2 = currentUserId === p2;

  // Safety: if user isn't even in this game, just wait
  if (!isP1 && !isP2) {
    return { kind: "waiting" };
  }

  // 1) Game over
  if (game.state.status === "COMPLETED" || game.state.status === "DECLINED") {
    return {
      kind: "completed",
      winnerId: game.winnerId ?? null,
    };
  }

  // 2) Pending acceptance
  if (game.state.status === "PENDING_ACCEPT") {
    // Defender is p2 in our convention
    if (isP2) {
      return { kind: "acceptOrDecline" };
    }
    // Challenger just waits
    return { kind: "waiting" };
  }

  // From here: ACTIVE game

  // 3) Do we have a round waiting for our reply?
  const pendingReply = rounds.find(
    (r) =>
      r.defenderId === currentUserId &&
      r.defenderResult === "PENDING" &&
      r.status === "AWAITING_DEFENDER"
  );

  if (pendingReply) {
    return { kind: "replyToTrick", round: pendingReply };
  }

  // 4) Is it our turn to set the next trick?
  if (game.state.turn === currentUserId && game.state.status === "ACTIVE") {
    return { kind: "setTrick" };
  }

  // 5) Otherwise we’re just waiting
  return { kind: "waiting" };
}
