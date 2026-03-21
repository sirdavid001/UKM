import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { ukmApi } from "@/core/api";
import { useAppStore } from "@/core/store";

export function useBootstrapSession() {
  const setSessionUser = useAppStore((state) => state.setSessionUser);
  const setAuthReady = useAppStore((state) => state.setAuthReady);
  const hydrated = useAppStore((state) => state.hydrated);
  const authReady = useAppStore((state) => state.authReady);
  const backendMode = useAppStore((state) => state.backendMode);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!hydrated || authReady) {
        return;
      }

      if (backendMode === "mock") {
        setAuthReady(true);
        return;
      }

      const restored = await ukmApi.restoreSession();

      if (!cancelled) {
        setSessionUser(restored);
        setAuthReady(true);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [authReady, backendMode, hydrated, setAuthReady, setSessionUser]);
}

export function useDashboard() {
  const sessionUser = useAppStore((state) => state.sessionUser);

  return useQuery({
    queryKey: ["dashboard", sessionUser?.id],
    queryFn: () => ukmApi.getDashboard(sessionUser!),
    enabled: Boolean(sessionUser),
  });
}

export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => ukmApi.getPublicProfile(username),
    enabled: Boolean(username),
  });
}

export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  const sessionUser = useAppStore((state) => state.sessionUser);

  return () => queryClient.invalidateQueries({ queryKey: ["dashboard", sessionUser?.id] });
}

export function useSignOut() {
  const setSessionUser = useAppStore((state) => state.setSessionUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ukmApi.signOut(),
    onSuccess: async () => {
      setSessionUser(null);
      await queryClient.clear();
    },
  });
}
