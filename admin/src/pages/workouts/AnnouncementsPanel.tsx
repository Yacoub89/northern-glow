import { FormEvent } from "react";
import { Id } from "@convex/_generated/dataModel";
import { shortDate } from "./helpers";
import { S } from "./styles";
import { Announcement } from "./types";

type AnnouncementsPanelProps = {
  announcements: Announcement[] | undefined;
  announcementBody: string;
  announcementEndDate: string;
  announcementError: string;
  announcementPinned: boolean;
  announcementSaving: boolean;
  announcementStartDate: string;
  announcementSuccess: string;
  announcementTitle: string;
  isMobile: boolean;
  onCreateAnnouncement: (event: FormEvent) => void;
  onDeleteAnnouncement: (id: Id<"announcements">) => void;
  setAnnouncementBody: (value: string) => void;
  setAnnouncementEndDate: (value: string) => void;
  setAnnouncementPinned: (value: boolean) => void;
  setAnnouncementStartDate: (value: string) => void;
  setAnnouncementTitle: (value: string) => void;
};

export function AnnouncementsPanel({
  announcements,
  announcementBody,
  announcementEndDate,
  announcementError,
  announcementPinned,
  announcementSaving,
  announcementStartDate,
  announcementSuccess,
  announcementTitle,
  isMobile,
  onCreateAnnouncement,
  onDeleteAnnouncement,
  setAnnouncementBody,
  setAnnouncementEndDate,
  setAnnouncementPinned,
  setAnnouncementStartDate,
  setAnnouncementTitle,
}: AnnouncementsPanelProps) {
  return (
    <section style={S.panel}>
      <div style={S.panelHead}>
        <div>
          <h2 style={S.panelTitle}>Announcements</h2>
          <p style={{ ...S.sub, marginTop: 6 }}>Post short gym notices that athletes see above the WOD.</p>
        </div>
      </div>
      <form onSubmit={onCreateAnnouncement}>
        <div style={{ ...S.formGrid, gridTemplateColumns: isMobile ? "1fr" : S.formGrid.gridTemplateColumns }}>
          <label style={S.field}>
            <span style={S.label}>Title</span>
            <input style={S.input} value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} placeholder="New gym number" required />
          </label>
          <label style={S.field}>
            <span style={S.label}>Start date</span>
            <input style={S.input} type="date" value={announcementStartDate} onChange={(e) => setAnnouncementStartDate(e.target.value)} required />
          </label>
          <label style={S.field}>
            <span style={S.label}>End date</span>
            <input style={S.input} type="date" value={announcementEndDate} onChange={(e) => setAnnouncementEndDate(e.target.value)} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#4b5563", fontSize: 13, paddingTop: 25 }}>
            <input style={S.check} type="checkbox" checked={announcementPinned} onChange={(e) => setAnnouncementPinned(e.target.checked)} />
            Pin to top
          </label>
        </div>
        <label style={{ ...S.field, marginBottom: 12 }}>
          <span style={S.label}>Message</span>
          <textarea style={S.textarea} value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} placeholder="Effective today, call 613-800-9671." required />
        </label>
        <div style={S.formActions}>
          <button style={S.btn(true)} type="submit" disabled={announcementSaving}>
            {announcementSaving ? "Posting..." : "Post Announcement"}
          </button>
        </div>
      </form>
      <div style={S.importList}>
        {(announcements ?? []).map((item) => (
          <div key={item._id} style={S.importRow}>
            <div style={S.dayTop}>
              <div>
                <div style={S.wodTitle}>{item.title}</div>
                <div style={S.panelMeta}>
                  {shortDate(item.startDate)}
                  {item.endDate ? ` - ${shortDate(item.endDate)}` : ""}
                  {item.pinned ? " · pinned" : ""}
                </div>
              </div>
              <button style={{ ...S.btn(false), padding: "7px 10px" }} type="button" onClick={() => onDeleteAnnouncement(item._id)}>
                Delete
              </button>
            </div>
            <div style={S.desc}>{item.body}</div>
          </div>
        ))}
        {announcements?.length === 0 && <div style={S.empty}>No announcements yet.</div>}
      </div>
      {announcementError && <p style={S.error}>{announcementError}</p>}
      {announcementSuccess && <p style={S.success}>{announcementSuccess}</p>}
    </section>
  );
}
