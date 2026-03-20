import { createContext, useContext, useMemo } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import { useColorScheme } from "nativewind";

import { useAppStore } from "@/core/store";
import type { ThemePreference } from "@/core/types";

type ThemePalette = {
  background: string;
  backgroundAlt: string;
  card: string;
  cardMuted: string;
  text: string;
  textMuted: string;
  accent: string;
  accentAlt: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
};

const palettes: Record<"light" | "dark", ThemePalette> = {
  light: {
    background: "#F6F7FB",
    backgroundAlt: "#FFFFFF",
    card: "#FFFFFF",
    cardMuted: "#EFF2FF",
    text: "#10131C",
    textMuted: "#596076",
    accent: "#FF7448",
    accentAlt: "#4DA2FF",
    border: "#D8E0F0",
    success: "#1DBE8B",
    warning: "#F59E0B",
    danger: "#F04438",
  },
  dark: {
    background: "#08090D",
    backgroundAlt: "#0F121B",
    card: "#121621",
    cardMuted: "#1A2030",
    text: "#F5F7FF",
    textMuted: "#A7B0C5",
    accent: "#FF7448",
    accentAlt: "#4DA2FF",
    border: "#242B3D",
    success: "#61F0BB",
    warning: "#F6B653",
    danger: "#FF6A6A",
  },
};

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  palette: ThemePalette;
};

const ThemeContext = createContext<ThemeContextValue>({
  preference: "system",
  resolved: "dark",
  palette: palettes.dark,
});

function resolveSystemScheme(preference: ThemePreference, systemScheme: ColorSchemeName | null | undefined) {
  if (preference === "system") {
    return systemScheme === "light" ? "light" : "dark";
  }

  return preference;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useAppStore((state) => state.themePreference);
  const { setColorScheme } = useColorScheme();

  const resolved = useMemo(() => {
    const scheme = resolveSystemScheme(preference, Appearance.getColorScheme() ?? null);
    setColorScheme(scheme);
    return scheme;
  }, [preference, setColorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      palette: palettes[resolved],
    }),
    [preference, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
