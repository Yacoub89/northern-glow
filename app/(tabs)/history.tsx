import { useQuery } from "convex/react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { useGymColors } from "../../constants/GymConfig";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HistoryScreen() {
  const { primary } = useGymColors();
  const results = useQuery(api.results.getMyResults);

  if (results === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>My Results</Text>
      </View>

      {results.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Nothing logged yet</Text>
          <Text style={styles.emptyText}>Log a result after your next WOD</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => r._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.wodName} numberOfLines={1}>
                  {item.wod?.title ?? "Unknown WOD"}
                </Text>
                <Text style={styles.cardDate}>{formatDate(item.loggedAt)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.score}>{item.score}</Text>
                <View style={[styles.rxBadge, { backgroundColor: primary + "22" }, !item.rx && styles.scaledBadge]}>
                  <Text
                    style={[styles.rxText, { color: primary }, !item.rx && styles.scaledText]}
                  >
                    {item.rx ? "RX" : "Scaled"}
                  </Text>
                </View>
              </View>
              {item.notes ? (
                <Text style={styles.notes}>{item.notes}</Text>
              ) : null}
            </View>
          )}
        />
      )}
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
  titleBar: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "800", color: Colors.text },
  list: { padding: 20, paddingTop: 8, gap: 10 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  wodName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  cardDate: { fontSize: 13, color: Colors.textSecondary },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  score: { fontSize: 24, fontWeight: "800", color: Colors.text, flex: 1 },
  rxBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  scaledBadge: { backgroundColor: Colors.textMuted + "44" },
  rxText: { fontWeight: "700", fontSize: 12 },
  scaledText: { color: Colors.textSecondary },
  notes: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    fontStyle: "italic",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 6,
  },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
