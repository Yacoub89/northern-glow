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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { Fonts, FontSizes } from "../../constants/Typography";
import { useGymColors, useGymConfig } from "../../constants/GymConfig";
import { getTodayDate } from "../../utils/date";
import { WOD_TYPES, type WodType } from "../../constants/wod";

// ─── Types ────────────────────────────────────────────────────────────────────

type PartName = "STRENGTH" | "METCON" | "SKILL" | "ACCESSORY";
type AccessLevel = "PUBLIC_CLASS" | "MEMBERS_ONLY" | "ADVANCED";

interface WodPart {
  label: string;
  name: PartName;
  type: WodType;
  movement: string;
  sets: string;
  reps: string;
  percentMax: string;
  coachNotes: string;
  timeCap: string;
  description: string;
}

const PART_NAMES: PartName[] = ["STRENGTH", "METCON", "SKILL", "ACCESSORY"];
const PART_LABELS = ["A", "B", "C", "D", "E"];

const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  PUBLIC_CLASS: "PUBLIC CLASS",
  MEMBERS_ONLY: "MEMBERS ONLY",
  ADVANCED: "ADVANCED",
};

const TYPE_LABELS: Record<WodType, string> = {
  AMRAP: "AMRAP",
  ForTime: "For Time",
  EMOM: "EMOM",
  Strength: "Strength",
  Other: "Other",
};

const SCALE_OPTIONS = ["Rx", "Scaled", "Rx+"] as const;
type Scale = (typeof SCALE_OPTIONS)[number];

function parseMovement(text: string): { num: string | null; label: string } {
  const match = text.match(/^(\d+(?:\+\d+)?)\s+(.+)/);
  if (match) return { num: match[1], label: match[2] };
  return { num: null, label: text };
}

function defaultPart(index: number): WodPart {
  const name: PartName = index === 0 ? "STRENGTH" : "METCON";
  return {
    label: PART_LABELS[index] ?? String(index + 1),
    name,
    type: name === "STRENGTH" ? "Strength" : "AMRAP",
    movement: "",
    sets: "",
    reps: "",
    percentMax: "",
    coachNotes: "",
    timeCap: "",
    description: "",
  };
}

// ─── Part Card ────────────────────────────────────────────────────────────────

interface PartCardProps {
  part: WodPart;
  index: number;
  total: number;
  primary: string;
  onChange: (updated: WodPart) => void;
  onRemove: () => void;
}

