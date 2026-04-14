import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { useGymColors } from "../../constants/GymConfig";
import { Ionicons } from "@expo/vector-icons";
import { getTodayDate, formatTime, formatDate } from "../../utils/date";
import { Doc } from "../../convex/_generated/dataModel";

export default function AdminSchedule() {
  const { primary } = useGymColors();
  const router = useRouter();
  const today = getTodayDate();
  const wodSchedule = useQuery(api.wods.getSchedule, { startDate: today, days: 14 });
  const upcomingClasses = useQuery(api.classes.getUpcoming, { startDate: today, days: 14 });
  const removeClass = useMutation(api.classes.remove);

  const handleDeleteClass = (cls: Doc<"classes">) => {
    Alert.alert(
      "Cancel Class",
      `Cancel ${formatTime(cls.startTime)} on ${formatDate(cls.date, { relative: true, weekday: "short" })}?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Class",
          style: "destructive",
          onPress: async () => {
            try { await removeClass({ id: cls._id }); }
            catch (e: any) { Alert.alert("Error", e.message); }
          },
        },
      ]
    );
  };

  if (wodSchedule === undefined || upcomingClasses === undefined) {
    return <View style={s.centered}><ActivityIndicator color={primary} /></View>;
  }

  // Group classes by date
  const classesByDate: Record<string, Doc<"classes">[]> = {};
  for (const cls of upcomingClasses) {
    if (!classesByDate[cls.date]) classesByDate[cls.date] = [];
    classesByDate[cls.date].push(cls);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.pageHeader}>
        <Text style={s.title}>Schedule</Text>
        <Pressable
          style={[s.addBtn, { backgroundColor: primary }]}
          onPress={() => router.push("/class-form")}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.addBtnText}>Add Class</Text>
        </Pressable>
      </View>

      <View style={s.grid}>
        {/* WODs column */}
        <View style={s.col}>
          <View style={s.colHeader}>
            <Ionicons name="barbell-outline" size={16} color={primary} />
            <Text style={s.colTitle}>WOD Schedule (14 days)</Text>
          </View>
          <View style={s.tableCard}>
            <View style={s.tableHeaderRow}>
              <Text style={[s.cell, s.head, { flex: 1 }]}>Date</Text>
              <Text style={[s.cell, s.head, { flex: 1 }]}>Type</Text>
              <Text style={[s.cell, s.head, { flex: 2 }]}>Title</Text>
              <Text style={[s.cell, s.head, { width: 60 }]}></Text>
            </View>
            {wodSchedule.map(({ date, wod }) => (
              <View key={date} style={[s.tableRow, date === today && [s.todayRow, { backgroundColor: primary + "0a" }]]}>
                <Text style={[s.cell, { flex: 1, color: date === today ? primary : Colors.text, fontWeight: date === today ? "700" : "400" }]}>
                  {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </Text>
                <Text style={[s.cell, { flex: 1 }]}>{wod?.type ?? "—"}</Text>
                <Text style={[s.cell, { flex: 2 }]} numberOfLines={1}>{wod?.title ?? <Text style={{ color: Colors.textMuted, fontStyle: "italic" }}>No WOD</Text>}</Text>
                <Pressable
                  style={[s.actionBtn, wod && [s.editBtn, { borderColor: primary + "55", backgroundColor: primary + "11" }]]}
                  onPress={() => router.push({ pathname: "/wod-form", params: wod ? { wodId: wod._id } : { date } })}
                >
                  <Text style={[s.actionBtnText, wod && [s.editBtnText, { color: primary }]]}>{wod ? "Edit" : "+ Add"}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Classes column */}
        <View style={s.col}>
          <View style={s.colHeader}>
            <Ionicons name="calendar-outline" size={16} color={primary} />
            <Text style={s.colTitle}>Classes (14 days)</Text>
          </View>
          <View style={s.tableCard}>
            <View style={s.tableHeaderRow}>
              <Text style={[s.cell, s.head, { flex: 2 }]}>Date & Time</Text>
              <Text style={[s.cell, s.head, { flex: 1 }]}>Bookings</Text>
              <Text style={[s.cell, s.head, { width: 70 }]}></Text>
            </View>
            {upcomingClasses.length === 0 ? (
              <View style={s.emptyRow}><Text style={s.emptyText}>No classes scheduled</Text></View>
            ) : upcomingClasses.map((cls) => {
              const full = cls.bookedCount >= cls.capacity;
              return (
                <View key={cls._id} style={[s.tableRow, cls.date === today && s.todayRow]}>
                  <View style={{ flex: 2 }}>
                    <Text style={[s.cell, { color: Colors.text, fontWeight: "600" }]}>
                      {formatDate(cls.date, { relative: true, weekday: "short" })}
                    </Text>
                    <Text style={[s.cell, { fontSize: 12, marginTop: 2 }]}>{formatTime(cls.startTime)}</Text>
                  </View>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={[s.cell, { color: full ? Colors.error : Colors.success, fontWeight: "700" }]}>{cls.bookedCount}</Text>
                    <Text style={s.cell}>/ {cls.capacity}</Text>
                  </View>
                  <Pressable style={s.deleteBtn} onPress={() => handleDeleteClass(cls)}>
                    <Text style={s.deleteBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 32, paddingBottom: 60 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  title: { fontSize: 28, fontWeight: "800", color: Colors.text },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  grid: { flexDirection: "row", gap: 24, flexWrap: "wrap" },
  col: { flex: 1, minWidth: 320 },
  colHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  colTitle: { fontSize: 14, fontWeight: "700", color: Colors.text },
  tableCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", marginBottom: 24 },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.background, alignItems: "center" },
  tableRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border + "66", alignItems: "center" },
  todayRow: {},
  cell: { fontSize: 14, color: Colors.textSecondary },
  head: { fontWeight: "700", color: Colors.textSecondary, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  actionBtn: { width: 60, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  editBtn: {},
  editBtnText: {},
  deleteBtn: { width: 70, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: Colors.error + "55", alignItems: "center" },
  deleteBtnText: { fontSize: 12, fontWeight: "600", color: Colors.error },
  emptyRow: { padding: 24, alignItems: "center" },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
});
