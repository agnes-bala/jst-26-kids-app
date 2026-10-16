import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import Header from "../components/Header";

// ─── API ────────────────────────────────────────────────────────────────
const API_BASE_URL = "/api"; // proxied by Vite -> http://10.12.1.118:8081
const KIDS_URL = `${API_BASE_URL}/kids`; // GET  -> all children
const ATTENDANCE_URL = `${API_BASE_URL}/attendance`; // POST -> one child
const PRESENT_URL = `${ATTENDANCE_URL}/present`; // GET ?date=yyyy-mm-dd -> present list
const BULK_URL = `${ATTENDANCE_URL}/bulk`; // POST -> array of records

// Attendance record exactly as the API takes it
// { kidsId, kidName, date: "2026-10-14", inTime: "09:15:00", status: "PRESENT" }
interface ApiAttendance {
  id?: string;
  kidsId: string;
  kidName?: string;
  date: string;
  inTime: string | null;
  status: string; // "PRESENT" | "ABSENT"
}

// Item of GET /attendance/present?date=  (inTime / status may or may not be sent)
interface ApiPresentItem {
  kidsId: string;
  name?: string;
  std?: string;
  inTime?: string | null;
  status?: string;
}

interface ApiKid {
  kidsId: string;
  name: string;
  gender: string;
  std?: string | null;
  selfNo?: string | null;
  momNo?: string | null;
  dadNo?: string | null;
  guardianNo?: string | null;
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
  id: string; // kidsId
  name: string;
  gender: string;
  mobile: string;
  standard: string;
  stdRaw: string; // raw std value from the API, used for the filter
  place: string;
  age: number | null;
}

type TabKey = "attendees" | "nonAttendees";
type GenderFilter = "all" | "Male" | "Female";
type AgeFilter = "all" | "u6" | "6-10" | "11-14" | "15+";
type Notice = { type: "error" | "success"; text: string } | null;

const GENDER_OPTIONS: { key: GenderFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Male", label: "Boys" },
  { key: "Female", label: "Girls" },
];

const AGE_OPTIONS: {
  key: AgeFilter;
  label: string;
  min: number;
  max: number;
}[] = [
  { key: "all", label: "All Ages", min: 0, max: 200 },
  { key: "u6", label: "Under 6", min: 0, max: 5 },
  { key: "6-10", label: "6–10", min: 6, max: 10 },
  { key: "11-14", label: "11–14", min: 11, max: 14 },
  { key: "15+", label: "15+", min: 15, max: 200 },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20];

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
  mobile: k.selfNo || k.dadNo || k.momNo || k.guardianNo || "—",
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

const buildRecord = (
  st: Student,
  status: "PRESENT" | "ABSENT",
  inTime: string = nowTime(),
): ApiAttendance => ({
  kidsId: st.id,
  kidName: st.name,
  date: todayStr(),
  inTime: status === "PRESENT" ? inTime : null,
  status,
});

// ─── Local cache of today's check-ins ───────────────────────────────────
// Used when GET /attendance/present is not available, and to remember the
// check-in time if the server does not send it back.
const cacheKey = () => `attendance:${todayStr()}`;

const readCache = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(cacheKey());
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
};

const writeCache = (map: Record<string, string>) => {
  try {
    localStorage.setItem(cacheKey(), JSON.stringify(map));
  } catch {
    /* storage unavailable – ignore */
  }
};

