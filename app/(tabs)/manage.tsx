import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { getTodayDate } from "../../utils/date";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Colors } from "../../constants/Colors";
import { useGymColors } from "../../constants/GymConfig";
import { formatDate, formatTime } from "../../utils/date";
import { useState } from "react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIME_PRESETS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
];

const DURATION_OPTIONS = [30, 45, 60, 90];

function AddAvailabilityModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { primary } = useGymColors();
  const [dayOfWeek, setDayOfWeek] = useState(1); // Mon
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const addAvailability = useMutation(api.appointments.addAvailability);

  const handleSave = async () => {
    try {
      await addAvailability({ dayOfWeek, startTime, durationMinutes: duration });
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <Text style={modal.title}>Add Availability Slot</Text>

          <Text style={modal.label}>Day of Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={modal.row}>
            {DAY_NAMES.map((name, i) => (
              <Pressable
                key={i}
                style={[modal.chip, dayOfWeek === i && [modal.chipActive, { backgroundColor: primary, borderColor: primary }]]}
                onPress={() => setDayOfWeek(i)}
              >
                <Text style={[modal.chipText, dayOfWeek === i && modal.chipTextActive]}>
                  {name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={modal.label}>Start Time</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={modal.row}>
            {TIME_PRESETS.map((t) => (
              <Pressable
                key={t}
                style={[modal.chip, startTime === t && [modal.chipActive, { backgroundColor: primary, borderColor: primary }]]}
                onPress={() => setStartTime(t)}
              >
                <Text style={[modal.chipText, startTime === t && modal.chipTextActive]}>
                  {formatTime(t)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={modal.label}>Duration</Text>
          <View style={modal.row}>
            {DURATION_OPTIONS.map((d) => (
              <Pressable
                key={d}
                style={[modal.chip, duration === d && [modal.chipActive, { backgroundColor: primary, borderColor: primary }]]}
                onPress={() => setDuration(d)}
              >
                <Text style={[modal.chipText, duration === d && modal.chipTextActive]}>
                  {d} min
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={modal.actions}>
            <Pressable style={modal.cancelBtn} onPress={onClose}>
              <Text style={modal.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[modal.saveBtn, { backgroundColor: primary }]} onPress={handleSave}>
              <Text style={modal.saveText}>Save Slot</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AvailabilitySection() {
  const { primary } = useGymColors();
  const [showModal, setShowModal] = useState(false);
  const availability = useQuery(api.appointments.getMyAvailability);
  const removeAvailability = useMutation(api.appointments.removeAvailability);

  const handleRemove = (id: string) => {
    Alert.alert("Remove Slot", "Remove this recurring availability slot?", [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeAvailability({ availabilityId: id as any });
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  // Group by day of week
  const byDay = (availability ?? []).reduce<Record<number, typeof availability>>((acc, slot) => {
    if (!slot) return acc;
    if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
    acc[slot.dayOfWeek]!.push(slot);
    return acc;
  }, {});

  return (
    <>
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionLabel}>1:1 Availability</Text>
        <Pressable style={[styles.addBtn, { backgroundColor: primary }]} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ Add Slot</Text>
        </Pressable>
      </View>

      {availability === undefined ? (
        <ActivityIndicator color={primary} style={{ marginTop: 8 }} />
      ) : availability.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No availability set</Text>
          <Text style={[styles.emptyText, { fontSize: 12, marginTop: 4 }]}>
            Add slots so athletes can book 1:1 sessions
          </Text>
        </View>
      ) : (
        [0, 1, 2, 3, 4, 5, 6]
          .filter((d) => byDay[d]?.length)
          .map((d) => (
            <View key={d} style={{ marginBottom: 12 }}>
              <Text style={styles.availDayLabel}>{DAY_NAMES[d]}</Text>
              {byDay[d]!
                .sort((a, b) => a!.startTime.localeCompare(b!.startTime))
                .map((slot) => (
                  <View key={slot!._id} style={styles.availSlotRow}>
                    <Text style={styles.availSlotTime}>{formatTime(slot!.startTime)}</Text>
                    <Text style={styles.availSlotDuration}>{slot!.durationMinutes} min</Text>
                    <Pressable
                      style={styles.removeBtn}
                      onPress={() => handleRemove(slot!._id)}
                    >
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
            </View>
          ))
      )}

      <AddAvailabilityModal visible={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

export default function ManageScreen() {
  const { primary } = useGymColors();
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
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
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
                        <Text style={[styles.wodBadge, { backgroundColor: primary }]}>{wod.type}</Text>
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
                  style={[styles.wodActionBtn, { backgroundColor: primary }, wod && styles.wodEditBtn]}
                  onPress={() =>
                    router.push("/(tabs)/wod-placeholder")
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
              <Pressable style={[styles.addBtn, { backgroundColor: primary }]} onPress={() => router.push("/class-form")}>
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
            <View style={{ flex: 1 }}>
              <Text style={styles.classDate}>{formatDate(item.date, { relative: true, weekday: "short" })}</Text>
              <Text style={styles.classTime}>{formatTime(item.startTime)}</Text>
              <Text style={styles.classCapacity}>
                {item.bookedCount}/{item.capacity} booked
                {item.bookedCount >= item.capacity ? " · Full" : ""}
              </Text>
            </View>
            <View style={styles.classActions}>
              <Pressable
                style={[styles.rosterBtn, { borderColor: primary + "66" }]}
                onPress={() => router.push({ pathname: "/roster", params: { classId: item._id } })}
              >
                <Text style={[styles.rosterBtnText, { color: primary }]}>Roster</Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={() => handleDeleteClass(item)}>
                <Text style={styles.deleteBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListFooterComponent={<AvailabilitySection />}
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
  wodDateCol: { width: 72 },
  wodDayLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  wodCardInline: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wodCardEmpty: { borderStyle: "dashed", borderColor: Colors.border },
  wodCardTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  wodBadge: {
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
  classActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  rosterBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  rosterBtnText: { fontWeight: "600", fontSize: 13 },
  deleteBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.error + "55",
  },
  deleteBtnText: { color: Colors.error, fontWeight: "600", fontSize: 13 },
  // Availability
  availDayLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  availSlotRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  availSlotTime: { fontSize: 16, fontWeight: "700", color: Colors.text, flex: 1 },
  availSlotDuration: { fontSize: 13, color: Colors.textSecondary },
  removeBtn: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.error + "55",
  },
  removeBtnText: { color: Colors.error, fontWeight: "600", fontSize: 12 },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 16,
  },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {},
  chipText: { color: Colors.textSecondary, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  cancelText: { color: Colors.textSecondary, fontWeight: "700" },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700" },
});
