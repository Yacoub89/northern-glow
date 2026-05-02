import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { Fonts, FontSizes } from "../../constants/Typography";
import { useGymColors } from "../../constants/GymConfig";
import { formatTime } from "../../utils/date";
import {
  modalStyles as md,
  DAY_NAMES,
  DURATION_OPTIONS,
  timeStrToDate,
  dateToTimeStr,
} from "./styles";

export function AddAvailabilityModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { primary } = useGymColors();
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [duration, setDuration] = useState(60);
  const addAvailability = useMutation(api.appointments.addAvailability);

  const handleSave = async () => {
    try {
      await addAvailability({ dayOfWeek, startTime, durationMinutes: duration });
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={md.overlay}>
        <View style={md.sheet}>
          <Text style={md.title}>Add Availability Slot</Text>

          <Text style={md.label}>Day of Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={md.row}>
            {DAY_NAMES.map((name, i) => (
              <Pressable
                key={i}
                style={[md.chip, dayOfWeek === i && [md.chipActive, { backgroundColor: primary, borderColor: primary }]]}
                onPress={() => setDayOfWeek(i)}
              >
                <Text style={[md.chipText, dayOfWeek === i && md.chipTextActive]}>{name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={md.label}>Start Time</Text>
          <Pressable style={md.input} onPress={() => setShowStartTimePicker((v) => !v)}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: Colors.text, fontFamily: Fonts.body, fontSize: FontSizes.labelLg }}>
                {formatTime(startTime)}
              </Text>
              <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
            </View>
          </Pressable>
          {showStartTimePicker && (
            <DateTimePicker
              mode="time"
              display="spinner"
              value={timeStrToDate(startTime)}
              minuteInterval={15}
              onChange={(_, selected) => {
                if (selected) setStartTime(dateToTimeStr(selected));
              }}
            />
          )}

          <Text style={md.label}>Duration</Text>
          <View style={md.row}>
            {DURATION_OPTIONS.map((d) => (
              <Pressable
                key={d}
                style={[md.chip, duration === d && [md.chipActive, { backgroundColor: primary, borderColor: primary }]]}
                onPress={() => setDuration(d)}
              >
                <Text style={[md.chipText, duration === d && md.chipTextActive]}>{d} min</Text>
              </Pressable>
            ))}
          </View>

          <View style={md.actions}>
            <Pressable style={md.cancelBtn} onPress={onClose}>
              <Text style={md.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[md.saveBtn, { backgroundColor: primary }]} onPress={handleSave}>
              <Text style={md.saveText}>Save Slot</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
