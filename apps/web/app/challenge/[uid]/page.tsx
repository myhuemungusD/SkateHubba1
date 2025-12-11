"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@utils/auth";
import { createGame } from "../../lib/gameService";
import { useOpponentLookup } from "../../hooks/useOpponentLookup";
import AuthButton from "../../components/AuthButton";

export default function ChallengePage() {
  const params = useParams();
  const opponentUid = params.uid as string;
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
    () => !!currentUser && !!opponentUid && opponentUid !== currentUser?.uid,
    [currentUser, opponentUid]
  );

  const handleCreateGame = async () => {
    if (!currentUser) return;
    setSubmitting(true);
    setError(null);
    try {
      const gameId = await createGame(currentUser.uid, opponentUid);
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
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4">
        <AuthButton />
      </div>

      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center shadow-2xl">
        <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">You have been challenged</p>
        
        <div className="my-6">
          {opponentChecking ? (
            <div className="animate-pulse h-8 w-32 bg-gray-800 mx-auto rounded"></div>
          ) : (
            <h1 className="text-3xl font-bold text-white">
              {opponentName ? opponentName : "Unknown Skater"}
            </h1>
          )}
          <p className="text-xs text-gray-600 font-mono mt-2">{opponentUid}</p>
        </div>

        {currentUser?.uid === opponentUid ? (
          <div className="bg-red-900/20 text-red-400 p-4 rounded border border-red-900/50">
            You cannot challenge yourself. Share this link with a friend!
          </div>
        ) : (
          <div className="space-y-4">
            {!currentUser ? (
              <p className="text-gray-400 text-sm">Sign in to accept the challenge and play S.K.A.T.E.</p>
            ) : (
              <p className="text-gray-400 text-sm">Ready to play?</p>
            )}

            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">
                {error}
              </div>
            )}

            <button
              onClick={handleCreateGame}
              disabled={!canCreate || submitting}
              className="w-full bg-[#39FF14] text-black font-bold py-4 rounded-lg hover:bg-[#32cc12] disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
            >
              {currentUser ? (submitting ? "Starting Match..." : "ACCEPT CHALLENGE") : "Sign In to Play"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
