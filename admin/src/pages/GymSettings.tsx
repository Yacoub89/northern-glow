import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMediaQuery } from "../components/useMediaQuery";

const ALL_TIMEZONES: string[] = (Intl as any).supportedValuesOf
  ? (Intl as any).supportedValuesOf("timeZone")
  : [
      "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
      "America/Toronto","America/Vancouver","Europe/London","Europe/Paris","Australia/Sydney",
    ];

type SettingsTab = "profile" | "mobile" | "payments";

const S = {
  h1: { fontSize: 24, fontWeight: 700, margin: "0 0 8px" },
  sub: { color: "#777", fontSize: 14, margin: "0 0 22px", lineHeight: 1.5 },
  form: { maxWidth: 560, width: "100%" },
  group: { marginBottom: 20 },
  label: { display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 },
  input: {
    width: "100%", background: "#1e1e1e", border: "1px solid #333", borderRadius: 8,
    padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const,
  },
  select: {
    width: "100%", background: "#1e1e1e", border: "1px solid #333", borderRadius: 8,
    padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const,
  },
  colorRow: { display: "flex", alignItems: "center", gap: 12 },
  colorSwatch: (color: string) => ({
    width: 36, height: 36, borderRadius: 6, background: color, border: "2px solid #333",
    flexShrink: 0, cursor: "pointer", position: "relative" as const, overflow: "hidden",
  }),
  colorNativeInput: {
    position: "absolute" as const, inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%",
  },
  tzWrapper: { position: "relative" as const },
  tzDropdown: {
    position: "absolute" as const, top: "100%", left: 0, right: 0, zIndex: 100,
    background: "#1e1e1e", border: "1px solid #444", borderRadius: 8, marginTop: 4,
    maxHeight: 220, overflowY: "auto" as const, boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  },
  tzOption: (active: boolean) => ({
    padding: "9px 12px", fontSize: 13, cursor: "pointer",
    background: active ? "#2a2a2a" : "transparent", color: active ? "#fff" : "#ccc",
  }),
  logoArea: {
    display: "flex", alignItems: "center", gap: 16,
  },
  logoPreview: {
    width: 72, height: 72, borderRadius: 10, border: "1px solid #333",
    objectFit: "contain" as const, background: "#1e1e1e",
  },
  logoPlaceholder: {
    width: 72, height: 72, borderRadius: 10, border: "1px dashed #444",
    background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center",
    color: "#555", fontSize: 11,
  },
  uploadBtn: {
    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: "pointer", border: "1px solid #444", background: "#1e1e1e", color: "#ccc",
  },
  uploadHint: { fontSize: 11, color: "#555", marginTop: 4 },
  btn: {
    padding: "11px 24px", borderRadius: 8, fontWeight: 600, fontSize: 14,
    cursor: "pointer", border: "none", background: "#1BBFBF", color: "#000",
  },
  saved: { color: "#34C759", fontSize: 13, marginLeft: 12 },
  tabs: { display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 22 },
  tabBtn: (active: boolean) => ({
    padding: "10px 14px",
    borderRadius: 7,
    fontWeight: 750,
    fontSize: 13,
    cursor: "pointer",
    border: `1px solid ${active ? "#1BBFBF" : "#333"}`,
    background: active ? "#1BBFBF" : "#141414",
    color: active ? "#001313" : "#aaa",
  }),
  section: { marginTop: 0 },
  sectionTitle: { fontSize: 16, fontWeight: 600, marginBottom: 6 },
  sectionSub: { fontSize: 13, color: "#666", marginBottom: 20 },
};

