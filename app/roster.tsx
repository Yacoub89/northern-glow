import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Colors } from "../constants/Colors";
import { useGymColors } from "../constants/GymConfig";
import { formatDate, formatTime } from "../utils/date";

function Initials({ name }: { name: string }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

export default function RosterScreen() {
  const { primary } = useGymColors();
  const params = useLocalSearchParams<{ classId?: string }>();
  const router = useRouter();

  // classId can come from URL params (e.g. from kiosk) or from local picker selection
  const [pickedClassId, setPickedClassId] = useState<string | null>(null);
  const classId = params.classId ?? pickedClassId ?? null;

  const upcomingClasses = useQuery(
    api.classes.getUpcoming,
    classId ? "skip" : { days: 7 }
  );

  const roster = useQuery(
    api.bookings.getClassRoster,
    classId ? { classId: classId as Id<"classes"> } : "skip"
  );

  const checkIn = useMutation(api.bookings.checkIn);
  const uncheckIn = useMutation(api.bookings.uncheckIn);

  const handleToggle = async (bookingId: Id<"bookings">, isCheckedIn: boolean) => {
    try {
      if (isCheckedIn) {
        await uncheckIn({ bookingId });
      } else {
        await checkIn({ bookingId });
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  // No class selected — show class picker
  if (!classId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Class Roster</Text>
            <Text style={styles.subtitle}>Select a class to view</Text>
          </View>
        </View>

        {upcomingClasses === undefined ? (
          <View style={styles.centered}>
            <ActivityIndicator color={primary} size="large" />
          </View>
        ) : upcomingClasses.length === 0 ? (
          <View style={[styles.emptyCard, { margin: 20 }]}>
            <Text style={styles.emptyText}>No upcoming classes scheduled</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {upcomingClasses.map((cls) => (
              <Pressable
                key={cls._id}
                style={styles.classPickerRow}
                onPress={() => setPickedClassId(cls._id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.classPickerDate}>
                    {formatDate(cls.date, { relative: true, weekday: "short" })} · {formatTime(cls.startTime)}
                  </Text>
                  <Text style={styles.classPickerSub}>
                    {cls.coachName} · {cls.bookedCount}/{cls.capacity} booked
                    {cls.wodTitle ? ` · ${cls.wodTitle}` : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // Class selected — show roster
  if (roster === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const booked = roster.filter((r) => r.status === "booked");
  const waitlisted = roster.filter((r) => r.status === "waitlist");
  const checkedInCount = booked.filter((r) => r.checkedInAt).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (pickedClassId ? setPickedClassId(null) : router.back())}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Class Roster</Text>
          <Text style={styles.subtitle}>{checkedInCount}/{booked.length} checked in</Text>
        </View>
        <Pressable
          style={[styles.kioskBtn, { borderColor: primary }]}
          onPress={() => router.push({ pathname: "/kiosk", params: { classId } })}
        >
          <Ionicons name="tv-outline" size={16} color={primary} />
          <Text style={[styles.kioskBtnText, { color: primary }]}>Kiosk</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {booked.length === 0 && waitlisted.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No athletes booked</Text>
          </View>
        ) : (
          <>
            {booked.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Booked ({booked.length})</Text>
                {booked.map((entry) => {
                  const isCheckedIn = !!entry.checkedInAt;
                  return (
                    <View key={entry._id} style={styles.athleteRow}>
                      <Initials name={entry.user?.name ?? "?"} />
                      <Text style={styles.athleteName}>{entry.user?.name ?? "Unknown"}</Text>
                      <Pressable
                        style={[styles.checkBtn, isCheckedIn && styles.checkBtnActive]}
                        onPress={() => handleToggle(entry._id, isCheckedIn)}
                      >
                        <Ionicons
                          name={isCheckedIn ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={isCheckedIn ? "#fff" : Colors.textSecondary}
                        />
                        <Text style={[styles.checkBtnText, isCheckedIn && styles.checkBtnTextActive]}>
                          {isCheckedIn ? "In" : "Check In"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </>
            )}

            {waitlisted.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
                  Waitlist ({waitlisted.length})
                </Text>
                {waitlisted.map((entry) => (
                  <View key={entry._id} style={[styles.athleteRow, styles.waitlistRow]}>
                    <Initials name={entry.user?.name ?? "?"} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.athleteName}>{entry.user?.name ?? "Unknown"}</Text>
                      <Text style={styles.waitlistPos}>#{entry.waitlistPosition} on waitlist</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 4 },
  title: { fontSize: 20, fontWeight: "800", color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  kioskBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  kioskBtnText: { fontWeight: "700", fontSize: 13 },
  list: { padding: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  athleteRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  waitlistRow: { opacity: 0.6 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  athleteName: { flex: 1, fontSize: 15, fontWeight: "600", color: Colors.text },
  waitlistPos: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  checkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "transparent",
  },
  checkBtnActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkBtnText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  checkBtnTextActive: { color: "#fff" },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: { color: Colors.textSecondary, fontSize: 15 },
  classPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  classPickerDate: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 2 },
  classPickerSub: { fontSize: 13, color: Colors.textSecondary },
});
