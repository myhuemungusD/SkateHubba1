"use client";

import { useState, useEffect } from "react";
import { auth } from "@utils/auth";
import { collection, query, where, onSnapshot, or } from "firebase/firestore";
import { firestore } from "@utils/firebaseClient";
import { onAuthStateChanged, User } from "firebase/auth";
import AuthButton from "../../components/AuthButton";
import Link from "next/link";
import type { Game } from "@skatehubba/types";

export default function JoinGamePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualGameId, setManualGameId] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const gamesRef = collection(firestore, "games");
    
    // Query for games where user is challengerId OR defenderId
    const q = query(
      gamesRef, 
      or(
        where("challengerId", "==", currentUser.uid),
        where("defenderId", "==", currentUser.uid)
      )
    );

    const unsubscribeGames = onSnapshot(q, (snapshot) => {
      const gamesData: Game[] = [];
      snapshot.forEach((doc) => {
        gamesData.push({ id: doc.id, ...doc.data() } as Game);
      });
      // Sort by lastActionAt desc
      gamesData.sort((a, b) => {
        const timeA = a.lastActionAt?.toMillis ? a.lastActionAt.toMillis() : 0;
        const timeB = b.lastActionAt?.toMillis ? b.lastActionAt.toMillis() : 0;
        return timeB - timeA;
      });
      setGames(gamesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching games:", error);
      setLoading(false);
    });

    return () => unsubscribeGames();
  }, [currentUser]);

  const isMyTurn = (game: Game) => {
    if (!currentUser) return false;
    return game.state.turn === currentUser.uid;
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4 relative">
      <div className="absolute top-4 right-4">
        <AuthButton />
      </div>

      <div className="w-full max-w-2xl mt-20">
        <h1 className="text-4xl font-bold text-[#39FF14] mb-8 tracking-tighter text-center">
          YOUR GAMES
        </h1>

        {!currentUser ? (
          <div className="text-center text-gray-500 mt-10">
            <p>Please sign in to view your games.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Manual Join Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Join by ID</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={manualGameId}
                  onChange={(e) => setManualGameId(e.target.value)}
                  placeholder="Enter Game ID"
                  className="flex-1 bg-black border border-gray-700 rounded px-4 py-2 text-white focus:border-[#39FF14] outline-none"
                />
                <Link
                  href={manualGameId ? `/skate/${manualGameId}` : "#"}
                  className={`px-6 py-2 rounded font-bold transition-colors flex items-center
                    ${manualGameId 
                      ? "bg-[#39FF14] text-black hover:bg-[#32cc12]" 
                      : "bg-gray-800 text-gray-500 cursor-not-allowed"}`}
                >
                  GO
                </Link>
              </div>
            </div>

            {/* Active Games List */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Active Games</h2>
              {loading ? (
                <p className="text-gray-500">Loading games...</p>
              ) : games.length === 0 ? (
                <p className="text-gray-500 italic">No active games found.</p>
              ) : (
                <div className="grid gap-4">
                  {games.map((game) => (
                    <Link 
                      key={game.id} 
                      href={`/skate/${game.id}`}
                      className="block bg-[#111] border border-[#333] hover:border-[#39FF14] rounded-lg p-4 transition-colors group"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Game ID: {game.id.substring(0, 8)}...</p>
                          <p className="font-bold text-lg">
                            vs {game.players.find(id => id !== currentUser.uid) ? "Opponent" : "Opponent"}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                          ${isMyTurn(game) 
                            ? "bg-[#39FF14] text-black" 
                            : "bg-gray-800 text-gray-400"
                          }`}
                        >
                          {isMyTurn(game) ? "Your Turn" : "Their Turn"}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
