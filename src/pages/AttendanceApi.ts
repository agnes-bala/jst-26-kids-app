export const API_BASE_URL = "/api";
export const KIDS_URL = `${API_BASE_URL}/kids`;
export const ATTENDANCE_URL = `${API_BASE_URL}/attendance`;

// ─── Types ──────────────────────────────────────────────────────────────
export interface ApiKid {
  kidsId: string;
  name: string;
  gender?: string | null;
  age?: number | string | null;
  std?: string | null;
  religion?: string | null;
  // current field names (ChildAdd saves these)
  mobileNo?: string | null;
  mothermobileNo?: string | null;
  fathermobileNo?: string | null;
  guardianmobileNo?: string | null;
  // older field names – kept as fallback
  selfNo?: string | null;
  motherNo?: string | null;
  fatherNo?: string | null;
  momNo?: string | null;
  dadNo?: string | null;
  guardianNo?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  createdAt?: string | null;
}

export interface ApiPresentItem {
  kidsId?: string;
  inTime?: string | null;
  outTime?: string | null;
  status?: string;
}

// Normalised child used by every page
export interface Kid {
  id: string;
  name: string;
  gender: string; // "Male" | "Female" | "" (not set)
  age: number; // 0 = not set
  std: string; // raw value from the API ("3", "LKG" ...)
  mobile: string; // best available number
  selfNo: string;
  motherNo: string;
  fatherNo: string;
  guardianNo: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  place: string;
  religion: string;
  createdDate: string; // yyyy-mm-dd or ""
}

// Times of one child on one date ("HH:mm", "" when unknown / not checked out)
export interface PresentInfo {
  inTime: string;
  outTime: string;
}

// kidsId -> times. A key means "present".
export type PresentMap = Record<string, PresentInfo>;

// ─── Small helpers ──────────────────────────────────────────────────────
export const pad = (n: number) => String(n).padStart(2, "0");

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayIso = () => isoDate(new Date());

export const isSunday = (iso: string) =>
  new Date(`${iso}T00:00:00`).getDay() === 0;

// iso date + n days (n can be negative)
export const shiftDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
};

export const weekBefore = (iso: string) => shiftDays(iso, -7);

// The Sunday strictly before this date (date - 7 when date is a Sunday)
export const previousSunday = (iso: string) => {
  let d = shiftDays(iso, -1);
  while (!isSunday(d)) d = shiftDays(d, -1);
  return d;
};

// Latest Sunday on or before today
export const latestSunday = () => {
  let d = todayIso();
  while (!isSunday(d)) d = shiftDays(d, -1);
  return d;
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

export const formatDate = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
};

// "09:15" -> "09:15 AM"  (empty -> "—")
export const formatHm = (hhmm: string) => {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${pad(m)} ${suffix}`;
};

export const toArray = <T>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  const obj = data as { content?: T[]; data?: T[] } | null;
  return obj?.content ?? obj?.data ?? [];
};

// "3" -> "3rd", "LKG" -> "LKG", empty -> "—"
export const stdLabel = (std?: string | null) => {
  if (!std || std === "—") return "—";
  if (!/^\d+$/.test(std)) return std;
  const n = Number(std);
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suffix}`;
};

// Sort order for classes: LKG, UKG, 1..12, College, everything else
export const stdOrder = (std?: string | null) => {
  if (!std || std === "—") return 200;
  if (std === "LKG") return 0;
  if (std === "UKG") return 1;
  if (/^\d+$/.test(std)) return 1 + Number(std);
  if (std === "College") return 100;
  return 150;
};

export const toKid = (k: ApiKid): Kid => {
  const selfNo = k.mobileNo || k.selfNo || "";
  const motherNo = k.mothermobileNo || k.motherNo || k.momNo || "";
  const fatherNo = k.fathermobileNo || k.fatherNo || k.dadNo || "";
  const guardianNo = k.guardianmobileNo || k.guardianNo || "";
  return {
    id: k.kidsId,
    name: k.name,
    gender: k.gender === "Male" || k.gender === "Female" ? k.gender : "",
    age: Number(k.age) || 0,
    std: k.std || "",
    mobile: selfNo || fatherNo || motherNo || guardianNo,
    selfNo,
    motherNo,
    fatherNo,
    guardianNo,
    address1: k.address1 || "",
    address2: k.address2 || "",
    city: k.city || "",
    state: k.state || "",
    place: k.address1 || k.address2 || k.city || k.state || "—",
    religion: k.religion || "Not specified",
    createdDate: k.createdAt ? String(k.createdAt).slice(0, 10) : "",
  };
};

export const CATEGORIES = ["Outsider", "Staff Kid", "NLS Kid"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  Outsider: { bg: "#fee2e2", fg: "#b91c1c" },
  "Staff Kid": { bg: "#dbeafe", fg: "#1d4ed8" },
  "NLS Kid": { bg: "#dcfce7", fg: "#15803d" },
  "": { bg: "#f3f4f6", fg: "#6b7280" },
};

// maps legacy values like "STAFF KIDS" / "NLS KIDS" to the canonical ones
export const normCategory = (raw?: string | null): string => {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s.startsWith("staff")) return "Staff Kid";
  if (s.startsWith("nls")) return "NLS Kid";
  if (s.startsWith("out")) return "Outsider";
  return "";
};

