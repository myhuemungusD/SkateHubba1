import { Game, Turn } from "../../types/skate";

/**
 * Creates a new Game object with initial state.
 * Note: The ID should be generated externally (e.g. by Firestore).
 */
export function createGame(id: string, playerA: string, playerB: string): Game {
  const now = Date.now();
  return {
    id,
    playerA,
    playerB,
    status: "pending",
    currentTurn: "A",
    turns: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a Turn object representing a submitted trick.
 * The result is initially "pending" and letter is empty, as the server
 * is authoritative on the outcome.
 */
export function submitTurn(turnData: {
  id: string;
  gameId: string;
  playerId: string;
  videoUrl: string;
  trickName: string;
}): Turn {
  return {
    id: turnData.id,
    gameId: turnData.gameId,
    playerId: turnData.playerId,
    videoUrl: turnData.videoUrl,
    trickName: turnData.trickName,
    result: "pending",
    letter: "",
    createdAt: Date.now(),
  };
}

/**
 * Determines the next player's turn.
 */
export function nextTurn(currentTurn: "A" | "B"): "A" | "B" {
  return currentTurn === "A" ? "B" : "A";
}

/**
 * Returns the letter corresponding to the number of bails.
 * 1 -> S, 2 -> K, 3 -> A, 4 -> T, 5 -> E
 */
export function getLetterForBail(bailCount: number): string {
  const letters = ["S", "K", "A", "T", "E"];
  // bailCount is 1-based index for the letter (1st bail = S)
  // We clamp to the last letter if it exceeds 5
  const index = Math.min(Math.max(bailCount, 1), 5) - 1;
  return letters[index];
}

/**
 * Calculates the winner based on the number of letters (bails) each player has.
 * Returns the uid of the winner, or undefined if the game is not over.
 * This is a local calculation helper and does not modify the game state.
 */
export function calculateWinner(
  game: Game,
  lettersA: number,
  lettersB: number
): string | undefined {
  const MAX_LETTERS = 5;

  if (lettersA >= MAX_LETTERS) {
    return game.playerB;
  }

  if (lettersB >= MAX_LETTERS) {
    return game.playerA;
  }

  return undefined;
}
