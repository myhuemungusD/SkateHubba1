"use client";

import { loginWithAuth0, logout } from "@utils/auth";

export default function AuthButton({ user }: { user?: any }) {
  // Not logged in
  if (!user) {
    return (
      <button
        onClick={loginWithAuth0}
        className="px-4 py-2 bg-white text-black rounded"
      >
        Sign In
      </button>
    );
  }

  // Logged in
  return (
    <button
      onClick={logout}
      className="px-4 py-2 bg-red-500 text-white rounded"
    >
      Sign Out
    </button>
  );
}
