import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@utils/firebaseClient";

export function useOpponentLookup(opponentUid: string) {
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentChecking, setOpponentChecking] = useState(false);

  useEffect(() => {
    const uid = opponentUid.trim();
    if (!uid) {
      setOpponentName(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setOpponentChecking(true);
      setOpponentName(null);
      try {
        const snap = await getDoc(doc(firestore, "users", uid));
        if (cancelled) return;
        if (snap.exists()) {
          setOpponentName((snap.data() as { displayName?: string }).displayName || uid);
        } else {
          setOpponentName(null);
        }
      } catch {
        if (!cancelled) setOpponentName(null);
      } finally {
        if (!cancelled) setOpponentChecking(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [opponentUid]);

  return { opponentName, opponentChecking };
}
