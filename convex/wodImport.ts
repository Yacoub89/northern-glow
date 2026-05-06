import { action, internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { requireCoachOrAdmin } from "./helpers";
import { DEFAULT_WOD_PROGRAM, WodImportItem } from "./wodTypes";

type WodTypeName = "AMRAP" | "ForTime" | "EMOM" | "Strength" | "Other";
type ParsedWod = {
  date: string;
  title: string;
  description: string;
  type: WodTypeName;
  movements: string[];
  scalingNotes?: string;
  parts?: Array<{
    label: string;
    name: string;
    type?: WodTypeName;
    description?: string;
    movement?: string;
    timeCap?: string;
  }>;
};
type ProgrammingBlock = {
  text: string;
  kind: "heading" | "list" | "text";
};

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const KNOWN_MOVEMENTS = [
  "air squat",
  "back squat",
  "bench press",
  "box jump",
  "burpee",
  "clean",
  "clean and jerk",
  "deadlift",
  "double under",
  "front squat",
  "handstand push-up",
  "hspu",
  "kettlebell swing",
  "lunge",
  "muscle-up",
  "overhead squat",
  "pull-up",
  "push press",
  "push jerk",
  "push-up",
  "ring dip",
  "row",
  "run",
  "sit-up",
  "ski",
  "snatch",
  "strict press",
  "thruster",
  "toes-to-bar",
  "wall ball",
];

function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function inferDate(header: string, startDate: string, sectionIndex: number) {
  const iso = header.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const numeric = header.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric) {
    const year = numeric[3]
      ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
      : Number(startDate.slice(0, 4));
    return `${year}-${numeric[1].padStart(2, "0")}-${numeric[2].padStart(2, "0")}`;
  }

  const dayIndex = WEEKDAYS.findIndex((day) => new RegExp(`\\b${day}\\b`, "i").test(header));
  if (dayIndex >= 0) {
    const start = new Date(`${startDate}T00:00:00`);
    const delta = (dayIndex - start.getDay() + 7) % 7;
    return addDays(startDate, delta);
  }

  return addDays(startDate, sectionIndex);
}

function inferType(text: string): WodTypeName {
  if (/\bamrap\b/i.test(text)) return "AMRAP";
  if (/\bemom\b/i.test(text)) return "EMOM";
  if (/\b(for time|time cap|rounds for time|rft)\b/i.test(text)) return "ForTime";
  if (/\b(strength|squat|deadlift|press|snatch|clean)\b/i.test(text)) return "Strength";
  return "Other";
}

function inferTitle(lines: string[], type: WodTypeName) {
  const firstUseful = lines.find((line) =>
    line.length > 2 &&
    !/^(warm[- ]?up|notes?|scal(e|ing)|strategy|stimulus|coach)/i.test(line)
  );
  if (!firstUseful) return type === "Other" ? "Workout" : type;
  if (/^(amrap|emom|for time|strength)\b/i.test(firstUseful)) return firstUseful.slice(0, 80);
  return firstUseful.length > 80 ? firstUseful.slice(0, 77) + "..." : firstUseful;
}

function extractMovements(text: string) {
  const found = new Set<string>();
  const normalized = text.toLowerCase();
  for (const movement of KNOWN_MOVEMENTS) {
    if (new RegExp(`\\b${movement.replace(/[ -]/g, "[ -]")}s?\\b`, "i").test(normalized)) {
      found.add(movement.replace(/\b\w/g, (char) => char.toUpperCase()).replace("Hspu", "HSPU"));
    }
  }
  return Array.from(found).slice(0, 12);
}

function extractScaling(lines: string[]) {
  const index = lines.findIndex((line) => /^(scale|scaling|modifications?|options?)\b/i.test(line));
  if (index < 0) return undefined;
  return lines.slice(index, Math.min(lines.length, index + 4)).join("\n");
}

