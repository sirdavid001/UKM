import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CACHE_KEY = "ukm.push-token.v1";
export const PUSH_CHANNEL_ID = "messages";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function getProjectId() {
  const extraProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const manifestProjectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  return extraProjectId ?? manifestProjectId ?? undefined;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
    name: "Messages",
    importance: Notifications.AndroidImportance.HIGH,
    showBadge: true,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF7448",
  });
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === "web" || !Device.isDevice) {
    return null;
  }

  await ensureAndroidChannel();

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (existingPermission.status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = getProjectId();
  const pushToken = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const token = pushToken.data;
  const cached = await AsyncStorage.getItem(CACHE_KEY);

  if (cached === token) {
    return { token, changed: false };
  }

  await AsyncStorage.setItem(CACHE_KEY, token);

  return { token, changed: true };
}

export function addExpoPushTokenRefreshListener(onToken: (token: string) => void | Promise<void>) {
  if (Platform.OS === "web") {
    return { remove: () => {} };
  }

  return Notifications.addPushTokenListener(async () => {
    const next = await registerForPushNotificationsAsync();

    if (next?.token) {
      await onToken(next.token);
    }
  });
}