export const readError = async (res: Response, fallback: string) => {
  const raw = await res.text().catch(() => "");
  let msg: string;
  try {
    const data = JSON.parse(raw);
    msg = data?.message || data?.error || data?.detail || "";
  } catch {
    msg = raw.trim().slice(0, 200);
  }
  return `${fallback} (HTTP ${res.status}${msg ? `: ${msg}` : ""})`;
};

// today + yesterday + the last N Sundays, newest first (no duplicates)
export const recentSessionDates = (weeks: number): string[] => {
  const set = new Set<string>();
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  set.add(isoDate(d)); // today

  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  set.add(isoDate(y)); // previous day

  while (d.getDay() !== 0) d.setDate(d.getDate() - 1); // back to latest Sunday
  for (let i = 0; i < weeks; i++) {
    set.add(isoDate(d));
    d.setDate(d.getDate() - 7);
  }
  return Array.from(set).sort().reverse();
};

// Phone number for wa.me links (10 digits -> India +91)
export const waNumber = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
};

// ─── Children (one request shared by all pages) ─────────────────────────
const KIDS_TTL = 30_000;
let kidsPromise: Promise<Kid[]> | null = null;
let kidsAt = 0;

export const loadKids = (): Promise<Kid[]> => {
  if (kidsPromise && Date.now() - kidsAt < KIDS_TTL) return kidsPromise;
  kidsAt = Date.now();
  kidsPromise = (async () => {
    const res = await fetch(KIDS_URL);
    if (!res.ok)
      throw new Error(await readError(res, "Could not load children"));
    const raw = toArray<ApiKid>(await res.json().catch(() => []));
    return Array.from(new Map(raw.map((k) => [k.kidsId, toKid(k)])).values());
  })();
  kidsPromise.catch(() => {
    kidsPromise = null;
  });
  return kidsPromise;
};

// ─── Attendance per date (past dates with data are cached for good) ─────
// v2: values are { inTime, outTime } (v1 stored only the check-in time)
const LS_PREFIX = "att:present:v2:";
const TODAY_TTL = 10_000;
const mem = new Map<string, { at: number; p: Promise<PresentMap> }>();

const readStored = (date: string): PresentMap | null => {
  try {
    const raw = localStorage.getItem(LS_PREFIX + date);
    if (!raw) return null;
    const map = JSON.parse(raw) as PresentMap;
    // ignore empty / old-format entries so they get refetched
    if (!map || Object.keys(map).length === 0) return null;
    const first = Object.values(map)[0] as unknown;
    if (typeof first !== "object" || first === null) return null;
    return map;
  } catch {
    return null;
  }
};
const writeStored = (date: string, map: PresentMap) => {
  try {
    localStorage.setItem(LS_PREFIX + date, JSON.stringify(map));
  } catch {
    /* storage full or unavailable – just skip caching */
  }
};

const hhmm = (t?: string | null) => (t ? String(t).slice(0, 5) : "");

export const getPresent = (date: string): Promise<PresentMap> => {
  const isPast = date < todayIso();
  if (isPast) {
    const stored = readStored(date);
    if (stored) return Promise.resolve(stored);
  }
  const hit = mem.get(date);
  if (hit && Date.now() - hit.at < TODAY_TTL) return hit.p;

  const p = (async () => {
    const res = await fetch(`${ATTENDANCE_URL}/present?date=${date}`);
    if (!res.ok) throw new Error(String(res.status));
    const list = toArray<ApiPresentItem>(await res.json().catch(() => []));
    const map: PresentMap = {};
    list.forEach((it) => {
      if (!it.kidsId) return;
      if (it.status && it.status.toUpperCase() !== "PRESENT") return;
      map[it.kidsId] = { inTime: hhmm(it.inTime), outTime: hhmm(it.outTime) };
    });
    // never cache an empty day – it may just be a hiccup
    if (isPast && Object.keys(map).length > 0) writeStored(date, map);
    return map;
  })();
  mem.set(date, { at: Date.now(), p });
  p.catch(() => mem.delete(date));
  return p;
};

// Loads many dates with a small worker pool (default 6 at a time)
export const loadPresentMany = async (dates: string[], concurrency = 6) => {
  const data: Record<string, PresentMap> = {};
  const failed: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < dates.length) {
      const date = dates[next++];
      try {
        data[date] = await getPresent(date);
      } catch {
        failed.push(date);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, dates.length) }, worker),
  );
  return { data, failed };
};

// Call from every "Refresh" button
export const clearAttendanceCaches = () => {
  kidsPromise = null;
  mem.clear();
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("att:present:"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
};

export const CONTACTED_URL = `${ATTENDANCE_URL}/followup/contacted`;

interface ApiContacted {
  kidsId?: string;
  contactedDate?: string | null;
}

// kidsId -> yyyy-mm-dd (latest contact date)
export const loadContacted = async (): Promise<Record<string, string>> => {
  const res = await fetch(CONTACTED_URL);
  if (!res.ok)
    throw new Error(await readError(res, "Could not load contacted list"));
  const list = toArray<ApiContacted>(await res.json().catch(() => []));
  const map: Record<string, string> = {};
  list.forEach((it) => {
    if (!it.kidsId || !it.contactedDate) return;
    const d = String(it.contactedDate).slice(0, 10);
    if (!map[it.kidsId] || d > map[it.kidsId]) map[it.kidsId] = d;
  });
  return map;
};

export const saveContacted = async (kidsId: string, contactedDate: string) => {
  const res = await fetch(CONTACTED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kidsId, contactedDate }),
  });
  if (!res.ok)
    throw new Error(await readError(res, "Could not save contacted mark"));
};
