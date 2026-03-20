import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";

import { env, isSupabaseConfigured } from "@/core/env";

export const supabase = isSupabaseConfigured
  ? createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
