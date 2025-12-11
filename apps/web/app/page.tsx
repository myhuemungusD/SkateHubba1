"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AuthButton from "./components/AuthButton";
import { auth } from "@utils/auth";
import { firestore } from "@utils/firebaseClient";
import { createGame } from "./lib/gameService";
import { useOpponentLookup } from "../hooks/useOpponentLookup";

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [opponentUid, setOpponentUid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { opponentName, opponentChecking } = useOpponentLookup(opponentUid);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const canCreate = useMemo(
    () => !!currentUser && !!opponentUid.trim() && opponentUid.trim() !== currentUser?.uid,
    [currentUser, opponentUid]
  );

  const handleCreateGame = async () => {
    if (!currentUser) {
      setError("Please sign in to start a game.");
      return;
    }
    const trimmedOpponent = opponentUid.trim();
    if (!trimmedOpponent) {
      setError("Opponent UID is required.");
      return;
    }
    if (trimmedOpponent === currentUser.uid) {
      setError("You cannot challenge yourself.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const gameId = await createGame(currentUser.uid, trimmedOpponent);
      router.push(`/game/${gameId}`);
    } catch (err) {
      console.error("Failed to create game", err);
      setError(err instanceof Error ? err.message : "Failed to create game.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-sm text-gray-500">Play SKATE</p>
          <h1 className="text-3xl font-bold text-[#39FF14] tracking-tight">Start a New Game</h1>
        </div>
        <AuthButton />
      </div>

      <div className="max-w-xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
        <div className="space-y-2 mb-6">
          <p className="text-lg font-semibold">Challenge an opponent</p>
          <p className="text-sm text-gray-500">
            Enter their UID and we&apos;ll create a match using the new SKATE flow.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-300">
            Opponent UID
            <input
              type="text"
              value={opponentUid}
              onChange={(e) => setOpponentUid(e.target.value)}
              placeholder="Paste their UID..."
              className="mt-2 w-full bg-black border border-gray-700 rounded px-4 py-3 text-white focus:border-[#39FF14] outline-none"
            />
          </label>

          {opponentUid.trim() ? (
            <div className="text-sm text-gray-400">
              {opponentChecking
                ? "Looking up opponent..."
                : opponentName
                  ? `Challenging: ${opponentName}`
                  : "No user found for this UID."}
            </div>
          ) : null}

          {error && (
            <div className="bg-red-900/30 border border-red-900 text-red-300 text-sm px-4 py-2 rounded">
              {error}
            </div>
          )}

          <button
            onClick={handleCreateGame}
            disabled={!canCreate || submitting}
            className="w-full bg-[#39FF14] text-black font-bold py-3 rounded-lg hover:bg-[#32cc12] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {currentUser ? (submitting ? "Creating..." : "Start Game") : "Sign in to start"}
          </button>
        </div>
      </div>
    </div>
  );
}
