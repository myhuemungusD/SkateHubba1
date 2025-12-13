"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@utils/auth";

export default function AuthFinishPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get("firebaseToken");
    const next = searchParams.get("state") || "/";

    const doLogin = async () => {
      if (!token) {
        setError("Missing Firebase token");
        setLoading(false);
        return;
      }
      try {
        await signInWithCustomToken(auth, token);
        router.replace(next);
      } catch (err) {
        console.error("Firebase sign-in failed", err);
        setError("Login failed. Please try again.");
        setLoading(false);
      }
    };

    void doLogin();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Completing sign-in...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return null;
}
