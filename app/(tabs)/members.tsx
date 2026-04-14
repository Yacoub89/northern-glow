import { useQuery } from "convex/react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { useGymColors } from "../../constants/GymConfig";

export default function MembersScreen() {
  const { primary } = useGymColors();
  const members = useQuery(api.users.listMembers);

  function roleBadgeColor(role?: string) {
    if (role === "admin") return primary;
    if (role === "coach") return Colors.warning ?? "#f59e0b";
    return Colors.textSecondary;
  }

  if (members === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Members</Text>
        <Text style={styles.count}>{members.length} total</Text>
      </View>
      <FlatList
        data={members}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.avatar, { backgroundColor: primary + "22" }]}>
              <Text style={[styles.avatarText, { color: primary }]}>
                {(item.name ?? item.email ?? "?")[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name ?? "No name"}</Text>
              <Text style={styles.email}>{item.email ?? "—"}</Text>
            </View>
            <View style={[styles.roleBadge, { borderColor: roleBadgeColor(item.role) }]}>
              <Text style={[styles.roleText, { color: roleBadgeColor(item.role) }]}>
                {item.role ?? "athlete"}
              </Text>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
  },
  count: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: Colors.text },
  email: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  roleBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  separator: { height: 8 },
});
