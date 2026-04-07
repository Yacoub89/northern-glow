import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  const stats = useQuery(api.users.getMyStats);
  const membership = useQuery(api.memberships.getMyMembership);
  const prs = useQuery(api.personalRecords.getMyPRs);
  const upcomingBookings = useQuery(api.bookings.getMyUpcoming);
  const cancelBooking = useMutation(api.bookings.cancel);
  const upsertPR = useMutation(api.personalRecords.upsert);
  const removePR = useMutation(api.personalRecords.remove);

  const [prModalVisible, setPrModalVisible] = useState(false);
  const [prMovement, setPrMovement] = useState("");
  const [prScore, setPrScore] = useState("");
  const [savingPR, setSavingPR] = useState(false);

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
    Alert.alert("Cancel Booking", `Cancel your booking for ${label}?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel Booking",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelBooking({ classId });
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
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
    Alert.alert("Delete PR", `Remove ${pr.movement}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removePR({ id: pr._id }),
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
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
            <Text style={styles.name}>{me?.name ?? "Unknown"}</Text>
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

        {/* Stats */}
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

        {/* Coach Tools */}
        {(me?.role === "coach" || me?.role === "admin") && (
          <Pressable
            style={styles.settingsRow}
            onPress={() => router.push("/(tabs)/members")}
          >
            <Ionicons name="people" size={20} color={Colors.primary} style={{ marginRight: 12 }} />
            <Text style={styles.settingsRowText}>Members</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </Pressable>
        )}

        {/* Personal Records */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Personal Records</Text>
          <Pressable
            style={styles.addBtn}
            onPress={() => setPrModalVisible(true)}
          >
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
      </ScrollView>

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
