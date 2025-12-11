"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { signInGoogle, signInGuest, logout } from "@utils/auth";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@utils/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { firestore } from "@utils/firebaseClient";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Check if user profile exists, if not create it
          const userRef = doc(firestore, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || `Guest-${currentUser.uid.substring(0, 4)}`,
              displayNameLower: (currentUser.displayName || `Guest-${currentUser.uid.substring(0, 4)}`).toLowerCase(),
              photoURL: currentUser.photoURL,
              createdAt: Date.now(),
              stats: { wins: 0, losses: 0, streak: 0 },
              profileCompleted: false
            });
            // Redirect new users to profile page to set their username
            if (window.location.pathname !== "/profile") {
              window.location.href = "/profile";
            }
          } else {
            // Check if profile is completed (has custom username)
            const userData = userSnap.data();
            if (!userData.profileCompleted && window.location.pathname !== "/profile") {
              window.location.href = "/profile";
            }
          }
        } catch (error) {
          console.error("Error managing user profile:", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="text-gray-500">Loading...</div>;

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <a href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
          <div className="text-right">
            <p className="text-sm font-bold text-[#39FF14] group-hover:underline">{user.displayName}</p>
            <p className="text-xs text-gray-500">UID: {user.uid.substring(0, 6)}...</p>
          </div>
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt="Profile"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full border border-[#333] object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">
              {user.displayName?.[0] || "G"}
            </div>
          )}
        </a>
        <button
          onClick={() => logout()}
          className="text-xs text-red-500 hover:text-red-400 underline"
        >
          Sign Out
        </button>
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    try {
      await signInGoogle();
    } catch (error) {
      console.error("Google Login failed:", error);
      alert(`Login failed: ${(error as Error).message}`);
    }
  };

  const handleGuestLogin = async () => {
    try {
      await signInGuest();
    } catch (error) {
      console.error("Guest Login failed:", error);
      alert(`Guest login failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleGuestLogin}
        className="bg-gray-800 text-white font-bold px-4 py-2 rounded hover:bg-gray-700 transition-colors border border-gray-700"
      >
        Guest
      </button>
      <button
        onClick={handleGoogleLogin}
        className="bg-white text-black font-bold px-4 py-2 rounded hover:bg-gray-200 transition-colors"
      >
        Google
      </button>
    </div>
  );
}