function looksLikePartHeading(line: string, index: number, lines: string[]) {
  const text = line.trim();
  const next = lines[index + 1]?.trim();
  if (!next || text.length < 2 || text.length > 60) return false;
  if (/^(?:part\s*)?[A-D][\).:\-]\s*/i.test(text)) return false;
  if (/^(general|specific prep|pre[- ]?workout ramp|add loads|increase loads|every rep|barbell|loading|score|notes?|coach|scale|scaling|modifications?|options?)\b/i.test(text)) {
    return false;
  }
  if (/^(?:for quality|for time|amrap|emom|\d+(?::\d{2})?\s+(?:amrap|emom)|\d+\s+(?:sets?|rounds?))\b/i.test(text)) {
    return false;
  }
  if (/^\d/.test(text) || /[.;:]$/.test(text)) return false;
  if (!/[a-z]/i.test(text)) return false;

  const prev = lines[index - 1]?.trim();
  const previousLooksLikeContent =
    !!prev &&
    !/^(general|specific prep|pre[- ]?workout ramp|for quality|loading|barbell)\b/i.test(prev) &&
    (/^\d/.test(prev) || /[.!?:]$/.test(prev) || prev.length > 60);
  return index === 0 || previousLooksLikeContent || text === text.toUpperCase() || /^["'].*["']$/.test(text);
}

function partFromBoundary(
  boundary: { index: number; bodyStart: number; label: string; name: string },
  next: number,
  lines: string[],
) {
  const body = lines.slice(boundary.bodyStart, next);
  const description = body.join("\n").trim();
  const text = `${boundary.name}\n${description}`;
  const timeCap = text.match(/\b(?:time cap|cap)[: ]+([^\n]+)/i)?.[1]?.trim();
  const movement = extractMovements(text)[0];
  return {
    label: boundary.label,
    name: boundary.name,
    type: inferType(text),
    ...(description ? { description } : {}),
    ...(movement ? { movement } : {}),
    ...(timeCap ? { timeCap } : {}),
  };
}

function parseParts(lines: string[]): ParsedWod["parts"] {
  const boundaries: Array<{ index: number; bodyStart: number; label: string; name: string }> = [];
  lines.forEach((line, index) => {
    const match = line.match(/^(?:part\s*)?([A-D])[\).:\-]\s*(.*)$/i);
    if (!match) return;
    const label = match[1].toUpperCase();
    const inlineName = match[2].trim();
    const nextLine = lines[index + 1]?.trim();
    const nextLooksLikeName =
      !!nextLine &&
      !/^(?:part\s*)?[A-D][\).:\-]\s*/i.test(nextLine) &&
      !/^(scale|scaling|modifications?|options?)\b/i.test(nextLine) &&
      nextLine.length <= 60;
    boundaries.push({
      index,
      bodyStart: inlineName ? index + 1 : nextLooksLikeName ? index + 2 : index + 1,
      label,
      name: inlineName || (nextLooksLikeName ? nextLine : `Part ${label}`),
    });
  });
  if (boundaries.length === 0) {
    lines.forEach((line, index) => {
      if (!looksLikePartHeading(line, index, lines)) return;
      boundaries.push({
        index,
        bodyStart: index + 1,
        label: String.fromCharCode(65 + boundaries.length),
        name: line.trim(),
      });
    });
  }
  if (boundaries.length === 0) return undefined;
  return boundaries.map((boundary, index) => {
    const next = boundaries[index + 1]?.index ?? lines.length;
    return partFromBoundary(boundary, next, lines);
  });
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function cleanHtmlText(html: string) {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function parseProgrammingHtml(html: string): ProgrammingBlock[] {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const blocks: ProgrammingBlock[] = [];
  const blockPattern = /<(h[1-6]|p|li|div)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(body)) !== null) {
    const tag = match[1].toLowerCase();
    const text = cleanHtmlText(match[2]);
    if (!text) continue;
    text.split("\n").forEach((line) => {
      if (!line.trim()) return;
      blocks.push({
        text: line,
        kind: tag.startsWith("h") ? "heading" : tag === "li" ? "list" : "text",
      });
    });
  }

  if (blocks.length > 0) return blocks;
  return cleanHtmlText(body)
    .split("\n")
    .map((text) => ({ text, kind: "text" as const }));
}

