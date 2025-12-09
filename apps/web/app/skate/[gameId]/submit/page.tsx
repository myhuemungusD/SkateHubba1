/// GOAL:
/// Build the SKATE turn submission page for Web.
/// This page lets the current player upload their attempt video,
/// stores it in Firebase Storage, creates a Turn document,
/// and redirects back to the Game View screen.
///
/// LOCATION:
/// apps/web/app/skate/[gameId]/submit/page.tsx
///
/// REQUIREMENTS:
/// - use client
/// - Read gameId from URL params
/// - Render a file input (accept video/mp4)
/// - Upload selected file to Firebase Storage under:
///     storage/skateTurns/{gameId}/{uuid}.mp4
/// - Generate a Turn document with:
///     id (uuid)
///     gameId
///     playerId (auth.uid)
///     videoUrl (download URL)
///     trickName (simple text input)
///     result: "pending"
///     letter: ""
///     createdAt: Date.now()
///
/// - Redirect to /skate/[gameId] after upload
///
/// THEME:
/// - Black background
/// - Neon green labels
/// - Orange submit button
///
/// IMPORTS NEEDED:
/// import { useState } from "react";
/// import { useParams, useRouter } from "next/navigation";
/// import { auth } from "@utils/auth";
/// import { firestore, storage } from "@utils/firebaseClient";
/// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
/// import { doc, setDoc } from "firebase/firestore";
/// import { v4 as uuid } from "uuid";
///
/// RULES:
/// - No placeholders
/// - Must handle loading state
/// - Validate file exists before upload
/// - Prevent submit if user is not logged in
///
/// OUTPUT:
/// Fully functional submit page.

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@utils/auth";
import { firestore, storage } from "@utils/firebaseClient";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { v4 as uuidv4 } from "uuid";

export default function SubmitTurnPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [trickName, setTrickName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      setError("You must be logged in to submit a turn.");
      return;
    }
    if (!file) {
      setError("Please select a video file.");
      return;
    }
    if (!trickName.trim()) {
      setError("Please enter a trick name.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const turnId = uuidv4();
      const storagePath = `skateTurns/${gameId}/${turnId}.mp4`;
      const storageRef = ref(storage, storagePath);

      // 1. Upload Video
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Create Turn Document
      const turnData = {
        id: turnId,
        gameId: gameId,
        playerId: currentUser.uid,
        videoUrl: downloadURL,
        trickName: trickName.trim(),
        result: "pending",
        letter: "",
        createdAt: Date.now(),
      };

      await setDoc(doc(firestore, "turns", turnId), turnData);

      // 3. Redirect
      router.push(`/skate/${gameId}`);
    } catch (err) {
      console.error("Error submitting turn:", err);
      setError("Failed to upload turn. Please try again.");
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-[#39FF14] mb-8 tracking-tighter uppercase">
        Submit Your Trick
      </h1>

      <div className="w-full max-w-md space-y-6 bg-gray-900 p-6 rounded-xl border border-gray-800">
        
        {/* Trick Name Input */}
        <div>
          <label htmlFor="trickName" className="block text-sm font-bold text-[#39FF14] mb-2 uppercase tracking-wider">
            Trick Name
          </label>
          <input
            id="trickName"
            type="text"
            value={trickName}
            onChange={(e) => setTrickName(e.target.value)}
            placeholder="e.g. Kickflip"
            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#39FF14] transition-colors"
          />
        </div>

        {/* Video Upload Input */}
        <div>
          <label htmlFor="video" className="block text-sm font-bold text-[#39FF14] mb-2 uppercase tracking-wider">
            Upload Video
          </label>
          <div className="relative">
            <input
              id="video"
              type="file"
              accept="video/mp4,video/quicktime"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-[#39FF14] file:text-black
                hover:file:bg-[#32CD32]
                cursor-pointer"
            />
          </div>
          {file && (
            <p className="mt-2 text-xs text-gray-500">
              Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-500 text-sm text-center bg-red-900/20 p-2 rounded border border-red-900">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={uploading || !currentUser || !file}
          className={`w-full font-bold py-4 rounded-lg uppercase tracking-widest transition-all
            ${uploading || !currentUser || !file
              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
              : "bg-[#FF5F1F] text-white hover:bg-[#FF4500] hover:shadow-[0_0_15px_rgba(255,95,31,0.5)] transform hover:scale-[1.02]"
            }`}
        >
          {uploading ? "Uploading..." : "Submit Attempt"}
        </button>
      </div>

      <button 
        onClick={() => router.back()}
        className="mt-6 text-gray-500 hover:text-white text-sm underline"
      >
        Cancel
      </button>
    </div>
  );
}
