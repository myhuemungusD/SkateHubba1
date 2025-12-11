import { doc, setDoc, runTransaction, Timestamp } from "firebase/firestore";
import { firestore } from "@utils/firebaseClient";
import { Game, Round } from "@skatehubba/types";
import { v4 as uuidv4 } from "uuid";
import {
  assertCanAcceptGame,
  assertCanCreateGame,
  assertCanDeclineGame,
  assertCanSetTrick,
  assertCanSubmitReply,
} from "./gameGuards";

const GAMES_COLLECTION = "games";

/**
 * Creates a new Game in Firestore.
 */
export async function createGame(challengerId: string, defenderId: string): Promise<string> {
  assertCanCreateGame(challengerId, defenderId);

  const gameId = uuidv4();
  const now = Timestamp.now();

  const newGame: Game = {
    id: gameId,
    players: [challengerId, defenderId],
    createdBy: challengerId,
    createdAt: now,
    lastActionAt: now,
    roundsCount: 0,
    openRoundId: null,
    state: {
      p1Letters: 0,
      p2Letters: 0,
      turn: challengerId,
      status: "PENDING_ACCEPT"
    },
    winnerId: null,
    finishedAt: null
  };

  await setDoc(doc(firestore, GAMES_COLLECTION, gameId), newGame);
  return gameId;
}

/**
 * Accepts a game invitation.
 */
export async function acceptGame(gameId: string, defenderId: string): Promise<void> {
  const gameRef = doc(firestore, GAMES_COLLECTION, gameId);

  await runTransaction(firestore, async (transaction) => {
    const gameSnap = await transaction.get(gameRef);
    if (!gameSnap.exists()) {
      throw new Error("Game does not exist");
    }

    const game = gameSnap.data() as Game;

    assertCanAcceptGame(game, defenderId);

    transaction.update(gameRef, {
      "state.status": "ACTIVE",
      lastActionAt: Timestamp.now()
    });
  });
}

/**
 * Declines a game invitation.
 */
export async function declineGame(gameId: string, defenderId: string): Promise<void> {
  const gameRef = doc(firestore, GAMES_COLLECTION, gameId);

  await runTransaction(firestore, async (transaction) => {
    const gameSnap = await transaction.get(gameRef);
    if (!gameSnap.exists()) {
      throw new Error("Game does not exist");
    }

    const game = gameSnap.data() as Game;

    assertCanDeclineGame(game, defenderId);

    transaction.update(gameRef, {
      "state.status": "DECLINED",
      lastActionAt: Timestamp.now()
    });
  });
}

/**
 * Starts a new round by the attacker uploading a video.
 */
export async function startRoundByAttacker(
  gameId: string, 
  attackerId: string, 
  videoUrl: string,
  trickName?: string
): Promise<string> {
  const gameRef = doc(firestore, GAMES_COLLECTION, gameId);
  const roundId = uuidv4();
  const now = Timestamp.now();

  await runTransaction(firestore, async (transaction) => {
    const gameSnap = await transaction.get(gameRef);
    if (!gameSnap.exists()) {
      throw new Error("Game does not exist");
    }

    const game = gameSnap.data() as Game;

    assertCanSetTrick(game, attackerId);

    // Determine defender
    const defenderId = game.players.find(p => p !== attackerId);
    if (!defenderId) throw new Error("Opponent not found");

    // Compute next round index transactionally to avoid race conditions
    const currentCount = typeof game.roundsCount === "number" ? game.roundsCount : 0;
    const nextIndex = currentCount + 1;

    const newRound: Round = {
      id: roundId,
      gameId,
      index: nextIndex,
      attackerId,
      defenderId,
      attackerVideoUrl: videoUrl,
      trickName: trickName || undefined,
      defenderResult: "PENDING",
      deadlineReplyAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // 24h
      status: "AWAITING_DEFENDER",
      createdAt: now,
      updatedAt: now
    };

    // Create Round
    const roundRef = doc(firestore, GAMES_COLLECTION, gameId, "rounds", roundId);
    transaction.set(roundRef, newRound);

    // Update Game
    transaction.update(gameRef, {
      lastActionAt: now,
      roundsCount: nextIndex,
      openRoundId: roundId
    });
  });

  return roundId;
}

