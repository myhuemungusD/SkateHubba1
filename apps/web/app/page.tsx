"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import AuthButton from "./components/AuthButton";
import { auth } from "@utils/auth";
import { firestore } from "@utils/firebaseClient";
import { createGame } from "./lib/gameService";
import { useOpponentLookup } from "../hooks/useOpponentLookup";
import { useUserSearch, UserProfile } from "../hooks/useUserSearch";

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [opponentUid, setOpponentUid] = useState("");
  const [recentOpponents, setRecentOpponents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { opponentName, opponentChecking } = useOpponentLookup(opponentUid);
  const { results: searchResults, loading: searchLoading } = useUserSearch(searchTerm);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        ensureUserProfile(user).catch((err) => console.error("ensureUserProfile failed", err));
      }
    });
    return () => unsubscribe();
  }, []);

  const ensureUserProfile = async (user: User) => {
    const userRef = doc(firestore, "users", user.uid);
    const snap = await getDoc(userRef);
    const displayName = user.displayName || `User-${user.uid.slice(0, 4)}`;
    const displayNameLower = displayName.toLowerCase();
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName,
        displayNameLower,
        photoURL: user.photoURL ?? null,
        createdAt: Date.now(),
        stats: { wins: 0, losses: 0, streak: 0 },
        profileCompleted: false,
      });
    } else {
      const data = snap.data() as Record<string, unknown>;
      if (!data.displayNameLower && data.displayName) {
        await updateDoc(userRef, { displayNameLower: String(data.displayName).toLowerCase() });
      }
    }
  };

  // Load recent opponents from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("recentOpponents");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentOpponents(parsed.slice(0, 5));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const rememberOpponent = (uid: string, profile?: Partial<UserProfile>) => {
    if (typeof window === "undefined") return;
    const trimmed = uid.trim();
    if (!trimmed) return;
    const next = [
      profile?.displayName ? `${profile.displayName}|${trimmed}` : trimmed,
      ...recentOpponents.filter((u) => !u.endsWith(trimmed)),
    ].slice(0, 5);
    setRecentOpponents(next as string[]);
    try {
      window.localStorage.setItem("recentOpponents", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

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
      rememberOpponent(trimmedOpponent, { displayName: opponentName || trimmedOpponent });
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
          {currentUser && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xs text-gray-500 font-mono bg-gray-900 px-2 py-1 rounded border border-gray-800">
                {currentUser.uid}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentUser.uid);
                  alert("UID copied to clipboard!");
                }}
                className="text-xs text-[#39FF14] hover:underline"
              >
                Copy UID
              </button>
            </div>
          )}
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
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Search by name
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type a skater name..."
                className="mt-2 w-full bg-black border border-gray-700 rounded px-4 py-3 text-white focus:border-[#39FF14] outline-none"
              />
            </label>
            {searchTerm && (
              <div className="bg-black border border-gray-800 rounded p-2 space-y-1">
                {searchLoading ? (
                  <div className="text-xs text-gray-500">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-xs text-gray-500">No users found.</div>
                ) : (
                  searchResults.map((user) => (
                    <button
                      key={user.uid}
                      type="button"
                      onClick={() => {
                        setOpponentUid(user.uid);
                        setSearchTerm("");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-900 rounded"
                    >
                      <span className="text-sm text-white">{user.displayName || user.uid}</span>
                      <span className="text-xs text-gray-500">{user.uid.slice(0, 6)}...</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

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
                  : "No profile found for this UID, but you can still start."}
            </div>
          ) : null}

          {recentOpponents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Recent opponents</p>
              <div className="flex flex-wrap gap-2">
                {recentOpponents.map((uid) => (
                  <button
                    key={uid}
                    type="button"
                    onClick={() => setOpponentUid(uid.split("|").pop() || "")}
                    className="px-3 py-1 text-xs rounded border border-gray-700 text-gray-300 hover:border-[#39FF14]"
                  >
                    {uid.includes("|") ? uid.split("|")[0] : uid}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          {currentUser && (
            <div className="text-xs text-gray-500 mt-2">
              Share your invite link:{" "}
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(`${window.location.origin}/challenge/${currentUser.uid}`);
                  }
                }}
                className="text-[#39FF14] underline hover:text-[#32cc12]"
              >
                Copy /challenge/{currentUser.uid}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
