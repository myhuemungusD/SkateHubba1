"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@utils/auth";
import { startRoundByAttacker } from "../../../lib/gameService";

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export default function SubmitTrickPage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;

  const [user, setUser] = useState<User | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
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

  const handleSubmit = async () => {
    if (!user || !videoUrl.trim()) {
      setError("Video URL is required");
      return;
    }
    if (!isValidHttpUrl(videoUrl.trim())) {
      setError("Enter a valid http/https URL");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      // In a real app, we would upload the file to Firebase Storage here.
      // For now, we assume the user pastes a URL or we mock it.
      await startRoundByAttacker(gameId, user.uid, videoUrl.trim());
      router.push(`/game/${gameId}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to submit trick");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#39FF14]">Submit Trick</h1>
          <p className="text-gray-400 mt-2">Upload your clip to challenge your opponent.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Video URL
            </label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white focus:border-[#39FF14] outline-none transition-colors"
            />
            <p className="text-xs text-gray-600 mt-2">
              (Paste a link to your video for now)
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900 text-red-400 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !videoUrl.trim()}
            className="w-full bg-[#39FF14] text-black font-bold py-3 rounded hover:bg-[#32cc12] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Submitting..." : "Submit Trick"}
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
