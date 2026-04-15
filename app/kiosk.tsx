import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Colors } from "../constants/Colors";
import { useGymColors } from "../constants/GymConfig";

function Initials({ name, size = 56 }: { name: string; size?: number }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View style={[kioskStyles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[kioskStyles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

function CheckedInBanner({ name, onDismiss }: { name: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={kioskStyles.banner}>
      <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
      <Text style={kioskStyles.bannerName}>{name}</Text>
      <Text style={kioskStyles.bannerSub}>Checked in!</Text>
    </View>
  );
}

export default function KioskScreen() {
  const { primary } = useGymColors();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();
  const [lastCheckedIn, setLastCheckedIn] = useState<string | null>(null);

  const roster = useQuery(
    api.bookings.getClassRoster,
    classId ? { classId: classId as Id<"classes"> } : "skip"
  );

  const checkIn = useMutation(api.bookings.checkIn);

  if (!classId) return null;

  if (roster === undefined) {
    return (
      <View style={kioskStyles.centered}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  const booked = roster
    .filter((r) => r.status === "booked")
    .sort((a, b) =>
      (a.user?.name ?? "").localeCompare(b.user?.name ?? "")
    );

  const checkedInCount = booked.filter((r) => r.checkedInAt).length;

  const handleTap = async (bookingId: Id<"bookings">, name: string, alreadyIn: boolean) => {
    if (alreadyIn) return; // kiosk only checks in, not out
    try {
      await checkIn({ bookingId });
      setLastCheckedIn(name);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <SafeAreaView style={kioskStyles.container}>
      {/* Top bar */}
      <View style={kioskStyles.topBar}>
        <View>
          <Text style={kioskStyles.topTitle}>Check In</Text>
          <Text style={kioskStyles.topSub}>
            {checkedInCount} / {booked.length} checked in
          </Text>
        </View>
        <Pressable style={kioskStyles.exitBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={Colors.textSecondary} />
          <Text style={kioskStyles.exitText}>Exit Kiosk</Text>
        </Pressable>
      </View>

      {/* Success banner */}
      {lastCheckedIn && (
        <CheckedInBanner
          name={lastCheckedIn}
          onDismiss={() => setLastCheckedIn(null)}
        />
      )}

      {/* Athlete grid */}
      {booked.length === 0 ? (
        <View style={kioskStyles.emptyWrap}>
          <Text style={kioskStyles.emptyText}>No athletes booked for this class</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={kioskStyles.grid}>
          {booked.map((entry) => {
            const isIn = !!entry.checkedInAt;
            const name = entry.user?.name ?? "Unknown";
            return (
              <Pressable
                key={entry._id}
                style={[kioskStyles.athleteCard, isIn && kioskStyles.athleteCardIn]}
                onPress={() => handleTap(entry._id, name, isIn)}
              >
                <Initials name={name} />
                <Text style={[kioskStyles.athleteName, isIn && kioskStyles.athleteNameIn]} numberOfLines={2}>
                  {name}
                </Text>
                {isIn && (
                  <View style={kioskStyles.checkBadge}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Progress bar */}
      <View style={kioskStyles.progressBar}>
        <View
          style={[
            kioskStyles.progressFill,
            { width: booked.length > 0 ? `${(checkedInCount / booked.length) * 100}%` : "0%" },
          ]}
        />
      </View>
    </SafeAreaView>
  );
}

const kioskStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topTitle: { fontSize: 26, fontWeight: "800", color: Colors.text },
  topSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exitText: { color: Colors.textSecondary, fontWeight: "600", fontSize: 14 },
  banner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: Colors.success + "15",
    borderBottomWidth: 1,
    borderBottomColor: Colors.success + "30",
  },
  bannerName: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 8,
  },
  bannerSub: { fontSize: 16, color: Colors.success, marginTop: 4, fontWeight: "600" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
    justifyContent: "flex-start",
  },
  athleteCard: {
    width: "30%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    position: "relative",
  },
  athleteCardIn: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + "12",
  },
  avatar: {
    backgroundColor: Colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: { color: Colors.text, fontWeight: "800" },
  athleteName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
  },
  athleteNameIn: { color: Colors.success },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.success,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { color: Colors.textSecondary, fontSize: 16 },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surface,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
});
