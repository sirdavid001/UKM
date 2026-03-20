import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, TextInput, View } from "react-native";
import type { TextInputProps, ViewProps } from "react-native";

import { useTheme } from "@/core/theme";

export function Screen({
  children,
  padded = true,
  style,
  className = "",
}: ViewProps & { padded?: boolean; style?: ViewProps["style"]; className?: string }) {
  const { palette } = useTheme();

  return (
    <View className={`${padded ? "flex-1 px-5 pt-6" : "flex-1"} ${className}`} style={[{ backgroundColor: palette.background }, style]}>
      {children}
    </View>
  );
}

export function GradientHero({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  const { palette } = useTheme();

  return (
    <LinearGradient
      colors={[palette.accent, palette.accentAlt, "#7D48FF"]}
      className="overflow-hidden rounded-[28px] p-5"
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text className="font-body text-xs uppercase tracking-[2px] text-white/80">{eyebrow}</Text>
      <Text className="mt-3 font-display text-[30px] leading-[34px] text-white">{title}</Text>
      <Text className="mt-3 font-body text-sm leading-6 text-white/85">{body}</Text>
    </LinearGradient>
  );
}

export function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { palette } = useTheme();

  return (
    <View className={`rounded-[24px] border p-4 ${className}`} style={{ backgroundColor: palette.card, borderColor: palette.border }}>
      {children}
    </View>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  const { palette } = useTheme();

  return (
    <View className="mb-3">
      <Text className="font-display text-xl" style={{ color: palette.text }}>
        {title}
      </Text>
      {hint ? (
        <Text className="mt-1 font-body text-sm" style={{ color: palette.textMuted }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme();

  return (
    <Text className="mb-2 font-medium text-sm" style={{ color: palette.text }}>
      {children}
    </Text>
  );
}

export function AppTextInput(props: TextInputProps) {
  const { palette } = useTheme();

  return (
    <TextInput
      placeholderTextColor={palette.textMuted}
      className="rounded-2xl border px-4 py-4 font-body text-base"
      style={{ backgroundColor: palette.backgroundAlt, borderColor: palette.border, color: palette.text }}
      {...props}
    />
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = "accent",
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: "accent" | "ghost";
}) {
  const { palette } = useTheme();

  const backgroundColor = tone === "ghost" ? palette.cardMuted : palette.accent;
  const color = tone === "ghost" ? palette.text : "#FFFFFF";

  return (
    <Pressable
      accessibilityRole="button"
      className="items-center rounded-full px-5 py-4"
      disabled={disabled}
      onPress={onPress}
      style={{
        opacity: disabled ? 0.5 : 1,
        backgroundColor,
      }}
    >
      <Text className="font-medium text-base" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      className="mr-2 rounded-full px-4 py-2"
      style={{ backgroundColor: active ? palette.accent : palette.cardMuted }}
    >
      <Text className="font-medium text-sm" style={{ color: active ? "#FFFFFF" : palette.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
