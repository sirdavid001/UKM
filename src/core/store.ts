import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { APP_FLAGS } from "@/core/config";
import { isSupabaseConfigured } from "@/core/env";
import type { AppFlags, SessionUser, ThemePreference } from "@/core/types";

type StoreState = {
  hydrated: boolean;
  authReady: boolean;
  backendMode: "misconfigured" | "supabase";
  appFlags: AppFlags;
  themePreference: ThemePreference;
  pendingEmail: string | null;
  sessionUser: SessionUser | null;
  setHydrated: (hydrated: boolean) => void;
  setAuthReady: (authReady: boolean) => void;
  setPendingEmail: (email: string | null) => void;
  setThemePreference: (preference: ThemePreference) => void;
  setSessionUser: (user: SessionUser | null) => void;
  setAppFlags: (flags: Partial<AppFlags>) => void;
  resetAuthFlow: () => void;
};

export const useAppStore = create<StoreState>()(
  persist(
    (set) => ({
      hydrated: false,
      authReady: false,
      backendMode: isSupabaseConfigured ? "supabase" : "misconfigured",
      appFlags: APP_FLAGS,
      themePreference: "system",
      pendingEmail: null,
      sessionUser: null,
      setHydrated: (hydrated) => set({ hydrated }),
      setAuthReady: (authReady) => set({ authReady }),
      setPendingEmail: (pendingEmail) => set({ pendingEmail }),
      setThemePreference: (themePreference) => set({ themePreference }),
      setSessionUser: (sessionUser) => set({ sessionUser }),
      setAppFlags: (flags) => set((state) => ({ appFlags: { ...state.appFlags, ...flags } })),
      resetAuthFlow: () => set({ pendingEmail: null, sessionUser: null }),
    }),
    {
      name: "ukm.ui.v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        appFlags: state.appFlags,
        themePreference: state.themePreference,
        sessionUser: state.sessionUser,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
