import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
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
import { api } from "../convex/_generated/api";
import { Colors } from "../constants/Colors";
import { getTodayDate } from "../utils/date";

const TIME_PRESETS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "12:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

export default function ClassFormScreen() {
  const router = useRouter();
  const createClass = useMutation(api.classes.create);

  const [date, setDate] = useState(getTodayDate());
  const [startTime, setStartTime] = useState("");
  const [capacity, setCapacity] = useState("15");
  const [saving, setSaving] = useState(false);

  const wod = useQuery(api.wods.getByDate, { date });

  const handleSave = async () => {
    if (!date || !startTime) {
      Alert.alert("Missing Fields", "Please fill in date and time");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(startTime)) {
      Alert.alert("Invalid Time", "Time must be in HH:MM format (24h), e.g. 06:00");
      return;
    }
    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap < 1) {
      Alert.alert("Invalid Capacity", "Must be at least 1");
      return;
    }

    setSaving(true);
    try {
      await createClass({
        date,
        startTime,
        capacity: cap,
        wodId: wod?._id,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Start Time (24h)</Text>
          <View style={styles.presets}>
            {TIME_PRESETS.map((t) => (
              <Pressable
                key={t}
                style={[styles.preset, startTime === t && styles.presetActive]}
                onPress={() => setStartTime(t)}
              >
                <Text
                  style={[
                    styles.presetText,
                    startTime === t && styles.presetTextActive,
                  ]}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="Or type HH:MM"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Capacity</Text>
          <TextInput
            style={styles.input}
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
          />
        </View>

        {/* Show linked WOD if available */}
        {wod && (
          <View style={styles.wodPreview}>
            <Text style={styles.wodPreviewLabel}>WOD linked for this date</Text>
            <Text style={styles.wodPreviewTitle}>
              {wod.type} · {wod.title}
            </Text>
          </View>
        )}

        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Creating…" : "Add Class"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 48 },
  field: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  preset: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetText: { color: Colors.textSecondary, fontWeight: "600", fontSize: 13 },
  presetTextActive: { color: "#fff" },
  wodPreview: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  wodPreviewLabel: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: "600",
    marginBottom: 4,
  },
  wodPreviewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
