"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@utils/auth";
import { createGame } from "../../lib/gameService";

export default function CreateGamePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [opponentId, setOpponentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/");
      } else {
        setUser(u);
      }
    });
    return () => unsub();
  }, [router]);

  const handleCreate = async () => {
    if (!user || !opponentId.trim()) {
      setError("Opponent UID is required");
      return;
    }
    if (opponentId.trim() === user.uid) {
      setError("You cannot challenge yourself");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      // For now, we just take a raw UID. 
      // Later we can add a user search or "Copy Invite Link" feature.
      const gameId = await createGame(user.uid, opponentId.trim());
      router.push(`/game/${gameId}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#39FF14]">New Game</h1>
          <p className="text-gray-400 mt-2">Challenge someone to a game of S.K.A.T.E.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Opponent User ID
            </label>
            <input
              type="text"
              value={opponentId}
              onChange={(e) => setOpponentId(e.target.value)}
              placeholder="Paste their UID here..."
              className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white focus:border-[#39FF14] outline-none transition-colors"
            />
            <p className="text-xs text-gray-600 mt-2">
              (Ask your friend for their UID from their profile)
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900 text-red-400 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !opponentId.trim()}
            className="w-full bg-[#39FF14] text-black font-bold py-3 rounded hover:bg-[#32cc12] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating..." : "Start Game"}
          </button>
          
          <button
            onClick={() => router.back()}
            className="w-full text-gray-500 hover:text-white text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
