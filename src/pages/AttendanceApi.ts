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
  selfNo?: string | null;
  momNo?: string | null;
  dadNo?: string | null;
  guardianNo?: string | null;
  address1?: string | null;
  address2?: string | null;
  state?: string | null;
  createdAt?: string | null;
}

export interface ApiPresentItem {
  kidsId?: string;
  inTime?: string | null;
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
  momNo: string;
  dadNo: string;
  guardianNo: string;
  address1: string;
  address2: string;
  state: string;
  place: string;
  religion: string;
  createdDate: string; // yyyy-mm-dd or ""
}

// kidsId -> check-in time ("HH:mm", "" when unknown). A key means "present".
export type PresentMap = Record<string, string>;

// ─── Small helpers ──────────────────────────────────────────────────────
export const pad = (n: number) => String(n).padStart(2, "0");

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayIso = () => isoDate(new Date());

export const weekBefore = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - 7);
  return isoDate(d);
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export const formatDate = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
};

export const toArray = <T,>(data: unknown): T[] => {
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

export const toKid = (k: ApiKid): Kid => ({
  id: k.kidsId,
  name: k.name,
  gender: k.gender === "Male" || k.gender === "Female" ? k.gender : "",
  age: Number(k.age) || 0,
  std: k.std || "",
  mobile: k.selfNo || k.dadNo || k.momNo || k.guardianNo || "",
  selfNo: k.selfNo || "",
  momNo: k.momNo || "",
  dadNo: k.dadNo || "",
  guardianNo: k.guardianNo || "",
  address1: k.address1 || "",
  address2: k.address2 || "",
  state: k.state || "",
  place: k.address2 || k.address1 || k.state || "—",
  religion: k.religion || "Not specified",
  createdDate: k.createdAt ? String(k.createdAt).slice(0, 10) : "",
});

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

// today + the last N Sundays, newest first
export const recentSessionDates = (weeks: number): string[] => {
  const out: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const today = isoDate(d);
  out.push(today);
  while (d.getDay() !== 0) d.setDate(d.getDate() - 1);
  for (let i = 0; i < weeks; i++) {
    const iso = isoDate(d);
    if (iso !== today) out.push(iso);
    d.setDate(d.getDate() - 7);
  }
  return out;
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
    if (!res.ok) throw new Error(await readError(res, "Could not load children"));
    const raw = toArray<ApiKid>(await res.json().catch(() => []));
    return Array.from(new Map(raw.map((k) => [k.kidsId, toKid(k)])).values());
  })();
  kidsPromise.catch(() => {
    kidsPromise = null;
  });
  return kidsPromise;
};

// ─── Attendance per date (past Sundays are cached for good) ─────────────
const LS_PREFIX = "att:present:v1:";
const TODAY_TTL = 10_000;
const mem = new Map<string, { at: number; p: Promise<PresentMap> }>();

const readStored = (date: string): PresentMap | null => {
  try {
    const raw = localStorage.getItem(LS_PREFIX + date);
    return raw ? (JSON.parse(raw) as PresentMap) : null;
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
      map[it.kidsId] = it.inTime ? String(it.inTime).slice(0, 5) : "";
    });
    if (isPast) writeStored(date, map);
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
      .filter((k) => k.startsWith(LS_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
};