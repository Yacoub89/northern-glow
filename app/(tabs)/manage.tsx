import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { getTodayDate } from "../../utils/date";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Colors } from "../../constants/Colors";
import { formatDate, formatTime } from "../../utils/date";

export default function ManageScreen() {
  const router = useRouter();

  const today = getTodayDate();
  const wodSchedule = useQuery(api.wods.getSchedule, { startDate: today, days: 7 });
  const upcomingClasses = useQuery(api.classes.getUpcoming, { startDate: today, days: 14 });
  const removeClass = useMutation(api.classes.remove);

  const handleDeleteClass = (cls: Doc<"classes">) => {
    Alert.alert(
      "Cancel Class",
      `Cancel the ${formatTime(cls.startTime)} class on ${formatDate(cls.date, { relative: true, weekday: "short" })}? All bookings will be cancelled.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Class",
          style: "destructive",
          onPress: async () => {
            try {
              await removeClass({ id: cls._id });
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ]
    );
  };

  if (wodSchedule === undefined || upcomingClasses === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>Manage</Text>
      </View>

      <FlatList
        data={upcomingClasses}
        keyExtractor={(c) => c._id}
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <>
            {/* WOD Schedule */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>WOD Schedule</Text>
            </View>

            {wodSchedule.map(({ date, wod }) => (
              <View key={date} style={styles.wodRow}>
                <View style={styles.wodDateCol}>
                  <Text style={styles.wodDayLabel}>
                    {formatDate(date, { relative: true, weekday: "short" })}
                  </Text>
                </View>
                <View style={[styles.wodCardInline, !wod && styles.wodCardEmpty]}>
                  {wod ? (
                    <>
                      <View style={styles.wodCardTop}>
                        <Text style={styles.wodBadge}>{wod.type}</Text>
                        <Text style={styles.wodTitle} numberOfLines={1}>
                          {wod.title}
                        </Text>
                      </View>
                      <Text style={styles.wodDesc} numberOfLines={1}>
                        {wod.description}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.noWodText}>No WOD posted</Text>
                  )}
                </View>
                <Pressable
                  style={[styles.wodActionBtn, wod && styles.wodEditBtn]}
                  onPress={() =>
                    router.push({
                      pathname: "/wod-form",
                      params: wod
                        ? { wodId: wod._id }
                        : { date },
                    })
                  }
                >
                  <Text style={[styles.wodActionText, wod && styles.wodEditText]}>
                    {wod ? "Edit" : "+ Add"}
                  </Text>
                </Pressable>
              </View>
            ))}

            {/* Upcoming Classes */}
            <View style={[styles.sectionHeader, { marginTop: 16 }]}>
              <Text style={styles.sectionLabel}>Upcoming Classes</Text>
              <Pressable
                style={styles.addBtn}
                onPress={() => router.push("/class-form")}
              >
                <Text style={styles.addBtnText}>+ Add</Text>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No classes scheduled</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.classCard}>
            <View>
              <Text style={styles.classDate}>{formatDate(item.date, { relative: true, weekday: "short" })}</Text>
              <Text style={styles.classTime}>{formatTime(item.startTime)}</Text>
              <Text style={styles.classCapacity}>
                {item.bookedCount}/{item.capacity} booked
                {item.bookedCount >= item.capacity ? " · Full" : ""}
              </Text>
            </View>
            <Pressable
              style={styles.deleteBtn}
              onPress={() => handleDeleteClass(item)}
            >
              <Text style={styles.deleteBtnText}>Cancel</Text>
            </Pressable>
          </View>
        )}
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
  titleBar: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "800", color: Colors.text },
  scroll: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  // WOD schedule row
  wodRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  wodDateCol: {
    width: 72,
  },
  wodDayLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  wodCardInline: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wodCardEmpty: {
    borderStyle: "dashed",
    borderColor: Colors.border,
  },
  wodCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  wodBadge: {
    backgroundColor: Colors.primary,
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: "uppercase",
    overflow: "hidden",
  },
  wodTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, flex: 1 },
  wodDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  noWodText: { fontSize: 13, color: Colors.textMuted, fontStyle: "italic" },
  wodActionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 50,
    alignItems: "center",
  },
  wodEditBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wodActionText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  wodEditText: { color: Colors.textSecondary },
  // Classes
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
  classCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  classDate: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  classTime: { fontSize: 18, fontWeight: "700", color: Colors.text },
  classCapacity: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  deleteBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.error + "55",
  },
  deleteBtnText: { color: Colors.error, fontWeight: "600", fontSize: 13 },
});
