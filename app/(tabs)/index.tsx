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

function formatCompactDate(dateStr: string): string {
  const today = getTodayDate();
  if (dateStr === today) return "Today";
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(time: string): string {
  const { hour, period } = splitFormattedTime(time);
  return `${hour} ${period}`;
}

function formatWodTypeLabel(type: string): string {
  if (type === "ForTime") return "For Time";
  return type || "Workout";
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
  const isCoach = me?.role === "coach" || me?.role === "admin";
  const upcomingBookings = useQuery(api.bookings.getMyUpcoming, hasGym && !isCoach ? {} : "skip");
  const upcomingAppointments = useQuery(api.appointments.getMyAppointments, hasGym && !isCoach ? {} : "skip");
  const upcomingEvents = useQuery(api.events.getMyUpcomingRegistrations, hasGym && !isCoach ? {} : "skip");

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
  const nextClass = todayClassList[0];
  const todaysBookings = isCoach
    ? []
    : upcomingBookings?.filter((b) => b.cls.date === today && b.booking.status !== "cancelled");
  const bookedTodayCount = todaysBookings?.length;
  const nextClassTime = nextClass ? splitFormattedTime(nextClass.startTime) : null;
  const bookingDataLoading =
    !isCoach &&
    (upcomingBookings === undefined ||
      upcomingAppointments === undefined ||
      upcomingEvents === undefined);
  const bookedItems = bookingDataLoading || isCoach
    ? []
    : [
        ...(upcomingBookings ?? []).map((item) => ({
          id: item.booking._id,
          kind: "Class" as const,
          title: "CrossFit Class",
          meta: `Coach ${item.coachName}`,
          date: item.cls.date,
          time: item.cls.startTime,
          icon: "barbell" as const,
          color: primary,
          onPress: () => router.push("/(tabs)/schedule"),
        })),
        ...(upcomingAppointments ?? []).map((item) => ({
          id: item._id,
          kind: "1:1" as const,
          title: "Private training",
          meta: `${item.durationMinutes} min with ${item.coachName}`,
          date: item.date,
          time: item.startTime,
          icon: "person" as const,
          color: Colors.warning,
          onPress: () => router.push("/(tabs)/schedule"),
        })),
        ...(upcomingEvents ?? []).map((item) => ({
          id: item.registration._id,
          kind: "Event" as const,
          title: item.event.title,
          meta: item.event.location ?? "Gym event",
          date: item.event.date,
          time: item.event.startTime,
          icon: "ticket" as const,
          color: Colors.success,
          onPress: () =>
            router.push({
              pathname: "/event-detail",
              params: { event_id: item.event._id },
            }),
        })),
      ]
        .sort((a, b) =>
          a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)
        )
        .slice(0, 4);

  return (
    <SafeAreaView style={sc.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={[sc.scroll, { paddingBottom: 60 + insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >

        <FadeIn style={[sc.greetingWrap, { paddingHorizontal: hPad }]} delay={0}>
          <Text style={[sc.trainingLabel, { color: primary }]}>TODAY'S TRAINING</Text>
          <Text style={sc.greetingText}>
            {getGreeting()}, <Text style={sc.greetingName}>{firstName}</Text>
          </Text>
          <Text style={sc.greetingDate}>{getFormattedDate()}</Text>
        </FadeIn>

        <FadeIn delay={80} style={{ paddingHorizontal: hPad }}>
          {isCoach ? (
            <>
              <View style={sc.coachHero}>
                <ScalePress
                  onPress={() => router.push("/(tabs)/manage")}
                  style={[sc.coachPrimaryAction, { borderColor: primary }]}
                >
                  <View>
                    <Text style={sc.panelLabel}>COACH CONSOLE</Text>
                    <Text style={sc.coachActionTitle}>Manage today's floor</Text>
                    <Text style={sc.coachActionText}>
                      Create classes, check capacity, and keep the schedule moving.
                    </Text>
                  </View>
                  <Ionicons name="clipboard" size={28} color={primary} />
                </ScalePress>
                <View style={sc.coachActionGrid}>
                  <Pressable style={sc.coachActionTile} onPress={() => router.push("/class-form")}>
                    <Ionicons name="add-circle" size={20} color={primary} />
                    <Text style={sc.coachActionSmall}>Add class</Text>
                  </Pressable>
                  <Pressable style={sc.coachActionTile} onPress={() => router.push("/(tabs)/wod")}>
                    <Ionicons name="stopwatch" size={20} color={Colors.warning} />
                    <Text style={sc.coachActionSmall}>{wod ? "View WOD" : "Create WOD"}</Text>
                  </Pressable>
                </View>
              </View>
              <View style={sc.quickGrid}>
                <Pressable style={sc.quickAction} onPress={() => router.push("/(tabs)/manage")}>
                  <Ionicons name="calendar-clear" size={18} color={primary} />
                  <Text style={sc.quickValue}>{todayClassList.length}</Text>
                  <Text style={sc.quickLabel}>classes</Text>
                </Pressable>
                <Pressable style={sc.quickAction} onPress={() => router.push("/(tabs)/wod")}>
                  <Ionicons name="timer" size={18} color={Colors.warning} />
                  <Text style={sc.quickValue}>{wod?.movements?.length ?? 0}</Text>
                  <Text style={sc.quickLabel}>moves</Text>
                </Pressable>
                <Pressable style={sc.quickAction} onPress={() => router.push("/(tabs)/members")}>
                  <Ionicons name="people" size={18} color={Colors.success} />
                  <Text style={sc.quickValue}>View</Text>
                  <Text style={sc.quickLabel}>members</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={sc.commandGrid}>
                <ScalePress
                  onPress={() => router.push("/(tabs)/schedule")}
                  style={[sc.nextPanel, { borderColor: primary }]}
                >
                  <View style={sc.nextPanelTop}>
                    <Text style={sc.panelLabel}>NEXT CLASS</Text>
                    <Ionicons name="barbell" size={20} color={primary} />
                  </View>
                  {nextClass && nextClassTime ? (
                    <>
                      <View style={sc.nextTimeRow}>
                        <Text style={[sc.nextHour, { color: primary }]}>{nextClassTime.hour}</Text>
                        <Text style={sc.nextPeriod}>{nextClassTime.period}</Text>
                      </View>
                      <Text style={sc.nextWorkout} numberOfLines={1}>
                        {nextClass.wodTitle ?? "CrossFit Class"}
                      </Text>
                      <Text style={sc.nextMeta} numberOfLines={1}>
                        Coach {nextClass.coachName} · {Math.max(nextClass.capacity - nextClass.bookedCount, 0)} spots left
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={sc.nextEmpty}>No class queued</Text>
                      <Text style={sc.nextMeta}>Check the schedule for the next training day.</Text>
                    </>
                  )}
                </ScalePress>

                <ScalePress onPress={() => router.push("/(tabs)/wod")} style={sc.wodPanel}>
                  <View style={sc.nextPanelTop}>
                    <Text style={sc.panelLabel}>WOD</Text>
                    <Ionicons name="timer" size={20} color={Colors.warning} />
                  </View>
                  <Text style={sc.wodTitle} numberOfLines={2}>
                    {wod ? formatWodTypeLabel(wod.type) : "No WOD"}
                  </Text>
                  <Text style={sc.wodDescription} numberOfLines={4}>
                    {wod?.description || wod?.movements?.slice(0, 4).join(" / ") || "Nothing posted for today."}
                  </Text>
                </ScalePress>
              </View>

              <View style={sc.quickGrid}>
                <Pressable style={sc.quickAction} onPress={() => router.push("/(tabs)/schedule")}>
                  <Ionicons name="calendar-clear" size={18} color={primary} />
                  <Text style={sc.quickValue}>{todayClassList.length}</Text>
                  <Text style={sc.quickLabel}>classes</Text>
                </Pressable>
                <Pressable style={sc.quickAction} onPress={() => router.push("/(tabs)/profile")}>
                  <Ionicons name="checkmark-done" size={18} color={Colors.success} />
                  <Text style={sc.quickValue}>{bookedTodayCount ?? "--"}</Text>
                  <Text style={sc.quickLabel}>booked</Text>
                </Pressable>
                <Pressable style={sc.quickAction} onPress={() => router.push("/(tabs)/wod")}>
                  <Ionicons name="timer" size={18} color={Colors.warning} />
                  <Text style={sc.quickValue}>{wod?.movements?.length ?? 0}</Text>
                  <Text style={sc.quickLabel}>moves</Text>
                </Pressable>
              </View>

              <View style={sc.bookedPanel}>
                <View style={sc.bookedHeader}>
                  <Text style={sc.sectionTitle}>BOOKED</Text>
                  <Pressable onPress={() => router.push("/(tabs)/schedule")}>
                    <Text style={[sc.sectionAction, { color: primary }]}>VIEW ALL</Text>
                  </Pressable>
                </View>
                {bookingDataLoading ? (
                  <Text style={sc.bookedEmpty}>Loading your bookings...</Text>
                ) : bookedItems.length === 0 ? (
                  <Text style={sc.bookedEmpty}>Nothing booked yet. Grab a class, session, or event.</Text>
                ) : (
                  <View style={sc.bookedList}>
                    {bookedItems.map((item) => (
                      <Pressable key={`${item.kind}-${item.id}`} style={sc.bookedItem} onPress={item.onPress}>
                        <View style={[sc.bookedIcon, { borderColor: item.color }]}>
                          <Ionicons name={item.icon} size={17} color={item.color} />
                        </View>
                        <View style={sc.bookedInfo}>
                          <Text style={sc.bookedTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={sc.bookedMeta} numberOfLines={1}>{item.meta}</Text>
                        </View>
                        <View style={sc.bookedWhen}>
                          <Text style={sc.bookedDate}>{formatCompactDate(item.date)}</Text>
                          <Text style={sc.bookedTime}>{formatTimeLabel(item.time)}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </FadeIn>

        {/* ── Today's Classes ── */}
        <FadeIn style={sc.section} delay={160}>
          <View style={[sc.sectionRow, { paddingHorizontal: hPad }]}>
            <Text style={sc.sectionTitle}>{isCoach ? "TODAY'S FLOOR" : "TODAY'S CLASSES"}</Text>
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
            <View style={[sc.emptyClassesCard, { marginHorizontal: hPad }]}>
              <View style={[sc.emptyLeftBorder, { backgroundColor: primary }]} />
              <View style={sc.emptyClasses}>
                <Ionicons name="moon-outline" size={28} color={Colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={sc.emptyTitle}>No classes today</Text>
                <Text style={sc.emptyText}>Rest day? Recovery is gains too.</Text>
              </View>
            </View>
          ) : (
            todayClassList.map((cls, idx) => {
              const myBooking = todaysBookings?.find(
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

                      {isCoach ? (
                        <>
                          <View style={sc.statusRow}>
                            <View style={[sc.statusDot, { backgroundColor: spotsLeft <= 0 ? Colors.error : primary }]} />
                            <Text style={[sc.statusText, { color: spotsLeft <= 0 ? Colors.error : primary }]}>
                              {cls.bookedCount}/{cls.capacity} RESERVED
                            </Text>
                          </View>
                          <View style={sc.spotsBarBg}>
                            <View
                              style={[
                                sc.spotsBarFill,
                                {
                                  width: `${Math.min(spotsRatio * 100, 100)}%`,
                                  backgroundColor: spotsLeft <= 0 ? Colors.error : primary,
                                },
                              ]}
                            />
                          </View>
                        </>
                      ) : myBooking ? (
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
    paddingTop: 18,
    paddingBottom: 8,
  },
  trainingLabel: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    letterSpacing: 1.8,
    marginBottom: 5,
  },
  greetingText: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.text,
  },
  greetingName: {
    fontFamily: Fonts.display,
    color: Colors.text,
  },
  greetingDate: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.3,
  },

  commandGrid: {
    flexDirection: "column",
    gap: 10,
    marginTop: 18,
    marginBottom: 10,
  },
  nextPanel: {
    minHeight: 170,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    justifyContent: "space-between",
  },
  nextPanelTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  panelLabel: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    color: Colors.textMuted,
    letterSpacing: 1.3,
  },
  nextTimeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 14,
  },
  nextHour: {
    fontFamily: Fonts.display,
    fontSize: 42,
    lineHeight: 46,
  },
  nextPeriod: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
    marginLeft: 6,
    marginBottom: 7,
  },
  nextWorkout: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.titleMd,
    color: Colors.text,
    marginTop: 16,
  },
  nextMeta: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  nextEmpty: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.headlineSm,
    color: Colors.text,
    marginTop: 20,
  },
  wodPanel: {
    minHeight: 150,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "flex-start",
    gap: 12,
  },
  wodTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.headlineSm,
    color: Colors.text,
  },
  wodDescription: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  noWodText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.titleLg,
    color: Colors.textSecondary,
  },
  quickGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  quickValue: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.text,
    marginTop: 8,
  },
  quickLabel: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  bookedPanel: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 24,
  },
  bookedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  bookedList: {
    gap: 8,
  },
  bookedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
  },
  bookedIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  bookedInfo: {
    flex: 1,
    minWidth: 0,
  },
  bookedTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.labelLg,
    color: Colors.text,
    marginBottom: 2,
  },
  bookedMeta: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
  },
  bookedWhen: {
    alignItems: "flex-end",
    minWidth: 74,
  },
  bookedDate: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    color: Colors.text,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  bookedTime: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bookedEmpty: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  coachHero: {
    gap: 10,
    marginTop: 18,
    marginBottom: 10,
  },
  coachPrimaryAction: {
    minHeight: 172,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
  },
  coachActionTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.text,
    lineHeight: 32,
    marginTop: 18,
    maxWidth: 240,
  },
  coachActionText: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 8,
    maxWidth: 260,
  },
  coachActionGrid: {
    flexDirection: "row",
    gap: 10,
  },
  coachActionTile: {
    flex: 1,
    minHeight: 96,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    justifyContent: "space-between",
  },
  coachActionSmall: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.titleMd,
    color: Colors.text,
  },
  movementList: {
    gap: 8,
    marginTop: 10,
  },
  movementRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  movementBullet: {
    width: 18,
    textAlign: "center",
    fontFamily: Fonts.display,
    fontSize: 14,
  },
  movementItem: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelLg,
    color: Colors.text,
    flex: 1,
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
    color: Colors.onPrimary,
    letterSpacing: 0.8,
  },

  // Class cards
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingRight: 16,
    paddingVertical: 14,
    marginBottom: 8,
    gap: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surfaceVariant,
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
  emptyClassesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyLeftBorder: {
    width: 3,
    alignSelf: "stretch",
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  emptyClasses: {
    flex: 1,
    paddingVertical: 32,
    paddingHorizontal: 20,
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
