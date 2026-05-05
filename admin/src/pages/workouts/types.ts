import { Id } from "@convex/_generated/dataModel";

export type WodType = "AMRAP" | "ForTime" | "EMOM" | "Strength" | "Other";
export type AccessLevel = "PUBLIC_CLASS" | "MEMBERS_ONLY" | "ADVANCED";
export type WodProgram =
  | "Challenge of the Month"
  | "OC-60"
  | "OC-Flex"
  | "OC-Home"
  | "OC-Hyrox"
  | "OC-Lift"
  | "OC-Teens";
export type WorkoutsTab = "week" | "create" | "import" | "announcements";

export type PartDraft = {
  label: string;
  name: string;
  type: "" | WodType;
  movement: string;
  sets: string;
  reps: string;
  percentMax: string;
  timeCap: string;
  description: string;
  coachNotes: string;
};

export type ImportedWod = {
  date: string;
  program?: string;
  title: string;
  description: string;
  type: WodType;
  movements: string[];
  scalingNotes?: string;
  accessLevel?: AccessLevel;
  parts?: Array<{
    label: string;
    name: string;
    type?: WodType;
    movement?: string;
    sets?: string;
    reps?: string;
    percentMax?: string;
    timeCap?: string;
    description?: string;
    coachNotes?: string;
  }>;
};

export type Announcement = {
  _id: Id<"announcements">;
  title: string;
  body: string;
  startDate: string;
  endDate?: string;
  pinned: boolean;
};
