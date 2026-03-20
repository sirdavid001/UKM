import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ukmApi } from "@/core/api";
import { registerForPushNotificationsAsync } from "@/core/notifications";
import { useAppStore } from "@/core/store";
import { AppThemeProvider, useTheme } from "@/core/theme";

const queryClient = new QueryClient();

function AppChrome() {
  const { resolved } = useTheme();
  return <StatusBar style={resolved === "dark" ? "light" : "dark"} />;
}

function NotificationBootstrap() {
  const sessionUser = useAppStore((state) => state.sessionUser);

  useEffect(() => {
    let cancelled = false;

    async function register() {
      if (!sessionUser) {
        return;
      }

      const result = await registerForPushNotificationsAsync();
      if (!result?.token || cancelled) {
        return;
      }

      await ukmApi.registerPushToken(sessionUser, result.token);
    }

    void register();

    return () => {
      cancelled = true;
    };
  }, [sessionUser]);

  useEffect(() => {
    function openFromNotification(response: Notifications.NotificationResponse | null) {
      const route = response?.notification.request.content.data?.route;

      if (typeof route === "string" && route.length > 0) {
        router.push(route as "/(tabs)/inbox");
        return;
      }

      router.push("/(tabs)/inbox");
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromNotification(response);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openFromNotification(response);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [loaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <AppChrome />
            <NotificationBootstrap />
            {children}
          </AppThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
