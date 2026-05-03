import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  ActivityIndicator,
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
import { useAppDialog } from "../AppDialog";

export function AthleteLogTab() {
  const gym = useGymConfig();
  const { primary } = useGymColors();
  const dialog = useAppDialog();
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
  const [fullWodExpanded, setFullWodExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const isLoading =
    wod === undefined ||
    todayBooking === undefined ||
    (wod !== null && myResult === undefined);

  const handleSave = async () => {
    if (!wod) return;
    if (!score.trim()) {
      dialog.alert("Missing Score", "Please enter your score before saving.");
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
      dialog.alert("Saved!", "Your result has been logged.");
      setScore("");
      setNotes("");
    } catch (e: any) {
      dialog.alert("Error", e.message);
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
                {wod.parts && wod.parts.length > 0 ? (
                  <>
                    {(fullWodExpanded ? wod.parts : wod.parts.slice(0, 1)).map((part, i) => (
                      <View key={`${part.label}-${i}`} style={s.readPartBlock}>
                        <Text style={[s.readPartLabel, { color: primary }]}>
                          PART {part.label}: {part.name}
                          {part.type ? ` · ${part.type}` : ""}
                        </Text>
                        {part.movement ? (
                          <Text style={s.readPartDetail}>{part.movement}</Text>
                        ) : null}
                        {(part.sets || part.reps || part.percentMax || part.timeCap) ? (
                          <Text style={s.readPartSubtle}>
                            {[
                              part.sets ? `${part.sets} sets` : null,
                              part.reps ? `${part.reps} reps` : null,
                              part.percentMax ? `${part.percentMax}%` : null,
                              part.timeCap ? `Cap ${part.timeCap}` : null,
                            ].filter(Boolean).join(" · ")}
                          </Text>
                        ) : null}
                        {part.description
                          ? part.description
                              .split("\n")
                              .filter(Boolean)
                              .map((line, j) => {
                                const { num, label } = parseMovement(line);
                                return (
                                  <View key={j} style={s.movementRow}>
                                    <Text style={[s.movementNum, { color: primary }]}>
                                      {num ?? "·"}
                                    </Text>
                                    <Text style={s.movementLabel}>{label}</Text>
                                  </View>
                                );
                              })
                          : null}
                      </View>
                    ))}
                    {wod.parts.length > 1 ? (
                      <Pressable
                        style={[s.expandWodBtn, { borderColor: primary }]}
                        onPress={() => setFullWodExpanded((v) => !v)}
                      >
                        <Text style={[s.expandWodBtnText, { color: primary }]}>
                          {fullWodExpanded ? "Show less" : `Show full WOD (${wod.parts.length} parts)`}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : wod.movements.length > 0 ? (
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
                ) : null}
                {wod.scalingNotes ? (
                  <View style={s.scalingNotesBlock}>
                    <Text style={[s.readPartLabel, { color: primary }]}>SCALING</Text>
                    <Text style={s.readPartDetail}>{wod.scalingNotes}</Text>
                  </View>
                ) : null}
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