function isSectionHeader(block: ProgrammingBlock) {
  const hasWeekday = new RegExp(`\\b(${WEEKDAYS.join("|")})\\b`, "i").test(block.text);
  if (!hasWeekday) return false;
  return block.kind === "heading" || block.text.length <= 80;
}

function parseProgrammingBlocks(blocks: ProgrammingBlock[], startDate: string): ParsedWod[] {
  const lines = blocks.map((block) => block.text);

  const headers: Array<{ index: number; title: string }> = [];
  blocks.forEach((block, index) => {
    if (isSectionHeader(block)) {
      headers.push({ index, title: block.text });
    }
  });

  if (headers.length === 0) {
    headers.push({ index: 0, title: "Workout" });
  }

  return headers
    .map<ParsedWod | null>((header, index) => {
      const next = headers[index + 1]?.index ?? lines.length;
      const body = lines.slice(header.index + 1, next);
      if (body.length === 0 && headers.length > 1) return null;
      const fullText = [header.title, ...body].join("\n");
      const type = inferType(fullText);
      const scalingNotes = extractScaling(body);
      const parts = parseParts(body);
      const title =
        parts && parts.length > 1
          ? parts.map((part) => part.name).join(" + ").slice(0, 80)
          : inferTitle(body.length > 0 ? body : [header.title], type);
      return {
        date: inferDate(header.title, startDate, index),
        title,
        description: body.join("\n") || header.title,
        type,
        movements: extractMovements(fullText),
        ...(scalingNotes ? { scalingNotes } : {}),
        ...(parts && parts.length > 0 ? { parts } : {}),
      };
    })
    .filter((item): item is ParsedWod => item !== null)
    .slice(0, 14);
}

function googleDocExportUrl(url: string) {
  const docId = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (docId) return `https://docs.google.com/document/d/${docId}/export?format=html`;
  const publishedId = url.match(/\/document\/d\/e\/([a-zA-Z0-9_-]+)/)?.[1];
  if (publishedId) return `https://docs.google.com/document/d/e/${publishedId}/pub?output=html`;
  throw new Error("Paste a Google Docs document URL");
}

export const canImportProgramming = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const user = await ctx.db.get(userId);
    return !!user?.gymId && (user.role === "coach" || user.role === "admin");
  },
});

export const previewGoogleDoc = action({
  args: { url: v.string(), startDate: v.string() },
  handler: async (ctx, { url, startDate }) => {
    const canImport: boolean = await ctx.runQuery(internal.wodImport.canImportProgramming, {});
    if (!canImport) throw new Error("Unauthorized");

    const exportUrl = googleDocExportUrl(url);
    const response = await fetch(exportUrl);
    if (!response.ok) {
      throw new Error("Could not read that Google Doc. Make sure link sharing or publishing is enabled.");
    }
    const html = await response.text();
    const blocks = parseProgrammingHtml(html);
    return {
      source: exportUrl,
      sourceFormat: "html",
      items: parseProgrammingBlocks(blocks, startDate),
    };
  },
});

export const importMany = mutation({
  args: {
    wods: v.array(WodImportItem),
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, { wods, overwrite = false }) => {
    const { userId, gymId } = await requireCoachOrAdmin(ctx);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const wod of wods.slice(0, 14)) {
      const program = wod.program ?? DEFAULT_WOD_PROGRAM;
      const existing = await ctx.db
        .query("wods")
        .withIndex("by_gym_date_program", (q) =>
          q.eq("gymId", gymId).eq("date", wod.date).eq("program", program)
        )
        .first();
      const target = existing ?? (
        program === DEFAULT_WOD_PROGRAM
          ? (await ctx.db
              .query("wods")
              .withIndex("by_gym_date", (q) => q.eq("gymId", gymId).eq("date", wod.date))
              .collect()).find((item) => item.program === undefined)
          : null
      );
      if (target && !overwrite) {
        skipped += 1;
        continue;
      }

      if (target) {
        await ctx.db.patch(target._id, { ...wod, program });
        updated += 1;
      } else {
        await ctx.db.insert("wods", { ...wod, program, gymId, createdBy: userId });
        created += 1;
      }
    }

    return { created, updated, skipped };
  },
});