/**
 * Submits the defender's reply (Make or Bail).
 */
export async function submitDefenderReply(
  gameId: string, 
  roundId: string, 
  defenderId: string, 
  videoUrl: string, 
  didMake: boolean
): Promise<void> {
  const gameRef = doc(firestore, GAMES_COLLECTION, gameId);
  const roundRef = doc(firestore, GAMES_COLLECTION, gameId, "rounds", roundId);
  const now = Timestamp.now();

  await runTransaction(firestore, async (transaction) => {
    const gameSnap = await transaction.get(gameRef);
    const roundSnap = await transaction.get(roundRef);

    if (!gameSnap.exists() || !roundSnap.exists()) {
      throw new Error("Game or Round not found");
    }

    const game = gameSnap.data() as Game;
    const round = roundSnap.data() as Round;

    assertCanSubmitReply(game, round, defenderId);

    // Update Round
    const defenderResult = didMake ? "MAKE" : "BAIL";
    transaction.update(roundRef, {
      defenderResult,
      defenderVideoUrl: videoUrl,
      status: "COMPLETE",
      updatedAt: now
    });

    // Update Game State
    const updates: Record<string, unknown> = {
      lastActionAt: now
    };

    if (didMake) {
      // Defender made it. Turn stays with attacker (who is currently game.state.turn).
      // No letter changes.
    } else {
      // Defender bailed.
      // 1. Assign letter to defender.
      // Defender is round.defenderId.
      // Check if defender is p1 or p2.
      // game.players[0] is p1, game.players[1] is p2.
      
      let p1Letters = game.state.p1Letters;
      let p2Letters = game.state.p2Letters;
      let winnerId = null;
      let finishedAt = null;
      let status = game.state.status;
      let turn = game.state.turn;

      if (defenderId === game.players[0]) {
        p1Letters = Math.min(p1Letters + 1, 5);
      } else {
        p2Letters = Math.min(p2Letters + 1, 5);
      }

      // 2. Check for Game Over
      if (p1Letters === 5) {
        status = "COMPLETED";
        winnerId = game.players[1]; // p2 wins
        turn = null;
        finishedAt = now;
      } else if (p2Letters === 5) {
        status = "COMPLETED";
        winnerId = game.players[0]; // p1 wins
        turn = null;
        finishedAt = now;
      } else {
        // Game continues. Attacker keeps turn?
        // Rules of SKATE: If defender misses, attacker goes again.
        // If defender makes it, they don't get a letter, and attacker goes again?
        // Wait, standard SKATE rules:
        // 1. Attacker sets trick.
        // 2. Defender tries.
        //    - If Defender makes: No letter. Attacker sets another trick.
        //    - If Defender misses: Defender gets letter. Attacker sets another trick.
        //    - If Attacker misses setting the trick: Turn passes to Defender.
        
        // The prompt says: "If !didMake (bail): ... attacker keeps the turn (state.turn unchanged)."
        // It implies if they MAKE, the turn ALSO stays?
        // Usually in SKATE, if you set a trick and they land it, you set another.
        // If you set a trick and they miss, you set another.
        // You only lose the turn if YOU (the attacker) miss your attempt to set.
        // But here, `startRoundByAttacker` implies the attacker ALREADY landed it (videoUrl exists).
        // So we assume the attacker landed the set.
        // So yes, turn stays with attacker in both cases.
      }

      updates["state.p1Letters"] = p1Letters;
      updates["state.p2Letters"] = p2Letters;
      updates["state.status"] = status;
      updates["state.turn"] = turn;
      if (winnerId) updates.winnerId = winnerId;
      if (finishedAt) updates.finishedAt = finishedAt;
    }

    updates["openRoundId"] = null;
    transaction.update(gameRef, updates);
  });
}
