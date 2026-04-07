import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { GymConfigProvider } from "../constants/GymConfig";
import { useConvexAuth, useMutation } from "convex/react";
import { ConvexReactClient } from "convex/react";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { api } from "../convex/_generated/api";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// SecureStore doesn't work on web — use localStorage instead
const tokenStorage =
  Platform.OS === "web"
    ? {
        getItem: (key: string) =>
          Promise.resolve(localStorage.getItem(key)),
        setItem: (key: string, value: string) => {
          localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          localStorage.removeItem(key);
          return Promise.resolve();
        },
      }
    : (() => {
        // Lazy import so SecureStore is never bundled on web
        const SecureStore = require("expo-secure-store");
        return {
          getItem: SecureStore.getItemAsync,
          setItem: SecureStore.setItemAsync,
          removeItem: SecureStore.deleteItemAsync,
        };
      })();

// Push notifications are native-only
function PushTokenRegistrar() {
  const { isAuthenticated } = useConvexAuth();
  const savePushToken = useMutation(api.users.savePushToken);

  useEffect(() => {
    // expo-notifications remote push not supported in Expo Go (SDK 53+)
    const isExpoGo = Constants.appOwnership === "expo";
    if (!isAuthenticated || Platform.OS === "web" || isExpoGo) return;

    async function register() {
      const Device = require("expo-device");
      const Notifications = require("expo-notifications");

      if (!Device.isDevice) return;

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") return;

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      await savePushToken({ token: tokenData.data });
    }

    register();
  }, [isAuthenticated]);

  return null;
}

export default function RootLayout() {
  return (
    <ConvexAuthProvider client={convex} storage={tokenStorage}>
      <GymConfigProvider>
      <PushTokenRegistrar />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="wod-form" options={{ headerShown: false }} />
        <Stack.Screen
          name="class-form"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Add Class",
            headerStyle: { backgroundColor: "#131328" },
            headerTintColor: "#FFFFFF",
            headerTitleStyle: { fontWeight: "700" },
          }}
        />
        <Stack.Screen name="membership" options={{ headerShown: false }} />
        <Stack.Screen name="roster" options={{ headerShown: false }} />
        <Stack.Screen name="kiosk" options={{ headerShown: false }} />
      </Stack>
      </GymConfigProvider>
    </ConvexAuthProvider>
  );
}
