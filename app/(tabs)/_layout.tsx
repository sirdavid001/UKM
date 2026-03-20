import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import { useDashboard } from "@/core/hooks";
import { useTheme } from "@/core/theme";

export default function TabLayout() {
  const { palette } = useTheme();
  const { data } = useDashboard();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: palette.border,
          height: 78,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="share"
        options={{
          title: "Share",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="sparkles-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="mail-unread-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name="options-outline" size={size} />,
        }}
      />
      <Tabs.Screen name="premium" options={{ href: data?.flags.launchMode ? null : "/(tabs)/premium" }} />
    </Tabs>
  );
}
