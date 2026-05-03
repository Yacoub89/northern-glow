import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
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
import { useAppDialog } from "../AppDialog";

const DEFAULT_DAY_OF_WEEK = 1;
const DEFAULT_START_TIME = "09:00";
const DEFAULT_DURATION = 60;

export function AddAvailabilityModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { primary } = useGymColors();
  const dialog = useAppDialog();
  const [dayOfWeek, setDayOfWeek] = useState(DEFAULT_DAY_OF_WEEK);
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const addAvailability = useMutation(api.appointments.addAvailability);

  const resetForm = () => {
    setDayOfWeek(DEFAULT_DAY_OF_WEEK);
    setStartTime(DEFAULT_START_TIME);
    setDuration(DEFAULT_DURATION);
    setShowStartTimePicker(false);
  };

  useEffect(() => {
    resetForm();
  }, [visible]);

  const handleSave = async () => {
    try {
      await addAvailability({ dayOfWeek, startTime, durationMinutes: duration });
      resetForm();
      onClose();
    } catch (e: any) {
      const message =
        e?.message?.includes("Availability slot already exists")
          ? "You already have an availability slot at this day and time. Pick a different time or remove the existing slot first."
          : e.message;
      dialog.alert("Could not add slot", message);
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
            <Pressable
              style={md.cancelBtn}
              onPress={() => {
                resetForm();
                onClose();
              }}
            >
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
