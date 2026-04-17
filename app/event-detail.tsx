import { useAction, useMutation, useQuery } from "convex/react";
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
import { Id } from "../convex/_generated/dataModel";
import { Colors } from "../constants/Colors";
import { useGymColors } from "../constants/GymConfig";
import { formatTime } from "../utils/date";

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default function EventDetailScreen() {
  const { primary } = useGymColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    event_id?: string;
    status?: string;
    session_id?: string;
  }>();

  const { event_id, status, session_id } = params;
  const eventId = event_id as Id<"events"> | undefined;

  const event = useQuery(
    api.events.get,
    eventId ? { eventId } : "skip"
  );
  const myRegistration = useQuery(
    api.events.getMyRegistration,
    eventId ? { eventId } : "skip"
  );

  const registerFree = useMutation(api.events.registerFree);
  const cancelRegistration = useMutation(api.events.cancelRegistration);
  const createEventCheckoutSession = useAction(api.stripe.createEventCheckoutSession);
  const syncEventFromSession = useAction(api.stripe.syncEventFromSession);

  const [loading, setLoading] = useState(false);

  // Handle deep-link return from Stripe
  useEffect(() => {
    if (!status || !eventId) return;
    if (status === "success") {
      const sessionId = typeof session_id === "string" ? session_id : "";
      if (sessionId) {
        syncEventFromSession({ sessionId })
          .then(() => {
            Alert.alert("Registered!", "You're registered for this event.");
          })
          .catch(() => {
            Alert.alert("Registered!", "You're registered for this event.");
          });
      } else {
        Alert.alert("Registered!", "You're registered for this event.");
      }
    } else if (status === "cancelled") {
      Alert.alert("Cancelled", "Checkout was cancelled. You were not charged.");
    }
  }, [status, eventId]);

  const handleRegisterFree = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      await registerFree({ eventId });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPaid = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const returnUrl = ExpoLinking.createURL("event-detail");
      const url = await createEventCheckoutSession({ eventId, returnUrl });
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!eventId) return;
    Alert.alert("Cancel Registration", "Are you sure you want to cancel?", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel Registration",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelRegistration({ eventId });
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  if (!eventId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Event not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (event === undefined || myRegistration === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (event === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Event not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFree = event.priceCents === 0;
  const isRegistered =
    myRegistration !== null &&
    myRegistration?.status === "registered" &&
    myRegistration?.paymentStatus !== "pending";
  const isPendingPayment =
    myRegistration?.status === "registered" &&
    myRegistration?.paymentStatus === "pending";
  const isFull =
    event.capacity !== undefined && event.registeredCount >= event.capacity;
  const isCancelled = event.status === "cancelled";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Event</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Price badge */}
        <View style={styles.priceBadgeRow}>
          <View
            style={[
              styles.priceBadge,
              isFree
                ? { backgroundColor: Colors.success + "22" }
                : { backgroundColor: primary + "22" },
            ]}
          >
            <Text
              style={[
                styles.priceBadgeText,
                { color: isFree ? Colors.success : primary },
              ]}
            >
              {formatPrice(event.priceCents)}
            </Text>
          </View>
          {isCancelled && (
            <View style={styles.cancelledBadge}>
              <Text style={styles.cancelledBadgeText}>Cancelled</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{event.title}</Text>

        {/* Date & time */}
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.metaText}>
            {formatDate(event.date)}
            {event.startTime ? `  ·  ${formatTime(event.startTime)}` : ""}
            {event.endTime ? ` – ${formatTime(event.endTime)}` : ""}
          </Text>
        </View>

        {/* Location */}
        {event.location ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{event.location}</Text>
          </View>
        ) : null}

        {/* Capacity */}
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.metaText}>
            {event.capacity !== undefined
              ? `${event.registeredCount} / ${event.capacity} registered`
              : `${event.registeredCount} registered`}
            {isFull && !isRegistered ? (
              <Text style={{ color: Colors.error }}> · Full</Text>
            ) : null}
          </Text>
        </View>

        {/* Description */}
        {event.description ? (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        ) : null}

        {/* Registration status */}
        {isRegistered && (
          <View style={styles.registeredBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.registeredText}>
              You're registered for this event
            </Text>
          </View>
        )}

        {isPendingPayment && (
          <View style={[styles.registeredBanner, { borderColor: Colors.warning + "55" }]}>
            <Ionicons name="time-outline" size={20} color={Colors.warning} />
            <Text style={[styles.registeredText, { color: Colors.warning }]}>
              Payment pending — complete checkout to confirm
            </Text>
          </View>
        )}

        {/* CTA */}
        {!isCancelled && (
          <View style={styles.ctaRow}>
            {isRegistered ? (
              <Pressable style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelBtnText}>Cancel Registration</Text>
              </Pressable>
            ) : isPendingPayment ? (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: primary }, loading && styles.btnDisabled]}
                onPress={handleRegisterPaid}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: Colors.onPrimary }]}>
                    Complete Payment
                  </Text>
                )}
              </Pressable>
            ) : isFull ? (
              <View style={styles.fullBtn}>
                <Text style={styles.fullBtnText}>Event Full</Text>
              </View>
            ) : isFree ? (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: primary }, loading && styles.btnDisabled]}
                onPress={handleRegisterFree}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: Colors.onPrimary }]}>
                    Register — Free
                  </Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: primary }, loading && styles.btnDisabled]}
                onPress={handleRegisterPaid}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: Colors.onPrimary }]}>
                    Register · {formatPrice(event.priceCents)}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: Colors.textSecondary, fontSize: 15 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },

  scroll: { padding: 20, paddingBottom: 48 },

  priceBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  priceBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  cancelledBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.error + "22",
  },
  cancelledBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.error,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 16,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },

  descriptionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 12,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },

  registeredBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.success + "55",
    marginTop: 20,
  },
  registeredText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.success,
    flex: 1,
  },

  ctaRow: { marginTop: 28 },

  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryBtnText: {
    fontWeight: "700",
    fontSize: 17,
  },
  btnDisabled: { opacity: 0.6 },

  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    color: Colors.error,
    fontWeight: "600",
    fontSize: 15,
  },

  fullBtn: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fullBtnText: {
    color: Colors.textMuted,
    fontWeight: "700",
    fontSize: 17,
  },
});
