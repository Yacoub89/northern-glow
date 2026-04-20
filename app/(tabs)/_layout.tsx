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
    <View style={[hdr.container, { paddingTop: insets.top + 6 }]}>
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
    paddingBottom: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 13,
  },
  brandName: {
    fontFamily: Fonts.display,
    fontSize: 18,
    letterSpacing: 2,
  },
  logo: {
    height: 28,
    width: 120,
  },
});

export default function TabsLayout() {
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Schedule — athletes only ── */}
      <Tabs.Screen
        name="schedule"
        options={{
          tabBarLabel: "Schedule",
          href: isCoach ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Manage — coaches only ── */}
      <Tabs.Screen
        name="manage"
        options={{
          tabBarLabel: "Manage",
          href: isCoach ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── WOD — visible to all ── */}
      <Tabs.Screen
        name="wod-placeholder"
        options={{
          tabBarLabel: "WOD",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Profile — visible to all ── */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
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
  tabBar: {
    backgroundColor: Colors.surfaceContainerLow,
    borderTopWidth: 0,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.4,
  },
});
