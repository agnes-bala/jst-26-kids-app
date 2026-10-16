import { useState, useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import Header from "../components/Header";
import {
  loadKids,
  loadPresentMany,
  clearAttendanceCaches,
  recentSessionDates,
  formatDate,
  stdLabel,
  waNumber,
  todayIso,
} from "./AttendanceApi";
import type { Kid, PresentMap } from "./AttendanceApi";

// ─── Types ──────────────────────────────────────────────────────────────
interface Row {
  kid: Kid;
  eligible: number; // Sundays this child could have attended
  present: number;
  rate: number; // %
  missedStreak: number; // Sundays missed in a row (up to the latest)
  currentStreak: number; // Sundays attended in a row (up to the latest)
  bestStreak: number;
  lastSeen: string; // yyyy-mm-dd or ""
  isNew: boolean; // first Sunday attended is the latest one
}

type TabKey = "followup" | "streak" | "new";

const DEFAULT_MESSAGE =
  "Hello, we missed {name} at our Sunday meeting. We hope everything is well. We would love to see {name} this Sunday!";

// "Contacted" marks are kept in this browser only
const CONTACT_KEY = "followup:contacted";
const readContacted = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(CONTACT_KEY) || "{}");
  } catch {
    return {};
  }
};

const AVATARS = [
  ["#ede9fe", "#7c3aed"],
  ["#dbeafe", "#2563eb"],
  ["#fce7f3", "#db2777"],
  ["#dcfce7", "#16a34a"],
  ["#ffedd5", "#ea580c"],
];
const avatarFor = (name: string) =>
  AVATARS[(name.charCodeAt(0) || 0) % AVATARS.length];
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase() || "?";

// Colors are applied inline so global CSS / dark mode / UI-library resets cannot hide them
const PILL_COLORS: Record<string, CSSProperties> = {
  red: { background: "#fee2e2", color: "#b91c1c" },
  green: { background: "#dcfce7", color: "#15803d" },
  amber: { background: "#fef3c7", color: "#92400e" },
  violet: { background: "#ede9fe", color: "#6d28d9" },
};
const pillStyle = (kind: keyof typeof PILL_COLORS): CSSProperties => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 700,
  ...PILL_COLORS[kind],
});
const WA_STYLE: CSSProperties = {
  background: "#16a34a",
  borderColor: "#16a34a",
  color: "#ffffff",
};
const CALL_STYLE: CSSProperties = {
  background: "#ffffff",
  borderColor: "#c4b5fd",
  color: "#6d28d9",
};

const pageNumbers = (current: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("…a");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push("…b");
    pages.push(total);
  }
  return pages;
};

// How many table rows fit in the available height, so the page never scrolls
const ROW_H = 52;
const HEAD_H = 36;
const useFitRows = (rowH: number, headH: number) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(8);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calc = () => {
      const h = el.clientHeight;
      if (h > 0) setRows(Math.max(3, Math.floor((h - headH) / rowH)));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rowH, headH]);
  return [ref, rows] as const;
};

