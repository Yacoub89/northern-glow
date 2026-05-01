import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation } from "convex/react";
import { ConvexReactClient } from "convex/react";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform, StyleSheet, View, ActivityIndicator } from "react-native";
import { api } from "../convex/_generated/api";
import { useFonts } from "expo-font";
import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { Colors } from "../constants/Colors";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

const SecureStore = require("expo-secure-store");
const tokenStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

// Links the authenticated user to their gym via a pending invite (runs once after login).
function GymLinker() {
  const { isAuthenticated } = useConvexAuth();
  const checkAndAccept = useMutation(api.invites.checkAndAccept);

  useEffect(() => {
    if (!isAuthenticated) return;
    checkAndAccept({}).catch((err) => {
      console.warn("Failed to link user to gym via invite:", err);
    });
  }, [isAuthenticated]);

  return null;
}

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
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />

      <Stack.Screen
        name="class-form"
        options={{
          presentation: "modal",
          headerShown: true,
          title: "Add Class",
          headerStyle: { backgroundColor: Colors.surfaceContainerLow },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen name="membership" options={{ headerShown: false }} />
      <Stack.Screen name="event-detail" options={{ headerShown: false }} />
      <Stack.Screen name="roster" options={{ headerShown: false }} />
      <Stack.Screen name="kiosk" options={{ headerShown: false }} />
      <Stack.Screen name="gym-settings" options={{ headerShown: false }} />
    </Stack>
  );

  return (
    <ConvexAuthProvider client={convex} storage={tokenStorage}>
      <GymLinker />
      <PushTokenRegistrar />
      {Platform.OS === "web" ? (
        <View style={webStyles.outer}>
          <View style={webStyles.inner}>{stack}</View>
        </View>
      ) : stack}
    </ConvexAuthProvider>
  );
}

const webStyles = Platform.OS === "web" ? StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
  },
  inner: {
    flex: 1,
    width: "100%",
    maxWidth: 430,
    overflow: "hidden",
  },
}) : { outer: {}, inner: {} };
