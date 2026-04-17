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
import { Doc, Id } from "../../convex/_generated/dataModel";
import { Colors } from "../../constants/Colors";
import { useGymColors, useGymConfig } from "../../constants/GymConfig";
import { formatTime, getTodayDate } from "../../utils/date";


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

// ── Classes tab ───────────────────────────────────────────────────────────────

function ClassCard({
  cls,
  myBookings,
}: {
  cls: EnrichedClass;
  myBookings: Doc<"bookings">[];
}) {
  const { primary } = useGymColors();
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
            style={[styles.bookBtn, { backgroundColor: primary }, isFull && styles.fullBtn]}
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

// ── 1:1 Appointments tab ──────────────────────────────────────────────────────

type Coach = Doc<"users">;
type AvailableSlot = {
  availabilityId: Id<"coachAvailability">;
  startTime: string;
  durationMinutes: number;
};

function CoachInitials({ name }: { name: string }) {
  const { primary } = useGymColors();
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View style={[styles.coachAvatar, { backgroundColor: primary }]}>
      <Text style={styles.coachAvatarText}>{initials}</Text>
    </View>
  );
}

function AppointmentSlotCard({
  slot,
  coachId,
  date,
  myAppointmentId,
  onBooked,
}: {
  slot: AvailableSlot;
  coachId: Id<"users">;
  date: string;
  myAppointmentId: Id<"appointments"> | null;
  onBooked: () => void;
}) {
  const bookAppt = useMutation(api.appointments.book);
  const cancelAppt = useMutation(api.appointments.cancel);

  const isMySlot = myAppointmentId !== null;

  const handleBook = async () => {
    try {
      await bookAppt({
        coachId,
        date,
        startTime: slot.startTime,
        durationMinutes: slot.durationMinutes,
      });
      onBooked();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleCancel = () => {
    if (!myAppointmentId) return;
    Alert.alert("Cancel Appointment", "Are you sure?", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelAppt({ appointmentId: myAppointmentId });
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.classCard}>
      <View style={styles.classRow}>
        <View style={styles.classInfo}>
          <Text style={styles.classTime}>{formatTime(slot.startTime)}</Text>
          <Text style={styles.classCoach}>{slot.durationMinutes} min session</Text>
        </View>
        {isMySlot ? (
          <Pressable style={styles.bookedBtn} onPress={handleCancel}>
            <Text style={styles.bookedBtnText}>Booked</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.bookBtn} onPress={handleBook}>
            <Text style={styles.bookBtnText}>Book</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function AppointmentsPanel({
  selectedDate,
  today,
}: {
  selectedDate: string;
  today: string;
}) {
  const { primary } = useGymColors();
  const coaches = useQuery(api.appointments.listCoaches);
  const [selectedCoachId, setSelectedCoachId] = useState<Id<"users"> | null>(null);

  const validCoachId = selectedCoachId && selectedCoachId.length > 0 ? selectedCoachId : null;

  const slots = useQuery(
    api.appointments.getCoachAvailableSlots,
    validCoachId ? { coachId: validCoachId, date: selectedDate } : "skip"
  );

  const myAppointment = useQuery(
    api.appointments.getMyAppointmentForDate,
    validCoachId ? { coachId: validCoachId, date: selectedDate } : "skip"
  );

  if (coaches === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={primary} />
      </View>
    );
  }

  if (coaches.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No coaches available</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Coach picker */}
      <Text style={styles.dayHeader}>PICK A COACH</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.coachPicker}
      >
        {coaches.map((coach) => {
          const isSelected = coach._id === selectedCoachId;
          return (
            <Pressable
              key={coach._id}
              style={[styles.coachPill, isSelected && [styles.coachPillActive, { borderColor: primary }]]}
              onPress={() =>
                setSelectedCoachId(isSelected || !coach._id ? null : coach._id)
              }
            >
              <CoachInitials name={coach.name ?? "?"} />
              <Text
                style={[
                  styles.coachPillName,
                  isSelected && styles.coachPillNameActive,
                ]}
                numberOfLines={1}
              >
                {coach.name?.split(" ")[0] ?? "Coach"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Slots for selected coach */}
      {selectedCoachId && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.dayHeader}>AVAILABLE SLOTS</Text>
          {slots === undefined ? (
            <ActivityIndicator color={primary} style={{ marginTop: 16 }} />
          ) : slots.length === 0 && myAppointment === null ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No slots available this day</Text>
            </View>
          ) : (
            <>
              {/* Show booked slot if exists */}
              {myAppointment && myAppointment.status !== "cancelled" && (
                <AppointmentSlotCard
                  key="my-booked"
                  slot={{
                    availabilityId: myAppointment._id as any,
                    startTime: myAppointment.startTime,
                    durationMinutes: myAppointment.durationMinutes,
                  }}
                  coachId={selectedCoachId}
                  date={selectedDate}
                  myAppointmentId={myAppointment._id}
                  onBooked={() => {}}
                />
              )}
              {/* Show available slots */}
              {slots.map((slot) => (
                <AppointmentSlotCard
                  key={slot.startTime}
                  slot={slot}
                  coachId={selectedCoachId}
                  date={selectedDate}
                  myAppointmentId={null}
                  onBooked={() => {}}
                />
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type TabMode = "classes" | "appointments";

export default function ScheduleScreen() {
  const gym = useGymConfig();
  const { primary } = useGymColors();
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [mode, setMode] = useState<TabMode>("classes");
  const dates = useMemo(() => generateDates(7), []);

  const classes = useQuery(api.classes.getUpcoming, { startDate: today, days: 7 });
  const myBookings = useQuery(api.bookings.getMyBookings);
  const wod = useQuery(api.wods.getByDate, { date: selectedDate });

  const dayClasses = useMemo(() => {
    if (!classes) return [];
    return classes.filter((c) => c.date === selectedDate);
  }, [classes, selectedDate]);

  if (mode === "classes" && (classes === undefined || myBookings === undefined)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.gymName, { color: primary }]}>{gym.name.toUpperCase()}</Text>
        <Text style={styles.title}>Schedule</Text>
      </View>

      {/* Mode toggle */}
      <View style={styles.segmentRow}>
        <Pressable
          style={[styles.segmentBtn, mode === "classes" && [styles.segmentBtnActive, { backgroundColor: primary }]]}
          onPress={() => setMode("classes")}
        >
          <Text style={[styles.segmentText, mode === "classes" && styles.segmentTextActive]}>
            Classes
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, mode === "appointments" && [styles.segmentBtnActive, { backgroundColor: primary }]]}
          onPress={() => setMode("appointments")}
        >
          <Text
            style={[
              styles.segmentText,
              mode === "appointments" && styles.segmentTextActive,
            ]}
          >
            1:1 Training
          </Text>
        </Pressable>
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
              style={[styles.dayPill, isSelected && [styles.dayPillActive, { backgroundColor: primary, borderColor: primary }]]}
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

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {mode === "classes" ? (
          <>
            {/* WOD of the day */}
            {wod ? (
              <View style={styles.wodCard}>
                <Text style={[styles.wodCardLabel, { color: primary }]}>WOD</Text>
                <Text style={styles.wodCardTitle}>{wod.title}</Text>
                <Text style={[styles.wodCardMeta, { color: primary }]}>
                  {wod.type.toUpperCase()}
                  {wod.description ? ` · ${wod.description}` : ""}
                </Text>
                {wod.movements.length > 0 && (
                  <View style={styles.wodMovements}>
                    {wod.movements.map((m, i) => {
                      const { num, label } = parseMovement(m);
                      return (
                        <View key={i} style={styles.wodMovementRow}>
                          <Text style={[styles.wodMovementNum, { color: primary }]}>{num ?? "·"}</Text>
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
                <ClassCard key={c._id} cls={c} myBookings={myBookings ?? []} />
              ))
            )}
          </>
        ) : (
          <AppointmentsPanel selectedDate={selectedDate} today={today} />
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
    paddingBottom: 12,
  },
  gymName: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
  },

  // Segmented control
  segmentRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentBtnActive: {},
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: "#fff",
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
  dayPillActive: {},
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

  // WOD movements
  wodMovements: { gap: 7 },
  wodMovementRow: { flexDirection: "row", alignItems: "baseline", gap: 12 },
  wodMovementNum: {
    width: 26,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
  },
  wodMovementLabel: { fontSize: 14, color: Colors.text, fontWeight: "500", flex: 1 },
  wodScaling: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },

  // Book buttons
  bookBtn: {
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

  // Coach picker
  coachPicker: {
    gap: 10,
    paddingBottom: 4,
  },
  coachPill: {
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minWidth: 70,
  },
  coachPillActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  coachAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  coachAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  coachPillName: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    maxWidth: 70,
    textAlign: "center",
  },
  coachPillNameActive: {
    color: Colors.text,
  },

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
