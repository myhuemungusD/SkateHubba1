"use client";

import { useState, useEffect } from "react";
import { signInGoogle, logout } from "@utils/auth";
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
        // Check if user profile exists, if not create it
        const userRef = doc(firestore, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || "Skater",
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
          {user.photoURL && (
            <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-[#333]" />
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

  const handleLogin = async () => {
    try {
      await signInGoogle();
    } catch (error) {
      console.error("Login failed:", error);
      alert(`Login failed: ${(error as Error).message}`);
    }
  };

  return (
    <button
      onClick={handleLogin}
      className="bg-white text-black font-bold py-2 px-4 rounded hover:bg-gray-200 transition-colors"
    >
      Sign In with Google
    </button>
  );
}
