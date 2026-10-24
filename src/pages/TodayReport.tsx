import { useState, useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import Header from "../components/Header";
import {
  loadKids,
  loadPresentMany,
  clearAttendanceCaches,
  weekBefore,
  latestSunday,
  todayIso,
  formatDate,
  formatHm,
  stdLabel,
  waNumber,
} from "./AttendanceApi";
import type { Kid, PresentMap } from "./AttendanceApi";

// ─── Types ──────────────────────────────────────────────────────────────
type Status = "regular" | "new" | "back" | "missed" | "absent";
type TabKey = "present" | "missed" | "new" | "back" | "absent";

interface Row {
  kid: Kid;
  here: boolean; // present on the selected date
  wasLast: boolean; // present on the same day last week
  inTime: string;
  outTime: string;
  lastSeen: string; // most recent earlier date the child attended ("" = never in range)
  status: Status;
}

const HISTORY_WEEKS = 12; // how far back we look to decide "new" vs "came back"
const ROW_H = 52;
const HEAD_H = 36;

const MISSED_MESSAGE =
  "Hello, we missed {name} at our Sunday meeting. We hope everything is well. We would love to see {name} this Sunday!";

const STATUS_LABEL: Record<Status, string> = {
  regular: "Came both weeks",
  new: "New",
  back: "Came back",
  missed: "Missed this week",
  absent: "Absent",
};

// inline colours so global CSS / UI-library resets cannot hide them
const STATUS_STYLE: Record<Status, CSSProperties> = {
  regular: { background: "#dcfce7", color: "#15803d" },
  new: { background: "#ede9fe", color: "#6d28d9" },
  back: { background: "#fef3c7", color: "#92400e" },
  missed: { background: "#fee2e2", color: "#b91c1c" },
  absent: { background: "#f3f4f6", color: "#6b7280" },
};
const pillStyle = (s: Status): CSSProperties => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
  ...STATUS_STYLE[s],
});

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

// "2026-10-24" -> "Saturday"
const dayName = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });

const pageNumbers = (current: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("…a");
    for (
      let i = Math.max(2, current - 1);
      i <= Math.min(total - 1, current + 1);
      i++
    )
      pages.push(i);
    if (current < total - 2) pages.push("…b");
    pages.push(total);
  }
  return pages;
};

// How many table rows fit in the available height, so the page never scrolls
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

const pctChange = (now: number, before: number) =>
  before === 0 ? (now === 0 ? 0 : 100) : Math.round(((now - before) / before) * 100);

