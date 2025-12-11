"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth } from "@utils/auth";
import { firestore } from "@utils/firebaseClient";
import AuthButton from "../components/AuthButton";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/");
        return;
      }
      setUser(currentUser);

      const userRef = doc(firestore, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setUsername(userSnap.data().displayName || "");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !username.trim()) return;

    setSaving(true);
    setMessage("");

    try {
      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        displayName: username.trim(),
        profileCompleted: true,
      });
      setMessage("Profile updated successfully! Redirecting...");
      setTimeout(() => router.push("/"), 1500);
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      setMessage("Failed to update profile.");
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4 relative">
      <div className="absolute top-4 right-4">
        <AuthButton />
      </div>

      <div className="w-full max-w-md mt-20">
        <h1 className="text-4xl font-bold text-[#39FF14] mb-8 tracking-tighter text-center">
          EDIT PROFILE
        </h1>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex justify-center mb-6">
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt="Profile"
                width={96}
                height={96}
                className="w-24 h-24 rounded-full border-2 border-[#39FF14] object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-2xl">
                ?
              </div>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-gray-400 mb-2 text-sm font-bold uppercase">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-[#39FF14] outline-none"
                placeholder="Enter your skater name"
              />
              <p className="text-xs text-gray-600 mt-1 text-right">
                {username.length}/20
              </p>
            </div>

            {message && (
              <div
                className={`text-center text-sm ${
                  message.includes("Failed") ? "text-red-500" : "text-[#39FF14]"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !username.trim()}
              className={`w-full py-3 rounded font-bold uppercase tracking-widest transition-all
                ${
                  saving || !username.trim()
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-[#39FF14] text-black hover:bg-[#32cc12]"
                }`}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
