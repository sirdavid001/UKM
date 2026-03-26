import Constants from "expo-constants";

type Extra = {
  expoClient?: {
    extra?: Record<string, string | undefined>;
  };
};

const extra = ((Constants as unknown as Extra).expoClient?.extra ?? {}) as Record<string, string | undefined>;

function readEnvVar(key: string) {
  const value = process.env[key] ?? extra[key];
  return value?.trim() ? value.trim() : "";
}

export const env = {
  supabaseUrl: readEnvVar("EXPO_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readEnvVar("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
  appUrl: readEnvVar("EXPO_PUBLIC_APP_URL"),
};

const requiredPublicEnv = [
  ["EXPO_PUBLIC_SUPABASE_URL", env.supabaseUrl],
  ["EXPO_PUBLIC_SUPABASE_ANON_KEY", env.supabaseAnonKey],
  ["EXPO_PUBLIC_APP_URL", env.appUrl],
] as const;

export const missingPublicEnvKeys = requiredPublicEnv
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const isSupabaseConfigured = missingPublicEnvKeys.length === 0;

export function getMissingPublicEnvMessage() {
  return `Missing required public env: ${missingPublicEnvKeys.join(", ")}. Configure the live Supabase project and public app URL before using UKM.`;
}
