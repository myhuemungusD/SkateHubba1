"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";
import type { Game, Round } from "@skatehubba/types";
import { firestore, storage } from "@utils/firebaseClient";
import { auth } from "@utils/auth";
import AuthButton from "../../components/AuthButton";
import { toDate, formatRelative } from "@utils/format";
import {
  acceptGame,
  declineGame,
  startRoundByAttacker,
  submitDefenderReply,
} from "../../lib/gameService";

const SKATE_STEPS = ["-", "S", "SK", "SKA", "SKAT", "SKATE"];
const lettersFromCount = (count: number) => SKATE_STEPS[count] ?? "SKATE";

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<Game | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [formMode, setFormMode] = useState<"none" | "set" | "reply">("none");
  const [didMake, setDidMake] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; tone?: "info" | "error" } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Auth subscription
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Game subscription
  useEffect(() => {
    if (!gameId) return;
    const gameRef = doc(firestore, "games", gameId);
    const unsub = onSnapshot(gameRef, (snap) => {
      if (snap.exists()) {
        setGame(snap.data() as Game);
      } else {
        setGame(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [gameId]);

  // Rounds subscription
  useEffect(() => {
    if (!gameId) return;
    const roundsRef = collection(firestore, "games", gameId, "rounds");
    const q = query(roundsRef, orderBy("index", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const data: Round[] = snap.docs.map((d) => d.data() as Round);
      setRounds(data);
    });
    return () => unsub();
  }, [gameId]);

  const opponentId = useMemo(() => {
    if (!currentUser || !game) return null;
    return game.players.find((p) => p !== currentUser.uid) ?? null;
  }, [currentUser, game]);

  const pendingReplyRound = useMemo(
    () =>
      rounds.find(
        (r) =>
          currentUser?.uid === r.defenderId &&
          r.defenderResult === "PENDING" &&
          r.status === "AWAITING_DEFENDER"
      ),
    [rounds, currentUser]
  );

  const openRound = useMemo(
    () =>
      (game?.openRoundId && rounds.find((r) => r.id === game.openRoundId)) ||
      pendingReplyRound ||
      null,
    [game?.openRoundId, rounds, pendingReplyRound]
  );

  const handleAccept = async () => {
    if (!game || !currentUser) return;
    setActionLoading(true);
    try {
      await acceptGame(game.id, currentUser.uid);
    } catch (err) {
      console.error(err);
      setActionMessage({ text: "Failed to accept. Please retry.", tone: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!game || !currentUser) return;
    setActionLoading(true);
    try {
      await declineGame(game.id, currentUser.uid);
    } catch (err) {
      console.error(err);
      setActionMessage({ text: "Failed to decline. Please retry.", tone: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormMode("none");
    setVideoFile(null);
    setDidMake(true);
  };

  const submitVideo = async () => {
    if (!game || !currentUser) return;
    if (!videoFile) {
      setActionMessage({ text: "Please select a video file.", tone: "error" });
      return;
    }

    // 100MB Limit
    if (videoFile.size > 100 * 1024 * 1024) {
      setActionMessage({ text: "File too large. Max 100MB.", tone: "error" });
      return;
    }

    setUploading(true);
    setActionLoading(true);
    setActionMessage({ text: "Uploading video...", tone: "info" });

    try {
      const fileRef = ref(storage, `games/${game.id}/rounds/${Date.now()}_${currentUser.uid}.mp4`);
      await uploadBytes(fileRef, videoFile);
      const downloadUrl = await getDownloadURL(fileRef);

      if (formMode === "set") {
        await startRoundByAttacker(game.id, currentUser.uid, downloadUrl);
        setActionMessage({ text: "Trick submitted." });
      }
      if (formMode === "reply" && pendingReplyRound) {
        await submitDefenderReply(
          game.id,
          pendingReplyRound.id,
          currentUser.uid,
          downloadUrl,
          didMake
        );
        setActionMessage({ text: "Reply submitted." });
      }
      resetForm();
    } catch (err) {
      console.error(err);
      setActionMessage({ text: "Failed to upload/submit. Please try again.", tone: "error" });
    } finally {
      setUploading(false);
      setActionLoading(false);
    }
  };

  const renderPrimaryAction = () => {
    if (!game || !currentUser) return null;

    if (game.state.status === "PENDING_ACCEPT") {
      if (game.players[1] === currentUser.uid) {
        return (
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className="px-6 py-3 bg-[#39FF14] text-black font-bold rounded hover:bg-[#32cc12]"
            >
              Accept
            </button>
            <button
              onClick={handleDecline}
              disabled={actionLoading}
              className="px-6 py-3 bg-red-900/30 text-red-400 font-bold rounded border border-red-900 hover:bg-red-900/50"
            >
              Decline
            </button>
          </div>
        );
      }
      return <p className="text-gray-500">Waiting for opponent to accept…</p>;
    }

    if (game.state.status === "ACTIVE") {
      if (game.state.turn === currentUser.uid && !pendingReplyRound) {
        return (
          <button
            onClick={() => setFormMode("set")}
            disabled={actionLoading}
            className="px-6 py-3 bg-orange-600 text-white font-bold rounded hover:bg-orange-700"
          >
            Set Trick
          </button>
        );
      }

      if (pendingReplyRound) {
        return (
          <button
            onClick={() => setFormMode("reply")}
            disabled={actionLoading}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
          >
            Reply to Trick
          </button>
        );
      }

      return (
        <p className="text-gray-500">
          Waiting for opponent… {openRound ? "(reply pending)" : null}
        </p>
      );
    }

    if (game.state.status === "COMPLETED") {
      const youWon = game.winnerId && game.winnerId === currentUser.uid;
      return (
        <p className="text-lg font-bold">
          {youWon ? <span className="text-[#39FF14]">You won!</span> : <span className="text-red-500">You lost.</span>}
        </p>
      );
    }

    if (game.state.status === "DECLINED") {
      return <p className="text-gray-500">Game was declined.</p>;
    }

    return <p className="text-gray-500">Status: {game.state.status}</p>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading…
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Game not found.
      </div>
    );
  }

  const [p1, p2] = game.players;
  const isP1 = currentUser?.uid === p1;
  const isP2 = currentUser?.uid === p2;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {actionMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded shadow ${
            actionMessage.tone === "error"
              ? "bg-red-900/50 border border-red-900 text-red-200"
              : "bg-gray-900 border border-gray-800 text-white"
          }`}
        >
          {actionMessage.text}
        </div>
      )}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#39FF14]">Game Control</h1>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <p>Status: {game.state.status}</p>
            <span>·</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Game link copied!");
              }}
              className="hover:text-white underline"
            >
              Copy Link
            </button>
          </div>
        </div>
        <AuthButton />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scoreboard */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Player 1</p>
              <p className="font-semibold">{isP1 ? "You" : p1}</p>
              <p className="text-sm text-gray-500">Letters: {lettersFromCount(game.state.p1Letters)}</p>
            </div>
            <div className="text-center text-[#39FF14] font-bold text-2xl">VS</div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Player 2</p>
              <p className="font-semibold">{isP2 ? "You" : p2}</p>
              <p className="text-sm text-gray-500">Letters: {lettersFromCount(game.state.p2Letters)}</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-black border border-gray-800 rounded">
            <p className="text-xs text-gray-500 mb-2">Turn</p>
            <p className="font-semibold">{game.state.turn ? (game.state.turn === currentUser?.uid ? "You" : opponentId) : "-"}</p>
          </div>
        </div>

        {/* Primary action */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 flex items-center justify-center">
            {renderPrimaryAction()}
          </div>
          {formMode !== "none" && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  {formMode === "set" ? "Submit your trick video" : "Reply to trick"}
                </p>
                <button
                  onClick={resetForm}
                  className="text-xs text-gray-500 hover:text-white"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-500">Video File</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white focus:border-[#39FF14] outline-none"
                />
                {formMode === "set" && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-500">Trick Name (Optional)</label>
                    <input
                      value={trickName}
                      onChange={(e) => setTrickName(e.target.value)}
                      placeholder="e.g. Kickflip"
                      className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white focus:border-[#39FF14] outline-none mt-1"
                    />
                  </div>
                )}
                {videoFile ? (
                  <div className="space-y-2">
                    <div className="bg-black border border-gray-800 rounded overflow-hidden">
                      <video
                        src={URL.createObjectURL(videoFile)}
                        controls
                        muted
                        className="w-full max-h-64 object-contain"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              {formMode === "reply" && (
                <div className="flex gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setDidMake(true)}
                    className={`px-3 py-2 rounded border ${
                      didMake
                        ? "border-[#39FF14] text-[#39FF14]"
                        : "border-gray-700 text-gray-400"
                    }`}
                  >
                    I made it
                  </button>
                  <button
                    type="button"
                    onClick={() => setDidMake(false)}
                    className={`px-3 py-2 rounded border ${
                      !didMake
                        ? "border-red-500 text-red-400"
                        : "border-gray-700 text-gray-400"
                    }`}
                  >
                    I bailed
                  </button>
                </div>
              )}
              {actionMessage && (
                <div
                  className={`text-sm rounded px-3 py-2 ${
                    actionMessage.tone === "error"
                      ? "text-red-200 bg-red-900/30 border border-red-900"
                      : "text-yellow-200 bg-yellow-900/20 border border-yellow-900"
                  }`}
                >
                  {actionMessage.text}
                </div>
              )}
              <button
                onClick={submitVideo}
                disabled={actionLoading || uploading}
                className="w-full bg-[#39FF14] text-black font-bold py-2 rounded hover:bg-[#32cc12] disabled:opacity-50"
              >
                {uploading ? "Uploading..." : actionLoading ? "Submitting..." : "Submit"}
              </button>
            </div>
          )}
        </div>

        {/* Rounds list */}
        <div className="mt-8">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Rounds</h3>
        {rounds.length === 0 ? (
          <p className="text-gray-600 text-sm">No rounds yet.</p>
        ) : (
          <div className="space-y-3">
            {openRound && (
              <div className="bg-yellow-900/20 border border-yellow-900 text-yellow-200 text-sm px-4 py-2 rounded">
                Pending defender reply on round #{openRound.index}
              </div>
            )}
            {rounds.map((round) => (
              <div
                key={round.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 grid gap-3 md:grid-cols-3"
              >
                <div>
                  <p className="text-xs text-gray-500">Round</p>
                  <p className="font-semibold">#{round.index}</p>
                  <p className="text-xs text-gray-500 mt-1">Status: {round.status}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Created {formatRelative(toDate(round.createdAt))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Attacker Video</p>
                  {round.attackerVideoUrl ? (
                    <a
                      href={round.attackerVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#39FF14] text-sm hover:underline"
                    >
                      View video
                    </a>
                  ) : (
                    <p className="text-sm text-gray-600">-</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Defender</p>
                  <p className="text-sm text-gray-400">{round.defenderId}</p>
                  <p className="text-xs text-gray-500 mt-1">Result: {round.defenderResult}</p>
                  {round.defenderVideoUrl && (
                    <a
                      href={round.defenderVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#39FF14] text-sm hover:underline"
                    >
                      Reply video
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
