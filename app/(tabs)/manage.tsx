import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Colors } from "../../constants/Colors";
import { Fonts, FontSizes } from "../../constants/Typography";
import { useGymColors } from "../../constants/GymConfig";
import { formatDate, formatTime, getTodayDate } from "../../utils/date";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIME_PRESETS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
];

const DURATION_OPTIONS = [30, 45, 60, 90];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shiftDate(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function formatNavDate(dateStr: string): { monthDay: string; dayName: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    monthDay: dt.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase(),
    dayName: dt.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase(),
  };
}

function sessionLabel(startTime: string): string {
  return parseInt(startTime.split(":")[0], 10) < 12 ? "AM SESSION" : "PM SESSION";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrichedClass = Doc<"classes"> & {
  coachName: string;
  wodTitle: string | null;
  wodType: string | null;
  wodDescription: string | null;
};

// ─── Add Availability Modal ───────────────────────────────────────────────────

function AddAvailabilityModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { primary } = useGymColors();
  const [dayOfWeek, setDayOfWeek] = useState(1);
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
      <View style={md.overlay}>
        <View style={md.sheet}>
          <Text style={md.title}>Add Availability Slot</Text>

          <Text style={md.label}>Day of Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={md.row}>
            {DAY_NAMES.map((name, i) => (
              <Pressable
                key={i}
                style={[md.chip, dayOfWeek === i && [md.chipActive, { backgroundColor: primary, borderColor: primary }]]}
                onPress={() => setDayOfWeek(i)}
              >
                <Text style={[md.chipText, dayOfWeek === i && md.chipTextActive]}>{name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={md.label}>Start Time</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={md.row}>
            {TIME_PRESETS.map((t) => (
              <Pressable
                key={t}
                style={[md.chip, startTime === t && [md.chipActive, { backgroundColor: primary, borderColor: primary }]]}
                onPress={() => setStartTime(t)}
              >
                <Text style={[md.chipText, startTime === t && md.chipTextActive]}>{formatTime(t)}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={md.label}>Duration</Text>
          <View style={md.row}>
            {DURATION_OPTIONS.map((d) => (
              <Pressable
                key={d}
                style={[md.chip, duration === d && [md.chipActive, { backgroundColor: primary, borderColor: primary }]]}
                onPress={() => setDuration(d)}
              >
                <Text style={[md.chipText, duration === d && md.chipTextActive]}>{d} min</Text>
              </Pressable>
            ))}
          </View>

          <View style={md.actions}>
            <Pressable style={md.cancelBtn} onPress={onClose}>
              <Text style={md.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[md.saveBtn, { backgroundColor: primary }]} onPress={handleSave}>
              <Text style={md.saveText}>Save Slot</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── 1:1 Availability Section ─────────────────────────────────────────────────

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

  const byDay = (availability ?? []).reduce<Record<number, typeof availability>>((acc, slot) => {
    if (!slot) return acc;
    if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
    acc[slot.dayOfWeek]!.push(slot);
    return acc;
  }, {});

  return (
    <View style={sc.sectionBlock}>
      <View style={sc.sectionHeaderRow}>
        <Text style={sc.sectionLabel}>1:1 Availability</Text>
        <Pressable style={[sc.addSlotBtn, { backgroundColor: primary }]} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={14} color={Colors.onPrimary} />
          <Text style={sc.addSlotBtnText}>Add Slot</Text>
        </Pressable>
      </View>

      {availability === undefined ? (
        <ActivityIndicator color={primary} style={{ marginTop: 8 }} />
      ) : availability.length === 0 ? (
        <View style={sc.emptyCard}>
          <Text style={sc.emptyText}>No availability set</Text>
          <Text style={sc.emptyHint}>Add slots so athletes can book 1:1 sessions</Text>
        </View>
      ) : (
        [0, 1, 2, 3, 4, 5, 6]
          .filter((d) => byDay[d]?.length)
          .map((d) => (
            <View key={d} style={{ marginBottom: 10 }}>
              <Text style={sc.availDayLabel}>{DAY_NAMES[d]}</Text>
              {byDay[d]!
                .sort((a, b) => a!.startTime.localeCompare(b!.startTime))
                .map((slot) => (
                  <View key={slot!._id} style={sc.availSlotRow}>
                    <Text style={sc.availSlotTime}>{formatTime(slot!.startTime)}</Text>
                    <Text style={sc.availSlotDuration}>{slot!.durationMinutes} min</Text>
                    <Pressable style={sc.removeBtn} onPress={() => handleRemove(slot!._id)}>
                      <Ionicons name="trash-outline" size={14} color={Colors.error} />
                    </Pressable>
                  </View>
                ))}
            </View>
          ))
      )}

      <AddAvailabilityModal visible={showModal} onClose={() => setShowModal(false)} />
    </View>
  );
}

// ─── Daily velocity card ──────────────────────────────────────────────────────

function VelocityCard({ classes }: { classes: EnrichedClass[] }) {
  const { primary } = useGymColors();
  const totalCapacity = classes.reduce((s, c) => s + c.capacity, 0);
  const totalBooked = classes.reduce((s, c) => s + c.bookedCount, 0);
  const pct = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

  return (
    <View style={sc.velocityCard}>
      <Text style={sc.velocityLabel}>DAILY VELOCITY</Text>
      <Text style={[sc.velocityPct, { color: primary }]}>{pct}%</Text>
      <Text style={sc.velocitySubLabel}>DAILY CAPACITY</Text>
      <View style={sc.progressTrack}>
        <View style={[sc.progressFill, { width: `${pct}%` as any, backgroundColor: primary }]} />
      </View>
      <View style={sc.velocityStats}>
        <View style={sc.velocityStat}>
          <Text style={sc.velocityStatNum}>{String(totalBooked).padStart(2, "0")}</Text>
          <Text style={sc.velocityStatUnit}>ATHLETES</Text>
        </View>
        <View style={sc.velocityStatDivider} />
        <View style={sc.velocityStat}>
          <Text style={sc.velocityStatNum}>{String(classes.length).padStart(2, "0")}</Text>
          <Text style={sc.velocityStatUnit}>SESSIONS</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Class card ───────────────────────────────────────────────────────────────

function ClassCard({ cls, onDelete }: { cls: EnrichedClass; onDelete: (cls: Doc<"classes">) => void }) {
  const router = useRouter();
  const { primary } = useGymColors();
  const spotsLeft = cls.capacity - cls.bookedCount;
  const isFull = spotsLeft <= 0;

  return (
    <View style={sc.classCard}>
      <View style={sc.classTimeRow}>
        <View>
          <Text style={sc.classTime}>{cls.startTime}</Text>
          <Text style={sc.sessionLabel}>{sessionLabel(cls.startTime)}</Text>
        </View>
        <View style={[sc.badge, {
          backgroundColor: isFull ? Colors.error + "22" : primary + "22",
          borderColor: isFull ? Colors.error + "66" : primary + "44",
        }]}>
          <Text style={[sc.badgeText, { color: isFull ? Colors.error : primary }]}>
            {isFull ? "FULL" : `${spotsLeft} SLOTS`}
          </Text>
        </View>
      </View>

      <Text style={sc.classTitle}>{cls.wodTitle?.toUpperCase() ?? "CROSSFIT CLASS"}</Text>
      {cls.wodDescription ? (
        <Text style={sc.classDesc} numberOfLines={1}>{cls.wodDescription}</Text>
      ) : null}

      <View style={sc.divider} />

      <View style={sc.classMeta}>
        <View style={sc.metaItem}>
          <Ionicons name="person-outline" size={13} color={Colors.textSecondary} />
          <Text style={sc.metaText}>{cls.coachName}</Text>
        </View>
        <View style={sc.metaItem}>
          <Ionicons name="people-outline" size={13} color={Colors.textSecondary} />
          <Text style={sc.metaText}>{cls.bookedCount}/{cls.capacity} Athletes</Text>
        </View>
      </View>

      <View style={sc.classActions}>
        <Pressable
          style={sc.rosterBtn}
          onPress={() => router.push({ pathname: "/roster", params: { classId: cls._id } })}
        >
          <Ionicons name="people" size={15} color={primary} />
          <Text style={[sc.rosterBtnText, { color: primary }]}>Roster</Text>
        </Pressable>
        <Pressable style={sc.deleteBtn} onPress={() => onDelete(cls)}>
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ManageScreen() {
  const { primary } = useGymColors();
  const router = useRouter();
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(today);

  const { monthDay, dayName } = formatNavDate(selectedDate);

  const upcomingClasses = useQuery(api.classes.getUpcoming, { startDate: selectedDate, days: 1 });
  const removeClass = useMutation(api.classes.remove);

  const dayClasses = useMemo(
    () => (upcomingClasses ?? []).filter((c) => c.date === selectedDate),
    [upcomingClasses, selectedDate]
  );

  const handleDelete = (cls: Doc<"classes">) => {
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

  return (
    <SafeAreaView style={sc.container} edges={[]}>
      <ScrollView contentContainerStyle={sc.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Page header ── */}
        <View style={sc.pageHeader}>
          <Text style={[sc.pageEyebrow, { color: primary }]}>MANAGEMENT HUB</Text>
          <Text style={sc.pageTitle}>SCHEDULE</Text>
          <Text style={sc.pageSubtitle}>
            Modify class slots, monitor capacity, and deploy new programming sessions.
          </Text>
        </View>

        {/* ── Date navigator ── */}
        <View style={sc.dateNav}>
          <Pressable style={sc.navArrow} onPress={() => setSelectedDate((d) => shiftDate(d, -1))} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </Pressable>
          <View style={sc.dateCenter}>
            <Text style={sc.dateMonthDay}>{monthDay}</Text>
            <Text style={sc.dateDayName}>{dayName}</Text>
          </View>
          <Pressable style={sc.navArrow} onPress={() => setSelectedDate((d) => shiftDate(d, 1))} hitSlop={10}>
            <Ionicons name="chevron-forward" size={20} color={Colors.text} />
          </Pressable>
        </View>

        {/* ── Deploy Class card ── */}
        <Pressable style={[sc.deployCard, { borderColor: primary + "44" }]} onPress={() => router.push("/class-form")}>
          <View style={[sc.deployIcon, { borderColor: primary + "66" }]}>
            <Ionicons name="add" size={22} color={primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={sc.deployTitle}>DEPLOY CLASS</Text>
            <Text style={sc.deploySubtitle}>Create a new slot in the daily roster.</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </Pressable>

        {/* ── Daily velocity ── */}
        {dayClasses.length > 0 && (
          <VelocityCard classes={dayClasses as EnrichedClass[]} />
        )}

        {/* ── Classes for selected day ── */}
        <View style={sc.sectionBlock}>
          <Text style={sc.sectionLabel}>
            {selectedDate === today ? "Today's Classes" : `${dayName.charAt(0) + dayName.slice(1).toLowerCase()}'s Classes`}
          </Text>

          {upcomingClasses === undefined ? (
            <View style={sc.centered}><ActivityIndicator color={primary} /></View>
          ) : dayClasses.length === 0 ? (
            <View style={sc.emptyCard}>
              <Text style={sc.emptyText}>No classes scheduled</Text>
              <Text style={sc.emptyHint}>Tap Deploy Class to add one</Text>
            </View>
          ) : (
            (dayClasses as EnrichedClass[]).map((cls) => (
              <ClassCard key={cls._id} cls={cls} onDelete={handleDelete} />
            ))
          )}
        </View>

        {/* ── 1:1 Availability ── */}
        <AvailabilitySection />

        <Text style={sc.endLabel}>END OF DAY ROSTER</Text>
      </ScrollView>

      {/* ── FAB ── */}
      <Pressable style={[sc.fab, { backgroundColor: primary }]} onPress={() => router.push("/class-form")}>
        <Ionicons name="add" size={26} color={Colors.onPrimary} />
      </Pressable>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 120 },
  centered: { paddingVertical: 24, alignItems: "center" },

  // Page header
  pageHeader: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 8 },
  pageEyebrow: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelSm,
    letterSpacing: 2,
    marginBottom: 4,
  },
  pageTitle: {
    fontFamily: Fonts.display,
    fontSize: 42,
    color: Colors.text,
    letterSpacing: -1,
    marginBottom: 10,
  },
  pageSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  // Date navigator
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 22,
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  navArrow: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: "center", justifyContent: "center",
  },
  dateCenter: { flex: 1, alignItems: "center", gap: 3 },
  dateMonthDay: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  dateDayName: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.headlineSm,
    color: Colors.text,
    letterSpacing: 0.5,
  },

  // Deploy card
  deployCard: {
    marginHorizontal: 22, marginBottom: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1,
    flexDirection: "row", alignItems: "center",
    padding: 16, gap: 14,
  },
  deployIcon: {
    width: 46, height: 46, borderRadius: 12, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.surfaceContainerHighest,
  },
  deployTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.titleMd,
    color: Colors.text,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  deploySubtitle: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary },

  // Velocity card
  velocityCard: {
    marginHorizontal: 22, marginBottom: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    padding: 18,
  },
  velocityLabel: {
    fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm,
    color: Colors.textSecondary, letterSpacing: 2, marginBottom: 6,
  },
  velocityPct: { fontFamily: Fonts.display, fontSize: 52, letterSpacing: -2, lineHeight: 58 },
  velocitySubLabel: {
    fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm,
    color: Colors.textSecondary, letterSpacing: 1.5, marginBottom: 12, marginTop: 2,
  },
  progressTrack: {
    height: 4, backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 2, marginBottom: 18, overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2 },
  velocityStats: { flexDirection: "row", alignItems: "center" },
  velocityStat: { flex: 1 },
  velocityStatNum: {
    fontFamily: Fonts.display, fontSize: FontSizes.headlineSm,
    color: Colors.text, letterSpacing: -0.5,
  },
  velocityStatUnit: {
    fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm,
    color: Colors.textSecondary, letterSpacing: 1.5, marginTop: 2,
  },
  velocityStatDivider: { width: 1, height: 36, backgroundColor: Colors.border, marginHorizontal: 20 },

  // Section block
  sectionBlock: { marginHorizontal: 22, marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: Fonts.display, fontSize: FontSizes.titleMd,
    color: Colors.text, letterSpacing: 0.5, marginBottom: 14,
  },
  addSlotBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  addSlotBtnText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.onPrimary },

  // Class card
  classCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 12,
  },
  classTimeRow: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between", marginBottom: 10,
  },
  classTime: {
    fontFamily: Fonts.display, fontSize: 32,
    color: Colors.text, letterSpacing: -1, lineHeight: 36,
  },
  sessionLabel: {
    fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm,
    color: Colors.textSecondary, letterSpacing: 1.5, marginTop: 2,
  },
  badge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm, letterSpacing: 0.8 },
  classTitle: {
    fontFamily: Fonts.display, fontSize: FontSizes.titleLg,
    color: Colors.text, letterSpacing: 0.3, marginBottom: 4,
  },
  classDesc: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  classMeta: { flexDirection: "row", gap: 16, marginBottom: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.textSecondary },
  classActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  rosterBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  rosterBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13 },
  deleteBtn: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.error + "44",
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.error + "11",
  },

  // Empty state
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 28, alignItems: "center",
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.textSecondary, marginBottom: 6 },
  emptyHint: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted },

  // WOD schedule — big cards
  wodBigCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 12,
  },
  wodBigCardHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 8,
  },
  wodBigDate: {
    fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm,
    color: Colors.textSecondary, letterSpacing: 1.5,
  },
  wodTypeBadge: {
    borderRadius: 5, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  wodTypeText: { fontFamily: Fonts.bodyBold, fontSize: 10, letterSpacing: 0.5 },
  wodBigTitle: {
    fontFamily: Fonts.display, fontSize: FontSizes.titleLg,
    color: Colors.text, letterSpacing: 0.3, marginBottom: 4,
  },
  wodBigDesc: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  noWodText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, fontStyle: "italic" },
  wodActionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  wodActionOutline: { backgroundColor: Colors.surfaceContainerHighest },
  wodActionText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: "#fff", letterSpacing: 0.5 },

  // Availability
  availDayLabel: {
    fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm,
    color: Colors.textSecondary, letterSpacing: 1.5,
    textTransform: "uppercase", marginBottom: 6,
  },
  availSlotRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  availSlotTime: { fontFamily: Fonts.display, fontSize: 16, color: Colors.text, flex: 1 },
  availSlotDuration: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.textSecondary },
  removeBtn: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.error + "44",
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.error + "11",
  },

  // End + FAB
  endLabel: {
    textAlign: "center", fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelSm, color: Colors.textMuted,
    letterSpacing: 2, marginTop: 8, marginBottom: 8,
  },
  fab: {
    position: "absolute", bottom: 28, right: 22,
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
});

// ─── Availability modal styles ────────────────────────────────────────────────

const md = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
    borderWidth: 1, borderColor: Colors.border,
  },
  title: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text, marginBottom: 20 },
  label: {
    fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm,
    color: Colors.textSecondary, letterSpacing: 1,
    textTransform: "uppercase", marginBottom: 8, marginTop: 16,
  },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: {},
  chipText: { fontFamily: Fonts.bodySemi, color: Colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: "#fff" },
  actions: { flexDirection: "row", gap: 12, marginTop: 28 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, alignItems: "center",
  },
  cancelText: { fontFamily: Fonts.bodyBold, color: Colors.textSecondary },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: "center" },
  saveText: { fontFamily: Fonts.bodyBold, color: "#fff" },
});
