import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";
import { getDayAbbr, getDayNum } from "./types";

export function WodScheduleStrip({
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
