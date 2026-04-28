import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";
import type { WodType } from "../../constants/wod";
import { wodStyles as s } from "./styles";
import { PART_NAMES, TYPE_LABELS, type WodPart } from "./types";

interface PartCardProps {
  part: WodPart;
  index: number;
  total: number;
  primary: string;
  onChange: (updated: WodPart) => void;
  onRemove: () => void;
}

export function PartCard({ part, index, total, primary, onChange, onRemove }: PartCardProps) {
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
