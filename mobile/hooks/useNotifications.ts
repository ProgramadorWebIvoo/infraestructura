import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestJson } from "../api";

const TOKEN_STORAGE_KEY = "expo_push_token";
const REGISTERED_STORAGE_KEY = "push_token_registered";

// Configure foreground notification appearance
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationData = {
  screen?: string;
  projectId?: string;
};

function extractData(notification: Notifications.Notification): NotificationData {
  const data = notification.request.content.data ?? {};
  return {
    screen: typeof data.screen === "string" ? data.screen : undefined,
    projectId: typeof data.projectId === "string" ? data.projectId : undefined,
  };
}

export function useNotifications(token: string | null) {
  const tapHandlerRef = useRef<((data: NotificationData) => void) | null>(null);

  // Register for push notifications on mount (if token available)
  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const register = async () => {
      // Check if already registered (avoid re-registering every launch)
      const alreadyRegistered = await AsyncStorage.getItem(REGISTERED_STORAGE_KEY);
      if (alreadyRegistered === token) return;

      // Physical device required for push tokens
      if (!Device.isDevice) {
        // Dev environment — use a known test token for Expo Go
        // Real push only works on physical devices
        return;
      }

      const existingPermissions: any = await Notifications.getPermissionsAsync();
      let canSend = existingPermissions?.status === "granted" || existingPermissions?.granted === true;

      if (!canSend) {
        const result: any = await Notifications.requestPermissionsAsync();
        canSend = result?.status === "granted" || result?.granted === true;
      }

      if (!canSend) {
        return;
      }

      try {
        const pushTokenData = await Notifications.getExpoPushTokenAsync({
          projectId: undefined, // auto-detect from app config
        });
        const pushToken = pushTokenData.data;

        // Store locally
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, pushToken);

        // Send to backend
        await requestJson(token, "/push-tokens", {
          method: "POST",
          body: JSON.stringify({
            token: pushToken,
            device: Platform.OS,
          }),
        });

        await AsyncStorage.setItem(REGISTERED_STORAGE_KEY, token);
      } catch {
        // Silently fail — push is non-critical
      }
    };

    register();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Set up notification response listener (user taps notification)
  useEffect(() => {
    // Handle notification that opened the app (cold start)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification && tapHandlerRef.current) {
        tapHandlerRef.current(extractData(response.notification));
      }
    });

    // Handle taps while app is running
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (tapHandlerRef.current) {
        tapHandlerRef.current(extractData(response.notification));
      }
    });

    return () => sub.remove();
  }, []);

  const onNotificationTap = (handler: (data: NotificationData) => void) => {
    tapHandlerRef.current = handler;
  };

  return { onNotificationTap };
}
