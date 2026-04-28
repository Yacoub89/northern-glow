import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Colors } from "../../constants/Colors";
import { useGymColors } from "../../constants/GymConfig";
import { formatTime } from "../../utils/date";
import { manageStyles as sc, DAY_NAMES } from "./styles";
import { AddAvailabilityModal } from "./AddAvailabilityModal";
import { CreateEventModal } from "./CreateEventModal";

export type EnrichedClass = Doc<"classes"> & {
  coachName: string;
  wodTitle: string | null;
  wodType: string | null;
  wodDescription: string | null;
};

function sessionLabel(startTime: string): string {
  return parseInt(startTime.split(":")[0], 10) < 12 ? "AM SESSION" : "PM SESSION";
}

// ─── 1:1 Availability Section ─────────────────────────────────────────────────

export function AvailabilitySection() {
  const { primary } = useGymColors();
  const [showModal, setShowModal] = useState(false);
  const availability = useQuery(api.appointments.getMyAvailability);
  const removeAvailability = useMutation(api.appointments.removeAvailability);

  const handleRemove = (id: string) => {
    Alert.alert("Remove Slot", "Remove this recurring availability slot?", [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeAvailability({ availabilityId: id as any });
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const byDay = (availability ?? []).reduce<Record<number, typeof availability>>((acc, slot) => {
    if (!slot) return acc;
    if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
    acc[slot.dayOfWeek]!.push(slot);
    return acc;
  }, {});

  return (
    <View style={sc.sectionBlock}>
      <View style={sc.sectionHeaderRow}>
        <Text style={sc.sectionLabel}>1:1 Availability</Text>
        <Pressable style={[sc.addSlotBtn, { backgroundColor: primary }]} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={14} color={Colors.onPrimary} />
          <Text style={sc.addSlotBtnText}>Add Slot</Text>
        </Pressable>
      </View>

      {availability === undefined ? (
        <ActivityIndicator color={primary} style={{ marginTop: 8 }} />
      ) : availability.length === 0 ? (
        <View style={sc.emptyCard}>
          <Text style={sc.emptyText}>No availability set</Text>
          <Text style={sc.emptyHint}>Add slots so athletes can book 1:1 sessions</Text>
        </View>
      ) : (
        [0, 1, 2, 3, 4, 5, 6]
          .filter((d) => byDay[d]?.length)
          .map((d) => (
            <View key={d} style={{ marginBottom: 10 }}>
              <Text style={sc.availDayLabel}>{DAY_NAMES[d]}</Text>
              {byDay[d]!
                .sort((a, b) => a!.startTime.localeCompare(b!.startTime))
                .map((slot) => (
                  <View key={slot!._id} style={sc.availSlotRow}>
                    <Text style={sc.availSlotTime}>{formatTime(slot!.startTime)}</Text>
                    <Text style={sc.availSlotDuration}>{slot!.durationMinutes} min</Text>
                    <Pressable style={sc.removeBtn} onPress={() => handleRemove(slot!._id)}>
                      <Ionicons name="trash-outline" size={14} color={Colors.error} />
                    </Pressable>
                  </View>
                ))}
            </View>
          ))
      )}

      <AddAvailabilityModal visible={showModal} onClose={() => setShowModal(false)} />
    </View>
  );
}

// ─── Daily velocity card ──────────────────────────────────────────────────────

export function VelocityCard({ classes }: { classes: EnrichedClass[] }) {
  const { primary } = useGymColors();
  const totalCapacity = classes.reduce((s, c) => s + c.capacity, 0);
  const totalBooked = classes.reduce((s, c) => s + c.bookedCount, 0);
  const pct = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

  return (
    <View style={sc.velocityCard}>
      <Text style={sc.velocityLabel}>CAPACITY</Text>
      <Text style={[sc.velocityPct, { color: primary }]}>{pct}%</Text>
      <Text style={sc.velocitySubLabel}>BOOKED TODAY</Text>
      <View style={sc.progressTrack}>
        <View style={[sc.progressFill, { width: `${pct}%` as any, backgroundColor: primary }]} />
      </View>
      <View style={sc.velocityStats}>
        <View style={sc.velocityStat}>
          <Text style={sc.velocityStatNum}>{String(totalBooked).padStart(2, "0")}</Text>
          <Text style={sc.velocityStatUnit}>ATHLETES</Text>
        </View>
        <View style={sc.velocityStatDivider} />
        <View style={sc.velocityStat}>
          <Text style={sc.velocityStatNum}>{String(classes.length).padStart(2, "0")}</Text>
          <Text style={sc.velocityStatUnit}>SESSIONS</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Class card ───────────────────────────────────────────────────────────────

export function ClassCard({
  cls,
  onDelete,
}: {
  cls: EnrichedClass;
  onDelete: (cls: Doc<"classes">) => void;
}) {
  const router = useRouter();
  const { primary } = useGymColors();
  const spotsLeft = cls.capacity - cls.bookedCount;
  const isFull = spotsLeft <= 0;

  return (
    <View style={sc.classCard}>
      <View style={sc.classTimeRow}>
        <View>
          <Text style={sc.classTime}>{cls.startTime}</Text>
          <Text style={sc.sessionLabel}>{sessionLabel(cls.startTime)}</Text>
        </View>
        <View style={[sc.badge, {
          backgroundColor: isFull ? Colors.error + "22" : primary + "22",
          borderColor: isFull ? Colors.error + "66" : primary + "44",
        }]}>
          <Text style={[sc.badgeText, { color: isFull ? Colors.error : primary }]}>
            {isFull ? "FULL" : `${spotsLeft} SLOTS`}
          </Text>
        </View>
      </View>

      <Text style={sc.classTitle}>{cls.wodTitle?.toUpperCase() ?? "CROSSFIT CLASS"}</Text>
      {cls.wodDescription ? (
        <Text style={sc.classDesc} numberOfLines={1}>{cls.wodDescription}</Text>
      ) : null}

      <View style={sc.divider} />

      <View style={sc.classMeta}>
        <View style={sc.metaItem}>
          <Ionicons name="person-outline" size={13} color={Colors.textSecondary} />
          <Text style={sc.metaText}>{cls.coachName}</Text>
        </View>
        <View style={sc.metaItem}>
          <Ionicons name="people-outline" size={13} color={Colors.textSecondary} />
          <Text style={sc.metaText}>{cls.bookedCount}/{cls.capacity} Athletes</Text>
        </View>
      </View>

      <View style={sc.classActions}>
        <Pressable
          style={sc.rosterBtn}
          onPress={() => router.push({ pathname: "/roster", params: { classId: cls._id } })}
        >
          <Ionicons name="people" size={15} color={primary} />
          <Text style={[sc.rosterBtnText, { color: primary }]}>Roster</Text>
        </Pressable>
        <Pressable style={sc.deleteBtn} onPress={() => onDelete(cls)}>
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Events Section ───────────────────────────────────────────────────────────

export function EventsSection() {
  const { primary } = useGymColors();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const events = useQuery(api.events.listUpcoming);
  const cancelEvent = useMutation(api.events.cancel);

  const handleCancel = (event: Doc<"events">) => {
    Alert.alert("Cancel Event", `Cancel "${event.title}"? Registrations will not be automatically refunded.`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel Event",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelEvent({ eventId: event._id });
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={sc.sectionBlock}>
      <View style={sc.sectionHeaderRow}>
        <Text style={sc.sectionLabel}>Events</Text>
        <Pressable style={[sc.addSlotBtn, { backgroundColor: primary }]} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={14} color={Colors.onPrimary} />
          <Text style={sc.addSlotBtnText}>Create</Text>
        </Pressable>
      </View>

      {events === undefined ? (
        <ActivityIndicator color={primary} style={{ marginTop: 8 }} />
      ) : events.length === 0 ? (
        <View style={sc.emptyCard}>
          <Text style={sc.emptyText}>No upcoming events</Text>
          <Text style={sc.emptyHint}>Tap Create to add a paid or free event</Text>
        </View>
      ) : (
        events.map((event) => {
          const isFree = event.priceCents === 0;
          const isFull = event.capacity !== undefined && event.registeredCount >= event.capacity;
          return (
            <View key={event._id} style={sc.eventRow}>
              <Pressable
                style={sc.eventRowContent}
                onPress={() => router.push({ pathname: "/event-detail", params: { event_id: event._id } })}
              >
                <View style={sc.eventRowLeft}>
                  <Text style={sc.eventRowTitle} numberOfLines={1}>{event.title}</Text>
                  <Text style={sc.eventRowMeta}>
                    {event.date}  ·  {formatTime(event.startTime)}
                    {event.location ? `  ·  ${event.location}` : ""}
                  </Text>
                  <View style={sc.eventRowBadges}>
                    <View style={[sc.eventBadge, { backgroundColor: isFree ? Colors.success + "22" : primary + "22" }]}>
                      <Text style={[sc.eventBadgeText, { color: isFree ? Colors.success : primary }]}>
                        {isFree ? "Free" : `$${(event.priceCents / 100).toFixed(event.priceCents % 100 === 0 ? 0 : 2)}`}
                      </Text>
                    </View>
                    <View style={[sc.eventBadge, { backgroundColor: Colors.surfaceContainerHighest }]}>
                      <Text style={sc.eventBadgeText}>
                        {event.registeredCount}{event.capacity !== undefined ? `/${event.capacity}` : ""} registered
                        {isFull ? " · Full" : ""}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
              <Pressable style={[sc.deleteBtn, { marginRight: 12 }]} onPress={() => handleCancel(event)}>
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
              </Pressable>
            </View>
          );
        })
      )}

      <CreateEventModal visible={showModal} onClose={() => setShowModal(false)} />
    </View>
  );
}