const css = `
.tr { height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; background: #f8f7ff; color: #111827;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color-scheme: light; }
.tr, .tr * { text-align: left; box-sizing: border-box; }
.tr button { width: auto; transform: none !important; font-family: inherit; }
.tr-top { flex: none; position: relative; z-index: 100; }
.tr-wrap { flex: 1; min-height: 0; width: 100%; max-width: 1280px; margin: 0 auto; padding: 12px 20px 14px; display: flex; flex-direction: column; gap: 10px; }
.tr-head, .tr-stats, .tr-error, .tr-info, .tr-tabs, .tr-bar, .tr-pag { flex: none; }
.tr-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.tr-title { font-size: 20px; font-weight: 800; margin: 0; }
.tr-sub { font-size: 13px; color: #6b7280; margin: 3px 0 0; }
.tr-tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.tr input[type="text"], .tr input[type="date"] { height: 34px; padding: 0 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; background: #fff; color: #374151; font-family: inherit; }
.tr input:focus-visible, .tr button:focus-visible, .tr a:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
.tr .tr-btn { height: 34px; padding: 0 14px; border-radius: 8px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; text-decoration: none; white-space: nowrap; }
.tr .tr-btn:hover:not(:disabled) { border-color: #c4b5fd; color: #7c3aed; }
.tr .tr-btn.on { border-color: #7c3aed; color: #7c3aed; background: #f5f3ff; }
.tr .tr-btn.p { background: #7c3aed; border-color: #7c3aed; color: #fff; }
.tr .tr-btn.p:hover:not(:disabled) { background: #6d28d9; color: #fff; }
.tr .tr-btn:disabled { opacity: .55; cursor: not-allowed; }
.tr .tr-wa { background: #16a34a; border-color: #16a34a; color: #fff; height: 30px; padding: 0 10px; font-size: 12px; }
.tr .tr-wa:hover { background: #15803d; border-color: #15803d; color: #fff; }
.tr .tr-call { height: 30px; padding: 0 10px; font-size: 12px; background: #fff; border-color: #c4b5fd; color: #6d28d9; }
.tr-error { padding: 8px 12px; border-radius: 8px; font-size: 13px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.tr-info { padding: 8px 12px; border-radius: 8px; font-size: 13px; background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }

.tr-stats { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
.tr-stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px 12px; min-width: 0; }
.tr-sl { font-size: 12px; color: #6b7280; margin: 0; font-weight: 500; }
.tr-sv { font-size: 22px; font-weight: 800; margin: 0; line-height: 1.2; }
.tr-sn { font-size: 11px; color: #9ca3af; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.tr-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; flex: 1; min-height: 0; display: flex; flex-direction: column; }
.tr-tabs { display: flex; gap: 4px; padding: 6px; border-bottom: 1px solid #f3f4f6; overflow-x: auto; }
.tr .tr-tab { border: none; background: transparent; color: #4b5563; font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 8px; cursor: pointer; white-space: nowrap; display: inline-flex; gap: 8px; align-items: center; }
.tr .tr-tab:hover { background: #f5f3ff; color: #7c3aed; }
.tr .tr-tab.on { background: #7c3aed; color: #fff; }
.tr-tab .n { border-radius: 20px; padding: 1px 8px; font-size: 11.5px; background: #ede9fe; color: #6d28d9; }
.tr .tr-tab.on .n { background: rgba(255,255,255,.28); color: #fff; }
.tr-bar { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 10px 14px; border-bottom: 1px solid #f3f4f6; }
.tr-hint { font-size: 12px; color: #6b7280; }

.tr-tw { flex: 1; min-height: 0; overflow: hidden; }
.tr-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.tr-table th { padding: 0 12px; height: 36px; font-size: 12px; font-weight: 600; color: #6b7280; background: #fafafa; border-bottom: 1px solid #f3f4f6; white-space: nowrap; }
.tr-table td { padding: 0 12px; height: 52px; font-size: 13px; color: #111827; border-bottom: 1px solid #f3f4f6; vertical-align: middle; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tr-table tr:hover td { background: #faf5ff; }
.tr-c-no { width: 48px; } .tr-c-id { width: 100px; } .tr-c-mob { width: 130px; } .tr-c-t { width: 100px; } .tr-c-ls { width: 120px; } .tr-c-st { width: 150px; } .tr-c-act { width: 170px; }
.tr-name { display: flex; align-items: center; gap: 10px; font-weight: 600; min-width: 0; }
.tr-name > div { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tr-av { width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.tr-meta { font-size: 11.5px; color: #9ca3af; font-weight: 400; }
.tr .tr-nm { color: #111827; text-decoration: none; }
.tr .tr-nm:hover { color: #7c3aed; text-decoration: underline; }
.tr .tr-tel { color: #2563eb; text-decoration: none; font-weight: 600; }
.tr-id { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: #4b5563; background: #f3f4f6; border-radius: 6px; padding: 2px 6px; }
.tr-in { background: #ede9fe; color: #7c3aed; border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
.tr-out { background: #ffedd5; color: #ea580c; border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
.tr-act { display: flex; gap: 6px; }
.tr-empty { padding: 40px 20px; text-align: center; color: #9ca3af; font-size: 14px; }
.tr-empty * { text-align: center; }
.tr-spin { width: 24px; height: 24px; border: 3px solid #ede9fe; border-top-color: #7c3aed; border-radius: 50%; animation: tr-rot .8s linear infinite; margin: 0 auto 12px; }
@keyframes tr-rot { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .tr-spin { animation: none; } }

.tr-pag { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 10px 14px; border-top: 1px solid #f3f4f6; }
.tr-showing { font-size: 12.5px; color: #6b7280; }
.tr-pages { display: flex; align-items: center; gap: 5px; }
.tr .tr-pg { min-width: 32px; height: 32px; padding: 0 8px; border-radius: 6px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-size: 13px; font-weight: 500; cursor: pointer; }
.tr .tr-pg.on { background: #7c3aed; border-color: #7c3aed; color: #fff; font-weight: 600; }
.tr .tr-pg:disabled { opacity: .4; cursor: default; }
.tr-dots { width: 20px; text-align: center; color: #9ca3af; }

@media (max-width: 1100px) { .tr-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); } .tr-hide-md { display: none; } }
@media (max-width: 760px) { .tr-hide-sm { display: none; } .tr-c-act { width: 150px; } .tr-c-st { width: 120px; } }
@media (max-width: 600px) {
  .tr-wrap { padding: 8px 10px 10px; gap: 8px; }
  .tr-title { font-size: 18px; }
  .tr-sn { display: none; }
  .tr-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .tr-stat { padding: 6px 8px; }
  .tr-sl { font-size: 10.5px; }
  .tr-sv { font-size: 18px; }
}
`;

