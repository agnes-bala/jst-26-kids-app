import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import Header from "../components/Header";
import { CATEGORIES, CATEGORY_COLORS, normCategory } from "./AttendanceApi";

// ─── API ────────────────────────────────────────────────────────────────
const API_BASE_URL = "/api"; // proxied by Vite -> http://10.12.1.118:8081
const KIDS_URL = `${API_BASE_URL}/kids`; // GET  -> all children, PUT /kids/{id} -> update one
const ATTENDANCE_URL = `${API_BASE_URL}/attendance`; // POST -> one child
const PRESENT_URL = `${ATTENDANCE_URL}/present`; // GET ?date=yyyy-mm-dd -> present list
const BULK_URL = `${ATTENDANCE_URL}/bulk`; // POST -> array of records

interface ApiAttendance {
  id?: string;
  kidsId: string;
  kidName?: string;
  category?: string | null;
  date: string;
  inTime: string | null;
  outTime: string | null;
  status: string; // "PRESENT" | "ABSENT"
  createdBy?: string;
  updatedBy?: string;
}

// Item of GET /attendance/present?date=
interface ApiPresentItem {
  kidsId: string;
  name?: string;
  std?: string;
  inTime?: string | null;
  outTime?: string | null;
  status?: string;
}

interface ApiKid {
  kidsId: string;
  name: string;
  gender: string;
  category?: string | null; // "Outsider" | "Staff Kid" | "NLS Kid"
  std?: string | null;
  mobileNo?: string | null;
  fathermobileNo?: string | null;
  mothermobileNo?: string | null;
  guardianmobileNo?: string | null;
  selfNo?: string | null; // legacy
  motherNo?: string | null; // legacy
  fatherNo?: string | null; // legacy
  guardianNo?: string | null; // legacy
  address2?: string | null;
  address1?: string | null;
  state?: string | null;
  // age can come as a number, or be calculated from a date of birth
  age?: number | string | null;
  dob?: string | null;
  dateOfBirth?: string | null;
}

// ─── Types ──────────────────────────────────────────────────────────────
interface Student {
  id: string; // kidsId  (e.g. JT-26-102)
  name: string;
  gender: string;
  category: string; // "Outsider" | "Staff Kid" | "NLS Kid" | "" (not set)
  mobile: string;
  standard: string;
  stdRaw: string; // raw std value from the API, used for the filter
  place: string;
  age: number | null;
}

// today's times for a child that has checked in ("" = not yet)
interface Mark {
  inTime: string;
  outTime: string;
}

type TabKey = "jst" | "checkedIn" | "checkedOut" | "absent";
type GenderFilter = "all" | "Male" | "Female";
type CategoryFilter = "all" | "Outsider" | "Staff Kid" | "NLS Kid" | "none";
type Notice = { type: "error" | "success"; text: string } | null;
type BulkAction = "in" | "out" | "absent";
type ViewMode = "today" | "date" | "range" | "kid";
type HistTab = "all" | "present" | "out" | "absent";

// one row of the date-wise / history view
interface HistRow {
  key: string;
  date: string;
  kidsId: string;
  name: string;
  inTime: string;
  outTime: string;
  status: string; // "PRESENT" | "ABSENT"
}

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "date", label: "By Date" },
  { key: "range", label: "Range" },
  { key: "kid", label: "By Kid" },
];
const MAX_RANGE_DAYS = 31;

const GENDER_OPTIONS: { key: GenderFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Male", label: "Boys" },
  { key: "Female", label: "Girls" },
];

const CATEGORY_OPTIONS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All Types" },
  { key: "Outsider", label: "Outsider" },
  { key: "Staff Kid", label: "Staff Kid" },
  { key: "NLS Kid", label: "NLS Kid" },
  { key: "none", label: "Not set" },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20];

// Everyone still checked in at/after this time is checked out automatically
const AUTO_OUT_TIME = "17:00:00"; // 5:00 PM

// ─── Helpers ────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Logged-in user (saved in localStorage as "username" by the login page)
const getUsername = (): string => {
  try {
    return localStorage.getItem("username") || "system";
  } catch {
    return "system";
  }
};

// "09:15:00" -> "09:15 AM"   (empty -> "—")
const formatTime = (hhmmss: string) => {
  if (!hhmmss) return "—";
  const [h, m] = hhmmss.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${pad(m)} ${suffix}`;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
};

// "3" -> "3rd"
const formatStd = (std?: string | null) => {
  if (!std) return "—";
  if (!/^\d+$/.test(std)) return std;
  const n = Number(std);
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suffix}`;
};

// age from `age` field, or calculated from dob / dateOfBirth
const calcAge = (k: ApiKid): number | null => {
  if (k.age != null && k.age !== "" && !isNaN(Number(k.age))) {
    return Number(k.age);
  }
  const raw = k.dob || k.dateOfBirth;
  if (!raw) return null;
  const b = new Date(raw);
  if (isNaN(b.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
};

const toArray = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  const obj = data as { content?: T[]; data?: T[] } | null;
  return obj?.content ?? obj?.data ?? [];
};

const toStudent = (k: ApiKid): Student => ({
  id: k.kidsId,
  name: k.name,
  gender: k.gender,
  category: normCategory(k.category),
  mobile:
    k.mobileNo ||
    k.selfNo ||
    k.fathermobileNo ||
    k.fatherNo ||
    k.mothermobileNo ||
    k.motherNo ||
    k.guardianmobileNo ||
    k.guardianNo ||
    "—",
  standard: formatStd(k.std),
  stdRaw: (k.std ?? "").toString().trim(),
  place: k.address2 || k.address1 || k.state || "—",
  age: calcAge(k),
});

const errorMessage = async (res: Response) => {
  const raw = await res.text().catch(() => "");
  let msg: string;
  try {
    const data = JSON.parse(raw);
    msg = data?.message || data?.error || "";
  } catch {
    msg = raw.trim().slice(0, 200);
  }
  return `Request failed (HTTP ${res.status}${msg ? `: ${msg}` : ""})`;
};

const postJson = async (url: string, body: unknown) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
};

// Attendance record. `category` travels with it so the attendance row itself
// carries the child's category (Outsider / Staff Kid / NLS Kid).
const buildRecord = (
  st: Student,
  status: "PRESENT" | "ABSENT",
  inTime: string | null,
  outTime: string | null = null,
): ApiAttendance => ({
  kidsId: st.id,
  kidName: st.name,
  category: st.category || null,
  date: todayStr(),
  inTime: status === "PRESENT" ? inTime || null : null,
  outTime: status === "PRESENT" ? outTime || null : null,
  status,
  createdBy: getUsername(),
  updatedBy: getUsername(),
});

const cacheKey = () => `attendance:${todayStr()}`;

const readCache = (): Record<string, Mark> => {
  try {
    const raw = localStorage.getItem(cacheKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Mark | string>;
    const out: Record<string, Mark> = {};
    Object.keys(parsed).forEach((id) => {
      const v = parsed[id];
      // older versions stored just the check-in time as a string
      out[id] =
        typeof v === "string" ? { inTime: v, outTime: "" } : (v as Mark);
    });
    return out;
  } catch {
    return {};
  }
};

const writeCache = (map: Record<string, Mark>) => {
  try {
    localStorage.setItem(cacheKey(), JSON.stringify(map));
  } catch {
    /* storage unavailable – ignore */
  }
};

const digits = (t: string) => t.replace(/\D/g, "");

// "2026-10-18" + 1 -> "2026-10-19"
const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};
const time8 = (v?: string | null) => String(v ?? "").slice(0, 8);

