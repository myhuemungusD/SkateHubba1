/// GOAL:
/// Build the SKATE Game View page. This is the main gameplay screen.
/// It loads game data in real-time, displays letters, shows last trick,
/// and gives the active player a "Submit Attempt" button.
///
/// LOCATION:
/// apps/web/app/skate/[gameId]/page.tsx
///
/// REQUIREMENTS:
/// - use client
/// - Read the dynamic gameId param from URL
/// - Subscribe to the game document in Firestore (onSnapshot)
/// - Show:
///     • Player A letters
///     • Player B letters
///     • Whose turn it is ("Your turn" vs "Waiting…")
///     • Last submitted trick video (simple <video> tag)
/// - If it's the current user's turn:
///       Show button: "Submit Attempt"
///       -> Redirect to /skate/[gameId]/submit
///
/// THEME:
/// - Black background
/// - Neon green for headers
/// - Orange for buttons
///
/// IMPORTS NEEDED:
/// import { useEffect, useState } from "react";
/// import { useParams } from "next/navigation";
/// import { doc, onSnapshot } from "firebase/firestore";
/// import { firestore } from "@utils/firebaseClient";
/// import { auth } from "@utils/auth";
///
/// DATA:
/// - Game.type is imported from @skatehubba/types
///
/// RULES:
/// - No placeholder data
/// - No server components
/// - Must handle null game state cleanly
///
/// OUTPUT:
/// A fully functional SKATE Game View page.

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import { firestore } from "@utils/firebaseClient";
import { auth } from "@utils/auth";
import { onAuthStateChanged, User } from "firebase/auth";
import { Game, Turn } from "@types/skate"; // Using @types/skate based on tsconfig

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<Game | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Game Subscription
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(firestore, "games", gameId);
    const unsubscribeGame = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        setGame(docSnap.data() as Game);
      } else {
        setGame(null);
      }
      setLoading(false);
    });

    return () => unsubscribeGame();
  }, [gameId]);

  // Turns Subscription
  useEffect(() => {
    if (!gameId) return;

    const turnsRef = collection(firestore, "turns");
    const q = query(turnsRef, where("gameId", "==", gameId), orderBy("createdAt", "asc"));

    const unsubscribeTurns = onSnapshot(q, (querySnap) => {
      const turnsData: Turn[] = [];
      querySnap.forEach((doc) => {
        turnsData.push(doc.data() as Turn);
      });
      setTurns(turnsData);
    });

    return () => unsubscribeTurns();
  }, [gameId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-[#39FF14]">Loading Game...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-red-500">Game not found.</p>
      </div>
    );
  }

  // Calculate Letters
  const getLetters = (playerId: string) => {
    return turns
      .filter((t) => t.playerId === playerId && t.letter)
      .map((t) => t.letter)
      .join("");
  };

  const lettersA = getLetters(game.playerA);
  const lettersB = getLetters(game.playerB);

  // Determine Turn Status
  const isMyTurn = currentUser && (
    (game.currentTurn === "A" && currentUser.uid === game.playerA) ||
    (game.currentTurn === "B" && currentUser.uid === game.playerB)
  );

  // Find Last Video
  // We look for the last turn that has a videoUrl.
  // Since turns are ordered by createdAt asc, we reverse to find the latest.
  const lastVideoTurn = [...turns].reverse().find((t) => t.videoUrl);

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col">
      {/* Header / Scoreboard */}
      <div className="flex justify-between items-start mb-8 border-b border-gray-800 pb-4">
        <div className="text-center">
          <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-1">Player A</h2>
          <div className="text-3xl font-bold text-[#39FF14] tracking-widest">
            {lettersA || <span className="text-gray-800">SKATE</span>}
          </div>
          {currentUser?.uid === game.playerA && <span className="text-xs text-gray-500">(You)</span>}
        </div>

        <div className="text-center">
          <div className="text-xl font-bold text-white mb-1">VS</div>
          <div className={`text-sm px-3 py-1 rounded-full ${isMyTurn ? "bg-[#39FF14] text-black" : "bg-gray-800 text-gray-400"}`}>
            {game.status === "finished" 
              ? "GAME OVER" 
              : isMyTurn 
                ? "YOUR TURN" 
                : "WAITING..."}
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-1">Player B</h2>
          <div className="text-3xl font-bold text-[#39FF14] tracking-widest">
            {lettersB || <span className="text-gray-800">SKATE</span>}
          </div>
          {currentUser?.uid === game.playerB && <span className="text-xs text-gray-500">(You)</span>}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        
        {/* Last Trick Video */}
        {lastVideoTurn ? (
          <div className="w-full max-w-md bg-gray-900 rounded-lg overflow-hidden shadow-lg border border-gray-800">
            <div className="p-3 border-b border-gray-800 flex justify-between items-center">
              <span className="text-sm text-gray-400">Last Trick: <span className="text-white font-bold">{lastVideoTurn.trickName}</span></span>
              <span className="text-xs text-gray-500">{new Date(lastVideoTurn.createdAt).toLocaleDateString()}</span>
            </div>
            <video 
              src={lastVideoTurn.videoUrl} 
              controls 
              className="w-full aspect-video bg-black"
              poster="/placeholder-skate.jpg" // Optional placeholder
            />
          </div>
        ) : (
          <div className="w-full max-w-md aspect-video bg-gray-900 rounded-lg flex items-center justify-center border border-gray-800 border-dashed">
            <p className="text-gray-500">No tricks yet. Start the game!</p>
          </div>
        )}

        {/* Action Button */}
        {game.status !== "finished" && isMyTurn && (
          <button
            onClick={() => router.push(`/skate/${gameId}/submit`)}
            className="w-full max-w-md bg-[#FF5F1F] text-white font-bold py-4 rounded-lg uppercase tracking-widest hover:bg-[#FF4500] hover:shadow-[0_0_15px_rgba(255,95,31,0.5)] transition-all transform hover:scale-105"
          >
            Submit Attempt
          </button>
        )}

        {game.status === "finished" && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#39FF14] mb-2">
              Winner: {game.winnerId === currentUser?.uid ? "YOU!" : "OPPONENT"}
            </h2>
            <button
              onClick={() => router.push("/skate/create")}
              className="text-gray-400 hover:text-white underline"
            >
              Start New Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
