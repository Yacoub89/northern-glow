import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { api } from "../convex/_generated/api";
import { Colors } from "../constants/Colors";

const TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Australia/Sydney",
];

const COLOR_PRESETS = [
  "#1BBFBF",
  "#007AFF",
  "#34C759",
  "#FF9F0A",
  "#FF453A",
  "#BF5AF2",
  "#FF2D55",
  "#30B0C7",
];

export default function GymSettingsScreen() {
  const router = useRouter();
  const gym = useQuery(api.gyms.getMyGym);
  const updateSettings = useMutation(api.gyms.updateSettings);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1BBFBF");
  const [timezone, setTimezone] = useState("America/New_York");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (gym && !initialized) {
      setName(gym.name);
      setTagline(gym.tagline);
      setPrimaryColor(gym.primaryColor);
      setTimezone(gym.timezone);
      setInitialized(true);
    }
  }, [gym, initialized]);

  if (gym === undefined) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={primaryColor} size="large" />
      </View>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Gym name is required");
      return;
    }
    setSaving(true);
    try {
      await updateSettings({ name: name.trim(), tagline: tagline.trim(), primaryColor, timezone });
      Alert.alert("Saved", "Gym settings updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={s.title}>Gym Settings</Text>
          <Pressable onPress={handleSave} disabled={saving} style={s.saveBtn}>
            {saving ? (
              <ActivityIndicator size="small" color={primaryColor} />
            ) : (
              <Text style={[s.saveBtnText, { color: primaryColor }]}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {/* Branding */}
          <Text style={s.sectionLabel}>Branding</Text>

          <View style={s.field}>
            <Text style={s.label}>Gym Name</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Your Gym Name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Tagline</Text>
            <TextInput
              style={s.input}
              value={tagline}
              onChangeText={setTagline}
              placeholder="e.g. Train Hard. Live Well."
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Color */}
          <View style={s.field}>
            <Text style={s.label}>Primary Color</Text>
            <View style={s.colorRow}>
              {COLOR_PRESETS.map((c) => (
                <Pressable
                  key={c}
                  style={[
                    s.colorSwatch,
                    { backgroundColor: c },
                    primaryColor === c && s.colorSwatchSelected,
                  ]}
                  onPress={() => setPrimaryColor(c)}
                >
                  {primaryColor === c && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </Pressable>
              ))}
            </View>
            <View style={s.colorPreview}>
              <View style={[s.colorDot, { backgroundColor: primaryColor }]} />
              <Text style={s.colorHex}>{primaryColor}</Text>
            </View>
          </View>

          {/* Timezone */}
          <Text style={[s.sectionLabel, { marginTop: 24 }]}>Timezone</Text>
          <View style={s.timezoneList}>
            {TIMEZONE_OPTIONS.map((tz) => (
              <Pressable
                key={tz}
                style={[s.timezoneRow, timezone === tz && s.timezoneRowSelected]}
                onPress={() => setTimezone(tz)}
              >
                <Text
                  style={[s.timezoneText, timezone === tz && { color: primaryColor, fontWeight: "700" }]}
                >
                  {tz.replace(/_/g, " ")}
                </Text>
                {timezone === tz && (
                  <Ionicons name="checkmark-circle" size={18} color={primaryColor} />
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: "700", color: Colors.text },
  saveBtn: { paddingHorizontal: 4, paddingVertical: 4, minWidth: 44, alignItems: "flex-end" },
  saveBtnText: { fontSize: 16, fontWeight: "700" },

  content: { padding: 20, paddingBottom: 60 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },

  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: Colors.text,
  },
  colorPreview: { flexDirection: "row", alignItems: "center", gap: 8 },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  colorHex: { fontSize: 13, color: Colors.textSecondary, fontFamily: "monospace" },

  timezoneList: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  timezoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  timezoneRowSelected: { backgroundColor: Colors.surfaceElevated },
  timezoneText: { fontSize: 15, color: Colors.text },
});
