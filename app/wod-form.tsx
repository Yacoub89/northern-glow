import DateTimePicker from "@react-native-community/datetimepicker";
// @ts-ignore — web-only import
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
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
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Colors } from "../constants/Colors";
import { useGymConfig } from "../constants/GymConfig";
import { WOD_TYPES, type WodType } from "../constants/wod";
import { getTodayDate } from "../utils/date";

const TYPE_LABELS: Record<WodType, string> = {
  AMRAP: "AMRAP",
  ForTime: "For Time",
  EMOM: "EMOM",
  Strength: "Strength",
  Other: "Other",
};

export default function WodFormScreen() {
  const gym = useGymConfig();
  const router = useRouter();
  const navigation = useNavigation();
  const { wodId, date: dateParam } = useLocalSearchParams<{ wodId?: string; date?: string }>();
  const editingId = wodId as Id<"wods"> | undefined;

  const existingWod = useQuery(
    api.wods.getById,
    editingId ? { id: editingId } : "skip"
  );

  const createWod = useMutation(api.wods.create);
  const updateWod = useMutation(api.wods.update);

  const parsedInitial = dateParam ?? getTodayDate();
  const [date, setDate] = useState(parsedInitial);
  const [pickerDate, setPickerDate] = useState(() => {
    const [y, mo, d] = parsedInitial.split("-").map(Number);
    return new Date(y, mo - 1, d);
  });
  const [showPicker, setShowPicker] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<WodType>("AMRAP");
  const [duration, setDuration] = useState("");
  const [movementsText, setMovementsText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: editingId ? "Edit WOD" : "Set WOD" });
  }, [editingId]);

  useEffect(() => {
    if (existingWod) {
      setTitle(existingWod.title);
      setType(existingWod.type);
      setDuration(existingWod.description ?? "");
      setMovementsText(existingWod.movements.join("\n"));
    }
  }, [existingWod]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Fields", "WOD name is required");
      return;
    }
    const movements = movementsText
      .split("\n")
      .map((m) => m.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      if (editingId) {
        await updateWod({
          id: editingId,
          title: title.trim(),
          description: duration.trim(),
          type,
          movements,
        });
      } else {
        await createWod({
          date,
          title: title.trim(),
          description: duration.trim(),
          type,
          movements,
        });
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>‹ Back</Text>
            </Pressable>
            <Text style={styles.gymName}>{gym.name.toUpperCase()}</Text>
            <Text style={styles.title}>{editingId ? "Edit WOD" : "Set WOD"}</Text>
          </View>

          {/* Date */}
          {!editingId && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DATE</Text>
              {Platform.OS === "web" ? (
                // Native HTML date input on web
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
                    backgroundColor: Colors.surfaceElevated,
                    border: `1px solid ${Colors.border}`,
                    borderRadius: 10,
                    padding: 14,
                    color: Colors.text,
                    fontSize: 15,
                    width: "100%",
                    boxSizing: "border-box",
                    colorScheme: "dark",
                  } as any}
                />
              ) : (
                <>
                  <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
                    <Text style={styles.dateButtonText}>
                      {new Date(pickerDate.getFullYear(), pickerDate.getMonth(), pickerDate.getDate()).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                    <Text style={styles.dateButtonIcon}>📅</Text>
                  </Pressable>
                  {showPicker && Platform.OS === "android" && (
                    <DateTimePicker
                      value={pickerDate}
                      mode="date"
                      display="calendar"
                      onChange={(_, selected) => {
                        setShowPicker(false);
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
                  {showPicker && Platform.OS === "ios" && (
                    <Modal transparent animationType="slide" visible={showPicker}>
                      <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
                        <View style={styles.modalSheet}>
                          <View style={styles.modalHandle} />
                          <DateTimePicker
                            value={pickerDate}
                            mode="date"
                            display="inline"
                            themeVariant="dark"
                            accentColor={Colors.primary}
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
                            style={styles.modalDoneBtn}
                            onPress={() => setShowPicker(false)}
                          >
                            <Text style={styles.modalDoneBtnText}>Done</Text>
                          </Pressable>
                        </View>
                      </Pressable>
                    </Modal>
                  )}
                </>
              )}
            </View>
          )}

          {/* WOD Name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WOD NAME</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Cindy's Revenge, Fran, etc."
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          {/* Workout Type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WORKOUT TYPE</Text>
            <View style={styles.typeRow}>
              {WOD_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeChip, type === t && styles.typeChipActive]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
                    {TYPE_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={duration}
              onChangeText={setDuration}
              placeholder="Duration / details (e.g. 20 min)"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          {/* Movements */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MOVEMENTS</Text>
            <TextInput
              style={[styles.input, styles.movementsInput]}
              value={movementsText}
              onChangeText={setMovementsText}
              placeholder={
                "21 Thrusters (95/65 lb)\n21 Pull-ups\n15 Thrusters\n15 Pull-ups\n9 Thrusters\n9 Pull-ups"
              }
              placeholderTextColor={Colors.textSecondary}
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
              {saving ? "Saving…" : editingId ? "Update WOD" : "Post WOD"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 48 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
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

  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateButton: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateButtonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  dateButtonIcon: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 48,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  modalDoneBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  movementsInput: { minHeight: 120 },

  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  typeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "22",
  },
  typeChipText: { color: Colors.textSecondary, fontWeight: "600", fontSize: 14 },
  typeChipTextActive: { color: Colors.primary, fontWeight: "700" },

  saveBtn: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
