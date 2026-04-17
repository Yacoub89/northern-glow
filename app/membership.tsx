import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ExpoLinking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../convex/_generated/api";
import { Colors } from "../constants/Colors";
import { useGymColors } from "../constants/GymConfig";

type Plan = "unlimited" | "twice_weekly";
type Period = "monthly" | "annual";

const PLANS: {
  id: Plan;
  label: string;
  tagline: string;
  features: string[];
}[] = [
  {
    id: "unlimited",
    label: "Unlimited",
    tagline: "Train as much as you want",
    features: [
      "Unlimited class bookings",
      "Full WOD access",
      "Priority waitlist",
    ],
  },
  {
    id: "twice_weekly",
    label: "2× per Week",
    tagline: "Perfect for getting started",
    features: ["2 classes per week", "Full WOD access", "Waitlist access"],
  },
];

const PERIODS: { id: Period; label: string; badge?: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "annual", label: "Annual", badge: "Save 17%" },
];

// Placeholder prices — update these to match your Stripe prices
const PRICES: Record<Plan, Record<Period, string>> = {
  unlimited: {
    monthly: "$200/mo",
    annual: "$166/mo",
  },
  twice_weekly: {
    monthly: "$190/mo",
    annual: "$157.7/mo",
  },
};

export default function MembershipScreen() {
  const { primary } = useGymColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    status?: string;
    session_id?: string;
  }>();
  const { status, session_id } = params;
  const membership = useQuery(api.memberships.getMyMembership);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const createPortalSession = useAction(api.stripe.createPortalSession);

  const syncFromSession = useAction(api.stripe.syncFromSession);

  const [selectedPlan, setSelectedPlan] = useState<Plan>("unlimited");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("annual");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!status) return;
    if (status === "success") {
      const sessionId = typeof session_id === "string" ? session_id : "";
      const finish = () => router.replace("/(tabs)/profile");
      if (sessionId) {
        syncFromSession({ sessionId })
          .then(finish)
          .catch(() => finish());
      } else {
        Alert.alert("Subscribed!", "Your membership is now active.", [
          { text: "Done", onPress: finish },
        ]);
      }
    } else if (status === "cancelled") {
      Alert.alert("No charge", "Checkout was cancelled.");
    }
  }, [status]);

  const isActive =
    membership?.status === "active" || membership?.status === "trialing";

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const returnUrl = ExpoLinking.createURL("membership");
      const url = await createCheckoutSession({
        plan: selectedPlan,
        billingPeriod: selectedPeriod,
        returnUrl,
      });
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const returnUrl = ExpoLinking.createURL("membership");
      const url = await createPortalSession({ returnUrl });
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Membership</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Active membership banner */}
        {isActive && membership && (
          <View style={styles.activeBanner}>
            <View style={styles.activeBannerLeft}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.success}
              />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.activeBannerTitle}>
                  {membership.plan === "unlimited"
                    ? "Unlimited"
                    : "2× per Week"}{" "}
                  ·{" "}
                  {membership.billingPeriod === "monthly"
                    ? "Monthly"
                    : "Annual"}
                </Text>
                <Text style={styles.activeBannerSub}>
                  Renews{" "}
                  {new Date(membership.currentPeriodEnd).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.manageBtn}
              onPress={handleManage}
              disabled={loading}
            >
              <Text style={styles.manageBtnText}>Manage</Text>
            </Pressable>
          </View>
        )}

        {/* Plan selector */}
        <Text style={styles.sectionLabel}>Choose a plan</Text>
        {PLANS.map((plan) => {
          const active = selectedPlan === plan.id;
          return (
            <Pressable
              key={plan.id}
              style={[styles.planCard, active && { borderColor: primary, backgroundColor: Colors.surfaceElevated }]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              <View style={styles.planCardRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.planLabel, active && { color: primary }]}
                  >
                    {plan.label}
                  </Text>
                  <Text style={styles.planTagline}>{plan.tagline}</Text>
                </View>
                <Text
                  style={[styles.planPrice, active && { color: primary }]}
                >
                  {PRICES[plan.id][selectedPeriod]}
                </Text>
                <View style={[styles.radio, active && { borderColor: primary }]}>
                  {active && <View style={[styles.radioDot, { backgroundColor: primary }]} />}
                </View>
              </View>
              <View style={styles.featureList}>
                {plan.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={active ? primary : Colors.textSecondary}
                    />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}

        {/* Billing period selector */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          Billing period
        </Text>
        <View style={styles.periodRow}>
          {PERIODS.map((p) => {
            const active = selectedPeriod === p.id;
            return (
              <Pressable
                key={p.id}
                style={[styles.periodBtn, active && { borderColor: primary, backgroundColor: Colors.surfaceElevated }]}
                onPress={() => setSelectedPeriod(p.id)}
              >
                <Text
                  style={[
                    styles.periodLabel,
                    active && styles.periodLabelActive,
                  ]}
                >
                  {p.label}
                </Text>
                {p.badge && (
                  <View style={[styles.badgeContainer, { backgroundColor: primary + "33" }]}>
                    <Text style={[styles.badgeText, { color: primary }]}>{p.badge}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Subscribe CTA */}
        {!isActive && (
          <Pressable
            style={[styles.subscribeBtn, { backgroundColor: primary }, loading && { opacity: 0.6 }]}
            onPress={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.subscribeBtnText}>
                Subscribe · {PRICES[selectedPlan][selectedPeriod]}
              </Text>
            )}
          </Pressable>
        )}

        {isActive && (
          <Text style={styles.changeNote}>
            To change your plan, tap Manage above.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scroll: { padding: 20, paddingBottom: 48 },

  activeBanner: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.success + "55",
    marginBottom: 28,
  },
  activeBannerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  activeBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  activeBannerSub: { fontSize: 12, color: Colors.textSecondary },
  manageBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  manageBtnText: { color: Colors.text, fontWeight: "600", fontSize: 13 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },

  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  planCardActive: {},
  planCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  planLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  planLabelActive: {},
  planTagline: { fontSize: 13, color: Colors.textSecondary },
  planPrice: { fontSize: 15, fontWeight: "700", color: Colors.textSecondary },
  planPriceActive: {},
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {},
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  featureList: { gap: 6 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 13, color: Colors.textSecondary },

  periodRow: { flexDirection: "row", gap: 10 },
  periodBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
  },
  periodBtnActive: {},
  periodLabel: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  periodLabelActive: { color: Colors.text },
  badgeContainer: {
    marginTop: 4,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },

  subscribeBtn: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 28,
  },
  subscribeBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  changeNote: {
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 28,
  },
});
