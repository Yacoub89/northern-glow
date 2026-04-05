import { useConvexAuth, useQuery } from "convex/react";
import { Redirect, Tabs, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";

function WodTabButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.wodBtn} onPress={onPress}>
      <View style={styles.wodBtnInner}>
        <Ionicons name="arrow-down" size={22} color="#fff" />
      </View>
      <Text style={styles.wodBtnLabel}>WOD</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.getMe);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (isLoading || (isAuthenticated && me === undefined)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
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
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: 72 + insets.bottom, paddingBottom: 8 + insets.bottom }],
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          tabBarLabel: "Schedule",
          href: isCoach ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      {/* Center WOD button */}
      <Tabs.Screen
        name="wod-placeholder"
        options={{
          tabBarButton: () => (
            <WodTabButton
              onPress={() =>
                isCoach
                  ? router.push("/wod-form")
                  : router.navigate("/(tabs)/wod-placeholder")
              }
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarLabel: "History",
          href: isCoach ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          tabBarLabel: "Coach",
          href: isCoach ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
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
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
  },
  wodBtn: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
    width: 70,
  },
  wodBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  wodBtnLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