function PartCard({ part, index, total, primary, onChange, onRemove }: PartCardProps) {
  const update = (key: keyof WodPart, val: string) =>
    onChange({ ...part, [key]: val });

  const isStrength = part.name === "STRENGTH" || part.name === "SKILL" || part.name === "ACCESSORY";
  const isMetcon = part.name === "METCON";

  return (
    <View style={s.partCard}>
      {/* Part header */}
      <View style={[s.partHeader, { borderLeftColor: primary }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.partTitle, { color: primary }]}>
            PART {part.label}: {part.name}
          </Text>
        </View>
        <View style={s.partHeaderRight}>
          {total > 1 && (
            <Pressable onPress={onRemove} style={s.partRemoveBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={14} color={Colors.textSecondary} />
            </Pressable>
          )}
          <Text style={s.partCounter}>
            {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </Text>
        </View>
      </View>

      {/* Part name selector (chips) */}
      <View style={s.partNameRow}>
        {PART_NAMES.map((n) => (
          <Pressable
            key={n}
            style={[
              s.partNameChip,
              part.name === n && { borderColor: primary, backgroundColor: primary + "18" },
            ]}
            onPress={() =>
              onChange({
                ...part,
                name: n,
                type: n === "METCON" ? "AMRAP" : "Strength",
              })
            }
          >
            <Text
              style={[
                s.partNameChipText,
                part.name === n && { color: primary, fontFamily: Fonts.bodyBold },
              ]}
            >
              {n}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Strength / Skill / Accessory fields */}
      {isStrength && (
        <>
          <View style={s.partFieldGroup}>
            <Text style={s.partFieldLabel}>MOVEMENT / COMPLEX</Text>
            <TextInput
              style={s.partInput}
              value={part.movement}
              onChangeText={(v) => update("movement", v)}
              placeholder="e.g., Back Squat"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={s.threeColRow}>
            <View style={s.threeColItem}>
              <Text style={s.partFieldLabel}>SETS</Text>
              <TextInput
                style={s.partInput}
                value={part.sets}
                onChangeText={(v) => update("sets", v)}
                placeholder="5"
                placeholderTextColor={Colors.textMuted}
                keyboardType="default"
              />
            </View>
            <View style={s.threeColItem}>
              <Text style={s.partFieldLabel}>REPS</Text>
              <TextInput
                style={s.partInput}
                value={part.reps}
                onChangeText={(v) => update("reps", v)}
                placeholder="3-3-2-1"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={s.threeColItem}>
              <Text style={s.partFieldLabel}>% MAX</Text>
              <TextInput
                style={s.partInput}
                value={part.percentMax}
                onChangeText={(v) => update("percentMax", v)}
                placeholder="75-85%"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={s.partFieldGroup}>
            <Text style={s.partFieldLabel}>COACH NOTES</Text>
            <TextInput
              style={[s.partInput, s.partMultiline]}
              value={part.coachNotes}
              onChangeText={(v) => update("coachNotes", v)}
              placeholder="Focus on explosive drive from the bottom..."
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>
        </>
      )}

      {/* MetCon fields */}
      {isMetcon && (
        <>
          <View style={s.partFieldGroup}>
            <Text style={s.partFieldLabel}>WORKOUT TYPE</Text>
            <View style={s.typeChipsRow}>
              {(["AMRAP", "ForTime", "EMOM", "Other"] as WodType[]).map((t) => (
                <Pressable
                  key={t}
                  style={[
                    s.typeChip,
                    part.type === t && { borderColor: primary, backgroundColor: primary + "18" },
                  ]}
                  onPress={() => update("type", t)}
                >
                  <Text
                    style={[
                      s.typeChipText,
                      part.type === t && { color: primary, fontFamily: Fonts.bodyBold },
                    ]}
                  >
                    {TYPE_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={s.partFieldGroup}>
            <Text style={s.partFieldLabel}>TIME CAP</Text>
            <TextInput
              style={s.partInput}
              value={part.timeCap}
              onChangeText={(v) => update("timeCap", v)}
              placeholder="15:00"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={s.partFieldGroup}>
            <Text style={s.partFieldLabel}>WORKOUT DESCRIPTION</Text>
            <TextInput
              style={[s.partInput, s.partDescMultiline]}
              value={part.description}
              onChangeText={(v) => update("description", v)}
              placeholder={"21-15-9\nThrusters (95/65)\nPull-ups\nBurpees over bar"}
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Auto scoring notice */}
          {(part.type === "AMRAP" || part.type === "ForTime") && (
            <View style={s.autoScoreNotice}>
              <Ionicons name="checkmark-circle" size={14} color={primary} />
              <Text style={[s.autoScoreText, { color: primary }]}>
                AUTOMATIC SCORING ENABLED FOR THIS WORKOUT TYPE
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ─── WOD schedule strip helpers ──────────────────────────────────────────────

function getDayAbbr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase()
    .slice(0, 3);
}

function getDayNum(dateStr: string): string {
  return String(parseInt(dateStr.split("-")[2], 10));
}

function formatNavDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function WodScheduleStrip({
  schedule,
  selectedDate,
  today,
  primary,
  onSelect,
}: {
  schedule: { date: string; wod: any }[];
  selectedDate: string;
  today: string;
  primary: string;
  onSelect: (date: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={ss.strip}
    >
      {schedule.map(({ date, wod }) => {
        const isSelected = date === selectedDate;
        const isToday = date === today;
        const hasWod = !!wod;
        return (
          <Pressable
            key={date}
            style={[
              ss.chip,
              isSelected && { backgroundColor: primary, borderColor: primary },
            ]}
            onPress={() => onSelect(date)}
          >
            <Text style={[ss.chipDay, isSelected && ss.chipTextActive]}>
              {isToday ? "TODAY" : getDayAbbr(date)}
            </Text>
            <Text style={[ss.chipNum, isSelected && ss.chipTextActive]}>
              {getDayNum(date)}
            </Text>
            <View
              style={[
                ss.dot,
                {
                  backgroundColor: hasWod
                    ? isSelected ? Colors.onPrimary : primary
                    : Colors.surfaceContainerHighest,
                },
              ]}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  strip: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 56,
    gap: 2,
  },
  chipDay: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  chipNum: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.text,
    lineHeight: 22,
  },
  chipTextActive: { color: Colors.onPrimary },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 3,
  },
});

// ─── Coach: Post / Edit WOD ───────────────────────────────────────────────────

function CoachWodTab() {
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
        await createWod({ date, ...wodPayload });
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
        {/* Page header */}
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
          {/* WOD Title */}
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

          {/* Date + Access Level row */}
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

          {/* Parts */}
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

          {/* Add Part */}
          {parts.length < 5 && (
            <Pressable style={s.addPartBtn} onPress={addPart}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.textSecondary} />
              <Text style={s.addPartBtnText}>ADD PART</Text>
            </Pressable>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom action bar */}
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

      {/* Access level modal */}
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

// ─── Athlete: Log Result ──────────────────────────────────────────────────────

function AthleteLogTab() {
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

// ─── Root: role-aware entry point ─────────────────────────────────────────────

export default function WodScreen() {
  const me = useQuery(api.users.getMe);
  const { primary } = useGymColors();

  if (me === undefined) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  const isCoach = me?.role === "coach" || me?.role === "admin";
  return isCoach ? <CoachWodTab /> : <AthleteLogTab />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  scroll: { paddingBottom: 60 },

  // ── Page header (create/edit form) ──
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  pageTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.text,
    letterSpacing: 1,
  },
  pageTitleUnderline: {
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    width: "100%",
  },
  coachBadge: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    letterSpacing: 1.5,
    marginTop: 6,
  },

  // ── Read view header ──
  readHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  readGymName: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  readTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.displayMd,
    color: Colors.text,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  editBtnText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.labelSm,
    letterSpacing: 1,
  },

  sectionLabel: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginHorizontal: 20,
    marginBottom: 12,
  },

  // ── WOD read card ──
  readCard: {
    backgroundColor: Colors.surfaceContainerLow,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
  },
  readWodTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.headlineMd,
    color: Colors.text,
    marginBottom: 6,
  },
  readWodMeta: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.labelMd,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  readPartBlock: {
    marginTop: 16,
    gap: 6,
  },
  readPartLabel: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  readPartDetail: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.labelLg,
    color: Colors.text,
  },

  movementRow: { flexDirection: "row", alignItems: "baseline", gap: 14 },
  movementNum: {
    width: 28,
    fontFamily: Fonts.display,
    fontSize: 16,
    textAlign: "right",
  },
  movementLabel: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelLg,
    color: Colors.text,
    flex: 1,
  },

  noWodBanner: {
    marginHorizontal: 20,
    padding: 32,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  noWodText: {
    fontFamily: Fonts.bodyMed,
    fontSize: FontSizes.labelLg,
    color: Colors.textSecondary,
  },

  // ── Form layout ──
  formScroll: { paddingHorizontal: 20, paddingBottom: 20 },

  formFieldGroup: {
    marginBottom: 14,
  },
  formFieldLabel: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontFamily: Fonts.bodyMed,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  twoFieldRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },

  // ── Part card ──
  partCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  partHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  partTitle: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelMd,
    letterSpacing: 1.5,
  },
  partHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  partRemoveBtn: {
    padding: 4,
  },
  partCounter: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },

  partNameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 14,
    paddingBottom: 0,
  },
  partNameChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.background,
  },
  partNameChipText: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },

  partFieldGroup: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  partFieldLabel: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  partInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontFamily: Fonts.bodyMed,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  partMultiline: {
    minHeight: 80,
    marginBottom: 14,
  },
  partDescMultiline: {
    minHeight: 110,
    marginBottom: 4,
  },

  threeColRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  threeColItem: {
    flex: 1,
  },

  twoColRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  twoColItem: {
    flex: 1,
  },
  typeChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.background,
  },
  typeChipText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  autoScoreNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  autoScoreText: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.labelSm,
    letterSpacing: 0.5,
    flex: 1,
  },

  // ── Add part ──
  addPartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderStyle: "dashed",
    marginBottom: 10,
  },
  addPartBtnText: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
  },

  // ── Bottom bar ──
  bottomBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    backgroundColor: Colors.background,
  },
  discardBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  discardBtnText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.labelLg,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  publishBtnWrapper: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  publishBtnText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.labelLg,
    color: Colors.onPrimary,
    letterSpacing: 1,
  },

  // ── Athlete log form ──
  formSection: {
    backgroundColor: Colors.surfaceContainerLow,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
  },
  scaleRow: { flexDirection: "row", gap: 8 },
  scaleBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scaleBtnActive: {},
  scaleBtnText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
  },
  scaleBtnTextActive: { color: "#fff" },
  saveBtn: {
    marginHorizontal: 20,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.labelLg,
    color: "#fff",
    letterSpacing: 0.5,
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.surfaceContainerLow,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 16,
  },
  modalDoneBtn: {
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 48,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  modalDoneBtnText: {
    color: Colors.onPrimary,
    fontFamily: Fonts.display,
    fontSize: 16,
  },
  accessModalSheet: {
    backgroundColor: Colors.surfaceContainerLow,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  accessModalTitle: {
    fontFamily: Fonts.bodyExtra,
    fontSize: FontSizes.labelSm,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 16,
    textAlign: "center",
  },
  accessOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  accessOptionText: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.labelLg,
    color: Colors.text,
    letterSpacing: 0.5,
  },
});
