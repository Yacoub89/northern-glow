import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
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
import { useGymColors } from "../../constants/GymConfig";
import { DEFAULT_WOD_PROGRAM, WOD_PROGRAMS, type WodProgram } from "../../constants/wod";
import { getTodayDate } from "../../utils/date";
import { wodStyles as s } from "./styles";
import { formatNavDateShort, SCALE_OPTIONS, parseMovement, type Scale } from "./types";
import { useAppDialog } from "../AppDialog";
import { WodScheduleStrip } from "./WodScheduleStrip";

export function AthleteLogTab() {
  const { primary } = useGymColors();
  const dialog = useAppDialog();
  const today = getTodayDate();

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedProgram, setSelectedProgram] = useState<WodProgram>(DEFAULT_WOD_PROGRAM);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedPartLabel, setSelectedPartLabel] = useState("");

  const wod = useQuery(api.wods.getByDate, { date: selectedDate, program: selectedProgram });
  const wodSchedule = useQuery(api.wods.getSchedule, {
    startDate: today,
    days: 7,
    program: selectedProgram,
  });
  const announcements = useQuery(api.announcements.listActive, { date: selectedDate });
  const todayBooking = useQuery(api.bookings.getMyUpcomingBooking, { date: selectedDate });
  const myResult = useQuery(
    api.results.getByWod,
    showLogModal && wod?._id ? { wodId: wod._id, ...(selectedPartLabel ? { partLabel: selectedPartLabel } : {}) } : "skip"
  );
  const logResult = useMutation(api.results.log);

  const [score, setScore] = useState("");
  const [scale, setScale] = useState<Scale>("Rx");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedPartLabel("");
    setShowLogModal(false);
    setScore("");
    setScale("Rx");
    setNotes("");
  }, [wod?._id]);

  const selectedPart = useMemo(
    () => wod?.parts?.find((part) => part.label === selectedPartLabel) ?? null,
    [selectedPartLabel, wod?.parts]
  );
  const scoreType = selectedPart?.type ?? wod?.type;

  const isLoading =
    wod === undefined ||
    announcements === undefined ||
    todayBooking === undefined;

  const openLogModal = (partLabel = "") => {
    setSelectedPartLabel(partLabel);
    setScore("");
    setScale("Rx");
    setNotes("");
    setShowLogModal(true);
  };

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
        ...(selectedPartLabel ? { partLabel: selectedPartLabel } : {}),
        classId: todayBooking?.slot?._id,
        score: score.trim(),
        rx: scale === "Rx" || scale === "Rx+",
        notes: notes.trim() || undefined,
      });
      dialog.alert("Saved!", selectedPartLabel ? `Your Part ${selectedPartLabel} result has been logged.` : "Your result has been logged.");
      setScore("");
      setNotes("");
      setShowLogModal(false);
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

          {announcements.length > 0 ? (
            <>
              <Text style={s.sectionLabel}>ANNOUNCEMENTS</Text>
              <View style={s.announcementList}>
                {announcements.map((item) => (
                  <View key={item._id} style={s.announcementCard}>
                    <View style={s.announcementIcon}>
                      <Ionicons name="megaphone-outline" size={18} color={primary} />
                    </View>
                    <View style={s.announcementTextWrap}>
                      <Text style={s.announcementTitle}>{item.title}</Text>
                      <Text style={s.announcementBody}>{item.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {wod ? (
            <>
              <Text style={s.sectionLabel}>
                {selectedDate === today ? "TODAY'S WOD" : formatNavDateShort(selectedDate)}
              </Text>
              <View style={s.readCard}>
                {(!wod.parts || wod.parts.length === 0) && wod.description ? (
                  <Text style={s.readPartDetail}>{wod.description}</Text>
                ) : null}
                {(!wod.parts || wod.parts.length === 0) && wod.movements.length > 0 ? (
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
                {(!wod.parts || wod.parts.length === 0) ? (
                  <Pressable
                    style={s.partLogButton}
                    onPress={() => openLogModal()}
                  >
                    <Ionicons name="trophy-outline" size={18} color={Colors.text} />
                    <Text style={s.partLogButtonText}>Log result</Text>
                  </Pressable>
                ) : null}
              </View>
              {wod.parts && wod.parts.length > 0 ? (
                <View style={s.athletePartList}>
                  {wod.parts.map((part, i) => (
                    <View key={`${part.label}-${i}`} style={s.athletePartCard}>
                      <View style={s.athletePartCardTop}>
                        <View style={s.athletePartTitleWrap}>
                          <Text style={s.athletePartTitle}>{part.name}</Text>
                          <Text style={[s.athletePartMeta, { color: primary }]}>
                            PART {part.label}
                            {part.type ? ` · ${part.type}` : ""}
                          </Text>
                        </View>
                        <Pressable
                          style={s.partLogButton}
                          onPress={() => openLogModal(part.label)}
                        >
                          <Ionicons name="trophy-outline" size={18} color={Colors.text} />
                          <Text style={s.partLogButtonText}>Log result</Text>
                        </Pressable>
                      </View>
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
                </View>
              ) : null}
                {wod.scalingNotes ? (
                  <View style={[s.scalingNotesBlock, s.scalingNotesCard]}>
                    <Text style={[s.readPartLabel, { color: primary }]}>SCALING</Text>
                    <Text style={s.readPartDetail}>{wod.scalingNotes}</Text>
                  </View>
                ) : null}
            </>
          ) : (
            <View style={s.noWodBanner}>
              <Text style={s.noWodText}>
                No WOD posted for {selectedDate === today ? "today" : formatNavDateShort(selectedDate)}
              </Text>
            </View>
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
      <Modal transparent animationType="slide" visible={showLogModal}>
        <Pressable style={s.modalOverlay} onPress={() => setShowLogModal(false)}>
          <Pressable style={s.accessModalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.accessModalTitle}>
              {selectedPart ? `PART ${selectedPart.label}: ${selectedPart.name}` : "LOG RESULT"}
            </Text>
            {myResult === undefined ? (
              <ActivityIndicator color={primary} size="large" />
            ) : (
              <>
                <Text style={s.formFieldLabel}>
                  Score
                  {scoreType === "AMRAP"
                    ? " (rounds + reps)"
                    : scoreType === "ForTime"
                    ? " (time)"
                    : ""}
                </Text>
                <TextInput
                  style={s.formInput}
                  placeholder={
                    scoreType === "AMRAP"
                      ? "e.g. 14 + 7"
                      : scoreType === "ForTime"
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
                      <Text style={[s.scaleBtnText, scale === opt && s.scaleBtnTextActive]}>
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
                <Pressable
                  style={[s.modalSaveBtn, { backgroundColor: primary }, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={s.modalSaveBtnText}>
                    {saving ? "Saving..." : myResult ? "Update Result" : "Save Result"}
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
