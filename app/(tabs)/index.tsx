import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { Fonts, FontSizes } from "../../constants/Typography";
import { useGymColors } from "../../constants/GymConfig";
import { getTodayDate, formatDate, formatTime } from "../../utils/date";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

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

/** Returns an array of booleans for the last 7 days (index 0 = 6 days ago, index 6 = today) */
function getLast7DaysActivity(history: Array<{ date: string }>): boolean[] {
  const dateSet = new Set(history?.map((h) => h.date) ?? []);
  const days: boolean[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(dateSet.has(d.toISOString().split("T")[0]));
  }
  return days;
}

function splitFormattedTime(time: string): { hour: string; period: string } {
  const [h] = time.split(":").map(Number);
  const hour = h % 12 || 12;
  return {
    hour: `${hour}:${time.split(":")[1]}`,
    period: h >= 12 ? "PM" : "AM",
  };
}

// ─── Animated pressable wrapper ──────────────────────────────────────────────

function ScalePress({ children, onPress, style }: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─── Fade-in wrapper ─────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, style }: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
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
  const last7 = attendanceStats ? getLast7DaysActivity(attendanceStats.checkInHistory) : Array(7).fill(false);
  const firstName = me?.name?.split(" ")[0] ?? "Athlete";

  // Most recent PR (sorted by setAt descending)
  const recentPR = myPRs
    ? [...myPRs].sort((a, b) => b.setAt - a.setAt)[0]
    : null;

  // Today's classes with my booking status
  const todayClassList = todayClasses ?? [];

  return (
    <SafeAreaView style={sc.container} edges={[]}>
      <ScrollView contentContainerStyle={sc.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Greeting ── */}
        <FadeIn style={sc.greetingWrap} delay={0}>
          <Text style={sc.greetingText}>
            {getGreeting()}, <Text style={[sc.greetingName, { color: primary }]}>{firstName}</Text>
          </Text>
          <Text style={sc.greetingDate}>{getFormattedDate()}</Text>
        </FadeIn>

        {/* ── WOD Hero ── */}
        <FadeIn delay={80}>
          <ScalePress
            onPress={() => router.push("/(tabs)/wod-placeholder")}
            style={sc.wodHero}
          >
            <View style={[sc.wodAccentBar, { backgroundColor: primary }]} />
            <View style={sc.wodContent}>
              <View style={sc.wodHeroHeader}>
                <View style={{ flex: 1 }}>
                  {wod ? (
                    <>
                      <Text style={[sc.wodSubtitle, { color: primary }]}>{getWodSubtitle(wod)}</Text>
                      <Text style={sc.wodTitle}>{wod.title.toUpperCase()}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[sc.wodSubtitle, { color: primary }]}>TODAY</Text>
                      <Text style={sc.wodTitle}>NO WOD POSTED</Text>
                    </>
                  )}
                </View>

                {wod && !isCoach && (
                  <LinearGradient
                    colors={[primary, Colors.primaryContainer]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={sc.logBtn}
                  >
                    <Text style={[sc.logBtnText, { color: Colors.onPrimary }]}>LOG</Text>
                    <Ionicons name="add-circle-outline" size={16} color={Colors.onPrimary} />
                  </LinearGradient>
                )}

                {wod && isCoach && (
                  <View style={[sc.logBtn, { backgroundColor: Colors.surfaceContainerHighest }]}>
                    <Text style={[sc.logBtnText, { color: primary }]}>EDIT</Text>
                    <Ionicons name="create-outline" size={16} color={primary} />
                  </View>
                )}

                {!wod && isCoach && (
                  <LinearGradient
                    colors={[primary, Colors.primaryContainer]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={sc.logBtn}
                  >
                    <Text style={[sc.logBtnText, { color: Colors.onPrimary }]}>POST</Text>
                    <Ionicons name="add-circle-outline" size={16} color={Colors.onPrimary} />
                  </LinearGradient>
                )}
              </View>

              {wod && wod.movements.length > 0 && (
                <View style={sc.movementList}>
                  {wod.movements.map((m, i) => (
                    <View key={i} style={sc.movementRow}>
                      <View style={[sc.movementBullet, { backgroundColor: primary }]} />
                      <Text style={sc.movementItem}>{m}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScalePress>
        </FadeIn>

        {/* ── Stat cards ── */}
        {!isCoach && (
          <FadeIn style={sc.statsRow} delay={160}>
            {/* Recent PR */}
            <ScalePress style={sc.statCard}>
              <LinearGradient
                colors={[Colors.surfaceContainerLow, Colors.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={sc.statCardGradient}
              >
                <View style={sc.statCardHeader}>
                  <Ionicons name="trophy" size={14} color={primary} />
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
                  <Text style={[sc.prValue, { color: Colors.textMuted }]}>--</Text>
                )}
              </LinearGradient>
            </ScalePress>

            {/* Streak */}
            <ScalePress style={sc.statCard}>
              <LinearGradient
                colors={[Colors.surfaceContainerLow, Colors.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={sc.statCardGradient}
              >
                <View style={sc.statCardHeader}>
                  <Ionicons name="flame" size={14} color={primary} />
                  <Text style={sc.statLabel}>STREAK</Text>
                </View>
                <Text style={sc.streakNum}>{String(streak).padStart(2, "0")}</Text>
                <Text style={sc.streakUnit}>DAYS</Text>
                <View style={sc.activityDots}>
                  {last7.map((active, i) => (
                    <View
                      key={i}
                      style={[
                        sc.activityDot,
                        { backgroundColor: active ? primary : Colors.surfaceContainerHighest },
                      ]}
                    />
                  ))}
                </View>
              </LinearGradient>
            </ScalePress>
          </FadeIn>
        )}

        {/* ── My Upcoming Bookings ── */}
        {!isCoach && upcomingBookings && upcomingBookings.length > 0 && (
          <FadeIn style={sc.section} delay={200}>
            <View style={sc.sectionRow}>
              <Text style={sc.sectionTitle}>MY BOOKINGS</Text>
              <Pressable onPress={() => router.push("/(tabs)/schedule")}>
                <Text style={[sc.sectionAction, { color: primary }]}>VIEW ALL</Text>
              </Pressable>
            </View>

            {upcomingBookings.map((item, idx) => {
              const dateLabel = formatDate(item.cls.date, { relative: true, weekday: "short" });
              const { hour, period } = splitFormattedTime(item.cls.startTime);
              const isWaitlist = item.booking.status === "waitlist";

              return (
                <FadeIn key={item.booking._id} delay={240 + idx * 50}>
                  <ScalePress style={sc.bookingCard}>
                    <View style={[sc.bookingDateCol, { backgroundColor: primary }]}>
                      <Text style={sc.bookingDateText}>{dateLabel.toUpperCase()}</Text>
                    </View>
                    <View style={sc.bookingTimeCol}>
                      <Text style={[sc.bookingHour, { color: primary }]}>{hour}</Text>
                      <Text style={sc.bookingPeriod}>{period}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={sc.bookingClassName}>
                        {formatTime(item.cls.startTime)} CLASS
                      </Text>
                      <Text style={sc.bookingCoach}>{item.coachName}</Text>
                    </View>
                    <View
                      style={[
                        sc.bookingBadge,
                        {
                          backgroundColor: isWaitlist
                            ? Colors.warning + "20"
                            : Colors.success + "20",
                        },
                      ]}
                    >
                      <View
                        style={[
                          sc.statusDot,
                          {
                            backgroundColor: isWaitlist
                              ? Colors.warning
                              : Colors.success,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          sc.bookingBadgeText,
                          {
                            color: isWaitlist ? Colors.warning : Colors.success,
                          },
                        ]}
                      >
                        {isWaitlist
                          ? `WAITLIST #${item.booking.waitlistPosition}`
                          : "BOOKED"}
                      </Text>
                    </View>
                  </ScalePress>
                </FadeIn>
              );
            })}
          </FadeIn>
        )}

        {/* ── Today's Classes ── */}
        <FadeIn style={sc.section} delay={240}>
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
              <Ionicons name="moon-outline" size={28} color={Colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={sc.emptyTitle}>No classes today</Text>
              <Text style={sc.emptyText}>Rest day? Recovery is gains too.</Text>
            </View>
          ) : (
            todayClassList.map((cls, idx) => {
              const myBooking = upcomingBookings?.find(
                (b) => b.booking.classId === cls._id && b.booking.status !== "cancelled"
              );
              const spotsLeft = cls.capacity - cls.bookedCount;
              const spotsRatio = cls.bookedCount / cls.capacity;
              const { hour, period } = splitFormattedTime(cls.startTime);

              return (
                <FadeIn key={cls._id} delay={280 + idx * 60}>
                  <ScalePress style={sc.classCard}>
                    <View style={[sc.classLeftBorder, { backgroundColor: primary }]} />
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
                        <>
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
                                ? `${spotsLeft} SPOTS LEFT`
                                : "OPEN"}
                            </Text>
                          </View>
                          {/* Spots progress bar */}
                          <View style={sc.spotsBarBg}>
                            <View
                              style={[
                                sc.spotsBarFill,
                                {
                                  width: `${Math.min(spotsRatio * 100, 100)}%`,
                                  backgroundColor:
                                    spotsLeft <= 0
                                      ? Colors.error
                                      : spotsLeft <= 3
                                      ? Colors.warning
                                      : primary,
                                },
                              ]}
                            />
                          </View>
                        </>
                      )}
                    </View>

                    {/* Coach avatar */}
                    <View style={[sc.classAvatar, { borderColor: primary + "40" }]}>
                      <Text style={[sc.classAvatarText, { color: primary }]}>
                        {(cls as any).coachName?.[0]?.toUpperCase() ?? "C"}
                      </Text>
                    </View>
                  </ScalePress>
                </FadeIn>
              );
            })
          )}
        </FadeIn>

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

  // Greeting
  greetingWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  greetingText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.headlineSm,
    color: Colors.text,
  },
  greetingName: {
    fontFamily: Fonts.display,
  },
  greetingDate: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.3,
  },

  // WOD Hero
  wodHero: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
  },
  wodAccentBar: {
    width: 4,
  },
  wodContent: {
    flex: 1,
    padding: 18,
  },
  wodHeroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  wodSubtitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelSm,
    letterSpacing: 1.2,
    marginBottom: 6,
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
    borderRadius: 10,
    marginTop: 6,
  },
  logBtnText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.labelMd,
    letterSpacing: 1,
  },
  movementList: {
    gap: 8,
  },
  movementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  movementBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  movementItem: {
    fontFamily: Fonts.bodySemi,
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
    borderRadius: 16,
    overflow: "hidden",
  },
  statCardGradient: {
    padding: 16,
    borderRadius: 16,
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
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
  streakNum: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.displayLg,
    color: Colors.text,
    lineHeight: 60,
  },
  streakUnit: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginTop: -4,
  },
  activityDots: {
    flexDirection: "row",
    gap: 5,
    marginTop: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    borderRadius: 14,
    paddingRight: 16,
    paddingVertical: 14,
    marginBottom: 8,
    gap: 14,
    overflow: "hidden",
  },
  classLeftBorder: {
    width: 3,
    alignSelf: "stretch",
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
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
    width: 34,
    height: 34,
    borderRadius: 17,
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
  spotsBarBg: {
    height: 3,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 1.5,
    marginTop: 6,
    overflow: "hidden",
  },
  spotsBarFill: {
    height: 3,
    borderRadius: 1.5,
  },
  emptyClasses: {
    marginHorizontal: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.labelLg,
    color: Colors.text,
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
  },

  // Booking cards
  bookingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceContainerLow,
    marginHorizontal: 20,
    borderRadius: 14,
    paddingRight: 12,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 12,
    overflow: "hidden",
  },
  bookingDateCol: {
    paddingHorizontal: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  bookingDateText: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    color: Colors.onPrimary,
    letterSpacing: 0.8,
  },
  bookingTimeCol: {
    alignItems: "flex-end",
    minWidth: 40,
  },
  bookingHour: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.headlineSm,
    lineHeight: 24,
  },
  bookingPeriod: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
  },
  bookingClassName: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelLg,
    color: Colors.text,
    marginBottom: 2,
  },
  bookingCoach: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
  },
  bookingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bookingBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelSm,
    letterSpacing: 0.5,
  },
});