const css = `
.fu { height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; background: #f8f7ff; color: #111827;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.fu { color-scheme: light; }
.fu, .fu * { text-align: left; box-sizing: border-box; }
.fu-table td, .fu-table td div { color: #111827; }
.fu select option { color: #111827; background: #ffffff; }
.fu button { width: auto; transform: none !important; font-family: inherit; }
.fu-top { flex: none; position: relative; z-index: 100; }
.fu-scroll { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.fu-wrap { width: 100%; max-width: 1200px; margin: 0 auto; padding: 12px 20px 14px; display: flex; flex: 1; min-height: 0; flex-direction: column; gap: 10px; }
.fu-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.fu-title { font-size: 20px; font-weight: 800; margin: 0; color: #111827; }
.fu-sub { font-size: 13px; color: #6b7280; margin: 3px 0 0; }
.fu-tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.fu select, .fu input[type="text"] { height: 34px; padding: 0 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; background: #fff; color: #374151; font-family: inherit; }
.fu select:focus-visible, .fu input:focus-visible, .fu textarea:focus-visible, .fu button:focus-visible, .fu a:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
.fu .fu-btn { height: 34px; padding: 0 14px; border-radius: 8px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; text-decoration: none; }
.fu .fu-btn:hover:not(:disabled) { border-color: #c4b5fd; color: #7c3aed; }
.fu .fu-btn.on { border-color: #7c3aed; color: #7c3aed; background: #f5f3ff; }
.fu .fu-btn:disabled { opacity: .55; cursor: not-allowed; }
.fu .fu-wa { background: #16a34a; border-color: #16a34a; color: #fff; height: 30px; padding: 0 10px; font-size: 12px; }
.fu .fu-wa:hover { background: #15803d; border-color: #15803d; color: #fff; }
.fu .fu-call { height: 30px; padding: 0 10px; font-size: 12px; }
.fu-error { padding: 8px 12px; border-radius: 8px; font-size: 13px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.fu-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
.fu-head, .fu-stats, .fu-error { flex: none; }
.fu-tabs, .fu-bar, .fu-pag, .fu-msgbox { flex: none; }
.fu-stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px 12px; }
.fu-sl { font-size: 12px; color: #6b7280; margin: 0; font-weight: 500; }
.fu-sv { font-size: 20px; font-weight: 800; margin: 0; line-height: 1.2; }
.fu-sn { font-size: 11px; color: #9ca3af; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fu-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; flex: 1; min-height: 0; display: flex; flex-direction: column; }
.fu-tabs { display: flex; gap: 4px; padding: 6px; border-bottom: 1px solid #f3f4f6; overflow-x: auto; }
.fu .fu-tab { border: none; background: transparent; color: #6b7280; font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 8px; cursor: pointer; white-space: nowrap; display: inline-flex; gap: 8px; align-items: center; }
.fu .fu-tab:hover { background: #f5f3ff; color: #7c3aed; }
.fu .fu-tab.on { background: #7c3aed; color: #fff; }
.fu-tab .n { background: rgba(124, 58, 237, .12); color: inherit; border-radius: 20px; padding: 1px 8px; font-size: 11.5px; }
.fu .fu-tab.on .n { background: rgba(255, 255, 255, .25); }
.fu-bar { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 10px 14px; border-bottom: 1px solid #f3f4f6; }
.fu-hint { font-size: 12px; color: #6b7280; }
.fu-tw { flex: 1; min-height: 0; overflow: hidden; }
.fu-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.fu-table tbody tr { height: 52px; }
.fu-c-no { width: 48px; } .fu-c-id { width: 100px; } .fu-c-mob { width: 130px; } .fu-c-ls { width: 110px; } .fu-c-st { width: 130px; } .fu-c-att { width: 140px; } .fu-c-act { width: 170px; }
.fu-table th { padding: 0 12px; height: 36px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; background: #fafafa; border-bottom: 1px solid #f3f4f6; white-space: nowrap; }
.fu-table td { padding: 0 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fu-name > div { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fu-name > div > div { overflow: hidden; text-overflow: ellipsis; }
.fu-table tr:hover td { background: #faf5ff; }
.fu-name { display: flex; align-items: center; gap: 10px; font-weight: 600; }
.fu-av { width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.fu-meta { font-size: 11.5px; color: #9ca3af; font-weight: 400; }
.fu-done { color: #16a34a; font-weight: 600; }
.fu-pill { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.fu-pill.red { background: #fef2f2; color: #dc2626; }
.fu-pill.green { background: #f0fdf4; color: #16a34a; }
.fu-pill.amber { background: #fffbeb; color: #b45309; }
.fu-pill.violet { background: #f5f3ff; color: #7c3aed; }
.fu-bartrack { height: 6px; border-radius: 99px; background: #fee2e2; overflow: hidden; width: 90px; margin-top: 4px; }
.fu-bartrack > span { display: block; height: 100%; background: #16a34a; }
.fu-act { display: flex; gap: 6px; }
.fu .fu-tel { color: #2563eb; text-decoration: none; font-weight: 600; }
.fu .fu-nm { color: #111827; text-decoration: none; }
.fu .fu-nm:hover { color: #7c3aed; text-decoration: underline; }
.fu-empty { padding: 40px 20px; text-align: center; color: #9ca3af; font-size: 14px; }
.fu-empty * { text-align: center; }
.fu-spin { width: 24px; height: 24px; border: 3px solid #ede9fe; border-top-color: #7c3aed; border-radius: 50%; animation: fu-rot .8s linear infinite; margin: 0 auto 12px; }
@keyframes fu-rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .fu-spin { animation: none; } }
.fu-pag { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 10px 14px; border-top: 1px solid #f3f4f6; }
.fu-showing { font-size: 12.5px; color: #6b7280; }
.fu-pages { display: flex; align-items: center; gap: 5px; }
.fu .fu-pg { min-width: 32px; height: 32px; padding: 0 8px; border-radius: 6px; border: 1.5px solid #e5e7eb; background: #ffffff; color: #374151; font-size: 13px; font-weight: 500; cursor: pointer; }
.fu .fu-pg:disabled { opacity: .4; cursor: default; }
.fu-dots { width: 20px; text-align: center; color: #9ca3af; }
.fu-sl-no { color: #6b7280; font-weight: 600; width: 48px; }
.fu-id { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: #4b5563; background: #f3f4f6; border-radius: 6px; padding: 2px 6px; white-space: nowrap; }
.fu-msg { width: 100%; resize: none; height: 56px; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 13px; font-family: inherit; color: #111827; }
.fu-msgbox { padding: 8px 14px 10px; border-top: 1px solid #f3f4f6; background: #fafafa; }
.fu-msgbox label { font-size: 12px; font-weight: 600; color: #374151; display: block; margin-bottom: 6px; }
@media (max-width: 1100px) { .fu-hide-md { display: none; } }
@media (max-width: 760px) { .fu-hide-sm { display: none; } .fu-c-act { width: 150px; } .fu-c-st { width: 100px; } }
@media (max-width: 600px) {
  .fu-wrap { padding: 8px 10px 10px; gap: 8px; }
  .fu-title { font-size: 18px; }
  .fu-sub, .fu-sn { display: none; }
  .fu-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .fu-stat { padding: 6px 8px; }
  .fu-sl { font-size: 10.5px; }
  .fu-sv { font-size: 17px; }
  .fu-tools { gap: 6px; }
}
`;