const pageCss = `
html, body, #root { overflow: hidden !important; height: 100%; }
.attendance-page { height: 100dvh !important; }
.attendance-page, .attendance-page * { text-align: left; }
.attendance-page th.right, .attendance-page td.right { text-align: right; }
.attendance-page button {
  width: auto;
  transform: none !important;
  box-shadow: none !important;
}
.attendance-page button:disabled { cursor: not-allowed !important; opacity: 0.6; }

/* custom checkbox (the default one rendered as a black square) */
.attendance-page input[type="checkbox"] {
  -webkit-appearance: none; appearance: none; box-sizing: border-box;
  width: 20px; height: 20px; margin: 0; flex-shrink: 0; position: relative;
  border: 2px solid #c4b5fd; border-radius: 6px; background: #fff; cursor: pointer;
}
.attendance-page input[type="checkbox"]:checked { background: #7c3aed; border-color: #7c3aed; }
.attendance-page input[type="checkbox"]:checked::after {
  content: ""; position: absolute; left: 5px; top: 1px; width: 4px; height: 9px;
  border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg);
}

/* search clear button */
.att-clear { position: absolute; right: 6px; top: 50%; margin-top: -14px; width: 28px; height: 28px; border-radius: 50%;
  border: none; background: #f3f4f6; color: #6b7280; font-size: 12px; cursor: pointer; padding: 0; }

/* date filter bar */
.att-datebar input[type="date"], .att-datebar input[type="text"] { font-family: inherit; }

/* kids ID chip */
.att-idchip { display: inline-block; background: #f5f3ff; color: #6d28d9; border-radius: 6px; padding: 2px 8px;
  font-size: 12px; font-weight: 700; letter-spacing: 0.02em; white-space: nowrap; }

/* category select (inline in the row) + category summary chips */
.att-catsel { height: 30px; padding: 0 8px; border-radius: 8px; border: 1.5px solid #e5e7eb; font-size: 12px; font-weight: 600;
  font-family: inherit; background: #fff; color: #374151; cursor: pointer; max-width: 130px; }
.att-catsel:disabled { cursor: not-allowed; opacity: .6; }
.att-catrow { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; flex-shrink: 0; }
.att-catchip { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1.5px solid transparent; cursor: pointer; }
.att-catchip.on { border-color: #7c3aed; }
.att-catchip small { font-weight: 500; opacity: .8; }

/* mobile card list (hidden on desktop) */
.att-cards { display: none; flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.att-selall { display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: #fafafa; border-bottom: 1px solid #f3f4f6; font-size: 13px; font-weight: 600; color: #6b7280; cursor: pointer; }
.att-card { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 8px 10px; padding: 12px; border-bottom: 1px solid #f3f4f6; background: #fff; }
.att-card.att-in { box-shadow: inset 3px 0 0 #16a34a; }
.att-card.att-out { box-shadow: inset 3px 0 0 #ea580c; }
.att-card > input[type="checkbox"] { margin-top: 2px; }
.att-info { flex: 1 1 0; min-width: 0; }
.att-name { font-weight: 700; font-size: 15px; line-height: 1.3; color: #111827; word-break: break-word; }
.att-name .att-idchip { margin-left: 6px; padding: 1px 6px; font-size: 11px; vertical-align: 1px; }
.att-meta { font-size: 12.5px; line-height: 1.4; color: #6b7280; margin-top: 3px; word-break: break-word; }
.att-tel { color: #2563eb; text-decoration: none; font-weight: 600; }
.att-time { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
.att-cardcat { margin-top: 8px; }
.att-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.att-pageof { display: none; font-size: 13px; font-weight: 600; color: #374151; min-width: 52px; text-align: center; }

@media (max-width: 700px) {
  /* the whole page scrolls on mobile (no tiny inner scroll area) */
  html, body, #root { height: auto !important; overflow: visible !important; }
  .attendance-page { height: auto !important; min-height: 100dvh; overflow-x: clip !important; overflow-y: visible !important; }
  .att-wrap { flex: none !important; min-height: auto !important; padding: 8px 10px 14px !important; }
  .att-main { flex: none !important; min-height: auto !important; overflow: visible !important; border-radius: 14px !important; }

  .att-hsec { margin-bottom: 8px !important; gap: 10px !important; }
  .att-hicon { width: 38px !important; height: 38px !important; }
  .att-title { font-size: 18px !important; }
  .att-notice { flex-wrap: wrap; }

  .att-sum { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 6px !important; margin-bottom: 8px !important; }
  .att-sumcard { padding: 6px 8px !important; border-radius: 12px !important; }

  /* the 4 category chips share one row, label on top, count below */
  .att-catrow { flex-wrap: nowrap; gap: 6px; margin-bottom: 8px; overflow: visible; }
  .att-catchip { flex: 1 1 0; min-width: 0; flex-direction: column; justify-content: center; align-items: center;
    gap: 0; padding: 5px 2px; border-radius: 12px; line-height: 1.25; font-size: 11px; text-align: center; }
  .att-catchip small { font-size: 11px; }

  /* sticky tabs, all 4 visible */
  .att-tabs { position: sticky; top: 0; z-index: 6; background: #fff; padding: 0 !important; border-radius: 14px 14px 0 0; overflow-x: hidden !important; }
  .att-tabs button { flex: 1 1 0; min-width: 0; flex-direction: column; justify-content: center; align-items: center;
    gap: 3px !important; padding: 8px 2px !important; font-size: 12px !important; line-height: 1.2;
    white-space: normal !important; text-align: center; }
  .att-tabs button span { font-size: 11px !important; padding: 1px 8px !important; }

  /* toolbar: search + gender full width, then category | standard | rows */
  .att-toolbar { display: grid !important; grid-template-columns: 1fr 1fr 72px; gap: 8px !important; padding: 8px 10px !important; }
  .att-search { grid-column: 1 / -1; max-width: none !important; }
  .att-search input { font-size: 16px !important; padding: 11px 36px 11px 34px !important; }
  .att-toolbar > .att-seg { grid-column: 1 / -1; }
  .att-seg { display: flex !important; overflow-x: auto; }
  .att-seg button { flex: 1; text-align: center; padding: 8px 10px !important; white-space: nowrap; }
  .att-perpage { min-width: 0; }
  .att-perpage select { width: 100%; font-size: 15px !important; padding: 8px 6px !important; }
  .att-pp-label { display: none; }

  .att-datebar { padding: 8px 10px 0 !important; gap: 8px !important; }
  .att-datebar input { font-size: 16px !important; flex: 1 1 120px; min-width: 0; }
  .att-datebar > button { flex: 1 1 100%; justify-content: center; min-height: 42px; }

  /* bulk bar stays on screen while scrolling the list */
  .att-bulk { position: sticky; top: 0; z-index: 7; padding: 8px 10px !important; gap: 6px !important; }
  .att-bulk button { padding: 7px 10px !important; font-size: 12px !important; }
  .att-bulk .att-catsel { flex: 1 1 130px; max-width: none; height: 34px; font-size: 13px; }

  .att-tablewrap { display: none !important; }
  .att-cards { display: block; flex: none; overflow: visible; }

  /* card: info on top, full-width action buttons underneath */
  .att-actions { flex: 1 1 100%; box-sizing: border-box; flex-wrap: nowrap; }
  .att-card--sel .att-actions { padding-left: 30px; }
  .att-actions button { flex: 1 1 0; justify-content: center; min-height: 42px; font-size: 13px !important; }
  .att-cardcat button { min-height: 30px; flex: none; }
  .att-card .att-catsel { min-height: 34px; font-size: 14px; max-width: 100%; }

  /* footer pinned to the bottom of the screen */
  .att-footer { position: sticky; bottom: 0; z-index: 6; background: #fff; padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px)) !important;
    border-radius: 0 0 14px 14px; box-shadow: 0 -2px 8px rgba(0,0,0,0.05); }
  .att-num { display: none !important; }
  .att-pageof { display: inline-block; }
  .att-pages button { min-width: 40px !important; height: 38px !important; }
}
`;

// ─── Icons ──────────────────────────────────────────────────────────────
const ClipboardIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M9 14l2 2 4-4" />
  </svg>
);

const SearchIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#9ca3af"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const EditIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
  </svg>
);

