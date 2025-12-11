import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { firestore } from "@utils/firebaseClient";

export type UserProfile = {
  uid: string;
  displayName: string;
  displayNameLower?: string;
  photoURL?: string | null;
};

export function useUserSearch(term: string) {
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = term.trim().toLowerCase();
    if (!t) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const usersRef = collection(firestore, "users");
        const q = query(
          usersRef,
          where("searchableKeywords", "array-contains", t),
          limit(5)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const next: UserProfile[] = [];
        snap.forEach((docSnap) => {
          next.push({
            uid: docSnap.id,
            ...(docSnap.data() as Partial<UserProfile>),
          } as UserProfile);
        });
        setResults(next);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [term]);

  return { results, loading };
}
