import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CACHE_KEY = "ukm.push-token.v1";

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

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === "web" || !Device.isDevice) {
    return null;
  }

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