// ─── Page ───────────────────────────────────────────────────────────────
export default function FollowUp() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [presentByDate, setPresentByDate] = useState<Record<string, PresentMap>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weeks, setWeeks] = useState(12);
  const [threshold, setThreshold] = useState(3);
  const [page, setPage] = useState(1);
  const [showMsg, setShowMsg] = useState(false);
  const [tableRef, perPage] = useFitRows(ROW_H, HEAD_H);
  const [tab, setTab] = useState<TabKey>("followup");
  const [search, setSearch] = useState("");
  const [template, setTemplate] = useState(DEFAULT_MESSAGE);
  const [reloadKey, setReloadKey] = useState(0);
  const [contacted, setContacted] = useState<Record<string, string>>(readContacted);
  const [hideContacted, setHideContacted] = useState(false);

  const markContacted = (id: string) =>
    setContacted((prev) => {
      const next = { ...prev, [id]: todayIso() };
      try {
        localStorage.setItem(CONTACT_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable – ignore */
      }
      return next;
    });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const kidList = await loadKids();
        if (cancelled) return;
        const dates = recentSessionDates(weeks);
        const { data, failed } = await loadPresentMany(dates);
        if (cancelled) return;
        setKids(kidList);
        setPresentByDate(data);
        if (failed.length === dates.length) {
          setError("Could not load attendance from the server.");
        } else if (failed.length > 0) {
          setError(
            `${failed.length} date(s) could not be loaded, so streaks may be inaccurate. Press Refresh to retry.`,
          );
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weeks, reloadKey]);

  // Only Sundays on which somebody actually came count as meetings
  // (a cancelled Sunday must not count as "missed" for everyone)
  const sessions = useMemo(
    () =>
      Object.keys(presentByDate)
        .filter((d) => Object.keys(presentByDate[d]).length > 0)
        .sort(),
    [presentByDate],
  );

  const rows = useMemo<Row[]>(() => {
    if (sessions.length === 0) return [];
    const latest = sessions[sessions.length - 1];
    const prev = sessions.length > 1 ? sessions[sessions.length - 2] : "";

    const out: Row[] = [];
    kids.forEach((kid) => {
      const flags: { date: string; here: boolean }[] = [];
      sessions.forEach((d) => {
        const here = presentByDate[d]?.[kid.id] !== undefined;
        // a child cannot "miss" a Sunday before they were registered
        if (here || !kid.createdDate || kid.createdDate <= d) {
          flags.push({ date: d, here });
        }
      });
      if (flags.length === 0) return;

      let present = 0;
      let best = 0;
      let run = 0;
      flags.forEach((f) => {
        if (f.here) {
          present += 1;
          run += 1;
          best = Math.max(best, run);
        } else {
          run = 0;
        }
      });
      let missed = 0;
      for (let i = flags.length - 1; i >= 0 && !flags[i].here; i--) missed += 1;
      let current = 0;
      for (let i = flags.length - 1; i >= 0 && flags[i].here; i--) current += 1;

      const lastSeen = [...flags].reverse().find((f) => f.here)?.date ?? "";
      const cameBefore = flags.some((f) => f.here && f.date < latest);
      const atLatest = presentByDate[latest]?.[kid.id] !== undefined;
      const isNew =
        atLatest &&
        !cameBefore &&
        (!kid.createdDate || prev === "" || kid.createdDate > prev);

      out.push({
        kid,
        eligible: flags.length,
        present,
        rate: Math.round((present / flags.length) * 100),
        missedStreak: missed,
        currentStreak: current,
        bestStreak: best,
        lastSeen,
        isNew,
      });
    });
    return out;
  }, [kids, presentByDate, sessions]);

  const latestDate = sessions[sessions.length - 1] ?? "";
  const prevDate = sessions.length > 1 ? sessions[sessions.length - 2] : "";

  // contacted on/after the latest meeting = already handled this week
  const isContacted = (id: string) => !!contacted[id] && contacted[id] >= latestDate;

  const followUp = rows
    .filter((r) => r.missedStreak >= threshold)
    .sort(
      (a, b) =>
        b.missedStreak - a.missedStreak || a.kid.name.localeCompare(b.kid.name),
    );
  const streaks = rows
    .filter((r) => r.currentStreak >= 3)
    .sort(
      (a, b) =>
        b.currentStreak - a.currentStreak || a.kid.name.localeCompare(b.kid.name),
    );
  const newKids = rows
    .filter((r) => r.isNew)
    .sort((a, b) => a.kid.name.localeCompare(b.kid.name));
  const perfect = rows.filter((r) => r.eligible >= 4 && r.rate === 100).length;

  // Retention = of the children who came the Sunday before, how many came again
  const retention = useMemo(() => {
    if (!latestDate || !prevDate) return null;
    const before = Object.keys(presentByDate[prevDate] ?? {});
    if (before.length === 0) return null;
    const again = before.filter(
      (id) => presentByDate[latestDate]?.[id] !== undefined,
    ).length;
    return { pct: Math.round((again / before.length) * 100), again, total: before.length };
  }, [presentByDate, latestDate, prevDate]);

  const list = tab === "followup" ? followUp : tab === "streak" ? streaks : newKids;
  const q = search.trim().toLowerCase();
  const shown = list.filter(
    (r) =>
      (!q ||
        r.kid.name.toLowerCase().includes(q) ||
        r.kid.mobile.includes(q) ||
        r.kid.place.toLowerCase().includes(q)) &&
      !(tab === "followup" && hideContacted && isContacted(r.kid.id)),
  );

  const totalPages = Math.max(1, Math.ceil(shown.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const pageRows = shown.slice(startIdx, startIdx + perPage);

  const messageFor = (name: string) => template.split("{name}").join(name);

  const exportCsv = () => {
    const head = ["SL No", "Student ID", "Name", "Class", "Mobile", "Place", "Last seen", "Missed in a row", "Attended", "Eligible", "Rate %", "Contacted"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = shown.map((r, i) =>
      [
        i + 1,
        r.kid.id,
        r.kid.name,
        stdLabel(r.kid.std),
        r.kid.mobile,
        r.kid.place,
        r.lastSeen,
        r.missedStreak,
        r.present,
        r.eligible,
        r.rate,
        contacted[r.kid.id] ?? "",
      ]
        .map(esc)
        .join(","),
    );
    const blob = new Blob([[head.map(esc).join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `followup-${todayIso()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "followup", label: "Needs follow-up", count: followUp.length },
    { key: "streak", label: "Regular (3+ in a row)", count: streaks.length },
    { key: "new", label: "New this Sunday", count: newKids.length },
  ];

  return (
    <div className="fu">
      <style>{css}</style>
      <div className="fu-top">
        <Header />
      </div>

      <div className="fu-scroll">
        <div className="fu-wrap">
          <div className="fu-head">
            <div>
              <h1 className="fu-title">Follow-up &amp; Regularity</h1>
              <p className="fu-sub">
                {sessions.length > 0
                  ? `${sessions.length} meeting${sessions.length === 1 ? "" : "s"} counted · latest ${formatDate(latestDate)}`
                  : "Children who stopped coming, regular attendees and new children"}
              </p>
            </div>
            <div className="fu-tools">
              <select value={weeks} onChange={(e) => { setWeeks(Number(e.target.value)); setPage(1); }} aria-label="Range">
                <option value={8}>Last 8 weeks</option>
                <option value={12}>Last 12 weeks</option>
                <option value={26}>Last 26 weeks</option>
                <option value={52}>Last 52 weeks</option>
              </select>
              <select value={threshold} onChange={(e) => { setThreshold(Number(e.target.value)); setPage(1); }} aria-label="Missed Sundays">
                <option value={2}>Missed 2+ Sundays</option>
                <option value={3}>Missed 3+ Sundays</option>
                <option value={4}>Missed 4+ Sundays</option>
                <option value={6}>Missed 6+ Sundays</option>
              </select>
              <button
                type="button"
                className="fu-btn"
                disabled={loading}
                onClick={() => {
                  clearAttendanceCaches();
                  setReloadKey((k) => k + 1);
                }}
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {error && <div className="fu-error" role="alert">{error}</div>}

          <div className="fu-stats">
            <div className="fu-stat">
              <p className="fu-sl">Need follow-up</p>
              <p className="fu-sv" style={{ color: "#dc2626" }}>{followUp.length}</p>
              <p className="fu-sn">Missed {threshold}+ Sundays in a row</p>
            </div>
            <div className="fu-stat">
              <p className="fu-sl">Regular attendees</p>
              <p className="fu-sv" style={{ color: "#16a34a" }}>{streaks.length}</p>
              <p className="fu-sn">{perfect} with perfect attendance</p>
            </div>
            <div className="fu-stat">
              <p className="fu-sl">New this Sunday</p>
              <p className="fu-sv" style={{ color: "#7c3aed" }}>{newKids.length}</p>
              <p className="fu-sn">{latestDate ? formatDate(latestDate) : "—"}</p>
            </div>
            <div className="fu-stat">
              <p className="fu-sl">Retention</p>
              <p className="fu-sv" style={{ color: "#2563eb" }}>
                {retention ? `${retention.pct}%` : "—"}
              </p>
              <p className="fu-sn">
                {retention
                  ? `${retention.again} of ${retention.total} came again`
                  : "Needs two meetings"}
              </p>
            </div>
          </div>

          <div className="fu-card">
            <div className="fu-tabs" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  className={`fu-tab${tab === t.key ? " on" : ""}`}
                  style={tab === t.key ? { background: "#7c3aed", color: "#ffffff" } : { background: "transparent", color: "#4b5563" }}
                  onClick={() => { setTab(t.key); setPage(1); }}
                >
                  {t.label}
                  <span className="n" style={tab === t.key ? { background: "rgba(255,255,255,0.28)", color: "#ffffff" } : { background: "#ede9fe", color: "#6d28d9" }}>{t.count}</span>
                </button>
              ))}
            </div>

            <div className="fu-bar">
              <input
                type="text"
                placeholder="Search name, mobile, place..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                aria-label="Search"
                style={{ width: 260, maxWidth: "100%" }}
              />
              <div className="fu-tools">
                <span className="fu-hint">{shown.length} shown</span>
                {tab === "followup" && (
                  <button
                    type="button"
                    className={`fu-btn${hideContacted ? " on" : ""}`}
                    onClick={() => { setHideContacted((v) => !v); setPage(1); }}
                  >
                    {hideContacted ? "Show contacted" : "Hide contacted"}
                  </button>
                )}
                {tab === "followup" && (
                  <button type="button" className="fu-btn" onClick={() => setShowMsg((v) => !v)}>
                    {showMsg ? "Hide message" : "Edit message"}
                  </button>
                )}
                <button type="button" className="fu-btn" disabled={shown.length === 0} onClick={exportCsv}>
                  Export CSV
                </button>
              </div>
            </div>

            <div className="fu-tw" ref={tableRef}>
            {loading ? (
              <div className="fu-empty"><div className="fu-spin" />Loading attendance history...</div>
            ) : shown.length === 0 ? (
              <div className="fu-empty">
                {tab === "followup"
                  ? hideContacted && followUp.length > 0
                    ? "Everyone on the list has been contacted this week."
                    : "Nobody has missed that many Sundays in a row. Great!"
                  : tab === "streak"
                    ? "No one has a 3-Sunday streak yet."
                    : "No new children on the latest Sunday."}
              </div>
            ) : (
                <table className="fu-table">
                  <thead>
                    <tr>
                      <th className="fu-c-no">#</th>
                      <th>Child</th>
                      <th className="fu-c-id fu-hide-md">Student ID</th>
                      <th className="fu-c-mob fu-hide-sm">Mobile</th>
                      <th className="fu-c-ls fu-hide-md">Last seen</th>
                      <th className="fu-c-st">{tab === "streak" ? "Streak" : tab === "new" ? "Joined" : "Missed in a row"}</th>
                      <th className="fu-c-att fu-hide-sm">Attendance</th>
                      <th className="fu-c-act">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, i) => {
                        const [bg, fg] = avatarFor(r.kid.name);
                        return (
                          <tr key={r.kid.id}>
                            <td className="fu-sl-no fu-c-no">{startIdx + i + 1}</td>
                            <td>
                              <div className="fu-name">
                                <span className="fu-av" style={{ background: bg, color: fg }}>
                                  {initials(r.kid.name)}
                                </span>
                                <div>
                                  <div>
                                    <a
                                      className="fu-nm"
                                      href={`/child-add?id=${encodeURIComponent(r.kid.id)}`}
                                      title="Open / edit this child"
                                    >
                                      {r.kid.name}
                                    </a>
                                  </div>
                                  <div className="fu-meta">
                                    {stdLabel(r.kid.std)} · {r.kid.place}
                                    {contacted[r.kid.id] && (
                                      <span className="fu-done">
                                        {" "}· ✓ Contacted {formatDate(contacted[r.kid.id])}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="fu-hide-md">
                              <span className="fu-id" title={r.kid.id}>{r.kid.id.slice(0, 8)}</span>
                            </td>
                            <td className="fu-hide-sm">
                              {r.kid.mobile ? (
                                <a className="fu-tel" href={`tel:${r.kid.mobile}`}>{r.kid.mobile}</a>
                              ) : (
                                <span className="fu-meta">—</span>
                              )}
                            </td>
                            <td className="fu-hide-md">
                              {r.lastSeen ? formatDate(r.lastSeen) : (
                                <span className="fu-pill amber" style={pillStyle("amber")}>Not in range</span>
                              )}
                            </td>
                            <td>
                              {tab === "streak" ? (
                                <span className="fu-pill green" style={pillStyle("green")}>{r.currentStreak} Sundays</span>
                              ) : tab === "new" ? (
                                <span className="fu-pill violet" style={pillStyle("violet")}>First visit</span>
                              ) : (
                                <span className="fu-pill red" style={pillStyle("red")}>{r.missedStreak} Sundays</span>
                              )}
                            </td>
                            <td className="fu-hide-sm">
                              <div>
                                <b>{r.present}</b> / {r.eligible} <span className="fu-meta">({r.rate}%)</span>
                              </div>
                              <div className="fu-bartrack" style={{ background: "#fecaca" }}><span style={{ width: `${r.rate}%`, background: "#16a34a" }} /></div>
                            </td>
                            <td>
                              <div className="fu-act">
                                {r.kid.mobile ? (
                                  <>
                                    <a
                                      className="fu-btn fu-wa"
                                      style={WA_STYLE}
                                      href={`https://wa.me/${waNumber(r.kid.mobile)}?text=${encodeURIComponent(messageFor(r.kid.name))}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={() => markContacted(r.kid.id)}
                                    >
                                      WhatsApp
                                    </a>
                                    <a
                                      className="fu-btn fu-call"
                                      style={CALL_STYLE}
                                      href={`tel:${r.kid.mobile}`}
                                      onClick={() => markContacted(r.kid.id)}
                                    >
                                      Call
                                    </a>
                                  </>
                                ) : (
                                  <span className="fu-meta">No number</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
            )}
            </div>

            {!loading && shown.length > 0 && (
              <div className="fu-pag">
                <div className="fu-tools">
                  <span className="fu-showing">
                    Showing {startIdx + 1}–{Math.min(startIdx + perPage, shown.length)} of {shown.length}
                  </span>
                </div>
                <div className="fu-pages">
                  <button type="button" className="fu-pg" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page">‹</button>
                  {pageNumbers(currentPage, totalPages).map((p) =>
                    typeof p === "string" ? (
                      <span key={p} className="fu-dots">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        className="fu-pg"
                        style={p === currentPage ? { background: "#7c3aed", borderColor: "#7c3aed", color: "#ffffff", fontWeight: 600 } : undefined}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button type="button" className="fu-pg" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Next page">›</button>
                </div>
              </div>
            )}

            {tab === "followup" && showMsg && (
              <div className="fu-msgbox">
                <label htmlFor="fu-template">WhatsApp message ({"{name}"} is replaced with the child's name)</label>
                <textarea
                  id="fu-template"
                  className="fu-msg"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}