const digits = (t: string) => t.replace(/\D/g, "");

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
.attendance-page input[type="checkbox"] { width: 16px; height: 16px; accent-color: #7c3aed; cursor: pointer; }

/* search clear button */
.att-clear { position: absolute; right: 6px; top: 50%; margin-top: -14px; width: 28px; height: 28px; border-radius: 50%;
  border: none; background: #f3f4f6; color: #6b7280; font-size: 12px; cursor: pointer; padding: 0; }

/* mobile card list (hidden on desktop) */
.att-cards { display: none; flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.att-selall { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  background: #fafafa; border-bottom: 1px solid #f3f4f6; font-size: 12px; font-weight: 600; color: #6b7280; cursor: pointer; }
.att-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
.att-card input[type="checkbox"] { width: 20px; height: 20px; flex-shrink: 0; }
.att-info { flex: 1; min-width: 0; }
.att-name { font-weight: 600; font-size: 14px; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.att-meta { font-size: 12px; color: #6b7280; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.att-tel { color: #2563eb; text-decoration: none; font-weight: 600; }
.att-time { margin-top: 4px; }
.att-card button { flex-shrink: 0; min-height: 40px; }
.att-pageof { display: none; font-size: 13px; font-weight: 600; color: #374151; min-width: 52px; text-align: center; }

@media (max-width: 700px) {
  .att-wrap { padding: 8px 10px 10px !important; }
  .att-hsec { margin-bottom: 8px !important; gap: 10px !important; }
  .att-hicon { width: 38px !important; height: 38px !important; }
  .att-title { font-size: 18px !important; }
  .att-notice { flex-wrap: wrap; }

  .att-sum { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 8px !important; margin-bottom: 8px !important; }
  .att-sumcard { padding: 6px 10px !important; border-radius: 12px !important; }

  .att-tabs { padding: 0 6px !important; }
  .att-tabs button { flex: 1; justify-content: center; padding: 12px 8px !important; }

  .att-toolbar { padding: 8px 10px !important; gap: 8px !important; }
  .att-search { flex: 1 1 100% !important; max-width: none !important; }
  .att-search input { font-size: 16px !important; padding: 11px 36px 11px 34px !important; }
  .att-seg { flex: 1 1 100%; display: flex !important; overflow-x: auto; }
  .att-seg button { flex: 1; padding: 8px 10px !important; white-space: nowrap; }
  .att-pp-label { display: none; }
  .att-perpage select { font-size: 16px !important; }

  .att-bulk { padding: 8px 10px !important; }

  .att-tablewrap { display: none !important; }
  .att-cards { display: block; }

  .att-footer { padding: 8px 10px !important; }
  .att-num { display: none !important; }
  .att-pageof { display: inline-block; }
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
  // kidsId -> check-in time ("HH:mm:ss", may be "" if unknown). Key present = checked in today.
  const [checkedIn, setCheckedIn] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("all");
  const [stdFilter, setStdFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<TabKey>("nonAttendees");
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const isIn = (id: string) => id in checkedIn;

  // ─── Load children + today's present list ───────────────────────────
  // `signal` cancels the first run of React StrictMode's double effect (dev),
  // so GET /kids and GET /attendance/present are not sent twice.
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
      const map: Record<string, string> = {};
      list.forEach((r) => {
        if (!r.kidsId) return;
        if (r.status && r.status.toUpperCase() !== "PRESENT") return;
        map[r.kidsId] = r.inTime || cache[r.kidsId] || "";
      });
      setCheckedIn(map);
    } else {
      console.warn(
        "GET /attendance/present unavailable  using locally saved check-ins.",
      );
      setCheckedIn(cache);
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
    if (!loading) writeCache(checkedIn);
  }, [checkedIn, loading]);

  // ─── Single check-in / not attended ─────────────────────────────────
  const setRowBusy = (id: string, value: boolean) =>
    setBusy((prev) => ({ ...prev, [id]: value }));

  const handleCheckIn = async (st: Student) => {
    if (isIn(st.id) || busy[st.id]) return;
    setRowBusy(st.id, true);
    setNotice(null);
    try {
      const record = buildRecord(st, "PRESENT");
      await postJson(ATTENDANCE_URL, record);
      setCheckedIn((prev) => ({ ...prev, [st.id]: record.inTime as string }));
    } catch (err) {
      setNotice({
        type: "error",
        text: `Could not check in ${st.name}. ${err instanceof Error ? err.message : ""}`,
      });
    } finally {
      setRowBusy(st.id, false);
    }
  };

  const handleMarkNotAttended = async (st: Student) => {
    if (busy[st.id]) return;
    if (!window.confirm(`Mark ${st.name} as not attended?`)) return;
    setRowBusy(st.id, true);
    setNotice(null);
    try {
      await postJson(ATTENDANCE_URL, buildRecord(st, "ABSENT"));
      setCheckedIn((prev) => {
        const next = { ...prev };
        delete next[st.id];
        return next;
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: `Could not update ${st.name}. ${err instanceof Error ? err.message : ""}`,
      });
    } finally {
      setRowBusy(st.id, false);
    }
  };

  // ─── Derived lists ──────────────────────────────────────────────────
  const ageRange = AGE_OPTIONS.find((a) => a.key === ageFilter) ?? AGE_OPTIONS[0];

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
      (stdFilter === "all" || st.stdRaw === stdFilter) &&
      (ageFilter === "all" ||
        (st.age !== null && st.age >= ageRange.min && st.age <= ageRange.max)),
  );
  const expectedList = visibleStudents;
  const attendeesList = visibleStudents.filter((st) => isIn(st.id));
  const nonAttendeesList = visibleStudents.filter((st) => !isIn(st.id));

  const tabData: Record<TabKey, Student[]> = {
    attendees: attendeesList,
    nonAttendees: nonAttendeesList,
  };

  const q = search.trim().toLowerCase();
  const qDigits = digits(q);
  const filtered = tabData[activeTab].filter(
    (st) =>
      !q ||
      st.name.toLowerCase().includes(q) ||
      st.mobile.includes(q) ||
      (qDigits !== "" && digits(st.mobile).includes(qDigits)) ||
      st.place.toLowerCase().includes(q) ||
      st.standard.toLowerCase().includes(q),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const pageRows = filtered.slice(startIdx, startIdx + perPage);

  // ─── Bulk selection / update ────────────────────────────────────────
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

  const runBulk = async (list: Student[], status: "PRESENT" | "ABSENT") => {
    if (list.length === 0 || bulkBusy) return;
    if (
      status === "ABSENT" &&
      !window.confirm(`Mark ${list.length} children as not attended?`)
    )
      return;

    setBulkBusy(true);
    setNotice(null);
    try {
      const inTime = nowTime(); // same check-in time for the whole batch
      await postJson(
        BULK_URL,
        list.map((st) => buildRecord(st, status, inTime)),
      );
      setCheckedIn((prev) => {
        const next = { ...prev };
        list.forEach((st) => {
          if (status === "PRESENT") next[st.id] = inTime;
          else delete next[st.id];
        });
        return next;
      });
      setSelected({});
      setNotice({
        type: "success",
        text:
          status === "PRESENT"
            ? `${list.length} children checked in.`
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

  const showTimeCol = activeTab === "attendees";

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "attendees", label: "Attendees", count: attendeesList.length },
    {
      key: "nonAttendees",
      label: "Non Attendees",
      count: nonAttendeesList.length,
    },
  ];

  const emptyText: Record<TabKey, string> = {
    attendees: "No one has checked in yet.",
    nonAttendees:
      students.length === 0 ? "No children found." : "Everyone has checked in.",
  };

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
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
    tableResponsive: { overflow: "auto", flex: 1, minHeight: 0 },
    table: { width: "100%", borderCollapse: "collapse", minWidth: "700px" },
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
    },
    bulkPrimaryBtn: {
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
    },
    timeBadge: {
      backgroundColor: "#ede9fe",
      color: "#7c3aed",
      borderRadius: "20px",
      padding: "3px 10px",
      fontSize: "12px",
      fontWeight: 600,
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

  // check-in / not-attended button (shared by the table and the mobile cards)
  const actionButton = (st: Student) => {
    const checked = isIn(st.id);
    const rowBusy = !!busy[st.id] || bulkBusy;
    return checked ? (
      <button
        type="button"
        style={s.editBtn}
        disabled={rowBusy}
        onClick={() => handleMarkNotAttended(st)}
      >
        <EditIcon />
        {busy[st.id] ? "Updating..." : "Not Attended"}
      </button>
    ) : (
      <button
        type="button"
        style={s.checkInBtn}
        disabled={rowBusy}
        onClick={() => handleCheckIn(st)}
      >
        <CheckIcon /> {busy[st.id] ? "Saving..." : "Check In"}
      </button>
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
              Check-in / Attendance
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

        <div className="att-sum" style={s.summaryRow}>
          <div className="att-sumcard" style={s.summaryCard}>
            <p style={s.summaryLabel}>Expected</p>
            <p style={s.summaryValue}>{expectedList.length}</p>
          </div>
          <div className="att-sumcard" style={s.summaryCard}>
            <p style={s.summaryLabel}>Checked In</p>
            <p style={{ ...s.summaryValue, color: "#16a34a" }}>
              {attendeesList.length}
            </p>
          </div>
          <div className="att-sumcard" style={s.summaryCard}>
            <p style={s.summaryLabel}>Yet to Arrive</p>
            <p style={{ ...s.summaryValue, color: "#f97316" }}>
              {nonAttendeesList.length}
            </p>
          </div>
        </div>

        <div style={s.card}>
          <div className="att-tabs" style={s.tabBar}>
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                style={tabStyle(activeTab === t.key)}
                onClick={() => switchTab(t.key)}
              >
                {t.label}
                <span style={countStyle(activeTab === t.key)}>{t.count}</span>
              </button>
            ))}
          </div>

          <div className="att-toolbar" style={s.toolbar}>
            <div className="att-search" style={s.searchWrapper}>
              <span style={s.searchIcon}>
                <SearchIcon />
              </span>
              <input
                style={s.searchInput}
                type="text"
                placeholder="Search by name, mobile, standard, place..."
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
            <div className="att-seg" style={s.segment}>
              {AGE_OPTIONS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  style={segBtnStyle(ageFilter === a.key)}
                  onClick={() => {
                    setAgeFilter(a.key);
                    setPage(1);
                    setSelected({});
                  }}
                >
                  {a.label}
                </button>
              ))}
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

          {selectedList.length > 0 && (
            <div className="att-bulk" style={s.bulkBar}>
              <span>{selectedList.length} selected</span>
              {activeTab === "nonAttendees" ? (
                <button
                  type="button"
                  style={s.bulkPrimaryBtn}
                  disabled={bulkBusy}
                  onClick={() => runBulk(selectedList, "PRESENT")}
                >
                  <CheckIcon />{" "}
                  {bulkBusy ? "Checking in..." : "Check In Selected"}
                </button>
              ) : (
                <button
                  type="button"
                  style={s.editBtn}
                  disabled={bulkBusy}
                  onClick={() => runBulk(selectedList, "ABSENT")}
                >
                  <EditIcon /> {bulkBusy ? "Updating..." : "Mark Not Attended"}
                </button>
              )}
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
                    <th style={{ ...s.th, width: "44px" }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        title="Select all"
                      />
                    </th>
                    <th style={s.th}>Action</th>
                    <th style={s.th}>Name</th>
                    <th style={s.th}>Mobile</th>
                    <th style={s.th}>Age</th>
                    <th style={s.th}>Standard</th>
                    <th style={s.th}>Place</th>
                    {showTimeCol && <th style={s.th}>Check-in Time</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((st) => (
                    <tr key={st.id}>
                      <td style={s.td}>
                        <input
                          type="checkbox"
                          checked={!!selected[st.id]}
                          onChange={() => toggleOne(st.id)}
                        />
                      </td>
                      <td style={s.td}>{actionButton(st)}</td>
                      <td style={{ ...s.td, ...s.nameCell }}>{st.name}</td>
                      <td style={s.td}>{st.mobile}</td>
                      <td style={s.td}>{st.age ?? "—"}</td>
                      <td style={s.td}>{st.standard}</td>
                      <td style={s.td}>{st.place}</td>
                      {showTimeCol && (
                        <td style={s.td}>
                          <span style={s.timeBadge}>
                            {formatTime(checkedIn[st.id])}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile: card list (name + details on the left, action on the right) */}
          <div className="att-cards">
            {loading ? (
              <div style={s.noData}>Loading children...</div>
            ) : pageRows.length === 0 ? (
              <div style={s.noData}>
                {q ? "No matching students found." : emptyText[activeTab]}
              </div>
            ) : (
              <>
                <label className="att-selall">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                  Select all ({filtered.length})
                </label>
                {pageRows.map((st) => (
                  <div className="att-card" key={st.id}>
                    <input
                      type="checkbox"
                      checked={!!selected[st.id]}
                      onChange={() => toggleOne(st.id)}
                      aria-label={`Select ${st.name}`}
                    />
                    <div className="att-info">
                      <div className="att-name">{st.name}</div>
                      <div className="att-meta">
                        {st.mobile !== "—" ? (
                          <a className="att-tel" href={`tel:${st.mobile}`}>
                            {st.mobile}
                          </a>
                        ) : (
                          "—"
                        )}
                        {st.age !== null ? ` · ${st.age} yrs` : ""}
                        {` · ${st.standard} · ${st.place}`}
                      </div>
                      {showTimeCol && (
                        <div className="att-time">
                          <span style={s.timeBadge}>
                            {formatTime(checkedIn[st.id])}
                          </span>
                        </div>
                      )}
                    </div>
                    {actionButton(st)}
                  </div>
                ))}
              </>
            )}
          </div>

          {!loading && filtered.length > 0 && (
            <div className="att-footer" style={s.footer}>
              <span style={s.showingText}>
                Showing {startIdx + 1}–
                {Math.min(startIdx + perPage, filtered.length)} of{" "}
                {filtered.length}
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