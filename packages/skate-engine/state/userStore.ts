import { create } from "zustand";

interface UserState {
  user: any | null;
  setUser: (user: any | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
}));
