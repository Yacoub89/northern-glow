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
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { Fonts, FontSizes } from "../../constants/Typography";
import { useGymColors } from "../../constants/GymConfig";
import { getTodayDate } from "../../utils/date";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWodSubtitle(wod: { type: string; description: string }): string {
  const text = `${wod.type} ${wod.description}`;
  const m = text.match(/(\d+)[\s-]?min/i);
  const mins = m ? parseInt(m[1]) : wod.type === "AMRAP" ? 20 : null;
  if (wod.type === "AMRAP") return mins ? `AMRAP ${mins} MINUTES` : "AMRAP";
  if (wod.type === "ForTime") return mins ? `FOR TIME (${mins} MIN CAP)` : "FOR TIME";
  if (wod.type === "EMOM") return mins ? `EMOM ${mins} MINUTES` : "EMOM";
  if (wod.type === "Strength") return "STRENGTH WORK";
  return "WORKOUT";
}

function computeStreak(history: Array<{ date: string }>): number {
  if (!history?.length) return 0;
  const dateSet = new Set(history.map((h) => h.date));
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const s = d.toISOString().split("T")[0];
    if (dateSet.has(s)) {
      streak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function splitFormattedTime(time: string): { hour: string; period: string } {
  // time is "HH:MM" 24h format
  const [h] = time.split(":").map(Number);
  const hour = h % 12 || 12;
  return {
    hour: `${hour}:${time.split(":")[1]}`,
    period: h >= 12 ? "PM" : "AM",
  };
}

function getLast7Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function getDayAbbr(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d)
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase()
    .slice(0, 3);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { primary } = useGymColors();
  const today = getTodayDate();
  const router = useRouter();

  const me = useQuery(api.users.getMe);
  const hasGym = !!me?.gymId;

  const wod = useQuery(api.wods.getByDate, hasGym ? { date: today } : "skip");
  const todayBooking = useQuery(api.bookings.getMyUpcomingBooking, hasGym ? { date: today } : "skip");
  const upcomingBookings = useQuery(api.bookings.getMyUpcoming, hasGym ? {} : "skip");

  const isCoach = me?.role === "coach" || me?.role === "admin";

  const attendanceStats = useQuery(
    api.bookings.getMyAttendanceStats,
    !hasGym || isCoach || me === undefined ? "skip" : undefined
  );

  const myPRs = useQuery(
    api.personalRecords.getMyPRs,
    !hasGym || isCoach || me === undefined ? "skip" : undefined
  );

  const todayClasses = useQuery(api.classes.getUpcoming, hasGym ? { startDate: today, days: 1 } : "skip");

  if (me === undefined || !hasGym || (hasGym && (wod === undefined || todayBooking === undefined))) {
    return (
      <View style={sc.centered}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  const streak = attendanceStats ? computeStreak(attendanceStats.checkInHistory) : 0;

  // Most recent PR (sorted by setAt descending)
  const recentPR = myPRs
    ? [...myPRs].sort((a, b) => b.setAt - a.setAt)[0]
    : null;

  // Today's classes with my booking status
  const todayClassList = todayClasses ?? [];

  // Last 7 days for performance chart
  const last7 = getLast7Days();
  const attendedDates = new Set(
    attendanceStats?.checkInHistory?.map((h) => h.date) ?? []
  );

  return (
    <SafeAreaView style={sc.container} edges={[]}>
      <ScrollView contentContainerStyle={sc.scroll} showsVerticalScrollIndicator={false}>

        {/* ── WOD Hero ── */}
        <View style={sc.wodHero}>
          <View style={sc.wodHeroHeader}>
            <View style={{ flex: 1 }}>
              {wod ? (
                <>
                  <Text style={sc.wodSubtitle}>{getWodSubtitle(wod)}</Text>
                  <Text style={sc.wodTitle}>{wod.title.toUpperCase()}</Text>
                </>
              ) : (
                <Text style={sc.wodTitle}>NO WOD TODAY</Text>
              )}
            </View>

            {wod && !isCoach && (
              <Pressable
                style={[sc.logBtn, { backgroundColor: primary }]}
                onPress={() => router.push("/(tabs)/wod-placeholder")}
              >
                <Text style={[sc.logBtnText, { color: Colors.onPrimary }]}>LOG</Text>
                <Ionicons name="add-circle-outline" size={16} color={Colors.onPrimary} />
              </Pressable>
            )}

            {wod && isCoach && (
              <Pressable
                style={[sc.logBtn, { backgroundColor: Colors.surfaceContainerHighest }]}
                onPress={() => router.push("/(tabs)/wod-placeholder")}
              >
                <Text style={[sc.logBtnText, { color: primary }]}>EDIT</Text>
                <Ionicons name="create-outline" size={16} color={primary} />
              </Pressable>
            )}

            {!wod && isCoach && (
              <Pressable
                style={[sc.logBtn, { backgroundColor: primary }]}
                onPress={() => router.push("/(tabs)/wod-placeholder")}
              >
                <Text style={[sc.logBtnText, { color: Colors.onPrimary }]}>POST</Text>
                <Ionicons name="add-circle-outline" size={16} color={Colors.onPrimary} />
              </Pressable>
            )}
          </View>

          {wod && wod.movements.length > 0 && (
            <View style={sc.movementList}>
              {wod.movements.map((m, i) => (
                <Text key={i} style={sc.movementItem}>{m}</Text>
              ))}
            </View>
          )}
        </View>

        {/* ── Stat cards ── */}
        {!isCoach && (
          <View style={sc.statsRow}>
            {/* Recent PR */}
            <View style={sc.statCard}>
              <View style={sc.statCardHeader}>
                <Ionicons name="trophy-outline" size={13} color={primary} />
                <Text style={sc.statLabel}>RECENT PR</Text>
              </View>
              {recentPR ? (
                <>
                  <Text style={sc.prMovement}>
                    {recentPR.movement.toUpperCase()}
                  </Text>
                  <Text style={[sc.prValue, { color: Colors.text }]}>
                    {recentPR.score}
                  </Text>
                </>
              ) : (
                <Text style={sc.prMovement}>—</Text>
              )}
            </View>

            {/* Streak */}
            <View style={sc.statCard}>
              <View style={sc.statCardHeader}>
                <Ionicons name="flame-outline" size={13} color={primary} />
                <Text style={sc.statLabel}>STREAK</Text>
              </View>
              <View style={sc.streakRow}>
                <Text style={sc.streakNum}>{String(streak).padStart(2, "0")}</Text>
                <Text style={sc.streakUnit}>DAYS</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Today's Classes ── */}
        <View style={sc.section}>
          <View style={sc.sectionRow}>
            <Text style={sc.sectionTitle}>CLASSES</Text>
            {isCoach ? (
              <Pressable
                style={[sc.addClassBtn, { backgroundColor: primary }]}
                onPress={() => router.push("/class-form")}
              >
                <Text style={sc.addClassBtnText}>+ ADD CLASS</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push("/(tabs)/schedule")}>
                <Text style={[sc.sectionAction, { color: primary }]}>SCHEDULE</Text>
              </Pressable>
            )}
          </View>

          {todayClassList.length === 0 ? (
            <View style={sc.emptyClasses}>
              <Text style={sc.emptyText}>No classes scheduled today</Text>
            </View>
          ) : (
            todayClassList.map((cls) => {
              const myBooking = upcomingBookings?.find(
                (b) => b.booking.classId === cls._id && b.booking.status !== "cancelled"
              );
              const spotsLeft = cls.capacity - cls.bookedCount;
              const { hour, period } = splitFormattedTime(cls.startTime);

              return (
                <View key={cls._id} style={sc.classCard}>
                  <View style={sc.classTimeCol}>
                    <Text style={[sc.classHour, { color: primary }]}>{hour}</Text>
                    <Text style={sc.classPeriod}>{period}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={sc.className}>
                      {(cls as any).wodTitle?.toUpperCase() ?? "CROSSFIT CLASS"}
                    </Text>
                    <Text style={sc.classCoach}>{(cls as any).coachName}</Text>

                    {/* Status badge */}
                    {myBooking ? (
                      <View style={sc.statusRow}>
                        <View
                          style={[
                            sc.statusDot,
                            {
                              backgroundColor:
                                myBooking.booking.status === "waitlist"
                                  ? Colors.warning
                                  : Colors.success,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            sc.statusText,
                            {
                              color:
                                myBooking.booking.status === "waitlist"
                                  ? Colors.warning
                                  : Colors.success,
                            },
                          ]}
                        >
                          {myBooking.booking.status === "waitlist"
                            ? `WAITLIST #${myBooking.booking.waitlistPosition}`
                            : "BOOKED"}
                        </Text>
                      </View>
                    ) : (
                      <View style={sc.statusRow}>
                        <View
                          style={[
                            sc.statusDot,
                            {
                              backgroundColor:
                                spotsLeft <= 0 ? Colors.error : Colors.success,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            sc.statusText,
                            {
                              color:
                                spotsLeft <= 0 ? Colors.error : Colors.success,
                            },
                          ]}
                        >
                          {spotsLeft <= 0
                            ? "FULL"
                            : spotsLeft <= 3
                            ? `${spotsLeft} SLOTS`
                            : "OPEN"}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Avatar placeholder */}
                  <View style={[sc.classAvatar, { borderColor: Colors.surfaceContainerHighest }]}>
                    <Text style={[sc.classAvatarText, { color: Colors.textSecondary }]}>
                      {(cls as any).coachName?.[0]?.toUpperCase() ?? "C"}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Performance Breakdown ── */}
        {!isCoach && attendanceStats != null && (
          <View style={sc.section}>
            <View style={sc.sectionRow}>
              <Text style={sc.sectionTitle}>PERFORMANCE BREAKDOWN</Text>
            </View>
            <View style={sc.barChart}>
              {last7.map((dateStr, i) => {
                const attended = attendedDates.has(dateStr);
                const isToday = dateStr === today;
                const dayLabel = getDayAbbr(dateStr);
                return (
                  <View key={i} style={sc.barCol}>
                    <View style={sc.barTrack}>
                      <View
                        style={[
                          sc.bar,
                          {
                            height: attended ? 64 : 16,
                            backgroundColor: attended
                              ? primary
                              : Colors.surfaceContainerHighest,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        sc.barLabel,
                        isToday && { color: primary },
                      ]}
                    >
                      {dayLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  scroll: { paddingBottom: 100 },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 13,
  },
  brandName: {
    fontFamily: Fonts.display,
    fontSize: 18,
    letterSpacing: 2,
  },

  // WOD Hero
  wodHero: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  wodHeroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  wodSubtitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  wodTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.displayMd,
    color: Colors.text,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 6,
  },
  logBtnText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.labelMd,
    letterSpacing: 1,
  },
  movementList: {
    gap: 6,
  },
  movementItem: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelLg,
    color: Colors.text,
    lineHeight: 22,
  },

  // Stat cards
  statsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 16,
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  statLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  prMovement: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  prValue: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.headlineMd,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 4,
  },
  streakNum: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.headlineMd,
    color: Colors.text,
  },
  streakUnit: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
  },
  sectionAction: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.labelSm,
    letterSpacing: 1,
  },
  addClassBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addClassBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelSm,
    color: "#fff",
    letterSpacing: 0.8,
  },

  // Class cards
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceContainerLow,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    gap: 14,
  },
  classTimeCol: {
    alignItems: "flex-end",
    minWidth: 44,
  },
  classHour: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.headlineSm,
    lineHeight: 26,
  },
  classPeriod: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
  },
  className: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelLg,
    color: Colors.text,
    marginBottom: 2,
  },
  classCoach: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  classAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  classAvatarText: {
    fontFamily: Fonts.display,
    fontSize: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelSm,
    letterSpacing: 0.5,
  },
  emptyClasses: {
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
  },

  // Performance breakdown bar chart
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  barTrack: {
    height: 80,
    justifyContent: "flex-end",
    width: "100%",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
});
