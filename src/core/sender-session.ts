import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "ukm.sender-session.v1";

export async function getOrCreateSenderSession() {
  const generated = Crypto.randomUUID();

  if (Platform.OS === "web") {
    const local = safeWebStorage("localStorage");
    const session = safeWebStorage("sessionStorage");
    const existing = local?.getItem(KEY) ?? session?.getItem(KEY);

    if (existing) {
      return { senderSessionId: existing, senderConfidence: "high" as const };
    }

    if (local) {
      local.setItem(KEY, generated);
      return { senderSessionId: generated, senderConfidence: "high" as const };
    }

    if (session) {
      session.setItem(KEY, generated);
      return { senderSessionId: generated, senderConfidence: "low" as const };
    }

    return { senderSessionId: generated, senderConfidence: "low" as const };
  }

  try {
    const stored = await SecureStore.getItemAsync(KEY);

    if (stored) {
      return { senderSessionId: stored, senderConfidence: "high" as const };
    }

    await SecureStore.setItemAsync(KEY, generated);
    return { senderSessionId: generated, senderConfidence: "high" as const };
  } catch {
    const fallback = await AsyncStorage.getItem(KEY);

    if (fallback) {
      return { senderSessionId: fallback, senderConfidence: "low" as const };
    }

    await AsyncStorage.setItem(KEY, generated);
    return { senderSessionId: generated, senderConfidence: "low" as const };
  }
}

function safeWebStorage(type: "localStorage" | "sessionStorage") {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window[type];
  } catch {
    return null;
  }
}
