import { useQuery } from "convex/react";
import { useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { useGymColors, useGymConfig } from "../../constants/GymConfig";
import { formatTime, getTodayDate } from "../../utils/date";

function getGreeting(name?: string): string {
  const h = new Date().getHours();
  const first = name?.split(" ")[0] ?? "Athlete";
  if (h < 12) return `Good morning, ${first}!`;
  if (h < 17) return `Good afternoon, ${first}!`;
  return `Good evening, ${first}!`;
}

function getTodayLabel(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function parseMovement(text: string): { num: string | null; label: string } {
  const match = text.match(/^(\d+(?:\+\d+)?)\s+(.+)/);
  if (match) return { num: match[1], label: match[2] };
  return { num: null, label: text };
}

function computeStats(scores: string[]): { top: string | null; avg: string | null } {
  const nums = scores
    .map((s) => { const m = s.match(/^(\d+)/); return m ? parseInt(m[1]) : null; })
    .filter((n): n is number => n !== null);
  if (!nums.length) return { top: null, avg: null };
  const suffix = scores[0]?.replace(/^\d+/, "").trim() || "rds";
  return {
    top: `${Math.max(...nums)} ${suffix}`,
    avg: `${Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)} ${suffix}`,
  };
}

export default function HomeScreen() {
  const gym = useGymConfig();
  const { primary } = useGymColors();
  const today = getTodayDate();
  const router = useRouter();

  const me = useQuery(api.users.getMe);
  const wod = useQuery(api.wods.getByDate, { date: today });
  const todayBooking = useQuery(api.bookings.getMyUpcomingBooking, { date: today });
  const upcomingBookings = useQuery(api.bookings.getMyUpcoming);
  const wodStats = useQuery(
    api.results.getWodStats,
    wod?._id ? { wodId: wod._id } : "skip"
  );

  const isCoach = me?.role === "coach" || me?.role === "admin";

  const attendanceStats = useQuery(
    api.bookings.getMyAttendanceStats,
    isCoach || me === undefined ? "skip" : undefined
  );

  const [showCheckIns, setShowCheckIns] = useState(false);

  const isLoading =
    me === undefined ||
    wod === undefined ||
    todayBooking === undefined;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  const spotsLeft = todayBooking
    ? todayBooking.slot.capacity - todayBooking.slot.bookedCount
    : null;

  const stats = wodStats ? computeStats(wodStats.scores) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.gymName, { color: primary }]}>{gym.name.toUpperCase()}</Text>
          <Text style={styles.dateText}>{getTodayLabel()}</Text>
          <Text style={styles.greeting}>{getGreeting(me?.name)}</Text>
          {wod && (
            <View style={[styles.wodDayBadge, { backgroundColor: primary + "33", borderColor: primary + "55" }]}>
              <Text style={[styles.wodDayText, { color: primary }]}>WOD DAY</Text>
            </View>
          )}
        </View>

        {/* Booking banner */}
        {!isCoach && todayBooking?.booking.status === "booked" && (
          <View style={[styles.bookingBanner, { backgroundColor: primary }]}>
            <Text style={styles.bookingBannerText}>
              You're booked for {formatTime(todayBooking.slot.startTime)}
              {spotsLeft !== null && spotsLeft <= 5
                ? ` — ${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`
                : ""}
            </Text>
          </View>
        )}

        {/* Today's WOD */}
        <Text style={styles.sectionLabel}>TODAY'S WOD</Text>
        {wod ? (
          <View style={styles.wodCard}>
            <Text style={styles.wodTitle}>{wod.title}</Text>
            <Text style={[styles.wodMeta, { color: primary }]}>
              {wod.type.toUpperCase()}
              {wod.description ? ` · ${wod.description.toUpperCase()}` : ""}
            </Text>

            {wod.movements.length > 0 && (
              <View style={styles.movements}>
                {wod.movements.map((m, i) => {
                  const { num, label } = parseMovement(m);
                  return (
                    <View key={i} style={styles.movementRow}>
                      <Text style={[styles.movementNum, { color: primary }]}>{num ?? "·"}</Text>
                      <Text style={styles.movementLabel}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Stats */}
            {(stats?.top || (wodStats?.count ?? 0) > 0) && (
              <View style={styles.statsRow}>
                {stats?.top && (
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Top score</Text>
                    <Text style={styles.statValue}>{stats.top}</Text>
                  </View>
                )}
                {stats?.avg && (
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Avg score</Text>
                    <Text style={styles.statValue}>{stats.avg}</Text>
                  </View>
                )}
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Athletes</Text>
                  <Text style={styles.statValue}>{wodStats?.count ?? 0}</Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No WOD posted yet</Text>
            {isCoach && (
              <Pressable style={[styles.ctaButton, { backgroundColor: primary }]} onPress={() => router.push("/wod-form")}>
                <Text style={styles.ctaButtonText}>+ Post Today's WOD</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Upcoming Classes */}
        {!isCoach && (upcomingBookings?.length ?? 0) > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>UPCOMING CLASSES</Text>
            {upcomingBookings!.map(({ booking, cls, coachName }) => (
              <View key={booking._id} style={styles.classCard}>
                <View>
                  <Text style={styles.classTime}>{formatTime(cls.startTime)}</Text>
                  <Text style={styles.classCoach}>Coach {coachName}</Text>
                </View>
                <View
                  style={[
                    styles.classStatusBadge,
                    booking.status === "waitlist" && styles.classStatusWaitlist,
                  ]}
                >
                  <Text
                    style={[
                      styles.classStatusText,
                      booking.status === "waitlist" && styles.classStatusTextWaitlist,
                    ]}
                  >
                    {booking.status === "waitlist"
                      ? `Waitlist #${booking.waitlistPosition}`
                      : "Booked"}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Attendance Stats — athletes only */}
        {!isCoach && attendanceStats !== undefined && attendanceStats !== null && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>MY ATTENDANCE</Text>
            <View style={styles.attendanceRow}>
              <View style={styles.attendanceBox}>
                <Text style={[styles.attendanceValue, { color: primary }]}>{attendanceStats.thisWeek}</Text>
                <Text style={styles.attendanceLabel}>This Week</Text>
              </View>
              <View style={styles.attendanceBox}>
                <Text style={[styles.attendanceValue, { color: primary }]}>{attendanceStats.thisMonth}</Text>
                <Text style={styles.attendanceLabel}>This Month</Text>
              </View>
              <View style={styles.attendanceBox}>
                <Text style={[styles.attendanceValue, { color: primary }]}>{attendanceStats.thisYear}</Text>
                <Text style={styles.attendanceLabel}>This Year</Text>
              </View>
              <View style={styles.attendanceBox}>
                <Text style={[styles.attendanceValue, { color: primary }]}>{attendanceStats.allTime}</Text>
                <Text style={styles.attendanceLabel}>All Time</Text>
              </View>
            </View>

            {attendanceStats.checkInHistory.length > 0 && (
              <>
                <Pressable
                  style={styles.checkInToggle}
                  onPress={() => setShowCheckIns((v) => !v)}
                >
                  <Ionicons name="time-outline" size={16} color={primary} style={{ marginRight: 8 }} />
                  <Text style={styles.checkInToggleText}>Check-in History</Text>
                  <Ionicons
                    name={showCheckIns ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={Colors.textSecondary}
                  />
                </Pressable>

                {showCheckIns && (
                  <View style={styles.checkInList}>
                    {attendanceStats.checkInHistory.map((item, i) => (
                      <View
                        key={item.classId + i}
                        style={[
                          styles.checkInRow,
                          i === attendanceStats.checkInHistory.length - 1 && { borderBottomWidth: 0 },
                        ]}
                      >
                        <View style={styles.checkInDot} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.checkInDate}>
                            {new Date(item.date + "T12:00:00").toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                            {" · "}{formatTime(item.startTime)}
                          </Text>
                          <Text style={styles.checkInCoach}>Coach {item.coachName}</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* No class booked CTA */}
        {!isCoach && !todayBooking && (
          <Pressable
            style={styles.bookClassCta}
            onPress={() => router.push("/(tabs)/schedule")}
          >
            <Text style={[styles.bookClassCtaText, { color: primary }]}>Book a Class →</Text>
          </Pressable>
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
  scroll: { paddingBottom: 48 },

  // Header
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    marginBottom: 20,
  },
  gymName: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.text,
    lineHeight: 36,
  },
  greeting: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 14,
  },
  wodDayBadge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
  },
  wodDayText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  // Booking banner
  bookingBanner: {
    marginHorizontal: 20,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  bookingBannerText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginHorizontal: 20,
    marginBottom: 12,
  },

  // WOD card
  wodCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wodTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 4,
  },
  wodMeta: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  movements: { gap: 10, marginBottom: 20 },
  movementRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 16,
  },
  movementNum: {
    width: 32,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
  },
  movementLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500",
    flex: 1,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },

  // Empty
  emptyCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  emptyText: { color: Colors.textSecondary, fontSize: 15 },
  ctaButton: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  ctaButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Upcoming classes
  classCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  classTime: { fontSize: 22, fontWeight: "800", color: Colors.text },
  classCoach: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  classStatusBadge: {
    backgroundColor: Colors.success + "22",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  classStatusWaitlist: { backgroundColor: Colors.warning + "22" },
  classStatusText: { color: Colors.success, fontWeight: "700", fontSize: 13 },
  classStatusTextWaitlist: { color: Colors.warning },

  // Attendance
  attendanceRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  attendanceBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  attendanceValue: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 2,
  },
  attendanceLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Check-in history
  checkInToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkInToggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  checkInList: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
    overflow: "hidden",
  },
  checkInRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  checkInDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  checkInDate: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  checkInCoach: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Book CTA
  bookClassCta: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookClassCtaText: { fontWeight: "700", fontSize: 15 },
});
