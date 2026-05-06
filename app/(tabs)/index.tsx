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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Colors } from "../../constants/Colors";
import { Fonts, FontSizes } from "../../constants/Typography";
import { useGymColors } from "../../constants/GymConfig";
import { getTodayDate } from "../../utils/date";

type HomeClass = Doc<"classes"> & {
  coachName: string;
  wodTitle: string | null;
};

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
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Responsive horizontal padding — tighter on small screens
  const hPad = width < 380 ? 14 : 20;

  const me = useQuery(api.users.getMe);
  const hasGym = !!me?.gymId;

  const wod = useQuery(api.wods.getByDate, hasGym ? { date: today } : "skip");
  const upcomingBookings = useQuery(api.bookings.getMyUpcoming, hasGym ? {} : "skip");

  const isCoach = me?.role === "coach" || me?.role === "admin";

  const todayClasses = useQuery(api.classes.getUpcoming, hasGym ? { startDate: today, days: 1 } : "skip");

  if (me === undefined || !hasGym || (hasGym && wod === undefined)) {
    return (
      <View style={sc.centered}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  const firstName = me?.name?.split(" ")[0] ?? "Athlete";

  // Today's classes with my booking status
  const todayClassList = (todayClasses ?? []) as HomeClass[];

  return (
    <SafeAreaView style={sc.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={[sc.scroll, { paddingBottom: 60 + insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Greeting ── */}
        <FadeIn style={[sc.greetingWrap, { paddingHorizontal: hPad }]} delay={0}>
          <Text style={sc.greetingText}>
            {getGreeting()}, <Text style={[sc.greetingName, { color: primary }]}>{firstName}</Text>
          </Text>
          <Text style={sc.greetingDate}>{getFormattedDate()}</Text>
        </FadeIn>

        {/* ── WOD Hero ── */}
        <FadeIn delay={80}>
          <ScalePress
            onPress={() => router.push("/(tabs)/wod")}
            style={[sc.wodHero, { marginHorizontal: hPad }]}
          >
            <View style={[sc.wodAccentBar, { backgroundColor: primary }]} />
            <View style={sc.wodContent}>
              <View style={sc.wodHeroHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {wod ? (
                    <>
                      <Text style={[sc.wodSubtitle, { color: primary }]}>{getWodSubtitle(wod)}</Text>
                      <Text style={sc.wodTitle} adjustsFontSizeToFit numberOfLines={2} minimumFontScale={0.7}>{wod.title.toUpperCase()}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[sc.wodSubtitle, { color: primary }]}>TODAY</Text>
                      <Text style={sc.wodTitle} adjustsFontSizeToFit numberOfLines={2} minimumFontScale={0.7}>NO WOD POSTED</Text>
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
                  {wod.movements.slice(0, 4).map((m, i) => (
                    <View key={i} style={sc.movementRow}>
                      <View style={[sc.movementBullet, { backgroundColor: primary }]} />
                      <Text style={sc.movementItem}>{m}</Text>
                    </View>
                  ))}
                  {wod.movements.length > 4 && (
                    <Text style={[sc.moreMovements, { color: primary }]}>
                      +{wod.movements.length - 4} more
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScalePress>
        </FadeIn>

        {/* ── Today's Classes ── */}
        <FadeIn style={sc.section} delay={160}>
          <View style={[sc.sectionRow, { paddingHorizontal: hPad }]}>
            <Text style={sc.sectionTitle}>TODAY'S CLASSES</Text>
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
            <View style={[sc.emptyClasses, { marginHorizontal: hPad }]}>
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
                <FadeIn key={cls._id} delay={200 + idx * 60}>
                  <ScalePress style={[sc.classCard, { marginHorizontal: hPad }]}>
                    <View style={[sc.classLeftBorder, { backgroundColor: primary }]} />
                    <View style={sc.classTimeCol}>
                      <Text style={[sc.classHour, { color: primary }]}>{hour}</Text>
                      <Text style={sc.classPeriod}>{period}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={sc.className}>
                        {cls.wodTitle?.toUpperCase() ?? "CROSSFIT CLASS"}
                      </Text>
                      <Text style={sc.classCoach}>{cls.coachName}</Text>

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
                        {cls.coachName?.[0]?.toUpperCase() ?? "C"}
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
  scroll: { paddingTop: 4 },

  // Greeting
  greetingWrap: {
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
    flexShrink: 0,
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
  moreMovements: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.labelMd,
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

});
