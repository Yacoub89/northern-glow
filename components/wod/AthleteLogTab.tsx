import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { useGymColors, useGymConfig } from "../../constants/GymConfig";
import { getTodayDate } from "../../utils/date";
import { wodStyles as s } from "./styles";
import { SCALE_OPTIONS, parseMovement, type Scale } from "./types";

export function AthleteLogTab() {
  const gym = useGymConfig();
  const { primary } = useGymColors();
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

  const isLoading =
    wod === undefined ||
    todayBooking === undefined ||
    (wod !== null && myResult === undefined);

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
      <View style={s.centered}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={[]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.readHeader}>
            <View>
              <Text style={[s.readGymName, { color: primary }]}>{gym.name.toUpperCase()}</Text>
              <Text style={s.readTitle}>Log Result</Text>
            </View>
          </View>

          {wod ? (
            <>
              <Text style={s.sectionLabel}>TODAY'S WOD</Text>
              <View style={s.readCard}>
                <Text style={s.readWodTitle}>{wod.title}</Text>
                <Text style={[s.readWodMeta, { color: primary }]}>
                  {wod.type.toUpperCase()}
                  {wod.description ? ` · ${wod.description.toUpperCase()}` : ""}
                </Text>
                {wod.movements.length > 0 && (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {wod.movements.map((m, i) => {
                      const { num, label } = parseMovement(m);
                      return (
                        <View key={i} style={s.movementRow}>
                          <Text style={[s.movementNum, { color: primary }]}>{num ?? "·"}</Text>
                          <Text style={s.movementLabel}>{label}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          ) : (
            <View style={s.noWodBanner}>
              <Text style={s.noWodText}>No WOD posted for today</Text>
            </View>
          )}

          {wod && (
            <>
              <Text style={[s.sectionLabel, { marginTop: 28 }]}>LOG YOUR SCORE</Text>
              <View style={s.formSection}>
                <Text style={s.formFieldLabel}>
                  Score
                  {wod.type === "AMRAP"
                    ? " (rounds + reps)"
                    : wod.type === "ForTime"
                    ? " (time)"
                    : ""}
                </Text>
                <TextInput
                  style={s.formInput}
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

                <Text style={[s.formFieldLabel, { marginTop: 16 }]}>Scale</Text>
                <View style={s.scaleRow}>
                  {SCALE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt}
                      style={[
                        s.scaleBtn,
                        scale === opt && [
                          s.scaleBtnActive,
                          { backgroundColor: primary, borderColor: primary },
                        ],
                      ]}
                      onPress={() => setScale(opt)}
                    >
                      <Text
                        style={[s.scaleBtnText, scale === opt && s.scaleBtnTextActive]}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[s.formFieldLabel, { marginTop: 16 }]}>Notes</Text>
                <TextInput
                  style={[s.formInput, { minHeight: 88 }]}
                  placeholder="Felt strong on pull-ups..."
                  placeholderTextColor={Colors.textSecondary}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <Pressable
                style={[s.saveBtn, { backgroundColor: primary }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={s.saveBtnText}>
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
