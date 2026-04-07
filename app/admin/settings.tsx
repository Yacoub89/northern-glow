import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { useGymConfig } from "../../constants/GymConfig";

const COLOR_PRESETS = [
  { hex: "#1BBFBF", name: "Teal" },
  { hex: "#FF3B30", name: "Red" },
  { hex: "#FF9F0A", name: "Orange" },
  { hex: "#34C759", name: "Green" },
  { hex: "#007AFF", name: "Blue" },
  { hex: "#AF52DE", name: "Purple" },
  { hex: "#FF2D55", name: "Pink" },
  { hex: "#5856D6", name: "Indigo" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function AdminSettings() {
  const gym = useGymConfig();
  const upsert = useMutation(api.gymConfig.upsert);
  const me = useQuery(api.users.getMe);

  const [name, setName] = useState(gym.name);
  const [tagline, setTagline] = useState(gym.tagline ?? "");
  const [primaryColor, setPrimaryColor] = useState(gym.primaryColor);
  const [timezone, setTimezone] = useState(gym.timezone ?? "America/New_York");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isAdmin = me?.role === "admin";

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsert({ name: name.trim(), tagline: tagline.trim() || undefined, primaryColor, timezone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const changed =
    name !== gym.name ||
    tagline !== (gym.tagline ?? "") ||
    primaryColor !== gym.primaryColor ||
    timezone !== (gym.timezone ?? "America/New_York");

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Gym Settings</Text>

      <View style={s.card}>
        <Text style={s.cardTitle}>Branding</Text>

        <Text style={s.label}>Gym Name</Text>
        <TextInput
          style={[s.input, !isAdmin && s.inputDisabled]}
          value={name}
          onChangeText={setName}
          placeholder="Your gym name"
          placeholderTextColor={Colors.textMuted}
          editable={isAdmin}
        />

        <Text style={[s.label, { marginTop: 16 }]}>Tagline</Text>
        <TextInput
          style={[s.input, !isAdmin && s.inputDisabled]}
          value={tagline}
          onChangeText={setTagline}
          placeholder="e.g. Forging Elite Fitness"
          placeholderTextColor={Colors.textMuted}
          editable={isAdmin}
        />

        <Text style={[s.label, { marginTop: 16 }]}>Brand Color</Text>
        <View style={s.colorGrid}>
          {COLOR_PRESETS.map((c) => (
            <Pressable
              key={c.hex}
              style={[s.colorItem, !isAdmin && { opacity: 0.5 }]}
              onPress={() => isAdmin && setPrimaryColor(c.hex)}
              disabled={!isAdmin}
            >
              <View style={[s.colorSwatch, { backgroundColor: c.hex }, primaryColor === c.hex && s.colorSwatchActive]} />
              <Text style={[s.colorName, primaryColor === c.hex && { color: c.hex }]}>{c.name}</Text>
            </Pressable>
          ))}
        </View>

        {/* Live preview */}
        <View style={s.preview}>
          <View style={[s.previewDot, { backgroundColor: primaryColor }]} />
          <View>
            <Text style={s.previewName}>{name || "Gym Name"}</Text>
            {tagline ? <Text style={s.previewTagline}>{tagline}</Text> : null}
          </View>
        </View>
      </View>

      <View style={[s.card, { marginTop: 20 }]}>
        <Text style={s.cardTitle}>Timezone</Text>
        <Text style={s.hint}>Used for class scheduling and WOD notifications</Text>
        <View style={s.tzGrid}>
          {TIMEZONES.map((tz) => (
            <Pressable
              key={tz}
              style={[s.tzPill, timezone === tz && { backgroundColor: primaryColor + "22", borderColor: primaryColor }]}
              onPress={() => isAdmin && setTimezone(tz)}
              disabled={!isAdmin}
            >
              <Text style={[s.tzPillText, timezone === tz && { color: primaryColor }]}>{tz}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isAdmin && (
        <Pressable
          style={[s.saveBtn, { backgroundColor: primaryColor }, (!changed || saving) && { opacity: 0.4 }]}
          onPress={handleSave}
          disabled={!changed || saving}
        >
          <Text style={s.saveBtnText}>{saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}</Text>
        </Pressable>
      )}

      {!isAdmin && (
        <View style={s.readOnlyBanner}>
          <Text style={s.readOnlyText}>Only admins can modify gym settings. You have coach access.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 32, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: "800", color: Colors.text, marginBottom: 24 },

  card: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 24 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  hint: { fontSize: 13, color: Colors.textMuted, marginBottom: 14 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    outlineStyle: "none",
  } as any,
  inputDisabled: { opacity: 0.6 },

  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  colorItem: { alignItems: "center", gap: 6, width: 56 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSwatchActive: { borderWidth: 3, borderColor: "#fff", transform: [{ scale: 1.15 }] },
  colorName: { fontSize: 11, color: Colors.textMuted, textAlign: "center" },

  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewDot: { width: 40, height: 40, borderRadius: 12 },
  previewName: { fontSize: 16, fontWeight: "800", color: Colors.text },
  previewTagline: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  tzGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tzPill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  tzPillText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },

  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  readOnlyBanner: { marginTop: 24, padding: 14, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  readOnlyText: { color: Colors.textSecondary, fontSize: 14 },
});
