"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { firestore } from "@utils/firebaseClient";
import { auth } from "@utils/auth";
import { onAuthStateChanged, User } from "firebase/auth";
import type { Game, Round } from "@skatehubba/types";
import AuthButton from "../../components/AuthButton";
import { acceptGame, declineGame, startRoundByAttacker, submitDefenderReply } from "../../lib/gameService";
import { computePrimaryAction, GamePrimaryAction } from "../../lib/gameActions";

const getLetters = (count: number) => "SKATE".substring(0, count).split("").join(".") || "-";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<Game | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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

  // Rounds Subscription
  useEffect(() => {
    if (!gameId) return;

    const roundsRef = collection(firestore, "games", gameId, "rounds");
    const q = query(roundsRef, orderBy("index", "asc"));

    const unsubscribeRounds = onSnapshot(q, (querySnap) => {
      const roundsData: Round[] = [];
      querySnap.forEach((doc) => {
        roundsData.push(doc.data() as Round);
      });
      setRounds(roundsData);
    });

    return () => unsubscribeRounds();
  }, [gameId]);

  const handleAcceptGame = async () => {
    if (!game || !currentUser) return;
    setActionLoading(true);
    try {
      await acceptGame(game.id, currentUser.uid);
    } catch (error) {
      console.error("Error accepting game:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineGame = async () => {
    if (!game || !currentUser) return;
    if (!confirm("Are you sure you want to decline this game?")) return;
    
    setActionLoading(true);
    try {
      await declineGame(game.id, currentUser.uid);
      router.push("/");
    } catch (error) {
      console.error("Error declining game:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetTrick = async () => {
    if (!game || !currentUser) return;
    const videoUrl = prompt("Enter video URL for your trick:");
    if (!videoUrl) return;
    
    setActionLoading(true);
    try {
      await startRoundByAttacker(game.id, currentUser.uid, videoUrl);
    } catch (error) {
      console.error("Error setting trick:", error);
      alert("Error setting trick");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReplyToTrick = async (roundId: string) => {
    if (!game || !currentUser) return;
    const videoUrl = prompt("Enter video URL for your reply:");
    if (!videoUrl) return;
    
    const made = confirm("Did you make the trick? OK for Yes, Cancel for No");
    
    setActionLoading(true);
    try {
      await submitDefenderReply(game.id, roundId, currentUser.uid, videoUrl, made);
    } catch (error) {
      console.error("Error replying to trick:", error);
      alert("Error replying to trick");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  if (!game) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Game not found</div>;

  const p1 = game.players[0];
  const p2 = game.players[1];
  const isP1 = currentUser?.uid === p1;
  const isP2 = currentUser?.uid === p2;
  
  const action: GamePrimaryAction = currentUser ? computePrimaryAction(game, rounds, currentUser.uid) : { kind: "waiting" };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col p-4 relative">
      <div className="absolute top-4 right-4">
        <AuthButton />
      </div>

      <div className="mt-16 max-w-2xl mx-auto w-full">
        {/* Scoreboard */}
        <div className="flex justify-between items-end mb-8 bg-gray-900 p-6 rounded-lg border border-gray-800">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">CHALLENGER</p>
            <p className="font-bold text-lg mb-2">{isP1 ? "YOU" : "OPP"}</p>
            <div className="text-3xl font-mono text-red-500 tracking-[0.5em]">
              {getLetters(game.state.p1Letters)}
            </div>
          </div>
          
          <div className="text-center pb-2">
            <div className="text-4xl font-bold text-[#39FF14]">VS</div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">DEFENDER</p>
            <p className="font-bold text-lg mb-2">{isP2 ? "YOU" : "OPP"}</p>
            <div className="text-3xl font-mono text-red-500 tracking-[0.5em]">
              {getLetters(game.state.p2Letters)}
            </div>
          </div>
        </div>

        {/* Game Status / Action Area */}
        <div className="mb-8 text-center">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
            <p className="text-gray-400 mb-4">STATUS</p>
            
            {action.kind === "acceptOrDecline" && (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleAcceptGame}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-[#39FF14] text-black font-bold rounded hover:bg-[#32cc12] transition-all"
                >
                  Accept Game
                </button>
                <button
                  onClick={handleDeclineGame}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-red-900/20 text-red-500 border border-red-900 font-bold rounded hover:bg-red-900/40 transition-all"
                >
                  Decline
                </button>
              </div>
            )}

            {action.kind === "setTrick" && (
              <button
                onClick={handleSetTrick}
                disabled={actionLoading}
                className="px-6 py-3 bg-orange-600 text-white font-bold rounded hover:bg-orange-700 transition-all"
              >
                Set Trick
              </button>
            )}

            {action.kind === "replyToTrick" && (
              <button
                onClick={() => {
                  if (action.kind === "replyToTrick") {
                    handleReplyToTrick(action.round.id);
                  }
                }}
                disabled={actionLoading}
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-all"
              >
                Reply to Trick
              </button>
            )}

            {action.kind === "waiting" && (
              <div className="text-gray-500 animate-pulse">
                Waiting for opponent...
              </div>
            )}

            {action.kind === "completed" && (
              <div className="text-lg font-bold">
                {action.winnerId === currentUser?.uid
                  ? <span className="text-[#39FF14]">YOU WON!</span>
                  : <span className="text-red-500">YOU LOST!</span>}
              </div>
            )}
          </div>
        </div>

        {/* Rounds History */}
        <div className="space-y-4">
          <h3 className="text-gray-500 font-bold text-sm uppercase">Rounds</h3>
          {rounds.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No rounds yet. Game just started!</p>
          ) : (
            rounds.map((round) => (
              <div key={round.id} className="bg-gray-900 border border-gray-800 p-4 rounded flex justify-between items-center">
                <div>
                  <span className="text-[#39FF14] font-bold mr-4">R{round.index}</span>
                  <span className="text-gray-400">{round.status}</span>
                </div>
                <div className="text-sm">
                  Attacker: MAKE vs Defender: {round.defenderResult}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