export default function GymSettings() {
  const gym = useQuery(api.gyms.getMyGym);
  const updateSettings = useMutation(api.gyms.updateSettings);
  const generateLogoUploadUrl = useMutation(api.gyms.generateLogoUploadUrl);
  const isMobile = useMediaQuery("(max-width: 760px)");

  const [form, setForm] = useState({
    name: "",
    tagline: "",
    primaryColor: "#1BBFBF",
    timezone: "America/New_York",
    logoStorageId: undefined as Id<"_storage"> | undefined,
    appIconStorageId: undefined as Id<"_storage"> | undefined,
    splashStorageId: undefined as Id<"_storage"> | undefined,
    stripeUnlimitedMonthlyPriceId: "",
    stripeUnlimitedAnnualPriceId: "",
    stripeTwiceWeeklyMonthlyPriceId: "",
    stripeTwiceWeeklyAnnualPriceId: "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingSplash, setUploadingSplash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appIconInputRef = useRef<HTMLInputElement>(null);
  const splashInputRef = useRef<HTMLInputElement>(null);
  const [tzSearch, setTzSearch] = useState("");
  const [tzOpen, setTzOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const tzRef = useRef<HTMLDivElement>(null);

  const logoUrl = useQuery(
    api.gyms.getLogoUrl,
    form.logoStorageId ? { storageId: form.logoStorageId } : "skip"
  );
  const appIconUrl = useQuery(
    api.gyms.getLogoUrl,
    form.appIconStorageId ? { storageId: form.appIconStorageId } : "skip"
  );
  const splashUrl = useQuery(
    api.gyms.getLogoUrl,
    form.splashStorageId ? { storageId: form.splashStorageId } : "skip"
  );

  const filteredTz = ALL_TIMEZONES.filter((tz) =>
    tz.toLowerCase().includes(tzSearch.toLowerCase())
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tzRef.current && !tzRef.current.contains(e.target as Node)) setTzOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (gym) {
      setTzSearch(gym.timezone);
      setForm({
        name: gym.name,
        tagline: gym.tagline,
        primaryColor: gym.primaryColor,
        timezone: gym.timezone,
        logoStorageId: gym.logoStorageId,
        appIconStorageId: gym.appIconStorageId,
        splashStorageId: gym.splashStorageId,
        stripeUnlimitedMonthlyPriceId: gym.stripeUnlimitedMonthlyPriceId ?? "",
        stripeUnlimitedAnnualPriceId: gym.stripeUnlimitedAnnualPriceId ?? "",
        stripeTwiceWeeklyMonthlyPriceId: gym.stripeTwiceWeeklyMonthlyPriceId ?? "",
        stripeTwiceWeeklyAnnualPriceId: gym.stripeTwiceWeeklyAnnualPriceId ?? "",
      });
    }
  }, [gym]);

  const uploadImage = async (
    file: File,
    maxBytes: number,
    label: string,
    setLoading: (v: boolean) => void,
    onSuccess: (id: Id<"_storage">) => Promise<void>,
    inputEl: HTMLInputElement,
  ) => {
    if (file.size > maxBytes) {
      alert(`${label} must be under ${maxBytes / 1024 / 1024} MB.`);
      return;
    }
    setLoading(true);
    try {
      const uploadUrl = await generateLogoUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", body: file, headers: { "Content-Type": file.type } });
      if (!res.ok) throw new Error(`${label} upload failed`);
      const { storageId } = await res.json() as { storageId: Id<"_storage"> };
      await onSuccess(storageId);
    } finally {
      setLoading(false);
      inputEl.value = "";
    }
  };

  const persistUploadedImage = async (
    field: "logoStorageId" | "appIconStorageId" | "splashStorageId",
    id: Id<"_storage">,
  ) => {
    setForm((f) => ({ ...f, [field]: id }));
    await updateSettings({ [field]: id });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file, 1024 * 1024, "Logo", setUploading, (id) => persistUploadedImage("logoStorageId", id), e.target);
  };

  const handleAppIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file, 2 * 1024 * 1024, "App icon", setUploadingIcon, (id) => persistUploadedImage("appIconStorageId", id), e.target);
  };

  const handleSplashChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file, 5 * 1024 * 1024, "Splash image", setUploadingSplash, (id) => persistUploadedImage("splashStorageId", id), e.target);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        name: form.name,
        tagline: form.tagline,
        primaryColor: form.primaryColor,
        timezone: form.timezone,
        logoStorageId: form.logoStorageId,
        appIconStorageId: form.appIconStorageId,
        splashStorageId: form.splashStorageId,
        stripeUnlimitedMonthlyPriceId: form.stripeUnlimitedMonthlyPriceId || undefined,
        stripeUnlimitedAnnualPriceId: form.stripeUnlimitedAnnualPriceId || undefined,
        stripeTwiceWeeklyMonthlyPriceId: form.stripeTwiceWeeklyMonthlyPriceId || undefined,
        stripeTwiceWeeklyAnnualPriceId: form.stripeTwiceWeeklyAnnualPriceId || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  if (!gym) return null;

  return (
    <div>
      <h1 style={S.h1}>Gym Settings</h1>
      <p style={S.sub}>Manage your gym profile, mobile app branding, and payment configuration.</p>
      <div style={S.tabs} role="tablist" aria-label="Gym settings sections">
        <button
          style={S.tabBtn(activeTab === "profile")}
          type="button"
          role="tab"
          aria-selected={activeTab === "profile"}
          onClick={() => setActiveTab("profile")}
        >
          Profile
        </button>
        <button
          style={S.tabBtn(activeTab === "mobile")}
          type="button"
          role="tab"
          aria-selected={activeTab === "mobile"}
          onClick={() => setActiveTab("mobile")}
        >
          Mobile App
        </button>
        <button
          style={S.tabBtn(activeTab === "payments")}
          type="button"
          role="tab"
          aria-selected={activeTab === "payments"}
          onClick={() => setActiveTab("payments")}
        >
          Payments
        </button>
      </div>
      <form style={S.form} onSubmit={handleSubmit}>
        {activeTab === "profile" && (
          <section style={S.section} role="tabpanel">
            <div style={S.group}>
              <label style={S.label}>Logo</label>
              <div style={{ ...S.logoArea, alignItems: isMobile ? "flex-start" : "center" }}>
                {logoUrl
                  ? <img src={logoUrl} alt="Gym logo" style={S.logoPreview} />
                  : <div style={S.logoPlaceholder}>No logo</div>
                }
                <div>
                  <button type="button" style={S.uploadBtn} disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                    {uploading ? "Uploading…" : logoUrl ? "Replace" : "Upload logo"}
                  </button>
                  <div style={S.uploadHint}>PNG or SVG · max 1 MB</div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/png,image/svg+xml,image/jpeg" style={{ display: "none" }} onChange={handleLogoChange} />
              </div>
            </div>
            <div style={S.group}>
              <label style={S.label}>Gym name</label>
              <input style={S.input} value={form.name} onChange={set("name")} required />
            </div>
            <div style={S.group}>
              <label style={S.label}>Tagline</label>
              <input style={S.input} value={form.tagline} onChange={set("tagline")} placeholder="Powered by NorthernGlow" />
            </div>
            <div style={S.group}>
              <label style={S.label}>Primary colour</label>
              <div style={S.colorRow}>
                <div style={S.colorSwatch(form.primaryColor)} title="Pick a colour">
                  <input
                    type="color"
                    style={S.colorNativeInput}
                    value={form.primaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                  />
                </div>
                <input
                  style={S.input}
                  value={form.primaryColor}
                  onChange={set("primaryColor")}
                  placeholder="#1BBFBF"
                  maxLength={7}
                />
              </div>
            </div>
            <div style={S.group}>
              <label style={S.label}>Timezone</label>
              <div style={S.tzWrapper} ref={tzRef}>
                <input
                  style={S.input}
                  value={tzSearch}
                  placeholder="Search timezone…"
                  onFocus={() => setTzOpen(true)}
                  onChange={(e) => {
                    setTzSearch(e.target.value);
                    setTzOpen(true);
                  }}
                />
                {tzOpen && filteredTz.length > 0 && (
                  <div style={S.tzDropdown}>
                    {filteredTz.map((tz) => (
                      <div
                        key={tz}
                        style={S.tzOption(tz === form.timezone)}
                        onMouseDown={() => {
                          setForm((f) => ({ ...f, timezone: tz }));
                          setTzSearch(tz);
                          setTzOpen(false);
                        }}
                      >
                        {tz}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "mobile" && (
          <section style={S.section} role="tabpanel">
            <div style={S.sectionTitle}>Mobile app images</div>
            <div style={S.sectionSub}>
              Used to brand the iOS and Android apps. Icon should be 1024×1024 PNG. Splash should be 2048×2048 PNG.
            </div>
            <div style={{ display: "flex", gap: isMobile ? 22 : 32, flexDirection: isMobile ? "column" : "row", flexWrap: "wrap" as const }}>
              <div>
                <div style={{ ...S.label, marginBottom: 10 }}>App icon</div>
                <div style={{ ...S.logoArea, alignItems: isMobile ? "flex-start" : "center" }}>
                  {appIconUrl
                    ? <img src={appIconUrl} alt="App icon" style={{ ...S.logoPreview, borderRadius: 16 }} />
                    : <div style={S.logoPlaceholder}>No icon</div>
                  }
                  <div>
                    <button type="button" style={S.uploadBtn} disabled={uploadingIcon} onClick={() => appIconInputRef.current?.click()}>
                      {uploadingIcon ? "Uploading…" : appIconUrl ? "Replace" : "Upload icon"}
                    </button>
                    <div style={S.uploadHint}>PNG · 1024×1024 · max 2 MB</div>
                  </div>
                  <input ref={appIconInputRef} type="file" accept="image/png" style={{ display: "none" }} onChange={handleAppIconChange} />
                </div>
              </div>
              <div>
                <div style={{ ...S.label, marginBottom: 10 }}>Splash screen</div>
                <div style={{ ...S.logoArea, alignItems: isMobile ? "flex-start" : "center" }}>
                  {splashUrl
                    ? <img src={splashUrl} alt="Splash screen" style={{ ...S.logoPreview, width: 120, height: 72, borderRadius: 6 }} />
                    : <div style={{ ...S.logoPlaceholder, width: 120, height: 72, borderRadius: 6 }}>No splash</div>
                  }
                  <div>
                    <button type="button" style={S.uploadBtn} disabled={uploadingSplash} onClick={() => splashInputRef.current?.click()}>
                      {uploadingSplash ? "Uploading…" : splashUrl ? "Replace" : "Upload splash"}
                    </button>
                    <div style={S.uploadHint}>PNG · 2048×2048 · max 5 MB</div>
                  </div>
                  <input ref={splashInputRef} type="file" accept="image/png" style={{ display: "none" }} onChange={handleSplashChange} />
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "payments" && (
          <section style={S.section} role="tabpanel">
            <div style={S.sectionTitle}>Stripe price IDs</div>
            <div style={S.sectionSub}>
              Leave blank to use the platform defaults. Create products in your Stripe dashboard and paste the price IDs here.
            </div>
            {[
              ["stripeUnlimitedMonthlyPriceId", "Unlimited — Monthly"],
              ["stripeUnlimitedAnnualPriceId", "Unlimited — Annual"],
              ["stripeTwiceWeeklyMonthlyPriceId", "Twice Weekly — Monthly"],
              ["stripeTwiceWeeklyAnnualPriceId", "Twice Weekly — Annual"],
            ].map(([field, label]) => (
              <div key={field} style={S.group}>
                <label style={S.label}>{label}</label>
                <input
                  style={S.input}
                  value={form[field as keyof typeof form]}
                  onChange={set(field as keyof typeof form)}
                  placeholder="price_..."
                />
              </div>
            ))}
          </section>
        )}

        <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
          <button style={S.btn} type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span style={S.saved}>Saved!</span>}
        </div>
      </form>
    </div>
  );
}
