import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { Fonts } from "../../constants/Typography";
import { useGymColors, useGymConfig } from "../../constants/GymConfig";
import { getTodayDate } from "../../utils/date";
import type { WodType } from "../../constants/wod";
import { wodStyles as s } from "./styles";
import { PartCard } from "./PartCard";
import { WodScheduleStrip } from "./WodScheduleStrip";
import {
  ACCESS_LEVEL_LABELS,
  PART_LABELS,
  defaultPart,
  formatNavDateShort,
  parseMovement,
  type AccessLevel,
  type PartName,
  type WodPart,
} from "./types";

export function CoachWodTab() {
  const gym = useGymConfig();
  const { primary } = useGymColors();
  const today = getTodayDate();

  const [selectedDate, setSelectedDate] = useState(today);

  const wod = useQuery(api.wods.getByDate, { date: selectedDate });
  const wodSchedule = useQuery(api.wods.getSchedule, { startDate: today, days: 7 });
  const createWod = useMutation(api.wods.create);
  const updateWod = useMutation(api.wods.update);

  const [date, setDate] = useState(selectedDate);
  const [pickerDate, setPickerDate] = useState(() => {
    const [y, mo, d] = today.split("-").map(Number);
    return new Date(y, mo - 1, d);
  });

  // Sync form date when selected day changes
  useEffect(() => {
    setDate(selectedDate);
    const [y, mo, d] = selectedDate.split("-").map(Number);
    setPickerDate(new Date(y, mo - 1, d));
    setEditMode(false);
  }, [selectedDate]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [title, setTitle] = useState("");
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("PUBLIC_CLASS");
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [parts, setParts] = useState<WodPart[]>([defaultPart(0), defaultPart(1)]);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (wod) {
      setTitle(wod.title);
      setAccessLevel((wod.accessLevel as AccessLevel) ?? "PUBLIC_CLASS");
      if (wod.parts && wod.parts.length > 0) {
        setParts(
          wod.parts.map((p, i) => ({
            label: p.label ?? PART_LABELS[i] ?? String(i + 1),
            name: (p.name as PartName) ?? "METCON",
            type: (p.type as WodType) ?? "AMRAP",
            movement: p.movement ?? "",
            sets: p.sets ?? "",
            reps: p.reps ?? "",
            percentMax: p.percentMax ?? "",
            coachNotes: p.coachNotes ?? "",
            timeCap: p.timeCap ?? "",
            description: p.description ?? "",
          }))
        );
      }
    } else if (wod === null) {
      setTitle("");
      setAccessLevel("PUBLIC_CLASS");
      setParts([defaultPart(0), defaultPart(1)]);
    }
  }, [wod?._id]);

  const addPart = () => {
    if (parts.length >= 5) return;
    setParts((prev) => [...prev, defaultPart(prev.length)]);
  };

  const removePart = (index: number) => {
    setParts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((p, i) => ({ ...p, label: PART_LABELS[i] ?? String(i + 1) }));
    });
  };

  const updatePart = (index: number, updated: WodPart) => {
    setParts((prev) => prev.map((p, i) => (i === index ? updated : p)));
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "WOD title is required.");
      return;
    }

    const metconPart = parts.find((p) => p.name === "METCON");
    const primaryType: WodType = metconPart?.type ?? "Strength";
    const primaryDescription = metconPart?.timeCap
      ? `${metconPart.type} · ${metconPart.timeCap}`
      : metconPart?.type ?? "";
    const movements = parts.flatMap((p) =>
      p.description
        ? p.description
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
        : []
    );

    const wodPayload = {
      date,
      title: title.trim(),
      description: primaryDescription,
      type: primaryType,
      movements,
      accessLevel,
      parts: parts.map((p) => ({
        label: p.label,
        name: p.name,
        type: p.type || undefined,
        movement: p.movement || undefined,
        sets: p.sets || undefined,
        reps: p.reps || undefined,
        percentMax: p.percentMax || undefined,
        coachNotes: p.coachNotes || undefined,
        timeCap: p.timeCap || undefined,
        description: p.description || undefined,
      })),
    };

    setSaving(true);
    try {
      if (wod) {
        await updateWod({ id: wod._id, ...wodPayload });
      } else {
        await createWod(wodPayload);
      }
      setEditMode(false);
      Alert.alert(wod ? "Updated!" : "Published!", wod ? "WOD updated." : "WOD is live.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (editMode) {
      setEditMode(false);
    } else {
      setTitle("");
      setAccessLevel("PUBLIC_CLASS");
      setParts([defaultPart(0), defaultPart(1)]);
    }
  };

  if (wod === undefined) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  // ── Read view (WOD already posted, not editing) ──
  if (wod && !editMode) {
    return (
      <SafeAreaView style={s.container} edges={[]}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
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
                {selectedDate === today ? "TODAY'S WOD" : formatNavDateShort(selectedDate).toUpperCase()}
              </Text>
            </View>
            <Pressable
              style={[s.editBtn, { borderColor: primary }]}
              onPress={() => setEditMode(true)}
            >
              <Ionicons name="create-outline" size={14} color={primary} />
              <Text style={[s.editBtnText, { color: primary }]}>EDIT</Text>
            </Pressable>
          </View>

          <View style={s.readCard}>
            <Text style={[s.readWodMeta, { color: primary }]}>
              {wod.type.toUpperCase()}
              {wod.description ? ` · ${wod.description.toUpperCase()}` : ""}
            </Text>
            <Text style={s.readWodTitle}>{wod.title}</Text>
            {wod.parts && wod.parts.length > 0
              ? wod.parts.map((p, i) => (
                  <View key={i} style={s.readPartBlock}>
                    <Text style={[s.readPartLabel, { color: primary }]}>
                      PART {p.label}: {p.name}
                    </Text>
                    {p.movement ? (
                      <Text style={s.readPartDetail}>{p.movement}</Text>
                    ) : null}
                    {p.description
                      ? p.description
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
                ))
              : wod.movements.map((m, i) => {
                  const { num, label } = parseMovement(m);
                  return (
                    <View key={i} style={s.movementRow}>
                      <Text style={[s.movementNum, { color: primary }]}>{num ?? "·"}</Text>
                      <Text style={s.movementLabel}>{label}</Text>
                    </View>
                  );
                })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Create / Edit form ──
  return (
    <SafeAreaView style={s.container} edges={[]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={s.pageHeader}>
          <View>
            <Text style={s.pageTitle}>{editMode ? "EDIT WOD" : "CREATE WOD"}</Text>
            <View style={[s.pageTitleUnderline, { backgroundColor: primary }]} />
          </View>
          <Text style={[s.coachBadge, { color: primary }]}>COACH INTERFACE</Text>
        </View>

        <ScrollView
          contentContainerStyle={s.formScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <WodScheduleStrip
            schedule={wodSchedule ?? []}
            selectedDate={selectedDate}
            today={today}
            primary={primary}
            onSelect={setSelectedDate}
          />
          <View style={s.formFieldGroup}>
            <Text style={s.formFieldLabel}>WOD TITLE</Text>
            <TextInput
              style={s.formInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., FROSTBITE: AMRAP"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={s.twoFieldRow}>
            <View style={[s.formFieldGroup, { flex: 1 }]}>
              <Text style={s.formFieldLabel}>SCHEDULE DATE</Text>
              {Platform.OS === "web" ? (
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    setDate(val);
                    const [y, mo, d] = val.split("-").map(Number);
                    setPickerDate(new Date(y, mo - 1, d));
                  }}
                  style={{
                    backgroundColor: Colors.surfaceContainerLow,
                    border: `1px solid ${Colors.outlineVariant}`,
                    borderRadius: 10,
                    padding: 12,
                    color: Colors.text,
                    fontSize: 13,
                    width: "100%",
                    boxSizing: "border-box",
                    colorScheme: "dark",
                    fontFamily: "inherit",
                  } as any}
                />
              ) : (
                <Pressable
                  style={s.formInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: Colors.text, fontFamily: Fonts.bodyMed, fontSize: 13 }}>
                    {date}
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={[s.formFieldGroup, { flex: 1 }]}>
              <Text style={s.formFieldLabel}>ACCESS LEVEL</Text>
              <Pressable
                style={[s.formInput, s.selectRow]}
                onPress={() => setShowAccessModal(true)}
              >
                <Text style={{ color: Colors.text, fontFamily: Fonts.bodyMed, fontSize: 13, flex: 1 }}>
                  {ACCESS_LEVEL_LABELS[accessLevel]}
                </Text>
                <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {parts.map((part, i) => (
            <PartCard
              key={i}
              part={part}
              index={i}
              total={parts.length}
              primary={primary}
              onChange={(updated) => updatePart(i, updated)}
              onRemove={() => removePart(i)}
            />
          ))}

          {parts.length < 5 && (
            <Pressable style={s.addPartBtn} onPress={addPart}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.textSecondary} />
              <Text style={s.addPartBtnText}>ADD PART</Text>
            </Pressable>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={s.bottomBar}>
          <Pressable style={s.discardBtn} onPress={handleDiscard}>
            <Text style={s.discardBtnText}>DISCARD</Text>
          </Pressable>
          <Pressable
            style={[s.publishBtnWrapper, { backgroundColor: primary }, saving && { opacity: 0.6 }]}
            onPress={handlePublish}
            disabled={saving}
          >
            <Text style={s.publishBtnText}>
              {saving ? "SAVING…" : wod ? "UPDATE WOD" : "PUBLISH WOD"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* iOS date picker modal */}
      {showDatePicker && Platform.OS === "ios" && (
        <Modal transparent animationType="slide" visible={showDatePicker}>
          <Pressable style={s.modalOverlay} onPress={() => setShowDatePicker(false)}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="inline"
                themeVariant="dark"
                accentColor={primary}
                style={{ width: "100%" }}
                onChange={(_, selected) => {
                  if (selected) {
                    setPickerDate(selected);
                    const y = selected.getFullYear();
                    const m = String(selected.getMonth() + 1).padStart(2, "0");
                    const d = String(selected.getDate()).padStart(2, "0");
                    setDate(`${y}-${m}-${d}`);
                  }
                }}
              />
              <Pressable
                style={[s.modalDoneBtn, { backgroundColor: primary }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={s.modalDoneBtnText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="calendar"
          onChange={(_, selected) => {
            setShowDatePicker(false);
            if (selected) {
              setPickerDate(selected);
              const y = selected.getFullYear();
              const m = String(selected.getMonth() + 1).padStart(2, "0");
              const d = String(selected.getDate()).padStart(2, "0");
              setDate(`${y}-${m}-${d}`);
            }
          }}
        />
      )}

      <Modal transparent animationType="fade" visible={showAccessModal}>
        <Pressable style={s.modalOverlay} onPress={() => setShowAccessModal(false)}>
          <View style={s.accessModalSheet}>
            <Text style={s.accessModalTitle}>ACCESS LEVEL</Text>
            {(Object.keys(ACCESS_LEVEL_LABELS) as AccessLevel[]).map((key) => (
              <Pressable
                key={key}
                style={[
                  s.accessOption,
                  accessLevel === key && { backgroundColor: primary + "18" },
                ]}
                onPress={() => {
                  setAccessLevel(key);
                  setShowAccessModal(false);
                }}
              >
                <Text
                  style={[
                    s.accessOptionText,
                    accessLevel === key && { color: primary, fontFamily: Fonts.bodyBold },
                  ]}
                >
                  {ACCESS_LEVEL_LABELS[key]}
                </Text>
                {accessLevel === key && (
                  <Ionicons name="checkmark" size={16} color={primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
