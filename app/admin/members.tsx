import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { useGymColors } from "../../constants/GymConfig";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "../../convex/_generated/dataModel";

const ROLES = ["athlete", "coach", "admin"] as const;

export default function AdminMembers() {
  const { primary } = useGymColors();
  const members = useQuery(api.users.listMembers);
  const setRole = useMutation(api.users.setRole);

  function roleBadgeColor(role?: string) {
    if (role === "admin") return primary;
    if (role === "coach") return Colors.warning;
    return Colors.textSecondary;
  }
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const filtered = (members ?? []).filter(m =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = async (userId: Id<"users">, role: typeof ROLES[number]) => {
    setUpdating(userId);
    try {
      await setRole({ userId, role });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.pageHeader}>
        <Text style={s.title}>Members</Text>
        <Text style={s.count}>{members?.length ?? 0} total</Text>
      </View>

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email…"
          placeholderTextColor={Colors.textMuted}
        />
        {search ? (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {members === undefined ? (
        <ActivityIndicator color={primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={s.tableCard}>
          <View style={s.tableHeader}>
            <Text style={[s.cell, s.head, { flex: 2 }]}>Name</Text>
            <Text style={[s.cell, s.head, { flex: 3 }]}>Email</Text>
            <Text style={[s.cell, s.head, { flex: 1 }]}>Role</Text>
          </View>
          {filtered.map((member) => (
            <View key={member._id} style={s.tableRow}>
              <Text style={[s.cell, { flex: 2, color: Colors.text, fontWeight: "600" }]} numberOfLines={1}>
                {member.name ?? "—"}
              </Text>
              <Text style={[s.cell, { flex: 3 }]} numberOfLines={1}>{member.email ?? "—"}</Text>
              <View style={[s.cell, { flex: 1 }]}>
                <View style={s.roleRow}>
                  {ROLES.map(r => (
                    <Pressable
                      key={r}
                      style={[s.rolePill, member.role === r && { backgroundColor: roleBadgeColor(r) + "33", borderColor: roleBadgeColor(r) }]}
                      onPress={() => member.role !== r && handleRoleChange(member._id as Id<"users">, r)}
                      disabled={updating === member._id}
                    >
                      {updating === member._id && member.role !== r ? (
                        <ActivityIndicator size={10} color={Colors.textMuted} />
                      ) : (
                        <Text style={[s.rolePillText, member.role === r && { color: roleBadgeColor(r) }]}>{r}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ))}
          {filtered.length === 0 && (
            <View style={s.emptyRow}>
              <Text style={s.emptyText}>No members found</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 32, paddingBottom: 60 },
  pageHeader: { flexDirection: "row", alignItems: "baseline", gap: 12, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "800", color: Colors.text },
  count: { fontSize: 14, color: Colors.textSecondary },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginBottom: 20,
    gap: 8,
  },
  searchIcon: {},
  searchInput: { flex: 1, paddingVertical: 10, color: Colors.text, fontSize: 14, outlineStyle: "none" } as any,
  tableCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.background,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "66",
    alignItems: "center",
  },
  cell: { fontSize: 14, color: Colors.textSecondary },
  head: { fontWeight: "700", color: Colors.textSecondary, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  roleRow: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rolePillText: { fontSize: 11, fontWeight: "600", color: Colors.textMuted, textTransform: "capitalize" },
  emptyRow: { padding: 24, alignItems: "center" },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
});
