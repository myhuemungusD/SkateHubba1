/// GOAL:
/// Create server-side notification triggers for SkateHubba's async S.K.A.T.E. game.
/// These triggers must send FCM push notifications through Firebase Admin SDK
/// whenever key game events occur.

// LOCATION:
// infra/firebase/functions/src/skate/notifications.ts

// IMPORTS NEEDED:
// import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";
// import { Game, Turn } from "@skatehubba/types";

// REQUIREMENTS:
// 1. Trigger #1: onTurnResolved
//    - Triggered AFTER resolver updates the Turn doc.
//    - Reads the game state (winner, currentTurn, letters).
//    - Sends push notification to the NEXT player:
//         "It's your turn in SKATE!"
//    - If a letter was assigned, notify:
//         "You got a letter: S" (or K, A, T, E)

// 2. Trigger #2: onGameFinished
//    - When game.status == "finished"
//    - Notify winner:
//         "You won your SKATE match!"
//    - Notify loser:
//         "You lost your SKATE match"

// 3. FCM Token Lookup:
//    - Each user document stores: fcmToken?: string
//    - Notification should gracefully skip users with no token.

// 4. SAFE RULES:
//    - Never expose sensitive data in notification body.
//    - Only send minimal game info.
//    - Log failures but do not throw.

// 5. EXPORTS:
//    - exports.onTurnResolved
//    - exports.onGameFinished

// 6. FORMAT:
//    - 100% TypeScript
//    - No placeholders
//    - No React imports

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Game, Turn, User } from "@skatehubba/types";

const db = admin.firestore();
const fcm = admin.messaging();

/**
 * Helper to retrieve a user's FCM token.
 */
async function getUserFCMToken(uid: string): Promise<string | undefined> {
  try {
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) return undefined;
    const userData = userSnap.data() as User;
    return userData.fcmToken;
  } catch (error) {
    console.error(`Error fetching FCM token for user ${uid}:`, error);
    return undefined;
  }
}

/**
 * Trigger #1: onTurnResolved
 * Triggered when a Turn document is updated (e.g. by the resolver).
 */
export const onTurnResolved = functions.firestore
  .document("turns/{turnId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as Turn;
    const after = change.after.data() as Turn;

    // Only proceed if the result changed from "pending" to something else (resolved)
    if (before.result === "pending" && after.result !== "pending") {
      const gameId = after.gameId;
      const gameSnap = await db.collection("games").doc(gameId).get();
      
      if (!gameSnap.exists) {
        console.error(`Game ${gameId} not found for turn ${context.params.turnId}`);
        return;
      }

      const game = gameSnap.data() as Game;

      // 1. Notify the player who just played if they got a letter
      if (after.letter) {
        const playerToken = await getUserFCMToken(after.playerId);
        if (playerToken) {
          await fcm.send({
            token: playerToken,
            notification: {
              title: "SkateHubba",
              body: `You got a letter: ${after.letter}`,
            },
            data: {
              gameId: game.id,
              type: "letter_assigned"
            }
          }).catch(err => console.error("Failed to send letter notification", err));
        }
      }

      // 2. Notify the NEXT player that it is their turn
      // The resolver updates the Game's currentTurn to the next player.
      const nextPlayerId = game.currentTurn === "A" ? game.playerA : game.playerB;
      
      // Ensure we don't notify the same person twice if logic overlaps (unlikely in strict turns)
      if (nextPlayerId !== after.playerId) {
        const nextPlayerToken = await getUserFCMToken(nextPlayerId);
        if (nextPlayerToken) {
          await fcm.send({
            token: nextPlayerToken,
            notification: {
              title: "SkateHubba",
              body: "It's your turn in SKATE!",
            },
            data: {
              gameId: game.id,
              type: "your_turn"
            }
          }).catch(err => console.error("Failed to send turn notification", err));
        }
      }
    }
  });

/**
 * Trigger #2: onGameFinished
 * Triggered when a Game document is updated to status "finished".
 */
export const onGameFinished = functions.firestore
  .document("games/{gameId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as Game;
    const after = change.after.data() as Game;

    // Only trigger if status changed to finished
    if (before.status !== "finished" && after.status === "finished") {
      const winnerId = after.winnerId;
      if (!winnerId) return;

      const loserId = winnerId === after.playerA ? after.playerB : after.playerA;

      // Notify Winner
      const winnerToken = await getUserFCMToken(winnerId);
      if (winnerToken) {
        await fcm.send({
          token: winnerToken,
          notification: {
            title: "Victory!",
            body: "You won your SKATE match!",
          },
          data: {
            gameId: after.id,
            type: "game_won"
          }
        }).catch(err => console.error("Failed to send winner notification", err));
      }

      // Notify Loser
      const loserToken = await getUserFCMToken(loserId);
      if (loserToken) {
        await fcm.send({
          token: loserToken,
          notification: {
            title: "Game Over",
            body: "You lost your SKATE match.",
          },
          data: {
            gameId: after.id,
            type: "game_lost"
          }
        }).catch(err => console.error("Failed to send loser notification", err));
      }
    }
  });
