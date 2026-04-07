import { useQuery } from "convex/react";
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
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { useGymConfig } from "../../constants/GymConfig";
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

  const isLoading =
    me === undefined ||
    wod === undefined ||
    todayBooking === undefined;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
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
          <Text style={styles.gymName}>{gym.name.toUpperCase()}</Text>
          <Text style={styles.dateText}>{getTodayLabel()}</Text>
          <Text style={styles.greeting}>{getGreeting(me?.name)}</Text>
          {wod && (
            <View style={styles.wodDayBadge}>
              <Text style={styles.wodDayText}>WOD DAY</Text>
            </View>
          )}
        </View>

        {/* Booking banner */}
        {!isCoach && todayBooking?.booking.status === "booked" && (
          <View style={styles.bookingBanner}>
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
            <Text style={styles.wodMeta}>
              {wod.type.toUpperCase()}
              {wod.description ? ` · ${wod.description.toUpperCase()}` : ""}
            </Text>

            {wod.movements.length > 0 && (
              <View style={styles.movements}>
                {wod.movements.map((m, i) => {
                  const { num, label } = parseMovement(m);
                  return (
                    <View key={i} style={styles.movementRow}>
                      <Text style={styles.movementNum}>{num ?? "·"}</Text>
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
              <Pressable style={styles.ctaButton} onPress={() => router.push("/wod-form")}>
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

        {/* No class booked CTA */}
        {!isCoach && !todayBooking && (
          <Pressable
            style={styles.bookClassCta}
            onPress={() => router.push("/(tabs)/schedule")}
          >
            <Text style={styles.bookClassCtaText}>Book a Class →</Text>
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
    color: Colors.primary,
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
    backgroundColor: Colors.primary + "33",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primary + "55",
  },
  wodDayText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  // Booking banner
  bookingBanner: {
    backgroundColor: Colors.primary,
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
    color: Colors.primary,
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
    color: Colors.primary,
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
    backgroundColor: Colors.primary,
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
  bookClassCtaText: { color: Colors.primary, fontWeight: "700", fontSize: 15 },
});
