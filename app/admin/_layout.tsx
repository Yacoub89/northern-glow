import { useConvexAuth, useQuery } from "convex/react";
import { Link, Redirect, Slot, usePathname } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { useGymConfig } from "../../constants/GymConfig";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
};

const NAV: NavItem[] = [
  { label: "Dashboard",  href: "/admin",           icon: "grid-outline" },
  { label: "Members",    href: "/admin/members",    icon: "people-outline" },
  { label: "Schedule",   href: "/admin/schedule",   icon: "calendar-outline" },
  { label: "Documents",  href: "/admin/documents",  icon: "document-text-outline" },
  { label: "Settings",   href: "/admin/settings",   icon: "settings-outline" },
];

export default function AdminLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.getMe);
  const gym = useGymConfig();
  const pathname = usePathname();

  if (isLoading || (isAuthenticated && me === undefined)) {
    return (
      <View style={s.splash}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (me?.role !== "admin" && me?.role !== "coach") {
    return (
      <View style={s.splash}>
        <Ionicons name="lock-closed-outline" size={48} color={Colors.textMuted} />
        <Text style={s.splashText}>Admin access only</Text>
      </View>
    );
  }

  return (
    <View style={s.shell}>
      {/* Sidebar */}
      <View style={s.sidebar}>
        <View style={s.brand}>
          <View style={[s.brandDot, { backgroundColor: gym.primaryColor }]} />
          <View>
            <Text style={s.brandName}>{gym.name}</Text>
            <Text style={s.brandSub}>Admin Panel</Text>
          </View>
        </View>

        <View style={s.nav}>
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href as any} asChild>
                <Pressable style={StyleSheet.flatten([s.navItem, active && { backgroundColor: gym.primaryColor + "22" }])}>
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={active ? gym.primaryColor : Colors.textSecondary}
                  />
                  <Text style={[s.navLabel, active && { color: gym.primaryColor }]}>
                    {item.label}
                  </Text>
                  {active && <View style={[s.navActivePip, { backgroundColor: gym.primaryColor }]} />}
                </Pressable>
              </Link>
            );
          })}
        </View>

        <View style={s.sidebarFooter}>
          <View style={s.meRow}>
            <View style={s.meAvatar}>
              <Text style={s.meAvatarText}>{(me?.name ?? "A")[0].toUpperCase()}</Text>
            </View>
            <View>
              <Text style={s.meName}>{me?.name ?? me?.email}</Text>
              <Text style={s.meRole}>{me?.role}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={s.content}>
        <Slot />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: "row", backgroundColor: Colors.background },
  splash: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background, gap: 16 },
  splashText: { color: Colors.textSecondary, fontSize: 16 },

  // Sidebar
  sidebar: {
    width: 220,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 32 },
  brandDot: { width: 36, height: 36, borderRadius: 10 },
  brandName: { fontSize: 15, fontWeight: "800", color: Colors.text },
  brandSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  nav: { gap: 4, flex: 1 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    position: "relative",
  },
  navLabel: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary, flex: 1 },
  navActivePip: { width: 6, height: 6, borderRadius: 3 },

  sidebarFooter: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 },
  meRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  meAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + "33",
    justifyContent: "center",
    alignItems: "center",
  },
  meAvatarText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  meName: { fontSize: 13, fontWeight: "600", color: Colors.text },
  meRole: { fontSize: 11, color: Colors.textMuted, textTransform: "capitalize" },

  // Content area
  content: { flex: 1, overflow: "hidden" },
});
