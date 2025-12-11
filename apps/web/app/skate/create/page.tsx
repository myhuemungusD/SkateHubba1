"use client";

import { useState, useEffect } from "react";
import { createGame } from "@skatehubba/skate-engine";
import { auth } from "@utils/auth";
import { doc, setDoc, collection } from "firebase/firestore";
import { firestore } from "@utils/firebaseClient";
import { onAuthStateChanged, User } from "firebase/auth";

export default function CreateGamePage() {
  const [opponentId, setOpponentId] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateGame = async () => {
    if (!currentUser || !opponentId) return;

    setLoading(true);
    setError("");

    try {
      // Generate a new ID for the game
      const gameRef = doc(collection(firestore, "games"));
      const gameId = gameRef.id;

      // Create the game object using the engine
      const newGame = createGame(gameId, currentUser.uid, opponentId);

      // Write to Firestore
      await setDoc(gameRef, newGame);

      // Redirect to the game page
      window.location.href = `/skate/${gameId}`;
    } catch (err) {
      console.error("Error creating game:", err);
      setError("Failed to create game. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-[#39FF14] mb-8 tracking-tighter">
        NEW SKATE GAME
      </h1>

      <div className="w-full max-w-md space-y-6">
        <div>
          <label htmlFor="opponent" className="block text-sm font-medium text-gray-400 mb-2">
            Opponent ID
          </label>
          <input
            id="opponent"
            type="text"
            value={opponentId}
            onChange={(e) => setOpponentId(e.target.value)}
            placeholder="Enter opponent UID"
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#39FF14] transition-colors"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleCreateGame}
          disabled={!currentUser || !opponentId || loading}
          className={`w-full font-bold py-4 rounded-lg uppercase tracking-widest transition-all
            ${!currentUser || !opponentId || loading
              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
              : "bg-[#FF5F1F] text-white hover:bg-[#FF4500] hover:shadow-[0_0_15px_rgba(255,95,31,0.5)]"
            }`}
        >
          {loading ? "Creating..." : "Start Game"}
        </button>

        {!currentUser && (
          <p className="text-center text-gray-500 text-sm mt-4">
            You must be logged in to start a game.
          </p>
        )}
      </div>
    </div>
  );
}
