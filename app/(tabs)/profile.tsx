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
import { Fonts } from "../../constants/Typography";
import { useGymColors } from "../../constants/GymConfig";
import { useAppDialog } from "../../components/AppDialog";

function formatMemberSince(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function ProfileScreen() {
  const { primary } = useGymColors();
  const dialog = useAppDialog();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.getMe);
  const isCoachOrAdmin = me?.role === "coach" || me?.role === "admin";
  const membership = useQuery(api.memberships.getMyMembership);
  const prs = useQuery(api.personalRecords.getMyPRs, isCoachOrAdmin ? "skip" : undefined);
  const upsertPR = useMutation(api.personalRecords.upsert);
  const removePR = useMutation(api.personalRecords.remove);

  const [prModalVisible, setPrModalVisible] = useState(false);
  const [prMovement, setPrMovement] = useState("");
  const [prScore, setPrScore] = useState("");
  const [savingPR, setSavingPR] = useState(false);

  if (me === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  const initials = (me?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const membershipActive = membership?.status === "active" || membership?.status === "trialing";
  const membershipLabel = membershipActive
    ? membership?.plan === "unlimited"
      ? "Unlimited"
      : "2x weekly"
    : "Inactive";

  const handleSavePR = async () => {
    if (!prMovement.trim() || !prScore.trim()) return;
    setSavingPR(true);
    try {
      await upsertPR({ movement: prMovement.trim(), score: prScore.trim() });
      setPrMovement("");
      setPrScore("");
      setPrModalVisible(false);
    } catch (e: any) {
      dialog.alert("Error", e.message);
    } finally {
      setSavingPR(false);
    }
  };

  const handleDeletePR = async (pr: Doc<"personalRecords">) => {
    const confirmed = await dialog.confirm({
      title: "Delete PR",
      message: `Remove ${pr.movement}?`,
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await removePR({ id: pr._id });
    } catch (e: any) {
      dialog.alert("Error", e.message);
    }
  };

  const handleSignOut = async () => {
    const confirmed = await dialog.confirm({
      title: "Sign Out",
      message: "Are you sure you want to sign out?",
      confirmText: "Sign Out",
    });
    if (confirmed) {
      signOut();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: primary }]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <Text style={styles.name}>{me?.name ?? "Unknown"}</Text>
              {isCoachOrAdmin && (
                <View style={[styles.roleBadge, { backgroundColor: primary + "22" }]}>
                  <Text style={[styles.roleBadgeText, { color: primary }]}>
                    {me?.role === "admin" ? "Admin" : "Coach"}
                  </Text>
                </View>
              )}
            </View>
            {(membership?.status === "active" || membership?.status === "trialing") && (
              <Text style={styles.memberSince}>
                Member since {formatMemberSince(me?._creationTime ?? Date.now())}
              </Text>
            )}
          </View>
          <Pressable style={styles.signOutIcon} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.statGrid}>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{membershipLabel}</Text>
            <Text style={styles.statLabel}>membership</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>
              {isCoachOrAdmin ? (me?.role === "admin" ? "Admin" : "Coach") : prs?.length ?? "--"}
            </Text>
            <Text style={styles.statLabel}>{isCoachOrAdmin ? "access" : "prs"}</Text>
          </View>
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
                      {membership.billingPeriod === "monthly" ? "Monthly" : "Annual"}
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

        {isCoachOrAdmin && (
          <>
            <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>Coach Console</Text>
            <Pressable
              style={styles.settingsRow}
              onPress={() => router.push("/(tabs)/members")}
            >
              <Ionicons name="people" size={20} color={primary} style={{ marginRight: 12 }} />
              <Text style={styles.settingsRowText}>Members</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </Pressable>
            <Pressable
              style={styles.settingsRow}
              onPress={() => router.push("/(tabs)/manage")}
            >
              <Ionicons name="calendar" size={20} color={primary} style={{ marginRight: 12 }} />
              <Text style={styles.settingsRowText}>Manage Schedule & WODs</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </Pressable>
            <Pressable
              style={styles.settingsRow}
              onPress={() => router.push("/(tabs)/documents")}
            >
              <Ionicons name="document-text" size={20} color={primary} style={{ marginRight: 12 }} />
              <Text style={styles.settingsRowText}>Documents & Waivers</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </Pressable>
            {me?.role === "admin" && (
              <Pressable
                style={[styles.settingsRow, { marginBottom: 28 }]}
                onPress={() => router.push("/gym-settings")}
              >
                <Ionicons name="settings-outline" size={20} color={primary} style={{ marginRight: 12 }} />
                <Text style={styles.settingsRowText}>Gym Settings</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </Pressable>
            )}
          </>
        )}

        {/* Personal Records — athletes only */}
        {!isCoachOrAdmin && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Personal Records</Text>
              <Pressable style={[styles.addBtn, { backgroundColor: primary }]} onPress={() => setPrModalVisible(true)}>
                <Text style={styles.addBtnText}>+ Add</Text>
              </Pressable>
            </View>

            {prs === undefined ? (
              <ActivityIndicator color={primary} style={{ marginBottom: 20 }} />
            ) : prs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="analytics-outline" size={28} color={Colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>No PRs yet — add your first one!</Text>
              </View>
            ) : (
              <View style={styles.prList}>
                {prs.map((pr) => (
                  <Pressable
                    key={pr._id}
                    style={styles.prCard}
                    onLongPress={() => handleDeletePR(pr)}
                  >
                    <Text style={styles.prMovement} numberOfLines={2}>{pr.movement}</Text>
                    <Text style={[styles.prScore, { color: primary }]}>{pr.score}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.actionGrid}>
              <Pressable
                style={styles.actionTile}
                onPress={() => router.push("/(tabs)/schedule")}
              >
                <Ionicons name="calendar-clear" size={20} color={primary} />
                <Text style={styles.actionTileText}>Book classes</Text>
              </Pressable>
              <Pressable
                style={styles.actionTile}
                onPress={() => router.push("/(tabs)/wod")}
              >
                <Ionicons name="timer" size={20} color={primary} />
                <Text style={styles.actionTileText}>Log WOD</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.settingsRow, { marginTop: 8 }]}
              onPress={() => router.push("/(tabs)/documents")}
            >
              <Ionicons name="document-text" size={20} color={primary} style={{ marginRight: 12 }} />
              <Text style={styles.settingsRowText}>Documents & Waivers</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </Pressable>

          </>
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
            style={[styles.modalSaveBtn, { backgroundColor: primary }, savingPR && { opacity: 0.6 }]}
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
    marginBottom: 22,
    gap: 14,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: { fontSize: 22, fontFamily: Fonts.display, color: Colors.onPrimary },
  headerInfo: { flex: 1 },
  name: { fontSize: 21, fontFamily: Fonts.display, color: Colors.text, marginBottom: 2 },
  memberSince: { fontSize: 13, fontFamily: Fonts.bodyMed, color: Colors.textSecondary },
  signOutIcon: { padding: 4 },
  roleBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bodyExtra,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  statTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: Fonts.bodyExtra,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Membership card
  membershipCard: {
    borderRadius: 8,
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
  membershipTitle: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.text, marginBottom: 2 },
  membershipSub: { fontSize: 12, fontFamily: Fonts.bodyMed, color: Colors.textSecondary },

  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: Fonts.bodyExtra,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  addBtn: {
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addBtnText: { color: Colors.onPrimary, fontFamily: Fonts.bodyBold, fontSize: 13 },

  settingsRow: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
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
    fontFamily: Fonts.bodySemi,
    color: Colors.text,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  actionTile: {
    flex: 1,
    minHeight: 92,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    justifyContent: "space-between",
  },
  actionTileText: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.text,
  },

  // PRs
  prList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  prCard: {
    width: "48%",
    minHeight: 112,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    justifyContent: "space-between",
  },
  prMovement: { fontSize: 13, color: Colors.textSecondary, fontFamily: Fonts.bodyExtra, textTransform: "uppercase", letterSpacing: 0.8 },
  prScore: { fontSize: 24, fontFamily: Fonts.display },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  emptyText: { color: Colors.textSecondary, fontSize: 14, fontFamily: Fonts.bodyMed },

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
    fontFamily: Fonts.display,
    color: Colors.text,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontFamily: Fonts.bodyExtra,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalSaveBtn: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  modalSaveBtnText: { color: Colors.onPrimary, fontFamily: Fonts.bodyBold, fontSize: 16 },
});
