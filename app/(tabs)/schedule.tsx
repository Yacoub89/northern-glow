import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { formatTime, getTodayDate } from "../../utils/date";

const GYM_NAME = "ORLEANS CROSSFIT";

function generateDates(count = 7): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

function getDayName(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

function getDayNum(dateStr: string): string {
  return String(parseInt(dateStr.split("-")[2]));
}

type EnrichedClass = Doc<"classes"> & {
  coachName: string;
  wodTitle: string | null;
  wodType: string | null;
  wodDescription: string | null;
  wodMovements: string[] | null;
  wodScalingNotes: string | null;
};

function parseMovement(text: string): { num: string | null; label: string } {
  const match = text.match(/^(\d+(?:\+\d+)?)\s+(.+)/);
  if (match) return { num: match[1], label: match[2] };
  return { num: null, label: text };
}

function ClassCard({
  cls,
  myBookings,
}: {
  cls: EnrichedClass;
  myBookings: Doc<"bookings">[];
}) {
  const book = useMutation(api.bookings.book);
  const cancel = useMutation(api.bookings.cancel);
  const myBooking = myBookings.find(
    (b) => b.classId === cls._id && b.status !== "cancelled"
  );
  const spotsLeft = cls.capacity - cls.bookedCount;
  const isFull = spotsLeft <= 0;

  const handleBook = async () => {
    try {
      const result = await book({ classId: cls._id });
      if (result.status === "waitlist") {
        Alert.alert(
          "Added to Waitlist",
          `You're #${result.position} on the waitlist.`
        );
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      myBooking?.status === "waitlist" ? "Leave Waitlist" : "Cancel Booking",
      "Are you sure?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: myBooking?.status === "waitlist" ? "Leave" : "Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancel({ classId: cls._id });
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.classCard}>
      {/* Main row */}
      <View style={styles.classRow}>
        <View style={styles.classInfo}>
          <Text style={styles.classTime}>{formatTime(cls.startTime)}</Text>
          <Text style={styles.classCoach}>
            {cls.coachName}
            {" · "}
            <Text style={[styles.classSpots, isFull && !myBooking && styles.classFull]}>
              {isFull ? "Full" : `${cls.bookedCount}/${cls.capacity} spots`}
            </Text>
          </Text>
        </View>

        {!myBooking ? (
          <Pressable
            style={[styles.bookBtn, isFull && styles.fullBtn]}
            onPress={isFull ? undefined : handleBook}
            disabled={isFull}
          >
            <Text style={[styles.bookBtnText, isFull && styles.fullBtnText]}>
              {isFull ? "Full" : "Book"}
            </Text>
          </Pressable>
        ) : (
          <Pressable style={styles.bookedBtn} onPress={handleCancel}>
            <Text style={styles.bookedBtnText}>
              {myBooking.status === "waitlist"
                ? `#${myBooking.waitlistPosition} waitlist`
                : "Booked"}
            </Text>
          </Pressable>
        )}
      </View>

    </View>
  );
}

export default function ScheduleScreen() {
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const dates = useMemo(() => generateDates(7), []);

  const classes = useQuery(api.classes.getUpcoming, { startDate: today, days: 7 });
  const myBookings = useQuery(api.bookings.getMyBookings);
  const wod = useQuery(api.wods.getByDate, { date: selectedDate });

  const dayClasses = useMemo(() => {
    if (!classes) return [];
    return classes.filter((c) => c.date === selectedDate);
  }, [classes, selectedDate]);

  if (classes === undefined || myBookings === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.gymName}>{GYM_NAME}</Text>
        <Text style={styles.title}>Schedule</Text>
      </View>

      {/* Day picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayPicker}
      >
        {dates.map((d) => {
          const isSelected = d === selectedDate;
          return (
            <Pressable
              key={d}
              style={[styles.dayPill, isSelected && styles.dayPillActive]}
              onPress={() => setSelectedDate(d)}
            >
              <Text style={[styles.dayPillName, isSelected && styles.dayPillTextActive]}>
                {getDayName(d)}
              </Text>
              <Text style={[styles.dayPillNum, isSelected && styles.dayPillTextActive]}>
                {getDayNum(d)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Classes + WOD for selected day */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {/* WOD of the day */}
        {wod ? (
          <View style={styles.wodCard}>
            <Text style={styles.wodCardLabel}>WOD</Text>
            <Text style={styles.wodCardTitle}>{wod.title}</Text>
            <Text style={styles.wodCardMeta}>
              {wod.type.toUpperCase()}
              {wod.description ? ` · ${wod.description}` : ""}
            </Text>
            {wod.movements.length > 0 && (
              <View style={styles.wodMovements}>
                {wod.movements.map((m, i) => {
                  const { num, label } = parseMovement(m);
                  return (
                    <View key={i} style={styles.wodMovementRow}>
                      <Text style={styles.wodMovementNum}>{num ?? "·"}</Text>
                      <Text style={styles.wodMovementLabel}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            {wod.scalingNotes ? (
              <Text style={styles.wodScaling}>Scaling: {wod.scalingNotes}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.noWodCard}>
            <Text style={styles.noWodText}>No WOD posted for this day</Text>
          </View>
        )}

        {/* Classes */}
        <Text style={[styles.dayHeader, { marginTop: 20 }]}>
          {selectedDate === today ? "TODAY" : getDayName(selectedDate)} CLASSES
        </Text>
        {dayClasses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No classes scheduled</Text>
          </View>
        ) : (
          dayClasses.map((c) => (
            <ClassCard key={c._id} cls={c} myBookings={myBookings} />
          ))
        )}
      </ScrollView>
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

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  gymName: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
  },

  // Day picker
  dayPicker: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  dayPill: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayPillName: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dayPillNum: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  dayPillTextActive: { color: "#fff" },

  // List
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  dayHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  // WOD card
  wodCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wodCardLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  wodCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 3,
  },
  wodCardMeta: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  noWodCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noWodText: { color: Colors.textSecondary, fontSize: 13 },

  // Class card
  classCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  classInfo: { flex: 1, marginRight: 12 },
  classTime: { fontSize: 22, fontWeight: "800", color: Colors.text, marginBottom: 3 },
  classCoach: { fontSize: 13, color: Colors.textSecondary },
  classSpots: { fontSize: 13, color: Colors.textSecondary },
  classFull: { color: Colors.error },

  // WOD detail
  wodDetail: { marginTop: 0 },
  wodDetailDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 14,
    marginBottom: 14,
  },
  wodDetailTitle: { fontSize: 16, fontWeight: "800", color: Colors.text, marginBottom: 3 },
  wodDetailMeta: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  wodMovements: { gap: 7 },
  wodMovementRow: { flexDirection: "row", alignItems: "baseline", gap: 12 },
  wodMovementNum: {
    width: 26,
    fontSize: 14,
    fontWeight: "800",
    color: Colors.primary,
    textAlign: "right",
  },
  wodMovementLabel: { fontSize: 14, color: Colors.text, fontWeight: "500", flex: 1 },
  wodScaling: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },

  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  bookBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  fullBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fullBtnText: { color: Colors.textMuted },
  bookedBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookedBtnText: { color: Colors.textSecondary, fontWeight: "600", fontSize: 13 },

  // Empty
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 12,
  },
  emptyText: { color: Colors.textSecondary, fontSize: 15 },
});
