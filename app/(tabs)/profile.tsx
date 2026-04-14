import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Colors } from "../../constants/Colors";
import { formatDate, formatTime } from "../../utils/date";

function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={confirmStyles.overlay} onPress={onCancel}>
        <View style={confirmStyles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={confirmStyles.title}>{title}</Text>
          <Text style={confirmStyles.message}>{message}</Text>
          <View style={confirmStyles.actions}>
            <Pressable style={confirmStyles.cancelBtn} onPress={onCancel}>
              <Text style={confirmStyles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[confirmStyles.confirmBtn, destructive && confirmStyles.confirmBtnDestructive]}
              onPress={onConfirm}
            >
              <Text style={[confirmStyles.confirmText, destructive && confirmStyles.confirmTextDestructive]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

function formatMemberSince(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.getMe);
  const isCoachOrAdmin = me?.role === "coach" || me?.role === "admin";
  const stats = useQuery(api.users.getMyStats, isCoachOrAdmin ? "skip" : undefined);
  const membership = useQuery(api.memberships.getMyMembership);
  const prs = useQuery(api.personalRecords.getMyPRs, isCoachOrAdmin ? "skip" : undefined);
  const upcomingBookings = useQuery(api.bookings.getMyUpcoming, isCoachOrAdmin ? "skip" : undefined);
  const cancelBooking = useMutation(api.bookings.cancel);
  const upsertPR = useMutation(api.personalRecords.upsert);
  const removePR = useMutation(api.personalRecords.remove);

  const [prModalVisible, setPrModalVisible] = useState(false);
  const [prMovement, setPrMovement] = useState("");
  const [prScore, setPrScore] = useState("");
  const [savingPR, setSavingPR] = useState(false);

  type ConfirmState = { title: string; message: string; confirmLabel: string; destructive: boolean; onConfirm: () => void } | null;
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  if (me === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const initials = (me?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleCancelBooking = (classId: Doc<"bookings">["classId"], label: string) => {
    setConfirm({
      title: "Cancel Booking",
      message: `Cancel your booking for ${label}?`,
      confirmLabel: "Cancel Booking",
      destructive: true,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await cancelBooking({ classId });
        } catch (e: any) {
          Alert.alert("Error", e.message);
        }
      },
    });
  };

  const handleSavePR = async () => {
    if (!prMovement.trim() || !prScore.trim()) return;
    setSavingPR(true);
    try {
      await upsertPR({ movement: prMovement.trim(), score: prScore.trim() });
      setPrMovement("");
      setPrScore("");
      setPrModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSavingPR(false);
    }
  };

  const handleDeletePR = (pr: Doc<"personalRecords">) => {
    setConfirm({
      title: "Delete PR",
      message: `Remove ${pr.movement}?`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => {
        setConfirm(null);
        removePR({ id: pr._id });
      },
    });
  };

  const handleSignOut = () => {
    setConfirm({
      title: "Sign Out",
      message: "Are you sure you want to sign out?",
      confirmLabel: "Sign Out",
      destructive: true,
      onConfirm: () => {
        setConfirm(null);
        signOut();
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <Text style={styles.name}>{me?.name ?? "Unknown"}</Text>
              {isCoachOrAdmin && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {me?.role === "admin" ? "Admin" : "Coach"}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.memberSince}>
              Member since {formatMemberSince(me?._creationTime ?? Date.now())}
            </Text>
          </View>
          <Pressable style={styles.signOutIcon} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Membership */}
        {me?.role !== "coach" && me?.role !== "admin" && (
          <Pressable
            style={[
              styles.membershipCard,
              membership?.status === "active" || membership?.status === "trialing"
                ? styles.membershipCardActive
                : styles.membershipCardInactive,
            ]}
            onPress={() => router.push("/membership")}
          >
            <View style={styles.membershipCardLeft}>
              <Ionicons
                name={
                  membership?.status === "active" || membership?.status === "trialing"
                    ? "shield-checkmark"
                    : "shield-outline"
                }
                size={22}
                color={
                  membership?.status === "active" || membership?.status === "trialing"
                    ? Colors.success
                    : Colors.warning
                }
              />
              <View style={{ marginLeft: 12 }}>
                {membership?.status === "active" || membership?.status === "trialing" ? (
                  <>
                    <Text style={styles.membershipTitle}>
                      {membership.plan === "unlimited" ? "Unlimited" : "2× per Week"} ·{" "}
                      {membership.billingPeriod === "monthly" ? "Monthly" : "3-Month"}
                    </Text>
                    <Text style={styles.membershipSub}>
                      Renews{" "}
                      {new Date(membership.currentPeriodEnd).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.membershipTitle, { color: Colors.warning }]}>
                      No active membership
                    </Text>
                    <Text style={styles.membershipSub}>Tap to subscribe</Text>
                  </>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </Pressable>
        )}

        {/* Stats — athletes only */}
        {!isCoachOrAdmin && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats?.classesAttended ?? "—"}</Text>
              <Text style={styles.statLabel}>Classes</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxMiddle]}>
              <Text style={styles.statValue}>{stats?.wodsLogged ?? "—"}</Text>
              <Text style={styles.statLabel}>WODs logged</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats?.prsSet ?? "—"}</Text>
              <Text style={styles.statLabel}>PRs set</Text>
            </View>
          </View>
        )}

        {/* Admin Tools — coaches and admins only */}
        {isCoachOrAdmin && (
          <>
            <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>Admin Tools</Text>
            <Pressable
              style={styles.settingsRow}
              onPress={() => router.push("/(tabs)/members")}
            >
              <Ionicons name="people" size={20} color={Colors.primary} style={{ marginRight: 12 }} />
              <Text style={styles.settingsRowText}>Members</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </Pressable>
            <Pressable
              style={styles.settingsRow}
              onPress={() => router.push("/(tabs)/manage")}
            >
              <Ionicons name="calendar" size={20} color={Colors.primary} style={{ marginRight: 12 }} />
              <Text style={styles.settingsRowText}>Manage Schedule & WODs</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </Pressable>
            <Pressable
              style={styles.settingsRow}
              onPress={() => router.push("/(tabs)/documents")}
            >
              <Ionicons name="document-text" size={20} color={Colors.primary} style={{ marginRight: 12 }} />
              <Text style={styles.settingsRowText}>Documents & Waivers</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </Pressable>
            {me?.role === "admin" && (
              <Pressable
                style={[styles.settingsRow, { marginBottom: 28 }]}
                onPress={() => router.push("/gym-settings")}
              >
                <Ionicons name="settings-outline" size={20} color={Colors.primary} style={{ marginRight: 12 }} />
                <Text style={styles.settingsRowText}>Gym Settings</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </Pressable>
            )}
          </>
        )}

        {/* Documents — athletes only */}
        {!isCoachOrAdmin && (
          <>
            <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>Documents</Text>
            <Pressable
              style={[styles.settingsRow, { marginBottom: 28 }]}
              onPress={() => router.push("/(tabs)/documents")}
            >
              <Ionicons name="document-text" size={20} color={Colors.primary} style={{ marginRight: 12 }} />
              <Text style={styles.settingsRowText}>Documents & Waivers</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </Pressable>
          </>
        )}

        {/* Personal Records — athletes only */}
        {!isCoachOrAdmin && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Personal Records</Text>
              <Pressable style={styles.addBtn} onPress={() => setPrModalVisible(true)}>
                <Text style={styles.addBtnText}>+ Add</Text>
              </Pressable>
            </View>

            {prs === undefined ? (
              <ActivityIndicator color={Colors.primary} style={{ marginBottom: 20 }} />
            ) : prs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No PRs yet — add your first one!</Text>
              </View>
            ) : (
              <View style={styles.prList}>
                {prs.map((pr) => (
                  <Pressable
                    key={pr._id}
                    style={styles.prRow}
                    onLongPress={() => handleDeletePR(pr)}
                  >
                    <Text style={styles.prMovement}>{pr.movement}</Text>
                    <Text style={styles.prScore}>{pr.score}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Upcoming Bookings */}
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={styles.sectionLabel}>My Upcoming Bookings</Text>
            </View>

            {upcomingBookings === undefined ? (
              <ActivityIndicator color={Colors.primary} style={{ marginBottom: 20 }} />
            ) : upcomingBookings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No upcoming bookings</Text>
              </View>
            ) : (
              upcomingBookings.map(({ booking, cls, coachName }) => (
                <View key={booking._id} style={styles.bookingCard}>
                  <View>
                    <Text style={styles.bookingDate}>
                      {formatDate(cls.date, { relative: true, weekday: "short" })} · {formatTime(cls.startTime)}
                      {booking.status === "waitlist" ? " · Waitlist" : ""}
                    </Text>
                    <Text style={styles.bookingCoach}>Coach {coachName}</Text>
                  </View>
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() =>
                      handleCancelBooking(
                        cls._id,
                        `${formatDate(cls.date, { relative: true, weekday: "short" })} ${formatTime(cls.startTime)}`
                      )
                    }
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Confirm Modal */}
      <ConfirmModal
        visible={confirm !== null}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        destructive={confirm?.destructive ?? false}
        onConfirm={confirm?.onConfirm ?? (() => {})}
        onCancel={() => setConfirm(null)}
      />

      {/* Add PR Modal */}
      <Modal
        visible={prModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPrModalVisible(false)}
        />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Add Personal Record</Text>

          <Text style={styles.modalLabel}>Movement</Text>
          <TextInput
            style={styles.modalInput}
            value={prMovement}
            onChangeText={setPrMovement}
            placeholder='e.g. "Fran", "Back Squat"'
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />

          <Text style={[styles.modalLabel, { marginTop: 12 }]}>Score</Text>
          <TextInput
            style={styles.modalInput}
            value={prScore}
            onChangeText={setPrScore}
            placeholder='e.g. "4:22", "185 lb"'
            placeholderTextColor={Colors.textMuted}
          />

          <Pressable
            style={[styles.modalSaveBtn, savingPR && { opacity: 0.6 }]}
            onPress={handleSavePR}
            disabled={savingPR}
          >
            <Text style={styles.modalSaveBtnText}>
              {savingPR ? "Saving…" : "Save PR"}
            </Text>
          </Pressable>
        </View>
      </Modal>
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
  scroll: { padding: 20, paddingBottom: 48 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerInfo: { flex: 1 },
  name: { fontSize: 20, fontWeight: "700", color: Colors.text, marginBottom: 2 },
  memberSince: { fontSize: 13, color: Colors.textSecondary },
  signOutIcon: { padding: 4 },
  roleBadge: {
    backgroundColor: Colors.primary + "22",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Membership card
  membershipCard: {
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    borderWidth: 1,
  },
  membershipCardActive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.success + "55",
  },
  membershipCardInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.warning + "55",
  },
  membershipCardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  membershipTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 2 },
  membershipSub: { fontSize: 12, color: Colors.textSecondary },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statBoxMiddle: {
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
    fontWeight: "600",
  },

  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  settingsRow: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingsRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },

  // PRs
  prList: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    overflow: "hidden",
  },
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  prMovement: { fontSize: 16, color: Colors.text, fontWeight: "500" },
  prScore: { fontSize: 16, fontWeight: "700", color: Colors.primary },

  // Bookings
  bookingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookingDate: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 2 },
  bookingCoach: { fontSize: 13, color: Colors.textSecondary },
  cancelBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: "600", fontSize: 13 },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },

  // PR Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  modalSaveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

const confirmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  cancelText: {
    color: Colors.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  confirmBtnDestructive: {
    backgroundColor: Colors.error,
  },
  confirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  confirmTextDestructive: {
    color: "#fff",
  },
});