// ─── Page ───────────────────────────────────────────────────────────────
export default function TodayReport() {
  const [date, setDate] = useState(todayIso()); // loads TODAY first
  const [kids, setKids] = useState<Kid[]>([]);
  const [data, setData] = useState<Record<string, PresentMap>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<TabKey>("present");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [tableRef, perPage] = useFitRows(ROW_H, HEAD_H);

  // SAME weekday one week earlier (Sat -> last Sat, Sun -> last Sun), plus the
  // older weeks before it, used to tell "new" from "came back".
  // (Before, this used "the previous Sunday", which is the wrong day to compare
  // with on any day that is not a Sunday.)
  const prev = useMemo(() => weekBefore(date), [date]);
  const history = useMemo(() => {
    const out: string[] = [];
    let d = prev;
    for (let i = 0; i < HISTORY_WEEKS; i++) {
      d = weekBefore(d);
      out.push(d);
    }
    return out;
  }, [prev]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const kidList = await loadKids();
        if (cancelled) return;
        const dates = [date, prev, ...history];
        const { data: res, failed } = await loadPresentMany(dates);
        if (cancelled) return;
        setKids(kidList);
        setData(res);
        if (failed.includes(date)) {
          setError("Could not load attendance for this date. Press Refresh.");
        } else if (failed.includes(prev)) {
          setError("Could not load the previous week, so the comparison may be wrong.");
        } else if (failed.length > 0) {
          setError(`${failed.length} older date(s) could not be loaded, so "New" may be inaccurate.`);
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
  }, [date, prev, history, reloadKey]);

  const todayMap = data[date];
  const prevMap = data[prev];
  const noMeetingYet = !loading && !!todayMap && Object.keys(todayMap).length === 0;
  const noPrevMeeting = !loading && !!prevMap && Object.keys(prevMap).length === 0;

  const rows = useMemo<Row[]>(() => {
    const t = data[date] ?? {};
    const p = data[prev] ?? {};
    const earlier = [prev, ...history];
    const out: Row[] = [];
    kids.forEach((kid) => {
      const here = t[kid.id] !== undefined;
      // a child cannot be "absent" before being registered
      if (!here && kid.createdDate && kid.createdDate > date) return;
      const wasLast = p[kid.id] !== undefined;
      const lastSeen = earlier.find((d) => data[d]?.[kid.id] !== undefined) ?? "";

      let status: Status;
      if (here) status = wasLast ? "regular" : lastSeen ? "back" : "new";
      else status = wasLast ? "missed" : "absent";

      out.push({
        kid,
        here,
        wasLast,
        inTime: t[kid.id]?.inTime ?? "",
        outTime: t[kid.id]?.outTime ?? "",
        lastSeen,
        status,
      });
    });
    return out;
  }, [kids, data, date, prev, history]);

  const lists: Record<TabKey, Row[]> = {
    present: rows.filter((r) => r.here),
    missed: rows.filter((r) => r.status === "missed"),
    new: rows.filter((r) => r.status === "new"),
    back: rows.filter((r) => r.status === "back"),
    absent: rows.filter((r) => !r.here),
  };

  const presentCount = lists.present.length;
  const prevCount = Object.keys(prevMap ?? {}).length;
  const diff = presentCount - prevCount;
  const boys = lists.present.filter((r) => r.kid.gender === "Male").length;
  const girls = lists.present.filter((r) => r.kid.gender === "Female").length;
  const bothWeeks = rows.filter((r) => r.status === "regular").length;
  const checkedOut = lists.present.filter((r) => r.outTime).length;

  const q = search.trim().toLowerCase();
  const shown = lists[tab]
    .filter(
      (r) =>
        !q ||
        r.kid.name.toLowerCase().includes(q) ||
        r.kid.id.toLowerCase().includes(q) ||
        r.kid.mobile.includes(q) ||
        r.kid.place.toLowerCase().includes(q),
    )
    .sort((a, b) =>
      tab === "present" || tab === "new" || tab === "back"
        ? (a.inTime || "99:99").localeCompare(b.inTime || "99:99") ||
          a.kid.name.localeCompare(b.kid.name)
        : a.kid.name.localeCompare(b.kid.name),
    );

  const totalPages = Math.max(1, Math.ceil(shown.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const pageRows = shown.slice(startIdx, startIdx + perPage);
  const showContact = tab === "missed" || tab === "absent";
  const showTimes = tab === "present" || tab === "new" || tab === "back";

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "present", label: "Present", count: lists.present.length },
    { key: "missed", label: "Missed (came last week)", count: lists.missed.length },
    { key: "new", label: "New", count: lists.new.length },
    { key: "back", label: "Came back", count: lists.back.length },
    { key: "absent", label: "All absent", count: lists.absent.length },
  ];

  const emptyText: Record<TabKey, string> = {
    present: noMeetingYet ? "Nobody has checked in on this date yet." : "No match.",
    missed: "Everyone who came last week is here. Great!",
    new: "No new children on this date.",
    back: "Nobody came back after a gap.",
    absent: "Nobody is absent.",
  };

  const messageFor = (name: string) => MISSED_MESSAGE.split("{name}").join(name);

  // WhatsApp-ready summary
  const summary = useMemo(() => {
    const names = (l: Row[]) => l.map((r) => r.kid.name).join(", ");
    const lines = [
      `*Attendance Report*`,
      `Date: ${formatDate(date)}`,
      ``,
      `*Present: ${presentCount}* (Boys ${boys}, Girls ${girls})`,
      `Previous (${formatDate(prev)}): ${prevCount}`,
      `Change: ${diff >= 0 ? "+" : ""}${diff}`,
      ``,
      `Came both weeks: ${bothWeeks}`,
      `New: ${lists.new.length}${lists.new.length ? ` – ${names(lists.new)}` : ""}`,
      `Came back: ${lists.back.length}`,
      `Missed (came last week): ${lists.missed.length}`,
    ];
    return lines.join("\n");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, prev, presentCount, prevCount, diff, boys, girls, bothWeeks, rows]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = summary;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCsv = () => {
    const head = ["SL No", "Student ID", "Name", "Class", "Mobile", "Place", "Status", "Check-in", "Check-out", "Last seen"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = shown.map((r, i) =>
      [
        i + 1,
        r.kid.id,
        r.kid.name,
        stdLabel(r.kid.std),
        r.kid.mobile,
        r.kid.place,
        STATUS_LABEL[r.status],
        r.inTime,
        r.outTime,
        r.lastSeen,
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
    a.download = `report-${date}-${tab}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const changeDate = (d: string) => {
    if (!d) return;
    setDate(d);
    setPage(1);
    setTab("present");
  };

  const diffColor = diff > 0 ? "#16a34a" : diff < 0 ? "#dc2626" : "#6b7280";

  return (
    <div className="tr">
      <style>{css}</style>
      <div className="tr-top">
        <Header />
      </div>

      <div className="tr-wrap">
        <div className="tr-head">
          <div>
            <h1 className="tr-title">
              {date === todayIso() ? "Today's Report" : "Report"} · {formatDate(date)}
            </h1>
            <p className="tr-sub">
              Compared with {formatDate(prev)} (last {dayName(prev)})
            </p>
          </div>
          <div className="tr-tools">
            <button
              type="button"
              className={`tr-btn${date === todayIso() ? " on" : ""}`}
              onClick={() => changeDate(todayIso())}
            >
              Today
            </button>
            <button
              type="button"
              className={`tr-btn${date === latestSunday() && date !== todayIso() ? " on" : ""}`}
              onClick={() => changeDate(latestSunday())}
            >
              Latest Sunday
            </button>
            <input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => changeDate(e.target.value)}
              aria-label="Report date"
            />
            <button
              type="button"
              className="tr-btn"
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

        {error && <div className="tr-error" role="alert">{error}</div>}
        {noMeetingYet && !error && (
          <div className="tr-info">
            No attendance recorded on {formatDate(date)} yet, so everyone who came last {dayName(prev)} shows as
            "Missed" until children are checked in. Use "Latest Sunday" to see the last Sunday meeting.
          </div>
        )}
        {noPrevMeeting && !noMeetingYet && (
          <div className="tr-info">
            No attendance found on {formatDate(prev)} (last {dayName(prev)}), so "Missed" will be empty and everyone present will count as "New" or "Came back".
          </div>
        )}

        <div className="tr-stats">
          <div className="tr-stat">
            <p className="tr-sl">Present</p>
            <p className="tr-sv" style={{ color: "#16a34a" }}>{presentCount}</p>
            <p className="tr-sn">Boys {boys} · Girls {girls}</p>
          </div>
          <div className="tr-stat">
            <p className="tr-sl">Previous week</p>
            <p className="tr-sv">{prevCount}</p>
            <p className="tr-sn">{formatDate(prev)}</p>
          </div>
          <div className="tr-stat">
            <p className="tr-sl">Change</p>
            <p className="tr-sv" style={{ color: diffColor }}>
              {diff > 0 ? "+" : ""}{diff}
            </p>
            <p className="tr-sn">{pctChange(presentCount, prevCount)}% vs last week</p>
          </div>
          <div className="tr-stat">
            <p className="tr-sl">Missed</p>
            <p className="tr-sv" style={{ color: "#dc2626" }}>{lists.missed.length}</p>
            <p className="tr-sn">Came last week, not now</p>
          </div>
          <div className="tr-stat">
            <p className="tr-sl">New</p>
            <p className="tr-sv" style={{ color: "#7c3aed" }}>{lists.new.length}</p>
            <p className="tr-sn">{lists.back.length} came back after a gap</p>
          </div>
          <div className="tr-stat">
            <p className="tr-sl">Checked out</p>
            <p className="tr-sv" style={{ color: "#ea580c" }}>{checkedOut}</p>
            <p className="tr-sn">{bothWeeks} came both weeks</p>
          </div>
        </div>

        <div className="tr-card">
          <div className="tr-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`tr-tab${tab === t.key ? " on" : ""}`}
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                }}
              >
                {t.label}
                <span className="n">{t.count}</span>
              </button>
            ))}
          </div>

          <div className="tr-bar">
            <input
              type="text"
              placeholder="Search name, ID, mobile, place..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search"
              style={{ width: 280, maxWidth: "100%" }}
            />
            <div className="tr-tools">
              <span className="tr-hint">{shown.length} shown</span>
              <button type="button" className="tr-btn p" onClick={copySummary} disabled={loading}>
                {copied ? "Copied ✓" : "Copy summary"}
              </button>
              <a
                className="tr-btn tr-wa"
                style={{ height: 34, fontSize: 13 }}
                href={`https://wa.me/?text=${encodeURIComponent(summary)}`}
                target="_blank"
                rel="noreferrer"
              >
                Share on WhatsApp
              </a>
              <button type="button" className="tr-btn" disabled={shown.length === 0} onClick={exportCsv}>
                Export CSV
              </button>
            </div>
          </div>

          <div className="tr-tw" ref={tableRef}>
            {loading ? (
              <div className="tr-empty">
                <div className="tr-spin" />
                Loading report...
              </div>
            ) : shown.length === 0 ? (
              <div className="tr-empty">{q ? "No matching children." : emptyText[tab]}</div>
            ) : (
              <table className="tr-table">
                <thead>
                  <tr>
                    <th className="tr-c-no">#</th>
                    <th>Child</th>
                    <th className="tr-c-id tr-hide-md">Student ID</th>
                    <th className="tr-c-mob tr-hide-sm">Mobile</th>
                    {showTimes && <th className="tr-c-t">Check-in</th>}
                    {showTimes && <th className="tr-c-t tr-hide-sm">Check-out</th>}
                    <th className="tr-c-ls tr-hide-md">Last seen</th>
                    <th className="tr-c-st">Status</th>
                    {showContact && <th className="tr-c-act">Contact</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => {
                    const [bg, fg] = avatarFor(r.kid.name);
                    return (
                      <tr key={r.kid.id}>
                        <td style={{ color: "#6b7280", fontWeight: 600 }}>{startIdx + i + 1}</td>
                        <td>
                          <div className="tr-name">
                            <span className="tr-av" style={{ background: bg, color: fg }}>
                              {initials(r.kid.name)}
                            </span>
                            <div>
                              <div>
                                <a
                                  className="tr-nm"
                                  href={`/child-add?id=${encodeURIComponent(r.kid.id)}`}
                                  title="Open / edit this child"
                                >
                                  {r.kid.name}
                                </a>
                              </div>
                              <div className="tr-meta">
                                {stdLabel(r.kid.std)}
                                {r.kid.age ? ` · ${r.kid.age} yrs` : ""} · {r.kid.place}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="tr-hide-md">
                          <span className="tr-id">{r.kid.id}</span>
                        </td>
                        <td className="tr-hide-sm">
                          {r.kid.mobile ? (
                            <a className="tr-tel" href={`tel:${r.kid.mobile}`}>{r.kid.mobile}</a>
                          ) : (
                            <span className="tr-meta">—</span>
                          )}
                        </td>
                        {showTimes && (
                          <td>
                            {r.inTime ? <span className="tr-in">{formatHm(r.inTime)}</span> : "—"}
                          </td>
                        )}
                        {showTimes && (
                          <td className="tr-hide-sm">
                            {r.outTime ? <span className="tr-out">{formatHm(r.outTime)}</span> : "—"}
                          </td>
                        )}
                        <td className="tr-hide-md">
                          {r.lastSeen ? formatDate(r.lastSeen) : <span className="tr-meta">Never in range</span>}
                        </td>
                        <td>
                          <span style={pillStyle(r.status)}>{STATUS_LABEL[r.status]}</span>
                        </td>
                        {showContact && (
                          <td>
                            <div className="tr-act">
                              {r.kid.mobile ? (
                                <>
                                  <a
                                    className="tr-btn tr-wa"
                                    href={`https://wa.me/${waNumber(r.kid.mobile)}?text=${encodeURIComponent(messageFor(r.kid.name))}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    WhatsApp
                                  </a>
                                  <a className="tr-btn tr-call" href={`tel:${r.kid.mobile}`}>Call</a>
                                </>
                              ) : (
                                <span className="tr-meta">No number</span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {!loading && shown.length > 0 && (
            <div className="tr-pag">
              <span className="tr-showing">
                Showing {startIdx + 1}–{Math.min(startIdx + perPage, shown.length)} of {shown.length}
              </span>
              <div className="tr-pages">
                <button
                  type="button"
                  className="tr-pg"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {pageNumbers(currentPage, totalPages).map((p) =>
                  typeof p === "string" ? (
                    <span key={p} className="tr-dots">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`tr-pg${p === currentPage ? " on" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className="tr-pg"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}