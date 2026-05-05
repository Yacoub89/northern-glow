import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { useGymColors, useGymConfig } from "../../constants/GymConfig";
import { DEFAULT_WOD_PROGRAM, WOD_PROGRAMS, type WodProgram } from "../../constants/wod";
import { getTodayDate } from "../../utils/date";
import { wodStyles as s } from "./styles";
import { formatNavDateShort, SCALE_OPTIONS, parseMovement, type Scale } from "./types";
import { useAppDialog } from "../AppDialog";
import { WodScheduleStrip } from "./WodScheduleStrip";

export function AthleteLogTab() {
  const gym = useGymConfig();
  const { primary } = useGymColors();
  const dialog = useAppDialog();
  const today = getTodayDate();

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedProgram, setSelectedProgram] = useState<WodProgram>(DEFAULT_WOD_PROGRAM);
  const [showProgramModal, setShowProgramModal] = useState(false);

  const wod = useQuery(api.wods.getByDate, { date: selectedDate, program: selectedProgram });
  const wodSchedule = useQuery(api.wods.getSchedule, {
    startDate: today,
    days: 7,
    program: selectedProgram,
  });
  const todayBooking = useQuery(api.bookings.getMyUpcomingBooking, { date: selectedDate });
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

  useEffect(() => {
    setScore("");
    setNotes("");
    setFullWodExpanded(false);
  }, [wod?._id]);

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
          <Pressable style={s.programSelect} onPress={() => setShowProgramModal(true)}>
            <Ionicons name="clipboard-outline" size={24} color={Colors.text} />
            <Text style={s.programSelectText}>{selectedProgram}</Text>
            <Ionicons name="chevron-down" size={20} color={Colors.text} />
          </Pressable>

          <WodScheduleStrip
            schedule={wodSchedule ?? []}
            selectedDate={selectedDate}
            today={today}
            primary={primary}
            onSelect={setSelectedDate}
          />

          <View style={s.readHeader}>
            <View>
              <Text style={[s.readGymName, { color: primary }]}>{gym.name.toUpperCase()}</Text>
              <Text style={s.readTitle}>
                {selectedDate === today ? "Log Result" : formatNavDateShort(selectedDate)}
              </Text>
            </View>
          </View>

          {wod ? (
            <>
              <Text style={s.sectionLabel}>
                {selectedDate === today ? "TODAY'S WOD" : `${selectedProgram} WOD`}
              </Text>
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
              <Text style={s.noWodText}>
                No WOD posted for {selectedDate === today ? "today" : formatNavDateShort(selectedDate)}
              </Text>
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

      <Modal transparent animationType="slide" visible={showProgramModal}>
        <Pressable style={s.modalOverlay} onPress={() => setShowProgramModal(false)}>
          <Pressable style={s.accessModalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.accessModalTitle}>SELECT WORKOUT</Text>
            {WOD_PROGRAMS.map((program) => {
              const selected = program === selectedProgram;
              return (
                <Pressable
                  key={program}
                  style={[
                    s.accessOption,
                    selected && { backgroundColor: Colors.surfaceContainerHighest },
                  ]}
                  onPress={() => {
                    setSelectedProgram(program);
                    setShowProgramModal(false);
                  }}
                >
                  <View style={s.programOptionLeft}>
                    <Ionicons name="clipboard-outline" size={22} color={Colors.text} />
                    <Text style={s.accessOptionText}>{program}</Text>
                  </View>
                  <Ionicons
                    name={selected ? "radio-button-on" : "radio-button-off"}
                    size={28}
                    color={selected ? primary : Colors.text}
                  />
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
