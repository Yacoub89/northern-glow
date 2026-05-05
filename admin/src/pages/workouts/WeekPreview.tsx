import { Doc } from "@convex/_generated/dataModel";
import { DEFAULT_WOD_PROGRAM } from "./constants";
import { addDays, shortDate, shortDay } from "./helpers";
import { S } from "./styles";
import { WodProgram } from "./types";

type WeekScheduleItem = {
  date: string;
  wod: Doc<"wods"> | null;
};

type WeekPreviewProps = {
  days: string[];
  schedule: WeekScheduleItem[] | undefined;
  startDate: string;
  viewProgram: WodProgram;
  onCreate: (date: string) => void;
  onDelete: (wod: Doc<"wods">) => void;
  onEdit: (wod: Doc<"wods">) => void;
};

export function WeekPreview({
  days,
  schedule,
  startDate,
  viewProgram,
  onCreate,
  onDelete,
  onEdit,
}: WeekPreviewProps) {
  return (
    <section style={S.panel}>
      <div style={S.panelHead}>
        <h2 style={S.panelTitle}>Week Preview</h2>
        <span style={S.panelMeta}>
          {viewProgram} · {shortDate(startDate)} - {shortDate(addDays(startDate, 6))}
        </span>
      </div>
      <div style={S.schedule}>
        {(schedule ?? days.map((day) => ({ date: day, wod: null }))).map(({ date: wodDate, wod }) => (
          <article key={wodDate} style={S.dayCard}>
            <div style={S.dayTop}>
              <div style={S.dayTitle}>{shortDay(wodDate)}</div>
              <div style={S.dayDate}>{shortDate(wodDate)}</div>
            </div>
            {wod ? (
              <>
                <div style={S.wodMeta}>{wod.program ?? DEFAULT_WOD_PROGRAM} · {wod.type}</div>
                <div style={S.wodTitle}>{wod.title}</div>
                <div style={S.desc}>{wod.description}</div>
                {wod.movements.length > 0 && (
                  <div style={S.chips}>
                    {wod.movements.map((movement) => (
                      <span key={movement} style={S.chip}>
                        {movement}
                      </span>
                    ))}
                  </div>
                )}
                {wod.scalingNotes && <div style={S.scaling}>Scaling: {wod.scalingNotes}</div>}
                <div style={S.formActions}>
                  <button style={{ ...S.btn(false), padding: "7px 10px" }} type="button" onClick={() => onEdit(wod)}>
                    Edit
                  </button>
                  <button style={{ ...S.btn(false), padding: "7px 10px", color: "#ff8a80" }} type="button" onClick={() => onDelete(wod)}>
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div style={S.empty}>No WOD posted.</div>
                <button
                  style={{ ...S.btn(false), padding: "7px 10px" }}
                  type="button"
                  onClick={() => onCreate(wodDate)}
                >
                  Create
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