// ─── Main Component ─────────────────────────────────────────────────────
export default function Attendance() {
  const [students, setStudents] = useState<Student[]>([]);
  // kidsId -> today's times. Key present = checked in today; outTime "" = not checked out yet.
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  // rows whose locked category is temporarily open for changing
  const [editingCat, setEditingCat] = useState<Record<string, boolean>>({});

  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  // const [ageFilter, setAgeFilter] = useState<AgeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [stdFilter, setStdFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<TabKey>("absent");
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  // date-wise / history view (Today = the live check-in screen)
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [viewDate, setViewDate] = useState(todayStr());
  const [rangeFrom, setRangeFrom] = useState(todayStr());
  const [rangeTo, setRangeTo] = useState(todayStr());
  const [kidQuery, setKidQuery] = useState("");
  const [histRows, setHistRows] = useState<HistRow[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histFetched, setHistFetched] = useState(false);
  const [histNotice, setHistNotice] = useState<Notice>(null);
  const [histTab, setHistTab] = useState<HistTab>("all");

  const rawKids = useRef<Record<string, Record<string, unknown>>>({});

  const isIn = (id: string) => id in marks;
  const isOut = (id: string) => !!marks[id]?.outTime;
  const isToday = viewMode === "today";
  const loadData = async (signal?: AbortSignal) => {
    setLoading(true);
    setNotice(null);
    const [kidsRes, presentRes] = await Promise.allSettled([
      fetch(KIDS_URL, { signal }),
      fetch(`${PRESENT_URL}?date=${todayStr()}`, { signal }),
    ]);
    if (signal?.aborted) return;

    // Children list (required)
    if (kidsRes.status === "fulfilled" && kidsRes.value.ok) {
      const kids = toArray<ApiKid>(await kidsRes.value.json().catch(() => []));
      const raw: Record<string, Record<string, unknown>> = {};
      kids.forEach((k) => {
        raw[k.kidsId] = k as unknown as Record<string, unknown>;
      });
      rawKids.current = raw;
      setStudents(kids.map(toStudent));
    } else {
      setStudents([]);
      setNotice({ type: "error", text: "Could not load the children list." });
    }

    // Today's present list (falls back to the local cache if the call fails)
    const cache = readCache();
    if (presentRes.status === "fulfilled" && presentRes.value.ok) {
      const list = toArray<ApiPresentItem>(
        await presentRes.value.json().catch(() => []),
      );
      const map: Record<string, Mark> = {};
      list.forEach((r) => {
        if (!r.kidsId) return;
        if (r.status && r.status.toUpperCase() !== "PRESENT") return;
        map[r.kidsId] = {
          inTime: r.inTime || cache[r.kidsId]?.inTime || "",
          outTime: r.outTime || cache[r.kidsId]?.outTime || "",
        };
      });
      setMarks(map);
    } else {
      console.warn(
        "GET /attendance/present unavailable  using locally saved check-ins.",
      );
      setMarks(cache);
    }

    setLoading(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadData(controller.signal));
    return () => controller.abort();
  }, []);

  // Keep the local cache in sync (only after the first load finished)
  useEffect(() => {
    if (!loading) writeCache(marks);
  }, [marks, loading]);

  // ─── Auto check-out at 6 PM ─────────────────────────────────────────
  const autoState = useRef({ running: false, done: false });

  const autoCheckOut = async () => {
    const auto = autoState.current;
    if (auto.running || auto.done || loading) return;
    if (nowTime() < AUTO_OUT_TIME) return;

    const pending = students.filter((st) => isIn(st.id) && !isOut(st.id));
    if (pending.length === 0) {
      auto.done = true;
      return;
    }

    const outFor = (id: string) => {
      const inTime = marks[id].inTime;
      return inTime && inTime > AUTO_OUT_TIME ? inTime : AUTO_OUT_TIME;
    };

    auto.running = true;
    try {
      await postJson(
        BULK_URL,
        pending.map((st) =>
          buildRecord(st, "PRESENT", marks[st.id].inTime, outFor(st.id)),
        ),
      );
      setMarks((prev) => {
        const next = { ...prev };
        pending.forEach((st) => {
          if (next[st.id] && !next[st.id].outTime) {
            next[st.id] = {
              inTime: next[st.id].inTime,
              outTime: outFor(st.id),
            };
          }
        });
        return next;
      });
      auto.done = true;
      setNotice({
        type: "success",
        text: `${pending.length} children were checked out automatically at 6:00 PM.`,
      });
    } catch (err) {
      // auto.done stays false -> tries again on the next tick
      setNotice({
        type: "error",
        text: `Auto check-out failed. ${err instanceof Error ? err.message : ""}`,
      });
    } finally {
      auto.running = false;
    }
  };

  // always call the latest version (fresh students / marks)
  const autoRef = useRef(autoCheckOut);
  useEffect(() => {
    autoRef.current = autoCheckOut;
  });

  // check right after loading, then every 30 seconds
  useEffect(() => {
    if (loading) return;
    void autoRef.current();
    const timer = setInterval(() => void autoRef.current(), 30_000);
    return () => clearInterval(timer);
  }, [loading]);

  // ─── Single actions ─────────────────────────────────────────────────
  const setRowBusy = (id: string, value: boolean) =>
    setBusy((prev) => ({ ...prev, [id]: value }));

  const runOne = async (
    st: Student,
    record: ApiAttendance,
    apply: (prev: Record<string, Mark>) => Record<string, Mark>,
    errText: string,
  ) => {
    setRowBusy(st.id, true);
    setNotice(null);
    try {
      await postJson(ATTENDANCE_URL, record);
      setMarks(apply);
    } catch (err) {
      setNotice({
        type: "error",
        text: `${errText} ${err instanceof Error ? err.message : ""}`,
      });
    } finally {
      setRowBusy(st.id, false);
    }
  };

  const handleCheckIn = async (st: Student) => {
    if (isIn(st.id) || busy[st.id]) return;
    const record = buildRecord(st, "PRESENT", nowTime());
    await runOne(
      st,
      record,
      (prev) => ({
        ...prev,
        [st.id]: { inTime: record.inTime as string, outTime: "" },
      }),
      `Could not check in ${st.name}.`,
    );
  };

  const handleCheckOut = async (st: Student) => {
    if (!isIn(st.id) || isOut(st.id) || busy[st.id]) return;
    const outTime = nowTime();
    const inTime = marks[st.id].inTime;
    await runOne(
      st,
      buildRecord(st, "PRESENT", inTime, outTime),
      (prev) => ({ ...prev, [st.id]: { inTime, outTime } }),
      `Could not check out ${st.name}.`,
    );
  };

  const handleUndoCheckOut = async (st: Student) => {
    if (!isOut(st.id) || busy[st.id]) return;
    const inTime = marks[st.id].inTime;
    await runOne(
      st,
      buildRecord(st, "PRESENT", inTime, null),
      (prev) => ({ ...prev, [st.id]: { inTime, outTime: "" } }),
      `Could not undo check-out for ${st.name}.`,
    );
  };

  const handleMarkNotAttended = async (st: Student) => {
    if (busy[st.id]) return;
    if (!window.confirm(`Mark ${st.name} as not attended?`)) return;
    await runOne(
      st,
      buildRecord(st, "ABSENT", null),
      (prev) => {
        const next = { ...prev };
        delete next[st.id];
        return next;
      },
      `Could not update ${st.name}.`,
    );
  };

  // ─── Category update ────────────────────────────────────────────────

  const putKidCategory = async (st: Student, category: string) => {
    const raw = rawKids.current[st.id];
    if (!raw) throw new Error("Child record not loaded. Press Refresh.");
    const r = raw as Record<string, unknown>;
    const body: Record<string, unknown> = {
      ...r,
      category: category || null,
      // GET may still return the old field names; the API expects the new ones
      mobileNo: r.mobileNo ?? r.selfNo ?? null,
      fathermobileNo: r.fathermobileNo ?? r.fatherNo ?? null,
      mothermobileNo: r.mothermobileNo ?? r.motherNo ?? null,
      guardianmobileNo: r.guardianmobileNo ?? r.guardianNo ?? null,
      updatedAt: null,
      updatedBy: getUsername(),
    };
    // old field names are no longer part of the API
    [
      "selfNo",
      "fatherNo",
      "motherNo",
      "guardianNo",
      "momNo",
      "dadNo",
      "occupation",
    ].forEach((key) => delete body[key]);
    const res = await fetch(`${KIDS_URL}/${encodeURIComponent(st.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await errorMessage(res));
    rawKids.current[st.id] = body;
  };

  const syncAttendanceCategory = async (st: Student, category: string) => {
    if (!isIn(st.id)) return;
    const m = marks[st.id];
    await postJson(
      ATTENDANCE_URL,
      buildRecord({ ...st, category }, "PRESENT", m.inTime, m.outTime || null),
    );
  };

  const handleCategory = async (st: Student, category: string) => {
    if (!category || category === st.category) return;
    if (busy[st.id] || bulkBusy) return;
    setRowBusy(st.id, true);
    setNotice(null);
    try {
      await putKidCategory(st, category);
      setStudents((prev) =>
        prev.map((x) => (x.id === st.id ? { ...x, category } : x)),
      );
      try {
        await syncAttendanceCategory(st, category);
      } catch (err) {
        setNotice({
          type: "error",
          text: `Category saved for ${st.name}, but today's attendance record could not be updated. ${err instanceof Error ? err.message : ""}`,
        });
      }
    } catch (err) {
      setNotice({
        type: "error",
        text: `Could not update the category of ${st.name}. ${err instanceof Error ? err.message : ""}`,
      });
    } finally {
      setRowBusy(st.id, false);
    }
  };

  // Set one category for every selected child that has NO category yet
  const runBulkCategory = async (category: string) => {
    if (bulkBusy || !category) return;
    const list = selectedList.filter((st) => !st.category);
    const skipped = selectedList.length - list.length;
    if (list.length === 0) {
      setNotice({
        type: "error",
        text: "Everyone selected already has a category.",
      });
      return;
    }
    setBulkBusy(true);
    setNotice(null);
    const results = await Promise.allSettled(
      list.map(async (st) => {
        await putKidCategory(st, category);
        await syncAttendanceCategory(st, category).catch(() => undefined);
      }),
    );
    const okIds = new Set(
      list
        .filter((_, i) => results[i].status === "fulfilled")
        .map((st) => st.id),
    );
    const failed = list.length - okIds.size;
    setStudents((prev) =>
      prev.map((x) => (okIds.has(x.id) ? { ...x, category } : x)),
    );
    setSelected({});
    setNotice(
      failed === 0
        ? {
            type: "success",
            text: `${okIds.size} children set to ${category}.${skipped ? ` ${skipped} skipped (already had a category).` : ""}`,
          }
        : {
            type: "error",
            text: `${okIds.size} updated, ${failed} failed. Try the failed ones again.`,
          },
    );
    setBulkBusy(false);
  };

  // ─── Date-wise / history view ───────────────────────────────────────
  const changeMode = (m: ViewMode) => {
    setViewMode(m);
    setHistRows([]);
    setHistFetched(false);
    setHistNotice(null);
    setHistTab("all");
    setPage(1);
    setSearch("");
    setSelected({});
  };

  const fetchHistory = async () => {
    const nameOf = (id: string, fallback?: string) =>
      fallback || students.find((st) => st.id === id)?.name || "";

    const presentRows = (list: ApiPresentItem[], date: string): HistRow[] =>
      list
        .filter(
          (r) =>
            r.kidsId && (!r.status || r.status.toUpperCase() === "PRESENT"),
        )
        .map((r) => ({
          key: `${date}-${r.kidsId}`,
          date,
          kidsId: r.kidsId,
          name: nameOf(r.kidsId, r.name),
          inTime: time8(r.inTime),
          outTime: time8(r.outTime),
          status: "PRESENT",
        }));

    const getPresent = async (date: string) => {
      const res = await fetch(`${PRESENT_URL}?date=${date}`);
      if (!res.ok) throw new Error(await errorMessage(res));
      return toArray<ApiPresentItem>(await res.json().catch(() => []));
    };

    setHistLoading(true);
    setHistNotice(null);
    setHistRows([]);
    setPage(1);
    try {
      let rows: HistRow[] = [];

      if (viewMode === "date") {
        if (!viewDate) throw new Error("Pick a date.");
        const present = presentRows(await getPresent(viewDate), viewDate);
        const ids = new Set(present.map((r) => r.kidsId));
        const absent: HistRow[] = students
          .filter((st) => !ids.has(st.id))
          .map((st) => ({
            key: `${viewDate}-${st.id}`,
            date: viewDate,
            kidsId: st.id,
            name: st.name,
            inTime: "",
            outTime: "",
            status: "ABSENT",
          }));
        rows = [...present, ...absent];
      } else if (viewMode === "range") {
        if (!rangeFrom || !rangeTo) throw new Error("Pick from and to dates.");
        if (rangeFrom > rangeTo)
          throw new Error("From date must be before the to date.");
        const dates: string[] = [];
        for (let d = rangeFrom; d <= rangeTo; d = addDays(d, 1)) dates.push(d);
        if (dates.length > MAX_RANGE_DAYS)
          throw new Error(
            `Please pick up to ${MAX_RANGE_DAYS} days at a time.`,
          );
        const results = await Promise.all(
          dates.map(async (d) => ({ d, list: await getPresent(d) })),
        );
        results.forEach(({ d, list }) => rows.push(...presentRows(list, d)));
      } else if (viewMode === "kid") {
        const id = kidQuery.trim();
        if (!id) throw new Error("Enter a kid ID, e.g. JT-26-102.");
        const res = await fetch(
          `${ATTENDANCE_URL}/kid/${encodeURIComponent(id)}`,
        );
        if (!res.ok) throw new Error(await errorMessage(res));
        const list = toArray<ApiAttendance>(await res.json().catch(() => []));
        rows = list.map((r, i) => {
          const date = String(r.date ?? "").slice(0, 10);
          return {
            key: String(r.id ?? `${date}-${i}`),
            date,
            kidsId: r.kidsId || id,
            name: nameOf(r.kidsId || id, r.kidName),
            inTime: time8(r.inTime),
            outTime: time8(r.outTime),
            status: (r.status || "PRESENT").toUpperCase(),
          };
        });
      }

      rows.sort(
        (a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name),
      );
      setHistRows(rows);
      if (rows.length === 0)
        setHistNotice({ type: "error", text: "No records found." });
    } catch (err) {
      setHistNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Could not load attendance.",
      });
    } finally {
      setHistLoading(false);
      setHistFetched(true);
    }
  };

  // ─── Derived lists ──────────────────────────────────────────────────
  // const ageRange =
  //   AGE_OPTIONS.find((a) => a.key === ageFilter) ?? AGE_OPTIONS[0];

  // unique standards present in the data (numbers first, then text)
  const stdOptions = Array.from(
    new Set(students.map((st) => st.stdRaw).filter(Boolean)),
  ).sort((a, b) => {
    const na = /^\d+$/.test(a);
    const nb = /^\d+$/.test(b);
    if (na && nb) return Number(a) - Number(b);
    if (na) return -1;
    if (nb) return 1;
    return a.localeCompare(b);
  });

  const visibleStudents = students.filter(
    (st) =>
      (genderFilter === "all" || st.gender === genderFilter) &&
      (categoryFilter === "all" ||
        (categoryFilter === "none"
          ? st.category === ""
          : st.category === categoryFilter)) &&
      (stdFilter === "all" || st.stdRaw === stdFilter),
    // (ageFilter === "all" ||
    //   (st.age !== null && st.age >= ageRange.min && st.age <= ageRange.max)),
  );
  const checkedInList = visibleStudents.filter((st) => isIn(st.id));
  const checkedOutList = visibleStudents.filter((st) => isOut(st.id));
  const absentList = visibleStudents.filter((st) => !isIn(st.id));

  // category chips: checked in / expected (ignores the category filter itself)
  const catChips = [...CATEGORIES, ""].map((c) => {
    const all = students.filter(
      (st) =>
        st.category === c &&
        (genderFilter === "all" || st.gender === genderFilter) &&
        (stdFilter === "all" || st.stdRaw === stdFilter),

    );
    return {
      key: (c || "none") as CategoryFilter,
      label: c || "Not set",
      value: c,
      expected: all.length,
      here: all.filter((st) => isIn(st.id)).length,
    };
  });

  const tabData: Record<TabKey, Student[]> = {
    jst: visibleStudents,
    checkedIn: checkedInList,
    checkedOut: checkedOutList,
    absent: absentList,
  };

  const q = search.trim().toLowerCase();
  const qDigits = digits(q);
  const filtered = tabData[activeTab].filter(
    (st) =>
      !q ||
      (st.id ?? "").toLowerCase().includes(q) ||
      st.name.toLowerCase().includes(q) ||
      st.category.toLowerCase().includes(q) ||
      st.mobile.includes(q) ||
      (qDigits !== "" && digits(st.mobile).includes(qDigits)) ||
      st.place.toLowerCase().includes(q) ||
      st.standard.toLowerCase().includes(q),
  );

  // history rows, respecting the gender / age / standard / category filters
  const visibleIds = new Set(visibleStudents.map((st) => st.id));
  const knownIds = new Set(students.map((st) => st.id));
  const categoryOf = (id: string) =>
    students.find((st) => st.id === id)?.category ?? "";
  const histScoped = histRows.filter((r) =>
    categoryFilter === "all" && !knownIds.has(r.kidsId)
      ? true
      : knownIds.has(r.kidsId) && visibleIds.has(r.kidsId),
  );
  const histByTab: Record<HistTab, HistRow[]> = {
    all: histScoped,
    present: histScoped.filter((r) => r.status !== "ABSENT"),
    out: histScoped.filter((r) => !!r.outTime),
    absent: histScoped.filter((r) => r.status === "ABSENT"),
  };
  const histFiltered = histByTab[histTab].filter(
    (r) =>
      !q ||
      r.kidsId.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      categoryOf(r.kidsId).toLowerCase().includes(q) ||
      r.date.includes(q),
  );

  const listLen = isToday ? filtered.length : histFiltered.length;
  const totalPages = Math.max(1, Math.ceil(listLen / perPage));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const pageRows = filtered.slice(startIdx, startIdx + perPage);
  const histPageRows = histFiltered.slice(startIdx, startIdx + perPage);

  // ─── Bulk selection / update ────────────────────────────────────────
  const showSelect = isToday && activeTab !== "checkedOut";
  const selectedList = filtered.filter((st) => selected[st.id]);
  const allSelected =
    filtered.length > 0 && selectedList.length === filtered.length;

  const toggleOne = (id: string) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<string, boolean> = {};
      filtered.forEach((st) => (next[st.id] = true));
      setSelected(next);
    }
  };

  const runBulk = async (selectedKids: Student[], action: BulkAction) => {
    if (bulkBusy) return;

    // only the children the action applies to
    const list =
      action === "in"
        ? selectedKids.filter((st) => !isIn(st.id))
        : action === "out"
          ? selectedKids.filter((st) => isIn(st.id) && !isOut(st.id))
          : selectedKids;

    if (list.length === 0) {
      setNotice({
        type: "error",
        text:
          action === "in"
            ? "Everyone selected has already checked in."
            : action === "out"
              ? "Nobody selected is waiting to check out."
              : "Nothing to update.",
      });
      return;
    }
    if (
      action === "absent" &&
      !window.confirm(`Mark ${list.length} children as not attended?`)
    )
      return;

    setBulkBusy(true);
    setNotice(null);
    try {
      const stamp = nowTime(); // same time for the whole batch
      const records = list.map((st) =>
        action === "in"
          ? buildRecord(st, "PRESENT", stamp)
          : action === "out"
            ? buildRecord(st, "PRESENT", marks[st.id].inTime, stamp)
            : buildRecord(st, "ABSENT", null),
      );
      await postJson(BULK_URL, records);
      setMarks((prev) => {
        const next = { ...prev };
        list.forEach((st) => {
          if (action === "in") next[st.id] = { inTime: stamp, outTime: "" };
          else if (action === "out")
            next[st.id] = { inTime: prev[st.id].inTime, outTime: stamp };
          else delete next[st.id];
        });
        return next;
      });
      setSelected({});
      setNotice({
        type: "success",
        text:
          action === "in"
            ? `${list.length} children checked in.`
            : action === "out"
              ? `${list.length} children checked out.`
              : `${list.length} children marked as not attended.`,
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: `Bulk update failed. ${err instanceof Error ? err.message : ""}`,
      });
    } finally {
      setBulkBusy(false);
    }
  };

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
    setSelected({});
  };

  const showInCol = activeTab !== "absent";
  const showOutCol = activeTab !== "absent";

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "jst", label: "JST Kids", count: visibleStudents.length },
    { key: "absent", label: "Absent", count: absentList.length },
    { key: "checkedIn", label: "Checked In", count: checkedInList.length },
    { key: "checkedOut", label: "Checked Out", count: checkedOutList.length },
  ];

  const emptyText: Record<TabKey, string> = {
    jst: "No children found.",
    checkedIn: "No one has checked in yet.",
    checkedOut: "No one has checked out yet.",
    absent: students.length === 0 ? "No children found." : "No one is absent.",
  };

  const histTabs: { key: HistTab; label: string; count: number }[] = [
    { key: "all", label: "All Records", count: histScoped.length },
    { key: "present", label: "Present", count: histByTab.present.length },
    { key: "out", label: "Checked Out", count: histByTab.out.length },
    { key: "absent", label: "Absent", count: histByTab.absent.length },
  ];

  const tabList = isToday
    ? tabs.map((t) => ({
        key: t.key as string,
        label: t.label,
        count: t.count,
        active: activeTab === t.key,
        onClick: () => switchTab(t.key),
      }))
    : histTabs.map((t) => ({
        key: t.key as string,
        label: t.label,
        count: t.count,
        active: histTab === t.key,
        onClick: () => {
          setHistTab(t.key);
          setPage(1);
          setSearch("");
        },
      }));

  const summaryCards = isToday
    ? [
        { label: "Expected", value: visibleStudents.length, color: "#111827" },
        { label: "C In", value: checkedInList.length, color: "#16a34a" },
        { label: "C Out", value: checkedOutList.length, color: "#ea580c" },
        { label: "Absent", value: absentList.length, color: "#dc2626" },
      ]
    : [
        { label: "Records", value: histScoped.length, color: "#111827" },
        { label: "Present", value: histByTab.present.length, color: "#16a34a" },
        { label: "C Out", value: histByTab.out.length, color: "#ea580c" },
        { label: "Absent", value: histByTab.absent.length, color: "#dc2626" },
      ];

  const histEmpty = histFetched
    ? "No records found."
    : viewMode === "kid"
      ? "Enter a kid ID and press Fetch."
      : "Choose the date(s) and press Fetch.";

  // ─── Styles ───────────────────────────────────────────────────────────
  const s: { [key: string]: CSSProperties } = {
    page: {
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      backgroundColor: "#f8f7ff",
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      boxSizing: "border-box",
    },
    contentWrapper: {
      width: "100%",
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "12px 24px 16px",
      boxSizing: "border-box",
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
    },
    headerSection: {
      display: "flex",
      alignItems: "center",
      gap: "14px",
      marginBottom: "10px",
      flexShrink: 0,
    },
    headerIconBox: {
      width: "48px",
      height: "48px",
      borderRadius: "12px",
      backgroundColor: "#ede9fe",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#7c3aed",
    },
    headerTitle: {
      fontSize: "24px",
      fontWeight: 700,
      color: "#111827",
      margin: 0,
    },
    headerSub: { fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" },
    notice: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      padding: "8px 14px",
      borderRadius: "8px",
      fontSize: "13px",
      marginBottom: "10px",
      flexShrink: 0,
    },
    noticeBtn: {
      background: "transparent",
      border: "none",
      color: "inherit",
      fontSize: "13px",
      fontWeight: 600,
      cursor: "pointer",
      textDecoration: "underline",
      padding: 0,
    },
    summaryRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: "12px",
      marginBottom: "10px",
      flexShrink: 0,
    },
    summaryCard: {
      backgroundColor: "white",
      borderRadius: "14px",
      border: "1px solid #e5e7eb",
      padding: "8px 16px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    },
    summaryLabel: {
      fontSize: "12px",
      fontWeight: 500,
      color: "#6b7280",
      margin: 0,
    },
    summaryValue: {
      fontSize: "20px",
      fontWeight: 700,
      color: "#111827",
      margin: "0",
    },
    card: {
      backgroundColor: "white",
      borderRadius: "16px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
    },
    tabBar: {
      flexShrink: 0,
      display: "flex",
      gap: "4px",
      padding: "0 20px",
      borderBottom: "1px solid #f3f4f6",
      overflowX: "auto",
    },
    toolbar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "12px",
      padding: "10px 20px",
      flexShrink: 0,
    },
    bulkBar: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "10px",
      padding: "8px 20px",
      backgroundColor: "#f5f3ff",
      borderTop: "1px solid #ede9fe",
      borderBottom: "1px solid #ede9fe",
      fontSize: "13px",
      color: "#5b21b6",
      fontWeight: 600,
      flexShrink: 0,
    },
    clearBtn: {
      background: "white",
      color: "#6b7280",
      border: "1.5px solid #e5e7eb",
      borderRadius: "8px",
      padding: "6px 12px",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
    },
    searchWrapper: {
      position: "relative",
      flex: "1 1 260px",
      maxWidth: "360px",
    },
    searchIcon: {
      position: "absolute",
      left: "10px",
      top: "50%",
      transform: "translateY(-50%)",
      display: "flex",
      pointerEvents: "none",
    },
    searchInput: {
      width: "100%",
      padding: "9px 36px 9px 34px",
      border: "1.5px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "13px",
      color: "#374151",
      outline: "none",
      boxSizing: "border-box",
      backgroundColor: "white",
    },
    segment: {
      display: "inline-flex",
      padding: "3px",
      gap: "2px",
      backgroundColor: "#f3f4f6",
      borderRadius: "10px",
    },
    perPageWrap: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "13px",
      color: "#6b7280",
    },
    perPageSelect: {
      padding: "6px 10px",
      border: "1.5px solid #e5e7eb",
      borderRadius: "6px",
      fontSize: "13px",
      color: "#374151",
      backgroundColor: "white",
      outline: "none",
    },
    dateBar: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "10px",
      padding: "10px 20px 0",
      flexShrink: 0,
    },
    dateInput: {
      padding: "7px 10px",
      border: "1.5px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "13px",
      color: "#374151",
      backgroundColor: "white",
      outline: "none",
    },
    presentBadge: {
      backgroundColor: "#dcfce7",
      color: "#16a34a",
      borderRadius: "20px",
      padding: "3px 10px",
      fontSize: "11px",
      fontWeight: 600,
    },
    absentBadge: {
      backgroundColor: "#fee2e2",
      color: "#dc2626",
      borderRadius: "20px",
      padding: "3px 10px",
      fontSize: "11px",
      fontWeight: 600,
    },
    tableResponsive: { overflow: "auto", flex: 1, minHeight: 0 },
    table: { width: "100%", borderCollapse: "collapse", minWidth: "960px" },
    th: {
      padding: "11px 16px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: 600,
      color: "#6b7280",
      backgroundColor: "#fafafa",
      position: "sticky",
      top: 0,
      zIndex: 1,
      borderTop: "1px solid #f3f4f6",
      borderBottom: "1px solid #f3f4f6",
      whiteSpace: "nowrap",
    },
    td: {
      padding: "13px 16px",
      fontSize: "13px",
      color: "#374151",
      borderBottom: "1px solid #f9fafb",
      verticalAlign: "middle",
    },
    nameCell: { fontWeight: 500, color: "#111827" },
    checkInBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      background: "#7c3aed",
      color: "white",
      border: "none",
      borderRadius: "8px",
      padding: "7px 14px",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    checkOutBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      background: "#ea580c",
      color: "white",
      border: "none",
      borderRadius: "8px",
      padding: "7px 14px",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    editBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      background: "white",
      color: "#dc2626",
      border: "1.5px solid #fecaca",
      borderRadius: "8px",
      padding: "6px 12px",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    timeBadge: {
      backgroundColor: "#ede9fe",
      color: "#7c3aed",
      borderRadius: "20px",
      padding: "3px 10px",
      fontSize: "12px",
      fontWeight: 600,
      whiteSpace: "nowrap",
    },
    outBadge: {
      backgroundColor: "#ffedd5",
      color: "#ea580c",
      borderRadius: "20px",
      padding: "3px 10px",
      fontSize: "12px",
      fontWeight: 600,
      whiteSpace: "nowrap",
    },
    noData: {
      padding: "40px 20px",
      textAlign: "center",
      color: "#9ca3af",
      fontSize: "15px",
    },
    footer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "10px",
      padding: "10px 20px",
      flexShrink: 0,
      borderTop: "1px solid #f3f4f6",
    },
    showingText: { fontSize: "13px", color: "#6b7280" },
    pagination: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      flexWrap: "wrap",
    },
  };

  const tabStyle = (active: boolean): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 14px",
    background: "none",
    border: "none",
    borderBottom: active ? "3px solid #7c3aed" : "3px solid transparent",
    color: active ? "#7c3aed" : "#6b7280",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  const countStyle = (active: boolean): CSSProperties => ({
    background: active ? "#ede9fe" : "#f3f4f6",
    color: active ? "#7c3aed" : "#6b7280",
    fontSize: "12px",
    fontWeight: 600,
    padding: "2px 9px",
    borderRadius: "20px",
  });

  const segBtnStyle = (active: boolean): CSSProperties => ({
    background: active ? "white" : "transparent",
    color: active ? "#7c3aed" : "#6b7280",
    border: "none",
    borderRadius: "8px",
    padding: "6px 16px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
  });

  const pageBtnStyle = (active: boolean, disabled = false): CSSProperties => ({
    minWidth: "32px",
    height: "32px",
    padding: "0 8px",
    borderRadius: "6px",
    border: `1.5px solid ${active ? "#7c3aed" : "#e5e7eb"}`,
    background: active ? "#7c3aed" : "white",
    color: active ? "white" : "#374151",
    fontSize: "13px",
    fontWeight: 500,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
  });

  // coloured pill for a category (also used in the history view)
  const catBadge = (cat: string): CSSProperties => {
    const c = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS[""];
    return {
      background: c.bg,
      color: c.fg,
      borderRadius: "20px",
      padding: "3px 10px",
      fontSize: "11px",
      fontWeight: 700,
      whiteSpace: "nowrap",
    };
  };

  // Category cell shown on every row.
  //   category set        -> locked badge + "Change" button
  //   category empty      -> dropdown (amber border) to set it
  //   after pressing Change -> dropdown to pick a new value
  const categorySelect = (st: Student) => {
    if (st.category && !editingCat[st.id]) {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={catBadge(st.category)}>{st.category}</span>
          <button
            type="button"
            style={{ ...s.clearBtn, padding: "3px 8px", fontSize: "11px" }}
            disabled={!!busy[st.id] || bulkBusy}
            onClick={() => setEditingCat((p) => ({ ...p, [st.id]: true }))}
          >
            Change
          </button>
        </span>
      );
    }

    return (
      <select
        className="att-catsel"
        style={
          st.category
            ? undefined
            : {
                borderColor: "#f59e0b",
                background: "#fffbeb",
                color: "#92400e",
              }
        }
        value={st.category}
        disabled={!!busy[st.id] || bulkBusy}
        aria-label={`Category of ${st.name}`}
        onChange={async (e) => {
          await handleCategory(st, e.target.value);
          setEditingCat((p) => ({ ...p, [st.id]: false }));
        }}
      >
        <option value="">Select</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    );
  };

  // row actions (shared by the table and the mobile cards)
  //   not in            -> Check In
  //   in, not out       -> Check Out  +  Not Attended
  //   in and out        -> Undo Check Out
  const actionButtons = (st: Student) => {
    const rowBusy = !!busy[st.id] || bulkBusy;

    if (!isIn(st.id)) {
      return (
        <div className="att-actions">
          <button
            type="button"
            style={s.checkInBtn}
            disabled={rowBusy}
            onClick={() => handleCheckIn(st)}
          >
            <CheckIcon /> {busy[st.id] ? "Saving..." : "Check In"}
          </button>
        </div>
      );
    }

    if (!isOut(st.id)) {
      return (
        <div className="att-actions">
          <button
            type="button"
            style={s.checkOutBtn}
            disabled={rowBusy}
            onClick={() => handleCheckOut(st)}
          >
            <LogoutIcon /> {busy[st.id] ? "Saving..." : "Check Out"}
          </button>
          <button
            type="button"
            style={s.editBtn}
            disabled={rowBusy}
            onClick={() => handleMarkNotAttended(st)}
          >
            <EditIcon /> Not Attended
          </button>
        </div>
      );
    }

    return (
      <div className="att-actions">
        <button
          type="button"
          style={s.editBtn}
          disabled={rowBusy}
          onClick={() => handleUndoCheckOut(st)}
        >
          <EditIcon /> {busy[st.id] ? "Updating..." : "Undo Check Out"}
        </button>
      </div>
    );
  };

  const inBadge = (st: Student) =>
    isIn(st.id) ? (
      <span style={s.timeBadge}>In {formatTime(marks[st.id].inTime)}</span>
    ) : null;
  const outBadge = (st: Student) =>
    isOut(st.id) ? (
      <span style={s.outBadge}>Out {formatTime(marks[st.id].outTime)}</span>
    ) : null;

  // mobile card: "9080635093 · 1 yr · 3rd · Place" (empty parts are skipped)
  const cardMeta = (st: Student) => {
    const parts = [
      st.age !== null ? `${st.age} ${st.age === 1 ? "yr" : "yrs"}` : "",
      st.standard !== "—" ? st.standard : "",
      st.place !== "—" ? st.place : "",
    ].filter(Boolean);
    return (
      <div className="att-meta">
        {st.mobile !== "—" ? (
          <a className="att-tel" href={`tel:${st.mobile}`}>
            {st.mobile}
          </a>
        ) : (
          "No mobile"
        )}
        {parts.length > 0 ? ` · ${parts.join(" · ")}` : ""}
      </div>
    );
  };

  return (
    <div className="attendance-page" style={s.page}>
      <style>{pageCss}</style>
      <div style={{ flexShrink: 0 }}>
        <Header />
      </div>

      <div className="att-wrap" style={s.contentWrapper}>
        <div className="att-hsec" style={s.headerSection}>
          <div className="att-hicon" style={s.headerIconBox}>
            <ClipboardIcon />
          </div>
          <div>
            <h1 className="att-title" style={s.headerTitle}>
              Attendance
            </h1>
            <p style={s.headerSub}>{formatDate(todayStr())}</p>
          </div>
        </div>

        {notice && (
          <div
            className="att-notice"
            style={{
              ...s.notice,
              backgroundColor: notice.type === "error" ? "#fef2f2" : "#f0fdf4",
              color: notice.type === "error" ? "#dc2626" : "#16a34a",
              border: `1px solid ${notice.type === "error" ? "#fecaca" : "#bbf7d0"}`,
            }}
          >
            <span>{notice.text}</span>
            <span style={{ display: "flex", gap: "12px" }}>
              {notice.type === "error" && (
                <button
                  type="button"
                  style={s.noticeBtn}
                  onClick={() => loadData()}
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                style={s.noticeBtn}
                onClick={() => setNotice(null)}
              >
                Dismiss
              </button>
            </span>
          </div>
        )}

        {!isToday && histNotice && (
          <div
            className="att-notice"
            style={{
              ...s.notice,
              backgroundColor:
                histNotice.type === "error" ? "#fef2f2" : "#f0fdf4",
              color: histNotice.type === "error" ? "#dc2626" : "#16a34a",
              border: `1px solid ${histNotice.type === "error" ? "#fecaca" : "#bbf7d0"}`,
            }}
          >
            <span>{histNotice.text}</span>
            <button
              type="button"
              style={s.noticeBtn}
              onClick={() => setHistNotice(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="att-sum" style={s.summaryRow}>
          {summaryCards.map((c) => (
            <div className="att-sumcard" style={s.summaryCard} key={c.label}>
              <p style={s.summaryLabel}>{c.label}</p>
              <p style={{ ...s.summaryValue, color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Category chips: checked in / expected. Click one to filter. */}
        <div className="att-catrow">
          {catChips.map((c) => {
            const col = CATEGORY_COLORS[c.value] ?? CATEGORY_COLORS[""];
            return (
              <button
                key={c.key}
                type="button"
                className={`att-catchip${categoryFilter === c.key ? " on" : ""}`}
                style={{ background: col.bg, color: col.fg }}
                title="Click to filter by this category"
                onClick={() => {
                  setCategoryFilter(categoryFilter === c.key ? "all" : c.key);
                  setPage(1);
                  setSelected({});
                }}
              >
                {c.label}
                <small>
                  {c.here} / {c.expected}
                </small>
              </button>
            );
          })}
        </div>

        <div className="att-main" style={s.card}>
          <div className="att-tabs" style={s.tabBar}>
            {tabList.map((t) => (
              <button
                key={t.key}
                type="button"
                style={tabStyle(t.active)}
                onClick={t.onClick}
              >
                {t.label}
                <span style={countStyle(t.active)}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Date filter: Today / By Date / Range / By Kid */}
          <div className="att-datebar" style={s.dateBar}>
            <div className="att-seg" style={s.segment}>
              {VIEW_MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  style={segBtnStyle(viewMode === m.key)}
                  onClick={() => changeMode(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {viewMode === "date" && (
              <input
                type="date"
                style={s.dateInput}
                max={todayStr()}
                value={viewDate}
                onChange={(e) => setViewDate(e.target.value)}
              />
            )}
            {viewMode === "range" && (
              <>
                <input
                  type="date"
                  style={s.dateInput}
                  max={todayStr()}
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                />
                <span style={{ color: "#6b7280", fontSize: "12px" }}>to</span>
                <input
                  type="date"
                  style={s.dateInput}
                  max={todayStr()}
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                />
              </>
            )}
            {viewMode === "kid" && (
              <input
                type="text"
                style={{ ...s.dateInput, minWidth: "200px" }}
                placeholder="Kid ID e.g. JT-26-102"
                value={kidQuery}
                onChange={(e) => setKidQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void fetchHistory();
                }}
              />
            )}
            {!isToday && (
              <button
                type="button"
                style={s.checkInBtn}
                disabled={histLoading}
                onClick={() => void fetchHistory()}
              >
                {histLoading ? "Loading..." : "Fetch"}
              </button>
            )}
          </div>

          <div className="att-toolbar" style={s.toolbar}>
            <div className="att-search" style={s.searchWrapper}>
              <span style={s.searchIcon}>
                <SearchIcon />
              </span>
              <input
                style={s.searchInput}
                type="text"
                placeholder="Search by ID, name, mobile, place, category..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  className="att-clear"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="att-seg" style={s.segment}>
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  style={segBtnStyle(genderFilter === g.key)}
                  onClick={() => {
                    setGenderFilter(g.key);
                    setPage(1);
                    setSelected({});
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="att-perpage" style={s.perPageWrap}>
              <select
                style={s.perPageSelect}
                value={categoryFilter}
                aria-label="Filter by category"
                onChange={(e) => {
                  setCategoryFilter(e.target.value as CategoryFilter);
                  setPage(1);
                  setSelected({});
                }}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="att-perpage" style={s.perPageWrap}>
              <select
                style={s.perPageSelect}
                value={stdFilter}
                aria-label="Filter by standard"
                onChange={(e) => {
                  setStdFilter(e.target.value);
                  setPage(1);
                  setSelected({});
                }}
              >
                <option value="all">All Standards</option>
                {stdOptions.map((std) => (
                  <option key={std} value={std}>
                    {formatStd(std)}
                  </option>
                ))}
              </select>
            </div>
            <div className="att-perpage" style={s.perPageWrap}>
              <span className="att-pp-label">Rows per page</span>
              <select
                style={s.perPageSelect}
                value={perPage}
                aria-label="Rows per page"
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showSelect && selectedList.length > 0 && (
            <div className="att-bulk" style={s.bulkBar}>
              <span>{selectedList.length} selected</span>
              {(activeTab === "jst" || activeTab === "absent") && (
                <button
                  type="button"
                  style={s.checkInBtn}
                  disabled={bulkBusy}
                  onClick={() => runBulk(selectedList, "in")}
                >
                  <CheckIcon /> {bulkBusy ? "Saving..." : "Check In Selected"}
                </button>
              )}
              {(activeTab === "jst" || activeTab === "checkedIn") && (
                <button
                  type="button"
                  style={s.checkOutBtn}
                  disabled={bulkBusy}
                  onClick={() => runBulk(selectedList, "out")}
                >
                  <LogoutIcon /> {bulkBusy ? "Saving..." : "Check Out Selected"}
                </button>
              )}
              {activeTab === "checkedIn" && (
                <button
                  type="button"
                  style={s.editBtn}
                  disabled={bulkBusy}
                  onClick={() => runBulk(selectedList, "absent")}
                >
                  <EditIcon /> Mark Not Attended
                </button>
              )}
              <select
                className="att-catsel"
                value=""
                disabled={bulkBusy}
                aria-label="Set category for selected children without a category"
                title="Only children with no category are updated"
                onChange={(e) => void runBulkCategory(e.target.value)}
              >
                <option value="">Set category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                style={s.clearBtn}
                disabled={bulkBusy}
                onClick={() => setSelected({})}
              >
                Clear selection
              </button>
            </div>
          )}

          {/* History view (By Date / Range / By Kid): read-only */}
          {!isToday && (
            <>
              <div className="att-tablewrap" style={s.tableResponsive}>
                {histLoading ? (
                  <div style={s.noData}>Loading attendance...</div>
                ) : histPageRows.length === 0 ? (
                  <div style={s.noData}>
                    {q ? "No matching records." : histEmpty}
                  </div>
                ) : (
                  <table style={{ ...s.table, minWidth: "820px" }}>
                    <thead>
                      <tr>
                        <th style={s.th}>Date</th>
                        <th style={s.th}>ID</th>
                        <th style={s.th}>Name</th>
                        <th style={s.th}>Category</th>
                        <th style={s.th}>Check-in Time</th>
                        <th style={s.th}>Check-out Time</th>
                        <th style={s.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {histPageRows.map((r) => (
                        <tr key={r.key}>
                          <td style={s.td}>{formatDate(r.date)}</td>
                          <td style={s.td}>
                            <span className="att-idchip">{r.kidsId}</span>
                          </td>
                          <td style={{ ...s.td, ...s.nameCell }}>
                            {r.name || "—"}
                          </td>
                          <td style={s.td}>
                            <span style={catBadge(categoryOf(r.kidsId))}>
                              {categoryOf(r.kidsId) || "Not set"}
                            </span>
                          </td>
                          <td style={s.td}>
                            {r.inTime ? (
                              <span style={s.timeBadge}>
                                {formatTime(r.inTime)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={s.td}>
                            {r.outTime ? (
                              <span style={s.outBadge}>
                                {formatTime(r.outTime)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={s.td}>
                            <span
                              style={
                                r.status === "ABSENT"
                                  ? s.absentBadge
                                  : s.presentBadge
                              }
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="att-cards">
                {histLoading ? (
                  <div style={s.noData}>Loading attendance...</div>
                ) : histPageRows.length === 0 ? (
                  <div style={s.noData}>
                    {q ? "No matching records." : histEmpty}
                  </div>
                ) : (
                  histPageRows.map((r) => (
                    <div className="att-card" key={r.key}>
                      <div className="att-info">
                        <div className="att-name">
                          {r.name || "—"}
                          <span className="att-idchip">{r.kidsId}</span>
                        </div>
                        <div className="att-meta">{formatDate(r.date)}</div>
                        <div className="att-time">
                          <span style={catBadge(categoryOf(r.kidsId))}>
                            {categoryOf(r.kidsId) || "Not set"}
                          </span>
                          {r.inTime && (
                            <span style={s.timeBadge}>
                              In {formatTime(r.inTime)}
                            </span>
                          )}
                          {r.outTime && (
                            <span style={s.outBadge}>
                              Out {formatTime(r.outTime)}
                            </span>
                          )}
                          <span
                            style={
                              r.status === "ABSENT"
                                ? s.absentBadge
                                : s.presentBadge
                            }
                          >
                            {r.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {isToday && (
            <>
              {/* Desktop / tablet: table */}
              <div className="att-tablewrap" style={s.tableResponsive}>
                {loading ? (
                  <div style={s.noData}>Loading children...</div>
                ) : pageRows.length === 0 ? (
                  <div style={s.noData}>
                    {q ? "No matching students found." : emptyText[activeTab]}
                  </div>
                ) : (
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {showSelect && (
                          <th style={{ ...s.th, width: "44px" }}>
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleAll}
                              title="Select all"
                            />
                          </th>
                        )}
                        <th style={s.th}>Action</th>
                        <th style={s.th}>ID</th>
                        <th style={s.th}>Name</th>
                        <th style={s.th}>Category</th>
                        <th style={s.th}>Mobile</th>

                        {/* <th style={s.th}>Standard</th> */}
                        <th style={s.th}>Place</th>
                        {showInCol && <th style={s.th}>Check-in Time</th>}
                        {showOutCol && <th style={s.th}>Check-out Time</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((st) => (
                        <tr key={st.id}>
                          {showSelect && (
                            <td style={s.td}>
                              <input
                                type="checkbox"
                                checked={!!selected[st.id]}
                                onChange={() => toggleOne(st.id)}
                              />
                            </td>
                          )}
                          <td style={s.td}>{actionButtons(st)}</td>
                          <td style={s.td}>
                            <span className="att-idchip">{st.id}</span>
                          </td>
                          <td style={{ ...s.td, ...s.nameCell }}>{st.name}</td>
                          <td style={s.td}>{categorySelect(st)}</td>
                          <td style={s.td}>{st.mobile}</td>
                          {/* <td style={s.td}>{st.age ?? "—"}</td> */}
                          {/* <td style={s.td}>{st.standard}</td> */}
                          <td style={s.td}>{st.place}</td>
                          {showInCol && (
                            <td style={s.td}>
                              {isIn(st.id) ? (
                                <span style={s.timeBadge}>
                                  {formatTime(marks[st.id].inTime)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          )}
                          {showOutCol && (
                            <td style={s.td}>
                              {isOut(st.id) ? (
                                <span style={s.outBadge}>
                                  {formatTime(marks[st.id].outTime)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Mobile: card list (details on top, full-width actions below) */}
              <div className="att-cards">
                {loading ? (
                  <div style={s.noData}>Loading children...</div>
                ) : pageRows.length === 0 ? (
                  <div style={s.noData}>
                    {q ? "No matching students found." : emptyText[activeTab]}
                  </div>
                ) : (
                  <>
                    {showSelect && (
                      <label className="att-selall">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                        />
                        Select all ({filtered.length})
                      </label>
                    )}
                    {pageRows.map((st) => (
                      <div
                        className={`att-card${showSelect ? " att-card--sel" : ""}${
                          isOut(st.id)
                            ? " att-out"
                            : isIn(st.id)
                              ? " att-in"
                              : ""
                        }`}
                        key={st.id}
                      >
                        {showSelect && (
                          <input
                            type="checkbox"
                            checked={!!selected[st.id]}
                            onChange={() => toggleOne(st.id)}
                            aria-label={`Select ${st.name}`}
                          />
                        )}
                        <div className="att-info">
                          <div className="att-name">
                            {st.name}
                            <span className="att-idchip">{st.id}</span>
                          </div>
                          {cardMeta(st)}
                          <div className="att-cardcat">
                            {categorySelect(st)}
                          </div>
                          {activeTab !== "absent" && isIn(st.id) && (
                            <div className="att-time">
                              {inBadge(st)}
                              {outBadge(st)}
                            </div>
                          )}
                        </div>
                        {actionButtons(st)}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          )}

          {!(isToday ? loading : histLoading) && listLen > 0 && (
            <div className="att-footer" style={s.footer}>
              <span style={s.showingText}>
                Showing {startIdx + 1}–{Math.min(startIdx + perPage, listLen)}{" "}
                of {listLen}
              </span>
              <div className="att-pages" style={s.pagination}>
                <button
                  type="button"
                  style={pageBtnStyle(false, currentPage === 1)}
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - currentPage) <= 1,
                  )
                  .map((p, i, arr) => (
                    <span
                      key={p}
                      className="att-num"
                      style={{
                        display: "inline-flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      {i > 0 && p - arr[i - 1] > 1 && (
                        <span style={{ color: "#9ca3af" }}>…</span>
                      )}
                      <button
                        type="button"
                        style={pageBtnStyle(p === currentPage)}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <span className="att-pageof">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  style={pageBtnStyle(false, currentPage === totalPages)}
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
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