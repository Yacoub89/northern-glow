import { StyleSheet } from "react-native";
import { Colors } from "../../constants/Colors";
import { Fonts, FontSizes } from "../../constants/Typography";

// ─── Screen + section styles ──────────────────────────────────────────────────

export const manageStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 120 },
  centered: { paddingVertical: 24, alignItems: "center" },

  // Page header
  pageHeader: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 8 },
  pageTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.text,
    letterSpacing: -0.5,
  },

  // Date navigator
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 22,
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  navArrow: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: "center", justifyContent: "center",
  },
  dateCenter: { flex: 1, alignItems: "center", gap: 3 },
  dateMonthDay: {
    fontFamily: Fonts.bodySemi,
    fontSize: FontSizes.labelMd,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  dateDayName: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.headlineSm,
    color: Colors.text,
    letterSpacing: 0.5,
  },

  // Velocity card
  velocityCard: {
    marginHorizontal: 22, marginBottom: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    padding: 18,
  },
  velocityLabel: {
    fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm,
    color: Colors.textSecondary, letterSpacing: 2, marginBottom: 6,
  },
  velocityPct: { fontFamily: Fonts.display, fontSize: 52, letterSpacing: -2, lineHeight: 58 },
  velocitySubLabel: {
    fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm,
    color: Colors.textSecondary, letterSpacing: 1.5, marginBottom: 12, marginTop: 2,
  },
  progressTrack: {
    height: 4, backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 2, marginBottom: 18, overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2 },
  velocityStats: { flexDirection: "row", alignItems: "center" },
  velocityStat: { flex: 1 },
  velocityStatNum: {
    fontFamily: Fonts.display, fontSize: FontSizes.headlineSm,
    color: Colors.text, letterSpacing: -0.5,
  },
  velocityStatUnit: {
    fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm,
    color: Colors.textSecondary, letterSpacing: 1.5, marginTop: 2,
  },
  velocityStatDivider: { width: 1, height: 36, backgroundColor: Colors.border, marginHorizontal: 20 },

  // Section block
  sectionBlock: { marginHorizontal: 22, marginBottom: 24 },
  sectionLabel: {
    fontFamily: Fonts.display, fontSize: FontSizes.titleMd,
    color: Colors.text, letterSpacing: 0.5, marginBottom: 14,
  },

  // Class card
  classCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 12,
  },
  classTimeRow: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between", marginBottom: 10,
  },
  classTime: {
    fontFamily: Fonts.display, fontSize: 32,
    color: Colors.text, letterSpacing: -1, lineHeight: 36,
  },
  sessionLabel: {
    fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm,
    color: Colors.textSecondary, letterSpacing: 1.5, marginTop: 2,
  },
  badge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm, letterSpacing: 0.8 },
  classTitle: {
    fontFamily: Fonts.display, fontSize: FontSizes.titleLg,
    color: Colors.text, letterSpacing: 0.3, marginBottom: 4,
  },
  classDesc: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  classMeta: { flexDirection: "row", gap: 16, marginBottom: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.textSecondary },
  classActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  rosterBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  rosterBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13 },
  deleteBtn: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.error + "44",
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.error + "11",
  },

  // Empty state
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 28, alignItems: "center",
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.textSecondary, marginBottom: 6 },
  emptyHint: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted },

  // Availability
  availDayLabel: {
    fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm,
    color: Colors.textSecondary, letterSpacing: 1.5,
    textTransform: "uppercase", marginBottom: 6,
  },
  availSlotRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  availSlotTime: { fontFamily: Fonts.display, fontSize: 16, color: Colors.text, flex: 1 },
  availSlotDuration: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.textSecondary },
  removeBtn: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.error + "44",
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.error + "11",
  },

  // Event rows
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    overflow: "hidden",
  },
  eventRowContent: { flex: 1, padding: 14 },
  eventRowLeft: { gap: 4 },
  eventRowTitle: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.text },
  eventRowMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary },
  eventRowBadges: { flexDirection: "row", gap: 6, marginTop: 6 },
  eventBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  eventBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.textSecondary },

  // FAB
  fab: {
    position: "absolute", bottom: 28, right: 22,
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  fabBackdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  fabMenu: { position: "absolute", bottom: 96, right: 22, gap: 14 },
  fabMenuItem: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10 },
  fabMenuLabel: {
    fontFamily: Fonts.bodyBold, fontSize: 13,
    color: Colors.text,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    overflow: "hidden",
  },
  fabMenuBtn: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
});

// ─── Modal styles (used by AddAvailabilityModal + CreateEventModal) ───────────

export const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
    borderWidth: 1, borderColor: Colors.border,
  },
  sheetScroll: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
    maxHeight: "90%",
  },
  sheetContent: { padding: 24, paddingBottom: 48 },
  title: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text, marginBottom: 20 },
  label: {
    fontFamily: Fonts.bodyBold, fontSize: FontSizes.labelSm,
    color: Colors.textSecondary, letterSpacing: 1,
    textTransform: "uppercase", marginBottom: 8, marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: Colors.text,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: "top", paddingTop: 11 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: {},
  chipText: { fontFamily: Fonts.bodySemi, color: Colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: "#fff" },
  actions: { flexDirection: "row", gap: 12, marginTop: 28 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, alignItems: "center",
  },
  cancelText: { fontFamily: Fonts.bodyBold, color: Colors.textSecondary },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: "center" },
  saveText: { fontFamily: Fonts.bodyBold, color: "#fff" },
});

// ─── Shared time helpers ──────────────────────────────────────────────────────

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DURATION_OPTIONS = [30, 45, 60, 90];
export const CAPACITY_OPTIONS = [10, 20, 30, 50, 100];

export function timeStrToDate(hhmm: string) {
  const [h, m] = (hhmm || "09:00").split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export function dateToTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
