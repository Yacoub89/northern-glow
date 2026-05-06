import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Colors } from "../../constants/Colors";
import { useGymColors } from "../../constants/GymConfig";
import { formatDate, formatTime, getTodayDate } from "../../utils/date";
import { manageStyles as sc } from "../../components/manage/styles";
import { AddAvailabilityModal } from "../../components/manage/AddAvailabilityModal";
import { CreateEventModal } from "../../components/manage/CreateEventModal";
import {
  AvailabilitySection,
  ClassCard,
  EnrichedClass,
  EventsSection,
  VelocityCard,
} from "../../components/manage/Sections";
import { useAppDialog } from "../../components/AppDialog";

function shiftDate(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function formatNavDate(dateStr: string): { monthDay: string; dayName: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    monthDay: dt.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase(),
    dayName: dt.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase(),
  };
}

export default function ManageScreen() {
  const { primary } = useGymColors();
  const router = useRouter();
  const dialog = useAppDialog();
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [fabOpen, setFabOpen] = useState(false);
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  const { monthDay, dayName } = formatNavDate(selectedDate);

  const upcomingClasses = useQuery(api.classes.getUpcoming, { startDate: selectedDate, days: 1 });
  const removeClass = useMutation(api.classes.remove);

  const dayClasses = useMemo(
    () => (upcomingClasses ?? []).filter((c) => c.date === selectedDate),
    [upcomingClasses, selectedDate]
  );

  const handleDelete = async (cls: Doc<"classes">) => {
    const confirmed = await dialog.confirm({
      title: "Cancel Class",
      message: `Cancel the ${formatTime(cls.startTime)} class on ${formatDate(cls.date, { relative: true, weekday: "short" })}? All bookings will be cancelled.`,
      cancelText: "Keep",
      confirmText: "Cancel Class",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await removeClass({ id: cls._id });
    } catch (e: any) {
      dialog.alert("Error", e.message);
    }
  };

  return (
    <SafeAreaView style={sc.container} edges={[]}>
      <ScrollView contentContainerStyle={sc.scroll} showsVerticalScrollIndicator={false}>

        <View style={sc.pageHeader}>
          <Text style={sc.pageTitle}>Schedule</Text>
        </View>

        <View style={sc.dateNav}>
          <Pressable style={sc.navArrow} onPress={() => setSelectedDate((d) => shiftDate(d, -1))} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </Pressable>
          <View style={sc.dateCenter}>
            <Text style={sc.dateMonthDay}>{monthDay}</Text>
            <Text style={sc.dateDayName}>{dayName}</Text>
          </View>
          <Pressable style={sc.navArrow} onPress={() => setSelectedDate((d) => shiftDate(d, 1))} hitSlop={10}>
            <Ionicons name="chevron-forward" size={20} color={Colors.text} />
          </Pressable>
        </View>

        {dayClasses.length > 0 && (
          <VelocityCard classes={dayClasses as EnrichedClass[]} />
        )}

        <View style={sc.sectionBlock}>
          <Text style={sc.sectionLabel}>
            {selectedDate === today ? "Today's Classes" : `${dayName.charAt(0) + dayName.slice(1).toLowerCase()}'s Classes`}
          </Text>

          {upcomingClasses === undefined ? (
            <View style={sc.centered}><ActivityIndicator color={primary} /></View>
          ) : dayClasses.length === 0 ? (
            <View style={sc.emptyCard}>
              <Text style={sc.emptyText}>No classes scheduled</Text>
              <Text style={sc.emptyHint}>Tap + to create one</Text>
            </View>
          ) : (
            (dayClasses as EnrichedClass[]).map((cls) => (
              <ClassCard key={cls._id} cls={cls} onDelete={handleDelete} />
            ))
          )}
        </View>

        <AvailabilitySection />
        <EventsSection />
      </ScrollView>

      {fabOpen && (
        <Pressable style={sc.fabBackdrop} onPress={() => setFabOpen(false)} />
      )}

      {fabOpen && (
        <View style={sc.fabMenu}>
          <Pressable style={sc.fabMenuItem} onPress={() => { setFabOpen(false); router.push("/class-form"); }}>
            <Text style={sc.fabMenuLabel}>Class</Text>
            <View style={[sc.fabMenuBtn, { backgroundColor: primary }]}>
              <Ionicons name="barbell-outline" size={20} color={Colors.onPrimary} />
            </View>
          </Pressable>
          <Pressable style={sc.fabMenuItem} onPress={() => { setFabOpen(false); setShowAvailModal(true); }}>
            <Text style={sc.fabMenuLabel}>1:1</Text>
            <View style={[sc.fabMenuBtn, { backgroundColor: primary }]}>
              <Ionicons name="person-outline" size={20} color={Colors.onPrimary} />
            </View>
          </Pressable>
          <Pressable style={sc.fabMenuItem} onPress={() => { setFabOpen(false); setShowEventModal(true); }}>
            <Text style={sc.fabMenuLabel}>Event</Text>
            <View style={[sc.fabMenuBtn, { backgroundColor: primary }]}>
              <Ionicons name="calendar-outline" size={20} color={Colors.onPrimary} />
            </View>
          </Pressable>
        </View>
      )}

      <Pressable style={[sc.fab, { backgroundColor: primary }]} onPress={() => setFabOpen((o) => !o)}>
        <Ionicons name={fabOpen ? "close" : "add"} size={26} color={Colors.onPrimary} />
      </Pressable>

      <AddAvailabilityModal visible={showAvailModal} onClose={() => setShowAvailModal(false)} />
      <CreateEventModal visible={showEventModal} onClose={() => setShowEventModal(false)} />
    </SafeAreaView>
  );
}
