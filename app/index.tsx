import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { useDashboard, useBootstrapSession } from "@/core/hooks";
import { useAppStore } from "@/core/store";
import { useTheme } from "@/core/theme";
import { Screen } from "@/ui/primitives";

export default function IndexScreen() {
  useBootstrapSession();
  const sessionUser = useAppStore((state) => state.sessionUser);
  const hydrated = useAppStore((state) => state.hydrated);
  const { data: dashboard, isLoading } = useDashboard();
  const { palette } = useTheme();

  if (!hydrated || isLoading) {
    return (
      <Screen className="items-center justify-center">
        <View className="rounded-full px-4 py-2" style={{ backgroundColor: palette.card }}>
          <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
            Loading UKM…
          </Text>
        </View>
      </Screen>
    );
  }

  if (!sessionUser) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!dashboard?.profile.dob) {
    return <Redirect href="/(onboarding)/age" />;
  }

  if (!dashboard.profile.displayName && !dashboard.profile.avatarUrl) {
    return <Redirect href="/(onboarding)/profile" />;
  }

  if (!dashboard.profile.username) {
    return <Redirect href="/(onboarding)/username" />;
  }

  return <Redirect href="/(tabs)/share" />;
}
