import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { useDashboard } from "@/core/hooks";
import { getPostAuthRoute } from "@/core/routing";
import { useAppStore } from "@/core/store";
import { useTheme } from "@/core/theme";
import { Screen } from "@/ui/primitives";

export default function IndexScreen() {
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

  return <Redirect href={getPostAuthRoute(dashboard?.profile)} />;
}
