import { useQuery } from "convex/react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { useGymConfig } from "../../constants/GymConfig";
import { Ionicons } from "@expo/vector-icons";
import { getTodayDate } from "../../utils/date";
import { formatTime } from "../../utils/date";

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ComponentProps<typeof Ionicons>["name"]; color: string }) {
  return (
    <View style={[s.statCard, { borderLeftColor: color }]}>
      <View style={[s.statIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function AdminDashboard() {
  const gym = useGymConfig();
  const today = getTodayDate();
  const members = useQuery(api.users.listMembers);
  const upcomingClasses = useQuery(api.classes.getUpcoming, { startDate: today, days: 7 });
  const wodSchedule = useQuery(api.wods.getSchedule, { startDate: today, days: 7 });
  const coachDocs = useQuery(api.documents.listAll);

  const loading = members === undefined || upcomingClasses === undefined || wodSchedule === undefined || coachDocs === undefined;

  const totalMembers = members?.length ?? 0;
  const athletes = members?.filter(m => m.role === "athlete" || !m.role).length ?? 0;
  const coaches = members?.filter(m => m.role === "coach" || m.role === "admin").length ?? 0;
  const todaysClasses = upcomingClasses?.filter(c => c.date === today) ?? [];
  const totalBooked = todaysClasses.reduce((sum, c) => sum + c.bookedCount, 0);
  const pendingDocs = coachDocs?.filter(d => (d as any).signatureCount === 0).length ?? 0;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.pageHeader}>
        <View>
          <Text style={s.greeting}>Good {getTimeOfDay()}</Text>
          <Text style={s.title}>Dashboard</Text>
        </View>
        <Text style={s.dateText}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Stats row */}
          <View style={s.statsRow}>
            <StatCard label="Total Members" value={totalMembers} icon="people" color={Colors.primary} />
            <StatCard label="Athletes" value={athletes} icon="barbell-outline" color="#007AFF" />
            <StatCard label="Coaches" value={coaches} icon="ribbon-outline" color={Colors.warning} />
            <StatCard label="Today's Bookings" value={totalBooked} icon="calendar" color={Colors.success} />
          </View>

          {/* Today's classes */}
          <Text style={s.sectionTitle}>Today's Classes</Text>
          {todaysClasses.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>No classes scheduled today</Text>
            </View>
          ) : (
            <View style={s.tableCard}>
              <View style={s.tableHeader}>
                <Text style={[s.tableCell, s.tableHead, { flex: 1 }]}>Time</Text>
                <Text style={[s.tableCell, s.tableHead, { flex: 2 }]}>WOD</Text>
                <Text style={[s.tableCell, s.tableHead, { flex: 1 }]}>Booked</Text>
                <Text style={[s.tableCell, s.tableHead, { flex: 1 }]}>Capacity</Text>
              </View>
              {todaysClasses.map((cls) => {
                const wod = wodSchedule?.find(w => w.date === cls.date)?.wod;
                const full = cls.bookedCount >= cls.capacity;
                return (
                  <View key={cls._id} style={s.tableRow}>
                    <Text style={[s.tableCell, { flex: 1, color: Colors.text, fontWeight: "600" }]}>{formatTime(cls.startTime)}</Text>
                    <Text style={[s.tableCell, { flex: 2 }]} numberOfLines={1}>{wod?.title ?? "—"}</Text>
                    <Text style={[s.tableCell, { flex: 1, color: full ? Colors.error : Colors.success, fontWeight: "600" }]}>{cls.bookedCount}</Text>
                    <Text style={[s.tableCell, { flex: 1 }]}>{cls.capacity}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* WOD week */}
          <Text style={s.sectionTitle}>This Week's WODs</Text>
          <View style={s.tableCard}>
            <View style={s.tableHeader}>
              <Text style={[s.tableCell, s.tableHead, { flex: 1 }]}>Date</Text>
              <Text style={[s.tableCell, s.tableHead, { flex: 1 }]}>Type</Text>
              <Text style={[s.tableCell, s.tableHead, { flex: 3 }]}>WOD</Text>
            </View>
            {wodSchedule?.map(({ date, wod }) => (
              <View key={date} style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 1, color: date === today ? gym.primaryColor : Colors.text, fontWeight: date === today ? "700" : "400" }]}>
                  {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </Text>
                <Text style={[s.tableCell, { flex: 1 }]}>{wod?.type ?? "—"}</Text>
                <Text style={[s.tableCell, { flex: 3 }]} numberOfLines={1}>{wod?.title ?? "No WOD"}</Text>
              </View>
            ))}
          </View>

          {/* Docs needing signatures */}
          {pendingDocs > 0 && (
            <View style={s.alertCard}>
              <Ionicons name="alert-circle-outline" size={20} color={Colors.warning} />
              <Text style={s.alertText}>{pendingDocs} document{pendingDocs > 1 ? "s have" : " has"} no signatures yet</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 32, paddingBottom: 60 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 },
  greeting: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  title: { fontSize: 28, fontWeight: "800", color: Colors.text },
  dateText: { fontSize: 13, color: Colors.textSecondary },

  statsRow: { flexDirection: "row", gap: 16, marginBottom: 32, flexWrap: "wrap" },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderLeftWidth: 3,
  },
  statIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "800", color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 12 },

  tableCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    marginBottom: 28,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.background,
  },
  tableHead: { fontWeight: "700", color: Colors.textSecondary, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "88",
  },
  tableCell: { fontSize: 14, color: Colors.textSecondary },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: { color: Colors.textMuted, fontSize: 14 },

  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.warning + "18",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.warning + "44",
  },
  alertText: { color: Colors.warning, fontWeight: "600", fontSize: 14 },
});
