"use client";

import { ReactNode, useEffect } from "react";
import { useUserStore } from "@engine/state/userStore";
import { listenToAuth } from "@utils/auth";

export function AppProviders({ children }: { children: ReactNode }) {
  const setUser = useUserStore((s) => s.setUser);

  useEffect(() => {
    const unsub = listenToAuth((user) => setUser(user));
    return () => unsub();
  }, [setUser]);

  return <>{children}</>;
}
