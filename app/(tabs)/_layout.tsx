import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { Redirect, Tabs, useRouter } from "expo-router";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";
import { useGymColors, useGymConfig } from "../../constants/GymConfig";

function SharedHeader() {
  const router = useRouter();
  const { primary } = useGymColors();
  const gym = useGymConfig();
  const me = useQuery(api.users.getMe);
  const insets = useSafeAreaInsets();
  const initial = me?.name?.[0]?.toUpperCase() ?? "A";

  return (
    <View style={[hdr.container, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.push("/(tabs)/profile")} hitSlop={10}>
        <View style={[hdr.avatar, { borderColor: primary }]}>
          <Text style={[hdr.avatarText, { color: primary }]}>{initial}</Text>
        </View>
      </Pressable>

      {gym.logoUrl ? (
        <Image
          source={{ uri: gym.logoUrl }}
          style={hdr.logo}
          resizeMode="contain"
        />
      ) : (
        <Text style={[hdr.brandName, { color: primary }]}>
          {gym.name.toUpperCase()}
        </Text>
      )}

      {/* Spacer to keep header balanced */}
      <View style={{ width: 34 }} />
    </View>
  );
}

const hdr = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surfaceContainerLow,
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 13,
  },
  brandName: {
    fontFamily: Fonts.display,
    fontSize: 18,
    letterSpacing: 1.6,
  },
  logo: {
    height: 28,
    width: 120,
  },
});

export default function TabsLayout() {
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.getMe);
  const insets = useSafeAreaInsets();
  const { primary } = useGymColors();

  if (isLoading || (isAuthenticated && me === undefined)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!me?.gymId) {
    return (
      <View style={[styles.centered, styles.noGym]}>
        <Text style={styles.noGymTitle}>We couldn't find your gym</Text>
        <Text style={styles.noGymText}>
          You're signed in, but this email is not connected to a gym yet. Ask your gym admin for an invite, then sign in with the invited email.
        </Text>
        <Pressable
          style={[styles.noGymButton, { backgroundColor: primary }]}
          onPress={() => void signOut()}
        >
          <Text style={styles.noGymButtonText}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  const isCoach = me?.role === "coach" || me?.role === "admin";

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <SharedHeader />,
        tabBarStyle: {
          ...styles.tabBar,
          height: 60 + insets.bottom,
          paddingBottom: 6 + insets.bottom,
        },
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {/* ── Home — always visible ── */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />

      {/* ── Schedule — athletes only ── */}
      <Tabs.Screen
        name="schedule"
        options={{
          tabBarLabel: "Schedule",
          href: isCoach ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />
          ),
        }}
      />

      {/* ── Manage — coaches only ── */}
      <Tabs.Screen
        name="manage"
        options={{
          tabBarLabel: "Manage",
          href: isCoach ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />
          ),
        }}
      />

      {/* ── WOD — visible to all ── */}
      <Tabs.Screen
        name="wod"
        options={{
          tabBarLabel: "WOD",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "stopwatch" : "stopwatch-outline"} size={size} color={color} />
          ),
        }}
      />

      {/* ── Profile — visible to all ── */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
      />

      {/* ── Hidden screens (accessible via navigation, not tabs) ── */}
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="members" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  noGym: {
    paddingHorizontal: 28,
  },
  noGymTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  noGymText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  noGymButton: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  noGymButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.onPrimary,
  },
  tabBar: {
    backgroundColor: Colors.surfaceVariant,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 7,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.4,
  },
});
