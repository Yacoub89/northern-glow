import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { getTodayDate } from "../../utils/date";

const GYM_NAME = "ORLEANS CROSSFIT";

const SCALE_OPTIONS = ["Rx", "Scaled", "Rx+"] as const;
type Scale = (typeof SCALE_OPTIONS)[number];

function parseMovement(text: string): { num: string | null; label: string } {
  const match = text.match(/^(\d+(?:\+\d+)?)\s+(.+)/);
  if (match) return { num: match[1], label: match[2] };
  return { num: null, label: text };
}

export default function LogResultScreen() {
  const today = getTodayDate();

  const wod = useQuery(api.wods.getByDate, { date: today });
  const todayBooking = useQuery(api.bookings.getMyUpcomingBooking, { date: today });
  const myResult = useQuery(
    api.results.getByWod,
    wod?._id ? { wodId: wod._id } : "skip"
  );
  const logResult = useMutation(api.results.log);

  const [score, setScore] = useState("");
  const [scale, setScale] = useState<Scale>("Rx");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isLoading = wod === undefined || todayBooking === undefined || (wod !== null && myResult === undefined);

  const handleSave = async () => {
    if (!wod) return;
    if (!score.trim()) {
      Alert.alert("Missing Score", "Please enter your score before saving.");
      return;
    }
    setSaving(true);
    try {
      await logResult({
        wodId: wod._id,
        classId: todayBooking?.slot?._id,
        score: score.trim(),
        rx: scale === "Rx" || scale === "Rx+",
        notes: notes.trim() || undefined,
      });
      Alert.alert("Saved!", "Your result has been logged.");
      setScore("");
      setNotes("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.gymName}>{GYM_NAME}</Text>
            <Text style={styles.title}>Log Result</Text>
          </View>

          {/* WOD summary */}
          {wod ? (
            <>
              <Text style={styles.sectionLabel}>TODAY'S WOD</Text>
              <View style={styles.wodCard}>
                <Text style={styles.wodTitle}>{wod.title}</Text>
                <Text style={styles.wodMeta}>
                  {wod.type.toUpperCase()}
                  {wod.description ? ` · ${wod.description.toUpperCase()}` : ""}
                </Text>
                {wod.movements.length > 0 && (
                  <View style={styles.movements}>
                    {wod.movements.map((m, i) => {
                      const { num, label } = parseMovement(m);
                      return (
                        <View key={i} style={styles.movementRow}>
                          <Text style={styles.movementNum}>{num ?? "·"}</Text>
                          <Text style={styles.movementLabel}>{label}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          ) : (
            <View style={styles.noWodCard}>
              <Text style={styles.noWodText}>No WOD posted for today</Text>
            </View>
          )}

          {/* Score form */}
          {wod && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 28 }]}>LOG YOUR SCORE</Text>

              <View style={styles.formCard}>
                <Text style={styles.fieldLabel}>
                  Score{wod.type === "AMRAP" ? " (rounds + reps)" : wod.type === "ForTime" ? " (time)" : ""}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={
                    wod.type === "AMRAP"
                      ? "e.g. 14 + 7"
                      : wod.type === "ForTime"
                      ? "e.g. 15:32"
                      : "Enter your score"
                  }
                  placeholderTextColor={Colors.textSecondary}
                  value={myResult && !score ? myResult.score : score}
                  onChangeText={setScore}
                  returnKeyType="done"
                />

                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Scale</Text>
                <View style={styles.scaleRow}>
                  {SCALE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt}
                      style={[styles.scaleBtn, scale === opt && styles.scaleBtnActive]}
                      onPress={() => setScale(opt)}
                    >
                      <Text style={[styles.scaleBtnText, scale === opt && styles.scaleBtnTextActive]}>
                        {opt}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Felt strong on pull-ups..."
                  placeholderTextColor={Colors.textSecondary}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving…" : myResult ? "Update Result" : "Save Result"}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: { paddingBottom: 48 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  gymName: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginHorizontal: 20,
    marginBottom: 12,
  },

  // WOD card
  wodCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wodTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 4,
  },
  wodMeta: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  movements: { gap: 8 },
  movementRow: { flexDirection: "row", alignItems: "baseline", gap: 14 },
  movementNum: {
    width: 28,
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primary,
    textAlign: "right",
  },
  movementLabel: { fontSize: 15, color: Colors.text, fontWeight: "500", flex: 1 },

  noWodCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noWodText: { color: Colors.textSecondary, fontSize: 15 },

  // Form
  formCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 14,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notesInput: { minHeight: 88 },

  scaleRow: { flexDirection: "row", gap: 8 },
  scaleBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scaleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  scaleBtnText: { color: Colors.textSecondary, fontWeight: "700", fontSize: 14 },
  scaleBtnTextActive: { color: "#fff" },

  saveBtn: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
