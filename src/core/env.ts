import Constants from "expo-constants";

type Extra = {
  expoClient?: {
    extra?: Record<string, string | undefined>;
  };
};

const extra = ((Constants as unknown as Extra).expoClient?.extra ?? {}) as Record<string, string | undefined>;

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  appUrl: process.env.EXPO_PUBLIC_APP_URL ?? extra.EXPO_PUBLIC_APP_URL ?? "https://ukm.app",
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
