import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { Colors } from "../../constants/Colors";
import { Fonts, FontSizes } from "../../constants/Typography";
import { useGymColors } from "../../constants/GymConfig";
import { formatDate, formatTime, getTodayDate } from "../../utils/date";
import {
  modalStyles as md,
  CAPACITY_OPTIONS,
  timeStrToDate,
  dateToTimeStr,
} from "./styles";
import { useAppDialog } from "../AppDialog";

export function CreateEventModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { primary } = useGymColors();
  const dialog = useAppDialog();
  const createEvent = useMutation(api.events.create);

  const today = getTodayDate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [endTime, setEndTime] = useState("");
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState<number | undefined>(undefined);
  const [priceInput, setPriceInput] = useState("0");
  const [saving, setSaving] = useState(false);

  const closePickers = () => {
    setShowDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDate(today);
    closePickers();
    setStartTime("09:00");
    setEndTime("");
    setLocation("");
    setCapacity(undefined);
    setPriceInput("0");
  };

  useEffect(() => {
    resetForm();
  }, [visible]);

  const handleSave = async () => {
    if (!title.trim()) {
      dialog.alert("Validation", "Event title is required.");
      return;
    }
    const priceDollars = parseFloat(priceInput) || 0;
    const priceCents = Math.round(priceDollars * 100);
    setSaving(true);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        startTime,
        endTime: endTime.trim() || undefined,
        location: location.trim() || undefined,
        capacity,
        priceCents,
      });
      resetForm();
      onClose();
    } catch (e: any) {
      dialog.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={md.overlay}>
        <ScrollView
          style={md.sheetScroll}
          contentContainerStyle={md.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={md.title}>Create Event</Text>

          <Text style={md.label}>Title *</Text>
          <TextInput
            style={md.input}
            value={title}
            onChangeText={setTitle}
            onFocus={closePickers}
            placeholder="e.g. Summer Throwdown"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={md.label}>Description</Text>
          <TextInput
            style={[md.input, md.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            onFocus={closePickers}
            placeholder="Optional details about the event"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <Text style={md.label}>Date</Text>
          <Pressable
            style={md.input}
            onPress={() => {
              setShowStartTimePicker(false);
              setShowEndTimePicker(false);
              setShowDatePicker((v) => !v);
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: Colors.text, fontFamily: Fonts.body, fontSize: FontSizes.labelLg }}>
                {formatDate(date, { weekday: "long" })}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
            </View>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              mode="date"
              display="inline"
              value={(() => { const [y, m, d] = date.split("-").map(Number); return new Date(y, m - 1, d); })()}
              minimumDate={new Date()}
              accentColor={primary}
              onChange={(_, selected) => {
                if (selected) {
                  const y = selected.getFullYear();
                  const m = String(selected.getMonth() + 1).padStart(2, "0");
                  const d = String(selected.getDate()).padStart(2, "0");
                  setDate(`${y}-${m}-${d}`);
                }
              }}
            />
          )}

          <Text style={md.label}>Start Time</Text>
          <Pressable
            style={md.input}
            onPress={() => {
              setShowDatePicker(false);
              setShowEndTimePicker(false);
              setShowStartTimePicker((v) => !v);
            }}
          >
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

          <Text style={md.label}>End Time</Text>
          <Pressable
            style={md.input}
            onPress={() => {
              setShowDatePicker(false);
              setShowStartTimePicker(false);
              setShowEndTimePicker((v) => !v);
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: endTime ? Colors.text : Colors.textMuted, fontFamily: Fonts.body, fontSize: FontSizes.labelLg }}>
                {endTime ? formatTime(endTime) : "None (optional)"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {endTime !== "" && (
                  <Pressable
                    hitSlop={8}
                    onPress={(e) => { e.stopPropagation(); setEndTime(""); setShowEndTimePicker(false); }}
                  >
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                  </Pressable>
                )}
                <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
              </View>
            </View>
          </Pressable>
          {showEndTimePicker && (
            <DateTimePicker
              mode="time"
              display="spinner"
              value={timeStrToDate(endTime || startTime)}
              minuteInterval={15}
              onChange={(_, selected) => {
                if (selected) setEndTime(dateToTimeStr(selected));
              }}
            />
          )}

          <Text style={md.label}>Location</Text>
          <TextInput
            style={md.input}
            value={location}
            onChangeText={setLocation}
            onFocus={closePickers}
            placeholder="e.g. Main gym floor"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={md.label}>Capacity</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={md.row}>
            {[undefined, ...CAPACITY_OPTIONS].map((c) => (
              <Pressable
                key={c ?? "unlimited"}
                style={[md.chip, capacity === c && [md.chipActive, { backgroundColor: primary, borderColor: primary }]]}
                onPress={() => {
                  closePickers();
                  setCapacity(c);
                }}
              >
                <Text style={[md.chipText, capacity === c && md.chipTextActive]}>
                  {c === undefined ? "Unlimited" : String(c)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={md.label}>Price (0 = Free)</Text>
          <TextInput
            style={md.input}
            value={priceInput}
            onChangeText={setPriceInput}
            onFocus={closePickers}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
          />

          <View style={md.actions}>
            <Pressable style={md.cancelBtn} onPress={() => { resetForm(); onClose(); }}>
              <Text style={md.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[md.saveBtn, { backgroundColor: primary }, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={Colors.onPrimary} />
                : <Text style={md.saveText}>Create Event</Text>
              }
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
