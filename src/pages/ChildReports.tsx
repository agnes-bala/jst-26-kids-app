// import { useState, useEffect, useMemo, useRef } from "react";
// import type { ReactNode } from "react";
// import * as XLSX from "xlsx";
// import Header from "../components/Header";

// // ─── API ────────────────────────────────────────────────────────────────
// const API_BASE_URL = "/api";
// const KIDS_URL = `${API_BASE_URL}/kids`; // GET -> all children
// const ATTENDANCE_URL = `${API_BASE_URL}/attendance`;

// interface ApiPresentItem {
//   kidsId?: string;
//   inTime?: string | null;
//   status?: string;
// }

// interface ApiKid {
//   kidsId: string;
//   name: string;
//   gender?: string;
//   age?: number | string;
//   std?: string;
//   religion?: string | null;
//   selfNo?: string | null;
//   momNo?: string | null;
//   dadNo?: string | null;
//   guardianNo?: string | null;
//   address1?: string | null;
//   address2?: string | null;
//   state?: string | null;
//   createdAt?: string | null;
// }

// // ─── Types ──────────────────────────────────────────────────────────────
// interface Child {
//   id: string; // kidsId
//   name: string;
//   gender: string;
//   age: number;
//   standard: string;
//   mobile: string; // best available number (for the table)
//   district: string;
//   religion: string;
//   createdDate: string; // yyyy-mm-dd ("" when unknown)
//   // full info (shown in the detail popup)
//   selfNo: string;
//   momNo: string;
//   dadNo: string;
//   guardianNo: string;
//   address1: string;
//   address2: string;
//   state: string;
// }

// interface AttendanceRecord extends Child {
//   recordId: string;
//   date: string; // yyyy-mm-dd
//   status: "Present" | "Absent";
//   checkInTime: string; // HH:mm (24h) – empty when absent
// }

// type TabKey =
//   | "age"
//   | "date"
//   | "month"
//   | "district"
//   | "religion"
//   | "status"
//   | "time";

// interface Group {
//   key: string;
//   label: string;
//   sort: number | string;
// }

// // One row of the summary table.
// // level 0 = date (or month) header, 1 = group under it, 2 = sub-group (status tab: age)
// interface SumGroup {
//   key: string;
//   label: string;
//   chip: string; // text shown in the "selected" chip above the children list
//   date: string; // date (or month) the row belongs to – rows are sorted by this, latest first
//   ord: string; // order inside that date
//   level: 0 | 1 | 2;
//   match: (r: AttendanceRecord) => boolean; // which records belong to this row
// }

// interface SummaryRow extends SumGroup {
//   present: number;
//   absent: number;
//   male: number;
//   female: number;
//   total: number;
// }

// interface Filters {
//   date: string;
//   month: string;
//   year: string;
//   week: string;
//   district: string;
//   religion: string;
//   gender: string;
//   status: string;
//   ageMin: string;
//   ageMax: string;
//   timeFrom: string;
//   timeTo: string;
// }

// const TABS: { key: TabKey; label: string; groupHeader: string }[] = [
//   { key: "age", label: "Age Wise", groupHeader: "Age" },
//   { key: "date", label: "Date Wise", groupHeader: "Date" },
//   { key: "month", label: "Month Wise", groupHeader: "Month / Date" },
//   { key: "district", label: "Area Wise", groupHeader: "District" },
//   { key: "religion", label: "Religion Wise", groupHeader: "Religion" },
//   { key: "status", label: "Present / Absent", groupHeader: "Status" },
//   { key: "time", label: "Time Based", groupHeader: "Check-in Time Slot" },
// ];

// const emptyFilters: Filters = {
//   date: "",
//   month: "",
//   year: "",
//   week: "",
//   district: "",
//   religion: "",
//   gender: "",
//   status: "",
//   ageMin: "",
//   ageMax: "",
//   timeFrom: "",
//   timeTo: "",
// };

// // ─── Helpers ────────────────────────────────────────────────────────────
// const pad = (n: number) => String(n).padStart(2, "0");

// const MONTH_FULL = [
//   "January",
//   "February",
//   "March",
//   "April",
//   "May",
//   "June",
//   "July",
//   "August",
//   "September",
//   "October",
//   "November",
//   "December",
// ];
// const MONTHS = [
//   "Jan",
//   "Feb",
//   "Mar",
//   "Apr",
//   "May",
//   "Jun",
//   "Jul",
//   "Aug",
//   "Sep",
//   "Oct",
//   "Nov",
//   "Dec",
// ];

// const formatDate = (iso: string) => {
//   const [y, m, d] = iso.split("-");
//   return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
// };

// const formatTime = (hhmm: string) => {
//   if (!hhmm) return "—";
//   const [h, m] = hhmm.split(":").map(Number);
//   const suffix = h >= 12 ? "PM" : "AM";
//   const h12 = h % 12 === 0 ? 12 : h % 12;
//   return `${pad(h12)}:${pad(m)} ${suffix}`;
// };

// const toArray = <T,>(data: unknown): T[] => {
//   if (Array.isArray(data)) return data as T[];
//   const obj = data as { content?: T[]; data?: T[] } | null;
//   return obj?.content ?? obj?.data ?? [];
// };

// const formatStd = (std?: string | null) => {
//   if (!std) return "—";
//   if (!/^\d+$/.test(std)) return std;
//   const n = Number(std);
//   const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
//   return `${n}${suffix}`;
// };

// const toChild = (k: ApiKid): Child => ({
//   id: k.kidsId,
//   name: k.name,
//   gender: k.gender || "—",
//   age: Number(k.age) || 0,
//   standard: formatStd(k.std),
//   mobile: k.selfNo || k.dadNo || k.momNo || k.guardianNo || "—",
//   district: k.address2 || k.address1 || k.state || "—",
//   religion: k.religion || "Not specified",
//   createdDate: k.createdAt ? String(k.createdAt).slice(0, 10) : "",
//   selfNo: k.selfNo || "",
//   momNo: k.momNo || "",
//   dadNo: k.dadNo || "",
//   guardianNo: k.guardianNo || "",
//   address1: k.address1 || "",
//   address2: k.address2 || "",
//   state: k.state || "",
// });

// const toHHmm = (t?: string | null) => (t ? String(t).slice(0, 5) : "");

// const getGroup = (tab: TabKey, r: AttendanceRecord): Group => {
//   switch (tab) {
//     case "age":
//       return { key: String(r.age), label: `${r.age} years`, sort: r.age };
//     case "date":
//       return { key: r.date, label: formatDate(r.date), sort: r.date };
//     case "month": {
//       const [y, m] = r.date.split("-");
//       return {
//         key: `${y}-${m}`,
//         label: `${MONTH_FULL[Number(m) - 1]} ${y}`,
//         sort: `${y}-${m}`,
//       };
//     }
//     case "district":
//       return { key: r.district, label: r.district, sort: r.district };
//     case "religion":
//       return { key: r.religion, label: r.religion, sort: r.religion };
//     case "status":
//       return {
//         key: `${r.status}|${r.age}`,
//         label: `${r.age} years`,
//         sort: `${r.status === "Present" ? 0 : 1}-${pad(r.age)}`,
//       };
//     case "time": {
//       if (!r.checkInTime)
//         return { key: "none", label: "Not Checked In", sort: 99 };
//       const h = Number(r.checkInTime.split(":")[0]);
//       return {
//         key: `h${h}`,
//         label: `${formatTime(`${pad(h)}:00`)} – ${formatTime(`${pad(h + 1)}:00`)}`,
//         sort: h,
//       };
//     }
//   }
// };

// // sortable string for a group's sort value (numbers are zero padded)
// const sortStr = (v: number | string) =>
//   typeof v === "number" ? String(v).padStart(6, "0") : v;

// const WEEK_NAMES = ["First", "Second", "Third", "Fourth", "Fifth"];

// const getSundays = (year: number, month0: number) => {
//   const days = new Date(year, month0 + 1, 0).getDate();
//   const out: number[] = [];
//   for (let d = 1; d <= days; d++) {
//     if (new Date(year, month0, d).getDay() === 0) out.push(d);
//   }
//   return out;
// };

// const getRefMonth = (f: Filters) => {
//   const now = new Date();
//   return {
//     year: Number(f.year) || now.getFullYear(),
//     month0: f.month ? Number(f.month) - 1 : now.getMonth(),
//   };
// };

// const uniqueSorted = (values: string[]) => Array.from(new Set(values)).sort();

// const isoDate = (d: Date) =>
//   `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// const todayIso = () => isoDate(new Date());

// // today + yesterday + the last N Sundays (newest first, no duplicates)
// const recentDates = (weeks = 1): string[] => {
//   const out = new Set<string>();
//   const d = new Date();
//   d.setHours(0, 0, 0, 0);

//   out.add(isoDate(d)); // today

//   const yest = new Date(d);
//   yest.setDate(yest.getDate() - 1);
//   out.add(isoDate(yest)); // yesterday

//   while (d.getDay() !== 0) d.setDate(d.getDate() - 1); // back to latest Sunday
//   for (let i = 0; i < weeks; i++) {
//     out.add(isoDate(d));
//     d.setDate(d.getDate() - 7);
//   }
//   return Array.from(out);
// };

// const datesNeeded = (
//   date: string,
//   month: string,
//   year: string,
//   week: string,
//   defaultWeeks = 1,
// ): string[] => {
//   if (date) return [date];
//   if (!month && !year && !week) return recentDates(defaultWeeks);
//   const y = Number(year) || new Date().getFullYear();
//   const months = month
//     ? [Number(month) - 1]
//     : Array.from({ length: 12 }, (_, i) => i);
//   const today = todayIso();
//   const out: string[] = [];
//   months.forEach((m0) => {
//     getSundays(y, m0).forEach((day, i) => {
//       if (week && Number(week) !== i + 1) return;
//       const iso = `${y}-${pad(m0 + 1)}-${pad(day)}`;
//       if (iso <= today) out.push(iso);
//     });
//   });
//   return out;
// };

// // Short-lived shared cache (React StrictMode runs effects twice in dev)
// const TTL = 10_000;
// let kidsPromise: Promise<Child[]> | null = null;
// let kidsAt = 0;
// const presentCache = new Map<
//   string,
//   { at: number; p: Promise<Record<string, string>> }
// >();

// const getKids = (): Promise<Child[]> => {
//   if (kidsPromise && Date.now() - kidsAt < TTL) return kidsPromise;
//   kidsAt = Date.now();
//   kidsPromise = (async () => {
//     const res = await fetch(KIDS_URL);
//     if (!res.ok) throw new Error(`Could not load children (${res.status})`);
//     const raw = toArray<ApiKid>(await res.json().catch(() => []));
//     return Array.from(new Map(raw.map((k) => [k.kidsId, toChild(k)])).values());
//   })();
//   kidsPromise.catch(() => {
//     kidsPromise = null;
//   });
//   return kidsPromise;
// };

// const getPresent = (date: string): Promise<Record<string, string>> => {
//   const hit = presentCache.get(date);
//   if (hit && Date.now() - hit.at < TTL) return hit.p;
//   const p = (async () => {
//     const res = await fetch(`${ATTENDANCE_URL}/present?date=${date}`);
//     if (!res.ok) throw new Error(String(res.status));
//     const list = toArray<ApiPresentItem>(await res.json().catch(() => []));
//     const present: Record<string, string> = {};
//     list.forEach((it) => {
//       if (!it.kidsId) return;
//       if (it.status && it.status.toUpperCase() !== "PRESENT") return;
//       present[it.kidsId] = toHHmm(it.inTime);
//     });
//     return present;
//   })();
//   presentCache.set(date, { at: Date.now(), p });
//   p.catch(() => presentCache.delete(date));
//   return p;
// };

// const clearCaches = () => {
//   kidsPromise = null;
//   presentCache.clear();
// };

// // ─── Hooks ──────────────────────────────────────────────────────────────
// const useMedia = (query: string) => {
//   const [matches, setMatches] = useState(
//     () => typeof window !== "undefined" && window.matchMedia(query).matches,
//   );
//   useEffect(() => {
//     const mq = window.matchMedia(query);
//     const on = () => setMatches(mq.matches);
//     on();
//     mq.addEventListener("change", on);
//     return () => mq.removeEventListener("change", on);
//   }, [query]);
//   return matches;
// };

// // How many table rows fit in the available height (so the page never scrolls)
// const useFitRows = (rowH: number, headH: number) => {
//   const ref = useRef<HTMLDivElement>(null);
//   const [rows, setRows] = useState(8);
//   useEffect(() => {
//     const el = ref.current;
//     if (!el) return;
//     const calc = () => {
//       const h = el.clientHeight;
//       if (h > 0) setRows(Math.max(3, Math.floor((h - headH) / (rowH + 1))));
//     };
//     calc();
//     const ro = new ResizeObserver(calc);
//     ro.observe(el);
//     return () => ro.disconnect();
//   }, [rowH, headH]);
//   return [ref, rows] as const;
// };

// // ─── Icons ──────────────────────────────────────────────────────────────
// const Svg = ({
//   size = 16,
//   children,
// }: {
//   size?: number;
//   children: ReactNode;
// }) => (
//   <svg
//     width={size}
//     height={size}
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//     aria-hidden="true"
//   >
//     {children}
//   </svg>
// );

// const ChartIcon = ({ size = 22 }: { size?: number }) => (
//   <Svg size={size}>
//     <line x1="18" y1="20" x2="18" y2="10" />
//     <line x1="12" y1="20" x2="12" y2="4" />
//     <line x1="6" y1="20" x2="6" y2="14" />
//   </Svg>
// );
// const DownloadIcon = () => (
//   <Svg>
//     <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
//     <polyline points="7 10 12 15 17 10" />
//     <line x1="12" y1="15" x2="12" y2="3" />
//   </Svg>
// );
// const RefreshIcon = () => (
//   <Svg>
//     <polyline points="23 4 23 10 17 10" />
//     <polyline points="1 20 1 14 7 14" />
//     <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
//   </Svg>
// );
// const FilterIcon = () => (
//   <Svg>
//     <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
//   </Svg>
// );
// const SearchIcon = () => (
//   <Svg size={15}>
//     <circle cx="11" cy="11" r="8" />
//     <line x1="21" y1="21" x2="16.65" y2="16.65" />
//   </Svg>
// );
// const ResetIcon = () => (
//   <Svg size={14}>
//     <polyline points="23 4 23 10 17 10" />
//     <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
//   </Svg>
// );
// const ChevLeft = () => (
//   <Svg size={18}>
//     <polyline points="15 18 9 12 15 6" />
//   </Svg>
// );
// const ChevRight = () => (
//   <Svg size={18}>
//     <polyline points="9 18 15 12 9 6" />
//   </Svg>
// );
// const PhoneIcon = () => (
//   <Svg size={13}>
//     <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
//   </Svg>
// );
// const PinIcon = () => (
//   <Svg size={13}>
//     <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
//     <circle cx="12" cy="10" r="3" />
//   </Svg>
// );
// const TableIcon = () => (
//   <Svg size={18}>
//     <rect x="3" y="3" width="18" height="18" rx="2" />
//     <line x1="3" y1="9" x2="21" y2="9" />
//     <line x1="3" y1="15" x2="21" y2="15" />
//     <line x1="9" y1="3" x2="9" y2="21" />
//   </Svg>
// );
// const UsersIcon = () => (
//   <Svg size={20}>
//     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
//     <circle cx="9" cy="7" r="4" />
//     <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
//     <path d="M16 3.13a4 4 0 0 1 0 7.75" />
//   </Svg>
// );
// const CheckCircleIcon = () => (
//   <Svg size={20}>
//     <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
//     <polyline points="22 4 12 14.01 9 11.01" />
//   </Svg>
// );
// const XCircleIcon = () => (
//   <Svg size={20}>
//     <circle cx="12" cy="12" r="10" />
//     <line x1="15" y1="9" x2="9" y2="15" />
//     <line x1="9" y1="9" x2="15" y2="15" />
//   </Svg>
// );
// const TrendIcon = () => (
//   <Svg size={20}>
//     <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
//   </Svg>
// );

// // ─── Small view helpers ─────────────────────────────────────────────────
// const AVATARS = [
//   ["#ede9fe", "#7c3aed"],
//   ["#dbeafe", "#2563eb"],
//   ["#fce7f3", "#db2777"],
//   ["#dcfce7", "#16a34a"],
//   ["#ffedd5", "#ea580c"],
//   ["#cffafe", "#0891b2"],
// ];
// const avatarFor = (name: string) =>
//   AVATARS[(name.charCodeAt(0) || 0) % AVATARS.length];
// const initials = (name: string) =>
//   name
//     .trim()
//     .split(/\s+/)
//     .slice(0, 2)
//     .map((w) => w[0] ?? "")
//     .join("")
//     .toUpperCase() || "?";

// const genderClass = (g: string) =>
//   g === "Male" ? "male" : g === "Female" ? "female" : "unk";

// const SORTS = [
//   "Date (Latest)",
//   "Name A-Z",
//   "Name Z-A",
//   "Age (Low-High)",
//   "Age (High-Low)",
//   "Check-in (Earliest)",
// ];

// const sortRecords = (list: AttendanceRecord[], by: string) =>
//   [...list].sort((a, b) => {
//     const byName = a.name.localeCompare(b.name);
//     switch (by) {
//       case "Name A-Z":
//         return byName;
//       case "Name Z-A":
//         return -byName;
//       case "Age (Low-High)":
//         return a.age - b.age || byName;
//       case "Age (High-Low)":
//         return b.age - a.age || byName;
//       case "Check-in (Earliest)":
//         return (
//           (a.checkInTime || "99:99").localeCompare(b.checkInTime || "99:99") ||
//           byName
//         );
//       default:
//         return b.date.localeCompare(a.date) || byName;
//     }
//   });

// const pageNumbers = (current: number, total: number) => {
//   const pages: (number | string)[] = [];
//   if (total <= 5) {
//     for (let i = 1; i <= total; i++) pages.push(i);
//   } else {
//     pages.push(1);
//     if (current > 3) pages.push("…a");
//     for (
//       let i = Math.max(2, current - 1);
//       i <= Math.min(total - 1, current + 1);
//       i++
//     )
//       pages.push(i);
//     if (current < total - 2) pages.push("…b");
//     pages.push(total);
//   }
//   return pages;
// };

// const Card = ({ title, children }: { title: string; children: ReactNode }) => (
//   <div className="cr-dc">
//     <div className="cr-dch">{title}</div>
//     <div className="cr-dcb">{children}</div>
//   </div>
// );

// const Row = ({ label, children }: { label: string; children: ReactNode }) => (
//   <div className="cr-kv">
//     <span className="cr-k">{label}</span>
//     <span className="cr-c">:</span>
//     <span className="cr-v">{children}</span>
//   </div>
// );

// const Phone = ({ n }: { n: string }) =>
//   n ? (
//     <a className="cr-tel" href={`tel:${n}`}>
//       {n}
//     </a>
//   ) : (
//     <span className="cr-muted">—</span>
//   );

// const Val = ({ v }: { v: string }) =>
//   v ? <>{v}</> : <span className="cr-muted">—</span>;

// // ─── Styles ─────────────────────────────────────────────────────────────
// const pageCss = `
// .cr { height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; background: #f8f7ff; color: #111827;
//   font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
// .cr, .cr * { text-align: left; box-sizing: border-box; }
// .cr button { width: auto; transform: none !important; font-family: inherit; }
// .cr-top { flex: none; position: relative; z-index: 100; }
// .cr-wrap { flex: 1; min-height: 0; width: 100%; max-width: 1440px; margin: 0 auto; padding: 12px 20px; display: flex; flex-direction: column; gap: 10px; }

// /* header */
// .cr-head { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
// .cr-head-l { display: flex; align-items: center; gap: 12px; min-width: 0; }
// .cr-ico { width: 38px; height: 38px; border-radius: 10px; background: #ede9fe; color: #7c3aed; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
// .cr-title { font-size: 19px; font-weight: 700; margin: 0; line-height: 1.2; }
// .cr-sub { font-size: 12px; color: #6b7280; margin: 1px 0 0; }
// .cr-actions { display: flex; gap: 8px; }
// .cr .cr-btn { display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 14px; border-radius: 8px;
//   font-size: 13px; font-weight: 600; line-height: 1; cursor: pointer; white-space: nowrap; transition: background .15s, border-color .15s, color .15s; }
// .cr .cr-btn-primary { background: #7c3aed; color: #fff; border: 1.5px solid #7c3aed; }
// .cr .cr-btn-primary:hover:not(:disabled) { background: #6d28d9; border-color: #6d28d9; }
// .cr .cr-btn-light { background: #fff; color: #374151; border: 1.5px solid #e5e7eb; }
// .cr .cr-btn-light:hover:not(:disabled) { border-color: #c4b5fd; color: #7c3aed; }
// .cr .cr-btn-light.on { border-color: #7c3aed; color: #7c3aed; background: #f5f3ff; }
// .cr .cr-btn:disabled { opacity: .55; cursor: not-allowed; }

// /* stats */
// .cr-stats { flex: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
// .cr-stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px 12px; display: flex; align-items: center; gap: 10px; min-width: 0; }
// .cr-stat-ico { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
// .cr-stat-body { min-width: 0; flex: 1; }
// .cr-stat-label { font-size: 11.5px; font-weight: 500; color: #6b7280; margin: 0; }
// .cr-stat-val { font-size: 20px; font-weight: 700; margin: 0; line-height: 1.2; }
// .cr-stat-note { font-size: 11px; color: #9ca3af; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
// .cr-bar { height: 5px; border-radius: 99px; background: #fee2e2; overflow: hidden; margin-top: 4px; }
// .cr-bar > span { display: block; height: 100%; background: #16a34a; border-radius: 99px; transition: width .3s; }

// /* notices */
// .cr-info, .cr-error { flex: none; padding: 6px 12px; border-radius: 8px; font-size: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
// .cr-info > span, .cr-error > span { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
// .cr-info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
// .cr-error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
// .cr .cr-link { background: none; border: none; padding: 0; color: #7c3aed; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
// .cr .cr-link:hover { text-decoration: underline; }
// .cr-error .cr-link { color: inherit; text-decoration: underline; }

// /* tabs row */
// .cr-bar2 { flex: none; display: flex; gap: 8px; align-items: center; }
// .cr-tabs { flex: 1; min-width: 0; display: flex; gap: 4px; padding: 4px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow-x: auto; scrollbar-width: none; }
// .cr-tabs::-webkit-scrollbar { display: none; }
// .cr .cr-tab { flex: 0 0 auto; border: none; background: transparent; color: #6b7280; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 8px; cursor: pointer; white-space: nowrap; transition: background .15s, color .15s; }
// .cr .cr-tab:hover { background: #f5f3ff; color: #7c3aed; }
// .cr .cr-tab.on { background: #7c3aed; color: #fff; }
// .cr .cr-fbtn { height: 42px; flex: none; }

// /* segmented switch (tablet / mobile) */
// .cr-seg { flex: none; display: none; gap: 4px; padding: 4px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
// .cr .cr-seg button { flex: 1; border: none; background: transparent; color: #6b7280; font-size: 13px; font-weight: 600; padding: 7px 10px; border-radius: 8px; cursor: pointer; }
// .cr .cr-seg button.on { background: #7c3aed; color: #fff; }

// /* cards + filters */
// .cr-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
// .cr-fcard { flex: none; padding: 12px 16px; overflow: visible; }
// .cr-fhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
// .cr-ftitle { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #282c36; }
// .cr-ftitle svg { color: #7c3aed; }
// .cr-count { background: #ede9fe; color: #7c3aed; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
// .cr-fh-r { display: flex; align-items: center; gap: 6px; }
// .cr .cr-clear { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: #7c3aed; font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
// .cr .cr-clear:hover { background: #f5f3ff; }
// .cr .cr-done { display: none; background: #7c3aed; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; padding: 6px 14px; cursor: pointer; }
// .cr-fgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px 12px; }
// .cr-lrow { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; min-height: 16px; }
// .cr-label { font-size: 12px; font-weight: 500; color: #222c3d; }
// .cr .cr-input, .cr .cr-select { width: 100%; height: 34px; padding: 0 12px; border: 1.5px solid #e5e7eb; border-radius: 8px;
//   font-size: 13px; color: #111827; background-color: #fff; outline: none; font-family: inherit; }
// .cr .cr-select { appearance: none; -webkit-appearance: none; padding-right: 30px; cursor: pointer;
//   background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
//   background-repeat: no-repeat; background-position: right 10px center; }
// .cr .cr-input:focus, .cr .cr-select:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124, 58, 237, .12); }
// .cr .cr-select:disabled, .cr .cr-input:disabled { background-color: #f3f4f6; color: #9ca3af; cursor: not-allowed; }
// .cr-warn { font-size: 11px; color: #dc2626; margin: 3px 0 0; }
// .cr-backdrop { display: none; }

// /* body: fills the remaining height, panels never grow past it */
// .cr-body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(340px, .9fr) minmax(0, 2fr); grid-template-rows: minmax(0, 1fr); gap: 12px; }
// .cr-pane { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
// .cr-chead { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 10px 14px; border-bottom: 1px solid #f3f4f6; }
// .cr-ctitle { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; flex-wrap: wrap; min-width: 0; }
// .cr-ctitle > svg { color: #7c3aed; }
// .cr-badge { background: #ede9fe; color: #7c3aed; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 20px; white-space: nowrap; }
// .cr-hint { font-size: 12px; color: #9ca3af; }
// .cr-chip { display: inline-flex; align-items: center; gap: 6px; background: #ede9fe; color: #7c3aed; border-radius: 20px; padding: 2px 6px 2px 10px; font-size: 12px; font-weight: 600; max-width: 100%; }
// .cr .cr-chip button { background: #7c3aed; color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; line-height: 18px; padding: 0; cursor: pointer; flex-shrink: 0; }
// .cr-tools { display: flex; align-items: center; gap: 8px; }
// .cr-tools .cr-select { width: auto; }
// .cr-search { position: relative; }
// .cr-search svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
// .cr-search .cr-input { padding-left: 32px; width: 230px; }

// /* tables */
// .cr-sumscroll { flex: 1; min-height: 0; overflow: auto; }
// .cr-tscroll { flex: 1; min-height: 0; overflow: hidden; }
// .cr-table { width: 100%; border-collapse: collapse; }
// .cr-table th { padding: 0 12px; height: 36px; font-size: 12px; font-weight: 600; color: #6b7280; background: #fafafa; border-bottom: 1px solid #f3f4f6; white-space: nowrap; position: sticky; top: 0; z-index: 1; }
// .cr-table td { padding: 8px 12px; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
// .cr-srow { cursor: pointer; }
// .cr-srow:hover td { background: #faf5ff; }
// .cr-srow.sel td { background: #ede9fe; }
// .cr-srow.parent td { background: #faf8ff; font-weight: 700; }
// .cr-srow.sel.parent td { background: #ede9fe; }
// .cr-lab { font-weight: 500; color: #111827; }
// .cr-srow.parent .cr-lab { font-weight: 700; }
// .cr-mini { height: 4px; border-radius: 99px; background: #fecaca; margin-top: 5px; overflow: hidden; min-width: 60px; }
// .cr-mini > span { display: block; height: 100%; background: #16a34a; }
// .cr-total td { position: sticky; bottom: 0; background: #f5f3ff; font-weight: 700; color: #111827; border-top: 1px solid #ede9fe; }
// .cr .g { color: #16a34a; font-weight: 600; }
// .cr .r { color: #dc2626; font-weight: 600; }
// .cr .bl { color: #2563eb; font-weight: 600; }
// .cr .pk { color: #db2777; font-weight: 600; }

// /* children table (5 columns, fixed layout → no horizontal scroll) */
// .cr-details { table-layout: fixed; }
// .cr-details td { padding: 0 12px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
// .cr-drow { cursor: pointer; }
// .cr-drow:nth-child(even) td { background: #fafafa; }
// .cr-drow:hover td, .cr-drow:focus-visible td { background: #faf5ff; outline: none; }
// .cr-details .c-gen { width: 110px; }
// .cr-details .c-age { width: 70px; }
// .cr-details .c-mob { width: 170px; }
// .cr-details .c-plc { width: 26%; }
// .cr-details .c-date { width: 120px; }
// .cr-name { display: flex; align-items: center; gap: 10px; font-weight: 500; color: #111827; min-width: 0; }
// .cr-nm { display: flex; flex-direction: column; min-width: 0; }
// .cr-nm .t, .cr-ic .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
// .cr-place-m { display: none; font-size: 11px; font-weight: 400; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
// .cr-av { width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
// .cr-ic { display: flex; align-items: center; gap: 6px; min-width: 0; }
// .cr-ic svg { color: #7c3aed; flex-shrink: 0; }
// .cr-pill { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
// .cr-pill.male { background: #eff6ff; color: #2563eb; }
// .cr-pill.female { background: #fdf2f8; color: #db2777; }
// .cr-pill.unk { background: #f3f4f6; color: #6b7280; }
// .cr-status { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
// .cr-status::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
// .cr-status.present { background: #f0fdf4; color: #16a34a; }
// .cr-status.absent { background: #fef2f2; color: #dc2626; }
// .cr-muted { color: #9ca3af; }

// /* pagination */
// .cr-pag { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 14px; border-top: 1px solid #f3f4f6; }
// .cr-showing { font-size: 12.5px; color: #6b7280; white-space: nowrap; }
// .cr-pages { display: flex; align-items: center; gap: 5px; }
// .cr .cr-pg { min-width: 30px; height: 30px; padding: 0 8px; border-radius: 6px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-size: 13px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
// .cr .cr-pg:hover:not(:disabled):not(.on) { border-color: #c4b5fd; color: #7c3aed; }
// .cr .cr-pg.on { background: #7c3aed; border-color: #7c3aed; color: #fff; font-weight: 600; }
// .cr .cr-pg.nav { border-color: transparent; background: transparent; }
// .cr .cr-pg:disabled { opacity: .35; cursor: default; }
// .cr-dots { width: 20px; text-align: center; color: #9ca3af; font-size: 13px; }
// .cr-pageof { display: none; font-size: 12.5px; color: #374151; font-weight: 600; min-width: 48px; text-align: center; }

// /* states */
// .cr-empty { padding: 40px 20px; text-align: center; color: #9ca3af; font-size: 14px; }
// .cr-empty * { text-align: center; }
// .cr-spin { width: 24px; height: 24px; border: 3px solid #ede9fe; border-top-color: #7c3aed; border-radius: 50%; animation: cr-rot .8s linear infinite; margin: 0 auto 12px; }
// @keyframes cr-rot { to { transform: rotate(360deg); } }

// /* child popup (card layout) */
// .cr-modal-bg { position: fixed; inset: 0; background: rgba(17, 24, 39, .5); z-index: 400; display: flex; align-items: center; justify-content: center; padding: 16px; }
// .cr-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 860px; max-height: 92vh; max-height: 92dvh; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0, 0, 0, .25); overflow: hidden; }
// .cr-mhead { flex: none; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 18px 24px; border-bottom: 1px solid #e5e7eb; }
// .cr-mname { font-size: 18px; font-weight: 700; margin: 0; color: #111827; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
// .cr-mb { display: inline-flex; align-items: center; padding: 2px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 11px; font-weight: 600; color: #374151; background: #fff; white-space: nowrap; }
// .cr-mb.gen { border-color: #2563eb; color: #2563eb; }
// .cr-mb.ok { background: #dcfce7; border-color: #bbf7d0; color: #15803d; }
// .cr-mb.no { background: #fee2e2; border-color: #fecaca; color: #b91c1c; }
// .cr .cr-mclose { margin-left: auto; width: 32px; height: 32px; border-radius: 50%; border: none; background: transparent; color: #374151; font-size: 16px; cursor: pointer; flex-shrink: 0; }
// .cr .cr-mclose:hover { background: #f3f4f6; }
// .cr-mbody { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 16px 24px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-content: start; }
// .cr-dc { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; min-width: 0; }
// .cr .cr-dch { text-align: center; padding: 10px; font-size: 12px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #374151; border-bottom: 1px solid #e5e7eb; }
// .cr-dcb { padding: 8px 0 10px; }
// .cr-kv { display: grid; grid-template-columns: 112px 14px minmax(0, 1fr); align-items: baseline; padding: 5px 18px; font-size: 13px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
// .cr-k { color: #6b7280; }
// .cr-c { color: #6b7280; }
// .cr-v { color: #111827; font-weight: 600; word-break: break-word; }
// .cr .cr-tel { color: #2563eb; text-decoration: none; font-weight: 600; }
// .cr .cr-tel:hover { text-decoration: underline; }
// .cr-mfoot { flex: none; display: flex; justify-content: flex-end; padding: 12px 24px; border-top: 1px solid #e5e7eb; }
// .cr .cr-mfbtn { background: #fff; color: #111827; border: 1.5px solid #d1d5db; border-radius: 8px; padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
// .cr .cr-mfbtn:hover { background: #f9fafb; }

// /* ── tablet & below: one panel at a time ── */
// @media (max-width: 1100px) {
//   .cr-seg { display: flex; }
//   .cr-body { grid-template-columns: minmax(0, 1fr); }
//   .cr-pane.off { display: none; }
//   .cr-hint { display: none; }
// }

// /* ── mobile ── */
// @media (max-width: 600px) {
//   .cr-wrap { padding: 8px 10px; gap: 8px; }
//   .cr-sub, .cr-bt { display: none; }
//   .cr-ico { width: 32px; height: 32px; }
//   .cr-title { font-size: 17px; }
//   .cr .cr-btn { padding: 0 11px; }
//   .cr .cr-input, .cr .cr-select { font-size: 16px; }

//   .cr-stats { gap: 6px; }
//   .cr-stat { padding: 6px 8px; }
//   .cr-stat-ico, .cr-stat-note { display: none; }
//   .cr-stat-label { font-size: 11px; }
//   .cr-stat-val { font-size: 17px; }

//   .cr .cr-tab { padding: 6px 11px; font-size: 12.5px; }
//   .cr .cr-fbtn { height: 40px; padding: 0 11px; }

//   /* filters become a bottom sheet */
//   .cr-backdrop { display: block; position: fixed; inset: 0; background: rgba(17, 24, 39, .45); z-index: 250; }
//   .cr-fcard { position: fixed; left: 0; right: 0; bottom: 0; z-index: 300; max-height: 82vh; max-height: 82dvh; overflow: auto;
//     border-radius: 16px 16px 0 0; border: none; padding: 14px 14px 20px; }
//   .cr-fgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
//   .cr .cr-done { display: inline-block; }

//   .cr-chead { padding: 8px 10px; gap: 8px; }
//   .cr-tools { width: 100%; }
//   .cr-search { flex: 1; min-width: 0; }
//   .cr-search .cr-input { width: 100%; }
//   .cr-tools .cr-select { max-width: 130px; }

//   .cr-table th, .cr-table td { padding-left: 8px; padding-right: 8px; font-size: 12px; }
//   .cr-mini { display: none; }

//   /* children table: name + place share a cell */
//   .cr-details .c-gen { width: 64px; }
//   .cr-details .c-age { width: 40px; }
//   .cr-details .c-mob { width: 104px; }
//   .cr-details .hide-m { display: none; }
//   .cr-details td { padding-left: 8px; padding-right: 8px; }
//   .cr-details .cr-av, .cr-details .cr-ic svg { display: none; }
//   .cr-details .cr-pill { padding: 2px 7px; font-size: 11px; }
//   .cr-place-m { display: block; }

//   .cr-showing { font-size: 12px; }
//   .cr-pag { padding: 6px 10px; }
//   .cr-pg.num, .cr-dots { display: none; }
//   .cr-pageof { display: inline-block; }

//   /* popup becomes a bottom sheet */
//   .cr-modal-bg { align-items: flex-end; padding: 0; }
//   .cr-modal { max-width: none; border-radius: 16px 16px 0 0; max-height: 90vh; max-height: 90dvh; }
//   .cr-mhead { padding: 14px 16px; }
//   .cr-mbody { grid-template-columns: minmax(0, 1fr); padding: 12px 14px; gap: 12px; }
//   .cr-kv { grid-template-columns: 96px 12px minmax(0, 1fr); padding: 4px 14px; }
//   .cr-mfoot { padding: 10px 16px; }
//   .cr .cr-mfbtn { width: 100% !important; }
// }
// `;

// // ─── Main Component ─────────────────────────────────────────────────────
// export default function ChildReports() {
//   const [kids, setKids] = useState<Child[]>([]);
//   const [presentByDate, setPresentByDate] = useState<
//     Record<string, Record<string, string>>
//   >({});
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [reloadKey, setReloadKey] = useState(0);
//   const [weeks, setWeeks] = useState(1); // today + yesterday + last N Sundays (default view)
//   const loadedDates = useRef<Set<string>>(new Set());

//   const [activeTab, setActiveTab] = useState<TabKey>("age");
//   const [filters, setFilters] = useState<Filters>(emptyFilters);
//   const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
//   const [search, setSearch] = useState("");
//   const [sortBy, setSortBy] = useState(SORTS[0]);
//   const [page, setPage] = useState(1);
//   const [showFilters, setShowFilters] = useState(false);
//   const [view, setView] = useState<"summary" | "details">("summary"); // tablet / mobile only
//   const [openRec, setOpenRec] = useState<AttendanceRecord | null>(null);

//   const isStacked = useMedia("(max-width: 1100px)");
//   const isMobile = useMedia("(max-width: 600px)");
//   const rowH = isMobile ? 54 : 44;
//   const [tableRef, perPage] = useFitRows(rowH, 36);

//   const reload = () => {
//     clearCaches();
//     loadedDates.current = new Set();
//     setPresentByDate({});
//     setReloadKey((k) => k + 1);
//   };

//   // close popup on Esc
//   useEffect(() => {
//     if (!openRec) return;
//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === "Escape") setOpenRec(null);
//     };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [openRec]);

//   // ─── Load children + present lists for the dates the filters need ───
//   const { date: fDate, month: fMonth, year: fYear, week: fWeek } = filters;
//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       try {
//         const kidList = await getKids();
//         if (cancelled) return;
//         setKids(kidList);

//         const missing = datesNeeded(fDate, fMonth, fYear, fWeek, weeks).filter(
//           (d) => !loadedDates.current.has(d),
//         );
//         if (missing.length === 0) {
//           setLoading(false);
//           return;
//         }
//         setLoading(true);

//         const fetched: Record<string, Record<string, string>> = {};
//         let failed = 0;
//         const BATCH = 6;
//         for (let i = 0; i < missing.length; i += BATCH) {
//           const slice = missing.slice(i, i + BATCH);
//           const results = await Promise.allSettled(
//             slice.map((d) => getPresent(d)),
//           );
//           if (cancelled) return;
//           results.forEach((r, j) => {
//             if (r.status === "fulfilled") fetched[slice[j]] = r.value;
//             else failed += 1;
//           });
//         }
//         Object.keys(fetched).forEach((d) => loadedDates.current.add(d));
//         setPresentByDate((prev) => ({ ...prev, ...fetched }));
//         setError(
//           failed === missing.length
//             ? "Could not load attendance from the server."
//             : "",
//         );
//         setLoading(false);
//       } catch (err) {
//         if (cancelled) return;
//         setKids([]);
//         setError(
//           err instanceof Error
//             ? err.message
//             : "Could not load the report data.",
//         );
//         setLoading(false);
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//   }, [fDate, fMonth, fYear, fWeek, weeks, reloadKey]);

//   // ─── One record per child per session date ─────────────────────────
//   const records = useMemo<AttendanceRecord[]>(() => {
//     const dates = Object.keys(presentByDate)
//       .filter((d) => Object.keys(presentByDate[d]).length > 0)
//       .sort();

//     return dates.flatMap((date) =>
//       kids.flatMap((c) => {
//         const inTime = presentByDate[date][c.id];
//         const isPresent = inTime !== undefined;
//         if (!isPresent && c.createdDate && c.createdDate > date) return [];
//         return [
//           {
//             ...c,
//             recordId: `${c.id}-${date}`,
//             date,
//             status: isPresent ? ("Present" as const) : ("Absent" as const),
//             checkInTime: isPresent ? inTime : "",
//           },
//         ];
//       }),
//     );
//   }, [kids, presentByDate]);

//   const latestDate = records.reduce((m, r) => (r.date > m ? r.date : m), "");

//   const updateFilter = (patch: Partial<Filters>) => {
//     setFilters((prev) => {
//       const next = { ...prev, ...patch };
//       if (patch.date) {
//         next.month = "";
//         next.year = "";
//         next.week = "";
//       }
//       if (next.week) {
//         const r = getRefMonth(next);
//         if (Number(next.week) > getSundays(r.year, r.month0).length)
//           next.week = "";
//       }
//       return next;
//     });
//     setSelectedGroup(null);
//     setPage(1);
//   };

//   const clearFilters = () => {
//     setFilters({ ...emptyFilters });
//     setSelectedGroup(null);
//     setSearch("");
//     setPage(1);
//   };

//   const switchTab = (tab: TabKey) => {
//     setActiveTab(tab);
//     setSelectedGroup(null);
//     setPage(1);
//   };

//   const isNotSunday =
//     !!filters.date && new Date(`${filters.date}T00:00:00`).getDay() !== 0;
//   const hasData =
//     !!filters.date &&
//     !!presentByDate[filters.date] &&
//     Object.keys(presentByDate[filters.date]).length > 0;

//   const tabMeta = TABS.find((t) => t.key === activeTab)!;

//   // district name + number of children in it (for the filter dropdown)
//   const districtCount = new Map<string, number>();
//   kids.forEach((k) =>
//     districtCount.set(k.district, (districtCount.get(k.district) ?? 0) + 1),
//   );
//   const districts = Array.from(districtCount.keys()).sort();

//   const religions = uniqueSorted(kids.map((r) => r.religion));
//   const years = uniqueSorted([
//     ...records.map((r) => r.date.slice(0, 4)),
//     String(new Date().getFullYear()),
//   ]);

//   const ref = getRefMonth(filters);
//   const sundays = getSundays(ref.year, ref.month0);

//   // ─── Filtering ──────────────────────────────────────────────────────
//   const filtered = records.filter((r) => {
//     if (filters.date && r.date !== filters.date) return false;
//     if (filters.month && r.date.slice(5, 7) !== filters.month) return false;
//     if (filters.year && r.date.slice(0, 4) !== filters.year) return false;
//     if (
//       filters.week &&
//       Math.ceil(Number(r.date.slice(8, 10)) / 7) !== Number(filters.week)
//     )
//       return false;
//     if (filters.district && r.district !== filters.district) return false;
//     if (filters.religion && r.religion !== filters.religion) return false;
//     if (filters.gender && r.gender !== filters.gender) return false;
//     if (filters.status && r.status !== filters.status) return false;
//     if (filters.ageMin && r.age < Number(filters.ageMin)) return false;
//     if (filters.ageMax && r.age > Number(filters.ageMax)) return false;
//     if (activeTab === "time" && (filters.timeFrom || filters.timeTo)) {
//       if (!r.checkInTime) return false;
//       if (filters.timeFrom && r.checkInTime < filters.timeFrom) return false;
//       if (filters.timeTo && r.checkInTime > filters.timeTo) return false;
//     }
//     return true;
//   });

//   const activeFilterCount =
//     Object.values(filters).filter((v) => v).length + (search ? 1 : 0);

//   // ─── Summary (every tab is split date-wise) ─────────────────────────
//   const isStatusTab = activeTab === "status";
//   const isMonthTab = activeTab === "month";
//   const isDateTab = activeTab === "date";

//   // header of the first summary column
//   const firstColHeader = isStatusTab
//     ? "Date / Status / Age"
//     : isDateTab || isMonthTab
//       ? tabMeta.groupHeader
//       : `Date / ${tabMeta.groupHeader}`;

//   type KidFlag = { present: boolean; gender: string };
//   const addKid = (map: Map<string, KidFlag>, r: AttendanceRecord) => {
//     const prev = map.get(r.id);
//     map.set(r.id, {
//       present: (prev?.present ?? false) || r.status === "Present",
//       gender: r.gender,
//     });
//   };
//   const countKids = (set: Map<string, KidFlag>) => {
//     let present = 0;
//     let male = 0;
//     let female = 0;
//     set.forEach((k) => {
//       if (k.present) present += 1;
//       if (k.gender === "Male") male += 1;
//       else if (k.gender === "Female") female += 1;
//     });
//     return {
//       present,
//       absent: set.size - present,
//       male,
//       female,
//       total: set.size,
//     };
//   };

//   const groupKids = new Map<
//     string,
//     { g: SumGroup; kids: Map<string, KidFlag> }
//   >();
//   const bump = (g: SumGroup, r: AttendanceRecord) => {
//     const entry = groupKids.get(g.key) ?? {
//       g,
//       kids: new Map<string, KidFlag>(),
//     };
//     addKid(entry.kids, r);
//     groupKids.set(g.key, entry);
//   };

//   filtered.forEach((r) => {
//     const date = r.date;
//     const dLabel = formatDate(date);
//     // date header row (level 0)
//     const dateRow = (ord = "0"): SumGroup => ({
//       key: `d:${date}`,
//       label: dLabel,
//       chip: dLabel,
//       date,
//       ord,
//       level: 0,
//       match: (x) => x.date === date,
//     });

//     if (isDateTab) {
//       bump(dateRow(), r);
//     } else if (isMonthTab) {
//       // month total, then every session date of that month under it
//       const m = date.slice(0, 7);
//       const [y, mm] = m.split("-");
//       const monthLabel = `${MONTH_FULL[Number(mm) - 1]} ${y}`;
//       bump(
//         {
//           key: `m:${m}`,
//           label: `${monthLabel} – Total`,
//           chip: monthLabel,
//           date: m,
//           ord: "0",
//           level: 0,
//           match: (x) => x.date.slice(0, 7) === m,
//         },
//         r,
//       );
//       const inv = 99999999 - Number(date.replace(/-/g, "")); // latest date first
//       bump({ ...dateRow(`1-${inv}`), date: m, level: 1 }, r);
//     } else if (isStatusTab) {
//       // date → Present / Absent → age
//       const sc = r.status === "Present" ? "0" : "1";
//       bump(dateRow(), r);
//       bump(
//         {
//           key: `s:${date}:${r.status}`,
//           label: r.status,
//           chip: `${dLabel} · ${r.status}`,
//           date,
//           ord: `1-${sc}`,
//           level: 1,
//           match: (x) => x.date === date && x.status === r.status,
//         },
//         r,
//       );
//       bump(
//         {
//           key: `a:${date}:${r.status}:${r.age}`,
//           label: `${r.age} years`,
//           chip: `${dLabel} · ${r.status} · ${r.age} years`,
//           date,
//           ord: `1-${sc}-${String(r.age).padStart(3, "0")}`,
//           level: 2,
//           match: (x) =>
//             x.date === date && x.status === r.status && x.age === r.age,
//         },
//         r,
//       );
//     } else {
//       // age / district / religion / time: date → group
//       const g = getGroup(activeTab, r);
//       bump(dateRow(), r);
//       bump(
//         {
//           key: `g:${date}:${g.key}`,
//           label: g.label,
//           chip: `${dLabel} · ${g.label}`,
//           date,
//           ord: `1-${sortStr(g.sort)}`,
//           level: 1,
//           match: (x) =>
//             x.date === date && getGroup(activeTab, x).key === g.key,
//         },
//         r,
//       );
//     }
//   });

//   const summaryRows: SummaryRow[] = Array.from(groupKids.values())
//     .map(({ g, kids: set }) => ({ ...g, ...countKids(set) }))
//     .sort((a, b) => b.date.localeCompare(a.date) || a.ord.localeCompare(b.ord));

//   const allKids = new Map<string, KidFlag>();
//   filtered.forEach((r) => addKid(allKids, r));
//   const totals = countKids(allKids);
//   const totalPresent = totals.present;
//   const totalAbsent = totals.absent;
//   const totalMale = totals.male;
//   const totalFemale = totals.female;
//   const childCount = totals.total;
//   const attendancePct = childCount
//     ? Math.round((totalPresent / childCount) * 100)
//     : 0;
//   const sessionCount = new Set(filtered.map((r) => r.date)).size;
//   const isDefaultRange = !fDate && !fMonth && !fYear && !fWeek;
//   const multiDates = sessionCount > 1; // show a Date column when several sessions are listed

//   // ─── Details (row click → search → sort → page) ─────────────────────
//   const selectedRow = summaryRows.find((g) => g.key === selectedGroup);
//   const q = search.trim().toLowerCase();
//   const details = sortRecords(
//     filtered.filter(
//       (r) =>
//         (!selectedRow || selectedRow.match(r)) &&
//         (!q ||
//           r.name.toLowerCase().includes(q) ||
//           r.mobile.includes(q) ||
//           r.district.toLowerCase().includes(q)),
//     ),
//     sortBy,
//   );
//   const selectedLabel = selectedRow?.chip;

//   const totalPages = Math.max(1, Math.ceil(details.length / perPage));
//   const currentPage = Math.min(page, totalPages);
//   const startIdx = (currentPage - 1) * perPage;
//   const pageRows = details.slice(startIdx, startIdx + perPage);

//   // popup: this child's attendance over the loaded sessions
//   const childHistory = openRec
//     ? records.filter((x) => x.id === openRec.id)
//     : [];
//   const childPresent = childHistory.filter(
//     (x) => x.status === "Present",
//   ).length;

//   // ─── Excel export ───────────────────────────────────────────────────
//   const handleDownload = () => {
//     const summarySheetRows = [
//       ...summaryRows.map((g) => ({
//         [firstColHeader]: `${"   ".repeat(g.level)}${g.label}`,
//         ...(isStatusTab ? {} : { Present: g.present, Absent: g.absent }),
//         Male: g.male,
//         Female: g.female,
//         Total: g.total,
//       })),
//       {
//         [firstColHeader]: "Total",
//         ...(isStatusTab ? {} : { Present: totalPresent, Absent: totalAbsent }),
//         Male: totalMale,
//         Female: totalFemale,
//         Total: childCount,
//       },
//     ];

//     const detailSheetRows = details.map((r, idx) => ({
//       "SL No": idx + 1,
//       Name: r.name,
//       Gender: r.gender,
//       Age: r.age,
//       Standard: r.standard,
//       Mobile: r.mobile,
//       District: r.district,
//       Religion: r.religion,
//       Date: formatDate(r.date),
//       Status: r.status,
//       "Check-in Time": r.checkInTime ? formatTime(r.checkInTime) : "",
//     }));

//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(
//       wb,
//       XLSX.utils.json_to_sheet(summarySheetRows),
//       "Summary",
//     );
//     XLSX.utils.book_append_sheet(
//       wb,
//       XLSX.utils.json_to_sheet(detailSheetRows),
//       "Details",
//     );

//     const today = new Date().toISOString().slice(0, 10);
//     const fileName = `${tabMeta.label.replace(/[\s/]+/g, "_")}_Report_${today}.xlsx`;
//     XLSX.writeFile(wb, fileName);
//   };

//   // ─── Render ─────────────────────────────────────────────────────────
//   return (
//     <div className="cr">
//       <style>{pageCss}</style>
//       <div className="cr-top">
//         <Header />
//       </div>

//       <div className="cr-wrap">
//         {/* Page header */}
//         <div className="cr-head">
//           <div className="cr-head-l">
//             <div className="cr-ico">
//               <ChartIcon size={20} />
//             </div>
//             <div>
//               <p className="cr-title">Children Reports</p>
//             </div>
//           </div>
//           <div className="cr-actions">
//             <button
//               type="button"
//               className="cr-btn cr-btn-primary"
//               onClick={handleDownload}
//               disabled={filtered.length === 0}
//               title="Download Excel"
//               aria-label="Download Excel"
//             >
//               <DownloadIcon /> <span className="cr-bt">Download Excel</span>
//             </button>
//             <button
//               type="button"
//               className="cr-btn cr-btn-light"
//               onClick={reload}
//               disabled={loading}
//               title="Refresh"
//               aria-label="Refresh"
//             >
//               <RefreshIcon />{" "}
//               <span className="cr-bt">
//                 {loading ? "Loading..." : "Refresh"}
//               </span>
//             </button>
//           </div>
//         </div>

//         {/* Stats */}
//         <div className="cr-stats">
//           <div className="cr-stat">
//             <div
//               className="cr-stat-ico"
//               style={{ background: "#ede9fe", color: "#7c3aed" }}
//             >
//               <UsersIcon />
//             </div>
//             <div className="cr-stat-body">
//               <p className="cr-stat-label">Total</p>
//               <p className="cr-stat-val">{childCount}</p>
//               <p className="cr-stat-note">
//                 children · {sessionCount} session{sessionCount === 1 ? "" : "s"}
//               </p>
//             </div>
//           </div>
//           <div className="cr-stat">
//             <div
//               className="cr-stat-ico"
//               style={{ background: "#f0fdf4", color: "#16a34a" }}
//             >
//               <CheckCircleIcon />
//             </div>
//             <div className="cr-stat-body">
//               <p className="cr-stat-label">Present</p>
//               <p className="cr-stat-val" style={{ color: "#16a34a" }}>
//                 {totalPresent}
//               </p>
//               <p className="cr-stat-note">
//                 {sessionCount > 1 ? "At least once" : "Checked in"}
//               </p>
//             </div>
//           </div>
//           <div className="cr-stat">
//             <div
//               className="cr-stat-ico"
//               style={{ background: "#fef2f2", color: "#dc2626" }}
//             >
//               <XCircleIcon />
//             </div>
//             <div className="cr-stat-body">
//               <p className="cr-stat-label">Absent</p>
//               <p className="cr-stat-val" style={{ color: "#dc2626" }}>
//                 {totalAbsent}
//               </p>
//               <p className="cr-stat-note">
//                 {sessionCount > 1 ? "Never in range" : "Not attended"}
//               </p>
//             </div>
//           </div>
//           <div className="cr-stat">
//             <div
//               className="cr-stat-ico"
//               style={{ background: "#ede9fe", color: "#7c3aed" }}
//             >
//               <TrendIcon />
//             </div>
//             <div className="cr-stat-body">
//               <p className="cr-stat-label">Attendance</p>
//               <p className="cr-stat-val" style={{ color: "#7c3aed" }}>
//                 {attendancePct}%
//               </p>
//               <div className="cr-bar">
//                 <span style={{ width: `${attendancePct}%` }} />
//               </div>
//             </div>
//           </div>
//         </div>

//         {error && (
//           <div className="cr-error">
//             <span>{error}</span>
//             <button type="button" className="cr-link" onClick={reload}>
//               Retry
//             </button>
//           </div>
//         )}

//         {!loading && (sessionCount > 1 || isDefaultRange) && (
//           <div className="cr-info">
//             <span>
//               Showing {sessionCount} session date{sessionCount === 1 ? "" : "s"}
//               {isDefaultRange
//                 ? ` (today, yesterday + last ${weeks} Sunday${weeks === 1 ? "" : "s"})`
//                 : ""}{" "}
//               – each date is listed separately; the Total row counts each child
//               once.
//             </span>
//             <div style={{ display: "flex", gap: 14, flexShrink: 0 }}>
//               {isDefaultRange && weeks < 260 && (
//                 <button
//                   type="button"
//                   className="cr-link"
//                   onClick={() => setWeeks((w) => w + 4)}
//                 >
//                   Load older
//                 </button>
//               )}
//               {latestDate && (
//                 <button
//                   type="button"
//                   className="cr-link"
//                   onClick={() => updateFilter({ date: latestDate })}
//                 >
//                   Latest day only
//                 </button>
//               )}
//             </div>
//           </div>
//         )}

//         {/* View tabs + filter toggle */}
//         <div className="cr-bar2">
//           <div className="cr-tabs">
//             {TABS.map((t) => (
//               <button
//                 key={t.key}
//                 type="button"
//                 className={`cr-tab${activeTab === t.key ? " on" : ""}`}
//                 onClick={() => switchTab(t.key)}
//               >
//                 {t.label}
//               </button>
//             ))}
//           </div>
//           <button
//             type="button"
//             className={`cr-btn cr-btn-light cr-fbtn${showFilters ? " on" : ""}`}
//             onClick={() => setShowFilters((s) => !s)}
//           >
//             <FilterIcon /> Filters
//             {activeFilterCount > 0 && (
//               <span className="cr-count">{activeFilterCount}</span>
//             )}
//           </button>
//         </div>

//         {/* Filters (inline on desktop, bottom sheet on mobile) */}
//         {showFilters && (
//           <div className="cr-backdrop" onClick={() => setShowFilters(false)} />
//         )}
//         {showFilters && (
//           <div className="cr-card cr-fcard">
//             <div className="cr-fhead">
//               <div className="cr-ftitle">
//                 <FilterIcon /> Filters
//                 {activeFilterCount > 0 && (
//                   <span className="cr-count">{activeFilterCount} active</span>
//                 )}
//               </div>
//               <div className="cr-fh-r">
//                 <button
//                   type="button"
//                   className="cr-clear"
//                   onClick={clearFilters}
//                 >
//                   <ResetIcon /> Clear
//                 </button>
//                 <button
//                   type="button"
//                   className="cr-done"
//                   onClick={() => setShowFilters(false)}
//                 >
//                   Done
//                 </button>
//               </div>
//             </div>

//             <div className="cr-fgrid">
//               <div>
//                 <div className="cr-lrow">
//                   <label className="cr-label">Date</label>
//                   {filters.date && (
//                     <button
//                       type="button"
//                       className="cr-link"
//                       onClick={() => updateFilter({ date: "" })}
//                     >
//                       All dates
//                     </button>
//                   )}
//                 </div>
//                 <input
//                   className="cr-input"
//                   type="date"
//                   value={filters.date}
//                   onChange={(e) => updateFilter({ date: e.target.value })}
//                 />
//                 {isNotSunday && !hasData && !loading && (
//                   <p className="cr-warn">Meetings are held on Sundays only</p>
//                 )}
//               </div>
//               <div>
//                 <div className="cr-lrow">
//                   <label className="cr-label">Month</label>
//                 </div>
//                 <select
//                   className="cr-select"
//                   disabled={!!filters.date}
//                   value={filters.month}
//                   onChange={(e) => updateFilter({ month: e.target.value })}
//                 >
//                   <option value="">All Months</option>
//                   {MONTH_FULL.map((m, i) => (
//                     <option key={m} value={pad(i + 1)}>
//                       {m}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <div className="cr-lrow">
//                   <label className="cr-label">Year</label>
//                 </div>
//                 <select
//                   className="cr-select"
//                   disabled={!!filters.date}
//                   value={filters.year}
//                   onChange={(e) => updateFilter({ year: e.target.value })}
//                 >
//                   <option value="">All Years</option>
//                   {years.map((y) => (
//                     <option key={y} value={y}>
//                       {y}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <div className="cr-lrow">
//                   <label className="cr-label">Week (Sunday)</label>
//                 </div>
//                 <select
//                   className="cr-select"
//                   disabled={!!filters.date}
//                   value={filters.week}
//                   onChange={(e) => updateFilter({ week: e.target.value })}
//                 >
//                   <option value="">All Weeks</option>
//                   {sundays.map((d, i) => (
//                     <option key={d} value={String(i + 1)}>
//                       {WEEK_NAMES[i]} Week
//                       {filters.month
//                         ? ` · ${pad(d)} ${MONTHS[ref.month0]}`
//                         : ""}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <div className="cr-lrow">
//                   <label className="cr-label">District</label>
//                 </div>
//                 <select
//                   className="cr-select"
//                   value={filters.district}
//                   onChange={(e) => updateFilter({ district: e.target.value })}
//                 >
//                   <option value="">All ({kids.length})</option>
//                   {districts.map((d) => (
//                     <option key={d} value={d}>
//                       {d} ({districtCount.get(d)})
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <div className="cr-lrow">
//                   <label className="cr-label">Religion</label>
//                 </div>
//                 <select
//                   className="cr-select"
//                   value={filters.religion}
//                   onChange={(e) => updateFilter({ religion: e.target.value })}
//                 >
//                   <option value="">All</option>
//                   {religions.map((r) => (
//                     <option key={r} value={r}>
//                       {r}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div>
//                 <div className="cr-lrow">
//                   <label className="cr-label">Gender</label>
//                 </div>
//                 <select
//                   className="cr-select"
//                   value={filters.gender}
//                   onChange={(e) => updateFilter({ gender: e.target.value })}
//                 >
//                   <option value="">All</option>
//                   <option value="Male">Male</option>
//                   <option value="Female">Female</option>
//                 </select>
//               </div>
//               <div>
//                 <div className="cr-lrow">
//                   <label className="cr-label">Status</label>
//                 </div>
//                 <select
//                   className="cr-select"
//                   value={filters.status}
//                   onChange={(e) => updateFilter({ status: e.target.value })}
//                 >
//                   <option value="">All</option>
//                   <option value="Present">Present</option>
//                   <option value="Absent">Absent</option>
//                 </select>
//               </div>
//               <div>
//                 <div className="cr-lrow">
//                   <label className="cr-label">Age From</label>
//                 </div>
//                 <input
//                   className="cr-input"
//                   type="number"
//                   min={1}
//                   placeholder="Min"
//                   value={filters.ageMin}
//                   onChange={(e) => updateFilter({ ageMin: e.target.value })}
//                 />
//               </div>
//               <div>
//                 <div className="cr-lrow">
//                   <label className="cr-label">Age To</label>
//                 </div>
//                 <input
//                   className="cr-input"
//                   type="number"
//                   min={1}
//                   placeholder="Max"
//                   value={filters.ageMax}
//                   onChange={(e) => updateFilter({ ageMax: e.target.value })}
//                 />
//               </div>
//               {activeTab === "time" && (
//                 <>
//                   <div>
//                     <div className="cr-lrow">
//                       <label className="cr-label">Check-in From</label>
//                     </div>
//                     <input
//                       className="cr-input"
//                       type="time"
//                       value={filters.timeFrom}
//                       onChange={(e) =>
//                         updateFilter({ timeFrom: e.target.value })
//                       }
//                     />
//                   </div>
//                   <div>
//                     <div className="cr-lrow">
//                       <label className="cr-label">Check-in To</label>
//                     </div>
//                     <input
//                       className="cr-input"
//                       type="time"
//                       value={filters.timeTo}
//                       onChange={(e) => updateFilter({ timeTo: e.target.value })}
//                     />
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>
//         )}

//         {/* Summary / Children switch (tablet & mobile) */}
//         <div className="cr-seg">
//           <button
//             type="button"
//             className={view === "summary" ? "on" : ""}
//             onClick={() => setView("summary")}
//           >
//             Summary
//           </button>
//           <button
//             type="button"
//             className={view === "details" ? "on" : ""}
//             onClick={() => setView("details")}
//           >
//             Children ({details.length})
//           </button>
//         </div>

//         <div className="cr-body">
//           {/* Summary */}
//           <div className={`cr-card cr-pane${view === "summary" ? "" : " off"}`}>
//             <div className="cr-chead">
//               <div className="cr-ctitle">
//                 <TableIcon />
//                 {tabMeta.label} Summary
//               </div>
//               <span className="cr-hint">Click a row to filter</span>
//             </div>
//             <div className="cr-sumscroll">
//               {loading ? (
//                 <div className="cr-empty">
//                   <div className="cr-spin" />
//                   Loading report...
//                 </div>
//               ) : summaryRows.length === 0 ? (
//                 <div className="cr-empty">
//                   No data for the selected filters.
//                 </div>
//               ) : (
//                 <table className="cr-table">
//                   <thead>
//                     <tr>
//                       <th>{firstColHeader}</th>
//                       {!isStatusTab && <th>Present</th>}
//                       {!isStatusTab && <th>Absent</th>}
//                       <th>Male</th>
//                       <th>Female</th>
//                       <th>Total</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {summaryRows.map((g) => {
//                       const isSel = selectedGroup === g.key;
//                       const isParent = g.level === 0 && !isDateTab;
//                       const pct = g.total
//                         ? Math.round((g.present / g.total) * 100)
//                         : 0;
//                       return (
//                         <tr
//                           key={g.key}
//                           className={`cr-srow${isSel ? " sel" : ""}${isParent ? " parent" : ""}`}
//                           onClick={() => {
//                             setSelectedGroup(isSel ? null : g.key);
//                             setPage(1);
//                             if (!isSel && isStacked) setView("details");
//                           }}
//                         >
//                           <td
//                             style={{
//                               paddingLeft:
//                                 g.level === 0 ? undefined : 12 + g.level * 16,
//                             }}
//                           >
//                             <div className="cr-lab">{g.label}</div>
//                             {!isStatusTab && (
//                               <div className="cr-mini">
//                                 <span style={{ width: `${pct}%` }} />
//                               </div>
//                             )}
//                           </td>
//                           {!isStatusTab && <td className="g">{g.present}</td>}
//                           {!isStatusTab && <td className="r">{g.absent}</td>}
//                           <td className="bl">{g.male}</td>
//                           <td className="pk">{g.female}</td>
//                           <td style={{ fontWeight: 700 }}>{g.total}</td>
//                         </tr>
//                       );
//                     })}
//                     <tr className="cr-total">
//                       <td>Total</td>
//                       {!isStatusTab && <td>{totalPresent}</td>}
//                       {!isStatusTab && <td>{totalAbsent}</td>}
//                       <td>{totalMale}</td>
//                       <td>{totalFemale}</td>
//                       <td>{childCount}</td>
//                     </tr>
//                   </tbody>
//                 </table>
//               )}
//             </div>
//           </div>

//           {/* Details */}
//           <div className={`cr-card cr-pane${view === "details" ? "" : " off"}`}>
//             <div className="cr-chead">
//               <div className="cr-ctitle">
//                 <TableIcon />
//                 Children
//                 <span className="cr-badge">
//                   {multiDates
//                     ? `${new Set(details.map((r) => r.id)).size} children · ${details.length} records`
//                     : details.length}
//                 </span>
//                 {selectedLabel && (
//                   <span className="cr-chip">
//                     {selectedLabel}
//                     <button
//                       type="button"
//                       title="Clear selection"
//                       onClick={() => {
//                         setSelectedGroup(null);
//                         setPage(1);
//                       }}
//                     >
//                       ✕
//                     </button>
//                   </span>
//                 )}
//               </div>
//               <div className="cr-tools">
//                 <div className="cr-search">
//                   <SearchIcon />
//                   <input
//                     className="cr-input"
//                     type="text"
//                     placeholder="Search name, mobile, place..."
//                     value={search}
//                     onChange={(e) => {
//                       setSearch(e.target.value);
//                       setPage(1);
//                     }}
//                   />
//                 </div>
//                 <select
//                   className="cr-select"
//                   value={sortBy}
//                   title="Sort by"
//                   onChange={(e) => {
//                     setSortBy(e.target.value);
//                     setPage(1);
//                   }}
//                 >
//                   {SORTS.map((o) => (
//                     <option key={o} value={o}>
//                       Sort: {o}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             <div className="cr-tscroll" ref={tableRef}>
//               {loading ? (
//                 <div className="cr-empty">
//                   <div className="cr-spin" />
//                   Loading children...
//                 </div>
//               ) : pageRows.length === 0 ? (
//                 <div className="cr-empty">No children found.</div>
//               ) : (
//                 <table className="cr-table cr-details">
//                   <thead>
//                     <tr>
//                       <th>Name</th>
//                       <th className="c-gen">Gender</th>
//                       <th className="c-age">Age</th>
//                       <th className="c-mob">Mobile</th>
//                       <th className="c-plc hide-m">Place</th>
//                       {multiDates && <th className="c-date hide-m">Date</th>}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {pageRows.map((r) => {
//                       const [bg, fg] = avatarFor(r.name);
//                       return (
//                         <tr
//                           key={r.recordId}
//                           className="cr-drow"
//                           style={{ height: rowH }}
//                           tabIndex={0}
//                           onClick={() => setOpenRec(r)}
//                           onKeyDown={(e) => {
//                             if (e.key === "Enter") setOpenRec(r);
//                           }}
//                         >
//                           <td>
//                             <div className="cr-name">
//                               <span
//                                 className="cr-av"
//                                 style={{ background: bg, color: fg }}
//                               >
//                                 {initials(r.name)}
//                               </span>
//                               <span className="cr-nm">
//                                 <span className="t">{r.name}</span>
//                                 <span className="cr-place-m">
//                                   {r.district}
//                                   {multiDates ? ` · ${formatDate(r.date)}` : ""}
//                                 </span>
//                               </span>
//                             </div>
//                           </td>
//                           <td>
//                             <span
//                               className={`cr-pill ${genderClass(r.gender)}`}
//                             >
//                               {r.gender}
//                             </span>
//                           </td>
//                           <td>{r.age || "—"}</td>
//                           <td>
//                             <div className="cr-ic">
//                               <PhoneIcon />
//                               <span className="t">{r.mobile}</span>
//                             </div>
//                           </td>
//                           <td className="hide-m">
//                             <div className="cr-ic">
//                               <PinIcon />
//                               <span className="t">{r.district}</span>
//                             </div>
//                           </td>
//                           {multiDates && (
//                             <td className="hide-m">{formatDate(r.date)}</td>
//                           )}
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               )}
//             </div>

//             {!loading && details.length > 0 && (
//               <div className="cr-pag">
//                 <span className="cr-showing">
//                   {startIdx + 1}–{Math.min(startIdx + perPage, details.length)}{" "}
//                   of {details.length}
//                 </span>
//                 <div className="cr-pages">
//                   <button
//                     type="button"
//                     className="cr-pg nav"
//                     disabled={currentPage === 1}
//                     onClick={() => setPage(currentPage - 1)}
//                     aria-label="Previous page"
//                   >
//                     <ChevLeft />
//                   </button>
//                   {pageNumbers(currentPage, totalPages).map((p) =>
//                     typeof p === "string" ? (
//                       <span key={p} className="cr-dots">
//                         …
//                       </span>
//                     ) : (
//                       <button
//                         key={p}
//                         type="button"
//                         className={`cr-pg num${p === currentPage ? " on" : ""}`}
//                         onClick={() => setPage(p)}
//                       >
//                         {p}
//                       </button>
//                     ),
//                   )}
//                   <span className="cr-pageof">
//                     {currentPage} / {totalPages}
//                   </span>
//                   <button
//                     type="button"
//                     className="cr-pg nav"
//                     disabled={currentPage === totalPages}
//                     onClick={() => setPage(currentPage + 1)}
//                     aria-label="Next page"
//                   >
//                     <ChevRight />
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Full child info popup */}
//       {openRec && (
//         <div className="cr-modal-bg" onClick={() => setOpenRec(null)}>
//           <div
//             className="cr-modal"
//             role="dialog"
//             aria-modal="true"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="cr-mhead">
//               <p className="cr-mname">Child Details — {openRec.name}</p>
//               <span className="cr-mb gen">{openRec.gender}</span>
//               <span
//                 className={`cr-mb ${openRec.status === "Present" ? "ok" : "no"}`}
//               >
//                 {openRec.status}
//               </span>
//               <button
//                 type="button"
//                 className="cr-mclose"
//                 onClick={() => setOpenRec(null)}
//                 aria-label="Close"
//               >
//                 ✕
//               </button>
//             </div>

//             <div className="cr-mbody">
//               <Card title="Personal">
//                 <Row label="ID">{openRec.id}</Row>
//                 <Row label="Gender">{openRec.gender}</Row>
//                 <Row label="Age">{openRec.age || "—"}</Row>
//                 <Row label="Standard">{openRec.standard}</Row>
//                 <Row label="Religion">{openRec.religion}</Row>
//                 <Row label="Joined">
//                   {openRec.createdDate ? formatDate(openRec.createdDate) : "—"}
//                 </Row>
//               </Card>

//               <Card title="Contact">
//                 <Row label="Self">
//                   <Phone n={openRec.selfNo} />
//                 </Row>
//                 <Row label="Mother">
//                   <Phone n={openRec.momNo} />
//                 </Row>
//                 <Row label="Father">
//                   <Phone n={openRec.dadNo} />
//                 </Row>
//                 <Row label="Guardian">
//                   <Phone n={openRec.guardianNo} />
//                 </Row>
//               </Card>

//               <Card title="Address">
//                 <Row label="Address 1">
//                   <Val v={openRec.address1} />
//                 </Row>
//                 <Row label="District">
//                   <Val v={openRec.address2} />
//                 </Row>
//                 <Row label="State">
//                   <Val v={openRec.state} />
//                 </Row>
//               </Card>

//               <Card title="Attendance">
//                 <Row label="Session">{formatDate(openRec.date)}</Row>
//                 <Row label="Status">{openRec.status}</Row>
//                 <Row label="Check-in">
//                   {openRec.checkInTime ? formatTime(openRec.checkInTime) : "—"}
//                 </Row>
//                 <Row label="Overall">
//                   {childPresent} / {childHistory.length} present
//                 </Row>
//               </Card>
//             </div>

//             <div className="cr-mfoot">
//               <button
//                 type="button"
//                 className="cr-mfbtn"
//                 onClick={() => setOpenRec(null)}
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

import { useState, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import * as XLSX from "xlsx";
import Header from "../components/Header";

// ─── API ────────────────────────────────────────────────────────────────
const API_BASE_URL = "/api";
const KIDS_URL = `${API_BASE_URL}/kids`; // GET -> all children
const ATTENDANCE_URL = `${API_BASE_URL}/attendance`;

interface ApiPresentItem {
  kidsId?: string;
  inTime?: string | null;
  outTime?: string | null;
  status?: string;
}

interface ApiKid {
  kidsId: string;
  name: string;
  gender?: string;
  age?: number | string;
  std?: string;
  religion?: string | null;
  selfNo?: string | null;
  motherNo?: string | null;
  fatherNo?: string | null;
  guardianNo?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  createdAt?: string | null;
}

// times of one child on one date ("HH:mm", outTime "" = not checked out)
interface PresentInfo {
  inTime: string;
  outTime: string;
}

// ─── Types ──────────────────────────────────────────────────────────────
interface Child {
  id: string; // kidsId
  name: string;
  gender: string;
  age: number;
  standard: string;
  mobile: string; // best available number (for the table)
  district: string;
  religion: string;
  createdDate: string; // yyyy-mm-dd ("" when unknown)
  // full info (shown in the detail popup)
  selfNo: string;
  motherNo: string;
  fatherNo: string;
  guardianNo: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
}

interface AttendanceRecord extends Child {
  recordId: string;
  date: string; // yyyy-mm-dd
  status: "Present" | "Absent";
  checkInTime: string; // HH:mm (24h) – empty when absent
  checkOutTime: string; // HH:mm (24h) – empty when absent / not checked out
}

type TabKey =
  | "age"
  | "date"
  | "month"
  | "district"
  | "religion"
  | "status"
  | "time";

interface Group {
  key: string;
  label: string;
  sort: number | string;
}

// One row of the summary table.
// level 0 = date (or month) header, 1 = group under it, 2 = sub-group (status tab: age)
interface SumGroup {
  key: string;
  label: string;
  chip: string; // text shown in the "selected" chip above the children list
  date: string; // date (or month) the row belongs to – rows are sorted by this, latest first
  ord: string; // order inside that date
  level: 0 | 1 | 2;
  match: (r: AttendanceRecord) => boolean; // which records belong to this row
}

interface SummaryRow extends SumGroup {
  present: number;
  absent: number;
  male: number;
  female: number;
  total: number;
}

interface Filters {
  date: string;
  month: string;
  year: string;
  week: string;
  district: string;
  religion: string;
  gender: string;
  status: string;
  ageMin: string;
  ageMax: string;
  timeFrom: string;
  timeTo: string;
}

const TABS: { key: TabKey; label: string; groupHeader: string }[] = [
  { key: "age", label: "Age Wise", groupHeader: "Age" },
  { key: "date", label: "Date Wise", groupHeader: "Date" },
  { key: "month", label: "Month Wise", groupHeader: "Month / Date" },
  { key: "district", label: "District Wise", groupHeader: "District" },
  { key: "religion", label: "Religion Wise", groupHeader: "Religion" },
  { key: "status", label: "Present / Absent", groupHeader: "Status" },
  { key: "time", label: "Time Based", groupHeader: "Check-in Time Slot" },
];

const emptyFilters: Filters = {
  date: "",
  month: "",
  year: "",
  week: "",
  district: "",
  religion: "",
  gender: "",
  status: "",
  ageMin: "",
  ageMax: "",
  timeFrom: "",
  timeTo: "",
};

// ─── Helpers ────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");

const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
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

const formatTime = (hhmm: string) => {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${pad(m)} ${suffix}`;
};

const toArray = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  const obj = data as { content?: T[]; data?: T[] } | null;
  return obj?.content ?? obj?.data ?? [];
};

const formatStd = (std?: string | null) => {
  if (!std) return "—";
  if (!/^\d+$/.test(std)) return std;
  const n = Number(std);
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suffix}`;
};

const toChild = (k: ApiKid): Child => ({
  id: k.kidsId,
  name: k.name,
  gender: k.gender || "—",
  age: Number(k.age) || 0,
  standard: formatStd(k.std),
  mobile: k.selfNo || k.fatherNo || k.motherNo || k.guardianNo || "—",
  district: k.address2 || k.address1 || k.city || k.state || "—",
  religion: k.religion || "Not specified",
  createdDate: k.createdAt ? String(k.createdAt).slice(0, 10) : "",
  selfNo: k.selfNo || "",
  motherNo: k.motherNo || "",
  fatherNo: k.fatherNo || "",
  guardianNo: k.guardianNo || "",
  address1: k.address1 || "",
  address2: k.address2 || "",
  city: k.city || "",
  state: k.state || "",
});

const toHHmm = (t?: string | null) => (t ? String(t).slice(0, 5) : "");

const getGroup = (tab: TabKey, r: AttendanceRecord): Group => {
  switch (tab) {
    case "age":
      return { key: String(r.age), label: `${r.age} years`, sort: r.age };
    case "date":
      return { key: r.date, label: formatDate(r.date), sort: r.date };
    case "month": {
      const [y, m] = r.date.split("-");
      return {
        key: `${y}-${m}`,
        label: `${MONTH_FULL[Number(m) - 1]} ${y}`,
        sort: `${y}-${m}`,
      };
    }
    case "district":
      return { key: r.district, label: r.district, sort: r.district };
    case "religion":
      return { key: r.religion, label: r.religion, sort: r.religion };
    case "status":
      return {
        key: `${r.status}|${r.age}`,
        label: `${r.age} years`,
        sort: `${r.status === "Present" ? 0 : 1}-${pad(r.age)}`,
      };
    case "time": {
      if (!r.checkInTime)
        return { key: "none", label: "Not Checked In", sort: 99 };
      const h = Number(r.checkInTime.split(":")[0]);
      return {
        key: `h${h}`,
        label: `${formatTime(`${pad(h)}:00`)} – ${formatTime(`${pad(h + 1)}:00`)}`,
        sort: h,
      };
    }
  }
};

// sortable string for a group's sort value (numbers are zero padded)
const sortStr = (v: number | string) =>
  typeof v === "number" ? String(v).padStart(6, "0") : v;

const WEEK_NAMES = ["First", "Second", "Third", "Fourth", "Fifth"];

const getSundays = (year: number, month0: number) => {
  const days = new Date(year, month0 + 1, 0).getDate();
  const out: number[] = [];
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month0, d).getDay() === 0) out.push(d);
  }
  return out;
};

const getRefMonth = (f: Filters) => {
  const now = new Date();
  return {
    year: Number(f.year) || now.getFullYear(),
    month0: f.month ? Number(f.month) - 1 : now.getMonth(),
  };
};

const uniqueSorted = (values: string[]) => Array.from(new Set(values)).sort();

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayIso = () => isoDate(new Date());

// today + yesterday + the last N Sundays (newest first, no duplicates)
const recentDates = (weeks = 1): string[] => {
  const out = new Set<string>();
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  out.add(isoDate(d)); // today

  const yest = new Date(d);
  yest.setDate(yest.getDate() - 1);
  out.add(isoDate(yest)); // yesterday

  while (d.getDay() !== 0) d.setDate(d.getDate() - 1); // back to latest Sunday
  for (let i = 0; i < weeks; i++) {
    out.add(isoDate(d));
    d.setDate(d.getDate() - 7);
  }
  return Array.from(out);
};

const datesNeeded = (
  date: string,
  month: string,
  year: string,
  week: string,
  defaultWeeks = 1,
): string[] => {
  if (date) return [date];
  if (!month && !year && !week) return recentDates(defaultWeeks);
  const y = Number(year) || new Date().getFullYear();
  const months = month
    ? [Number(month) - 1]
    : Array.from({ length: 12 }, (_, i) => i);
  const today = todayIso();
  const out: string[] = [];
  months.forEach((m0) => {
    getSundays(y, m0).forEach((day, i) => {
      if (week && Number(week) !== i + 1) return;
      const iso = `${y}-${pad(m0 + 1)}-${pad(day)}`;
      if (iso <= today) out.push(iso);
    });
  });
  return out;
};

// Short-lived shared cache (React StrictMode runs effects twice in dev)
const TTL = 10_000;
let kidsPromise: Promise<Child[]> | null = null;
let kidsAt = 0;
const presentCache = new Map<
  string,
  { at: number; p: Promise<Record<string, PresentInfo>> }
>();

const getKids = (): Promise<Child[]> => {
  if (kidsPromise && Date.now() - kidsAt < TTL) return kidsPromise;
  kidsAt = Date.now();
  kidsPromise = (async () => {
    const res = await fetch(KIDS_URL);
    if (!res.ok) throw new Error(`Could not load children (${res.status})`);
    const raw = toArray<ApiKid>(await res.json().catch(() => []));
    return Array.from(new Map(raw.map((k) => [k.kidsId, toChild(k)])).values());
  })();
  kidsPromise.catch(() => {
    kidsPromise = null;
  });
  return kidsPromise;
};

const getPresent = (date: string): Promise<Record<string, PresentInfo>> => {
  const hit = presentCache.get(date);
  if (hit && Date.now() - hit.at < TTL) return hit.p;
  const p = (async () => {
    const res = await fetch(`${ATTENDANCE_URL}/present?date=${date}`);
    if (!res.ok) throw new Error(String(res.status));
    const list = toArray<ApiPresentItem>(await res.json().catch(() => []));
    const present: Record<string, PresentInfo> = {};
    list.forEach((it) => {
      if (!it.kidsId) return;
      if (it.status && it.status.toUpperCase() !== "PRESENT") return;
      present[it.kidsId] = {
        inTime: toHHmm(it.inTime),
        outTime: toHHmm(it.outTime),
      };
    });
    return present;
  })();
  presentCache.set(date, { at: Date.now(), p });
  p.catch(() => presentCache.delete(date));
  return p;
};

const clearCaches = () => {
  kidsPromise = null;
  presentCache.clear();
};

// ─── Hooks ──────────────────────────────────────────────────────────────
const useMedia = (query: string) => {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
};

// How many table rows fit in the available height (so the page never scrolls)
const useFitRows = (rowH: number, headH: number) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(8);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calc = () => {
      const h = el.clientHeight;
      if (h > 0) setRows(Math.max(3, Math.floor((h - headH) / (rowH + 1))));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rowH, headH]);
  return [ref, rows] as const;
};

// ─── Icons ──────────────────────────────────────────────────────────────
const Svg = ({
  size = 16,
  children,
}: {
  size?: number;
  children: ReactNode;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const ChartIcon = ({ size = 22 }: { size?: number }) => (
  <Svg size={size}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </Svg>
);
const DownloadIcon = () => (
  <Svg>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Svg>
);
const RefreshIcon = () => (
  <Svg>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </Svg>
);
const FilterIcon = () => (
  <Svg>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </Svg>
);
const SearchIcon = () => (
  <Svg size={15}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Svg>
);
const ResetIcon = () => (
  <Svg size={14}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </Svg>
);
const ChevLeft = () => (
  <Svg size={18}>
    <polyline points="15 18 9 12 15 6" />
  </Svg>
);
const ChevRight = () => (
  <Svg size={18}>
    <polyline points="9 18 15 12 9 6" />
  </Svg>
);
const PhoneIcon = () => (
  <Svg size={13}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </Svg>
);
const PinIcon = () => (
  <Svg size={13}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </Svg>
);
const TableIcon = () => (
  <Svg size={18}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </Svg>
);
const UsersIcon = () => (
  <Svg size={20}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);
const CheckCircleIcon = () => (
  <Svg size={20}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </Svg>
);
const XCircleIcon = () => (
  <Svg size={20}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </Svg>
);
const TrendIcon = () => (
  <Svg size={20}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </Svg>
);

// ─── Small view helpers ─────────────────────────────────────────────────
const AVATARS = [
  ["#ede9fe", "#7c3aed"],
  ["#dbeafe", "#2563eb"],
  ["#fce7f3", "#db2777"],
  ["#dcfce7", "#16a34a"],
  ["#ffedd5", "#ea580c"],
  ["#cffafe", "#0891b2"],
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

const genderClass = (g: string) =>
  g === "Male" ? "male" : g === "Female" ? "female" : "unk";

const SORTS = [
  "Date (Latest)",
  "Name A-Z",
  "Name Z-A",
  "Age (Low-High)",
  "Age (High-Low)",
  "Check-in (Earliest)",
];

const sortRecords = (list: AttendanceRecord[], by: string) =>
  [...list].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    switch (by) {
      case "Name A-Z":
        return byName;
      case "Name Z-A":
        return -byName;
      case "Age (Low-High)":
        return a.age - b.age || byName;
      case "Age (High-Low)":
        return b.age - a.age || byName;
      case "Check-in (Earliest)":
        return (
          (a.checkInTime || "99:99").localeCompare(b.checkInTime || "99:99") ||
          byName
        );
      default:
        return b.date.localeCompare(a.date) || byName;
    }
  });

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

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="cr-dc">
    <div className="cr-dch">{title}</div>
    <div className="cr-dcb">{children}</div>
  </div>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="cr-kv">
    <span className="cr-k">{label}</span>
    <span className="cr-c">:</span>
    <span className="cr-v">{children}</span>
  </div>
);

const Phone = ({ n }: { n: string }) =>
  n ? (
    <a className="cr-tel" href={`tel:${n}`}>
      {n}
    </a>
  ) : (
    <span className="cr-muted">—</span>
  );

const Val = ({ v }: { v: string }) =>
  v ? <>{v}</> : <span className="cr-muted">—</span>;

// ─── Styles ─────────────────────────────────────────────────────────────
const pageCss = `
.cr { height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; background: #f8f7ff; color: #111827;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.cr, .cr * { text-align: left; box-sizing: border-box; }
.cr button { width: auto; transform: none !important; font-family: inherit; }
.cr-top { flex: none; position: relative; z-index: 100; }
.cr-wrap { flex: 1; min-height: 0; width: 100%; max-width: 1440px; margin: 0 auto; padding: 12px 20px; display: flex; flex-direction: column; gap: 10px; }

/* header */
.cr-head { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.cr-head-l { display: flex; align-items: center; gap: 12px; min-width: 0; }
.cr-ico { width: 38px; height: 38px; border-radius: 10px; background: #ede9fe; color: #7c3aed; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cr-title { font-size: 19px; font-weight: 700; margin: 0; line-height: 1.2; }
.cr-sub { font-size: 12px; color: #6b7280; margin: 1px 0 0; }
.cr-actions { display: flex; gap: 8px; }
.cr .cr-btn { display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 14px; border-radius: 8px;
  font-size: 13px; font-weight: 600; line-height: 1; cursor: pointer; white-space: nowrap; transition: background .15s, border-color .15s, color .15s; }
.cr .cr-btn-primary { background: #7c3aed; color: #fff; border: 1.5px solid #7c3aed; }
.cr .cr-btn-primary:hover:not(:disabled) { background: #6d28d9; border-color: #6d28d9; }
.cr .cr-btn-light { background: #fff; color: #374151; border: 1.5px solid #e5e7eb; }
.cr .cr-btn-light:hover:not(:disabled) { border-color: #c4b5fd; color: #7c3aed; }
.cr .cr-btn-light.on { border-color: #7c3aed; color: #7c3aed; background: #f5f3ff; }
.cr .cr-btn:disabled { opacity: .55; cursor: not-allowed; }

/* stats */
.cr-stats { flex: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.cr-stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px 12px; display: flex; align-items: center; gap: 10px; min-width: 0; }
.cr-stat-ico { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cr-stat-body { min-width: 0; flex: 1; }
.cr-stat-label { font-size: 11.5px; font-weight: 500; color: #6b7280; margin: 0; }
.cr-stat-val { font-size: 20px; font-weight: 700; margin: 0; line-height: 1.2; }
.cr-stat-note { font-size: 11px; color: #9ca3af; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cr-bar { height: 5px; border-radius: 99px; background: #fee2e2; overflow: hidden; margin-top: 4px; }
.cr-bar > span { display: block; height: 100%; background: #16a34a; border-radius: 99px; transition: width .3s; }

/* notices */
.cr-info, .cr-error { flex: none; padding: 6px 12px; border-radius: 8px; font-size: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.cr-info > span, .cr-error > span { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cr-info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.cr-error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.cr .cr-link { background: none; border: none; padding: 0; color: #7c3aed; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.cr .cr-link:hover { text-decoration: underline; }
.cr-error .cr-link { color: inherit; text-decoration: underline; }

/* tabs row */
.cr-bar2 { flex: none; display: flex; gap: 8px; align-items: center; }
.cr-tabs { flex: 1; min-width: 0; display: flex; gap: 4px; padding: 4px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow-x: auto; scrollbar-width: none; }
.cr-tabs::-webkit-scrollbar { display: none; }
.cr .cr-tab { flex: 0 0 auto; border: none; background: transparent; color: #6b7280; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 8px; cursor: pointer; white-space: nowrap; transition: background .15s, color .15s; }
.cr .cr-tab:hover { background: #f5f3ff; color: #7c3aed; }
.cr .cr-tab.on { background: #7c3aed; color: #fff; }
.cr .cr-fbtn { height: 42px; flex: none; }

/* segmented switch (tablet / mobile) */
.cr-seg { flex: none; display: none; gap: 4px; padding: 4px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
.cr .cr-seg button { flex: 1; border: none; background: transparent; color: #6b7280; font-size: 13px; font-weight: 600; padding: 7px 10px; border-radius: 8px; cursor: pointer; }
.cr .cr-seg button.on { background: #7c3aed; color: #fff; }

/* cards + filters */
.cr-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
.cr-fcard { flex: none; padding: 12px 16px; overflow: visible; }
.cr-fhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.cr-ftitle { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #282c36; }
.cr-ftitle svg { color: #7c3aed; }
.cr-count { background: #ede9fe; color: #7c3aed; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
.cr-fh-r { display: flex; align-items: center; gap: 6px; }
.cr .cr-clear { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: #7c3aed; font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
.cr .cr-clear:hover { background: #f5f3ff; }
.cr .cr-done { display: none; background: #7c3aed; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; padding: 6px 14px; cursor: pointer; }
.cr-fgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px 12px; }
.cr-lrow { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; min-height: 16px; }
.cr-label { font-size: 12px; font-weight: 500; color: #222c3d; }
.cr .cr-input, .cr .cr-select { width: 100%; height: 34px; padding: 0 12px; border: 1.5px solid #e5e7eb; border-radius: 8px;
  font-size: 13px; color: #111827; background-color: #fff; outline: none; font-family: inherit; }
.cr .cr-select { appearance: none; -webkit-appearance: none; padding-right: 30px; cursor: pointer;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat: no-repeat; background-position: right 10px center; }
.cr .cr-input:focus, .cr .cr-select:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124, 58, 237, .12); }
.cr .cr-select:disabled, .cr .cr-input:disabled { background-color: #f3f4f6; color: #9ca3af; cursor: not-allowed; }
.cr-warn { font-size: 11px; color: #dc2626; margin: 3px 0 0; }
.cr-backdrop { display: none; }

/* body: fills the remaining height, panels never grow past it */
.cr-body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(340px, .9fr) minmax(0, 2fr); grid-template-rows: minmax(0, 1fr); gap: 12px; }
.cr-pane { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.cr-chead { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 10px 14px; border-bottom: 1px solid #f3f4f6; }
.cr-ctitle { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; flex-wrap: wrap; min-width: 0; }
.cr-ctitle > svg { color: #7c3aed; }
.cr-badge { background: #ede9fe; color: #7c3aed; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 20px; white-space: nowrap; }
.cr-hint { font-size: 12px; color: #9ca3af; }
.cr-chip { display: inline-flex; align-items: center; gap: 6px; background: #ede9fe; color: #7c3aed; border-radius: 20px; padding: 2px 6px 2px 10px; font-size: 12px; font-weight: 600; max-width: 100%; }
.cr .cr-chip button { background: #7c3aed; color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; line-height: 18px; padding: 0; cursor: pointer; flex-shrink: 0; }
.cr-tools { display: flex; align-items: center; gap: 8px; }
.cr-tools .cr-select { width: auto; }
.cr-search { position: relative; }
.cr-search svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
.cr-search .cr-input { padding-left: 32px; width: 230px; }

/* tables */
.cr-sumscroll { flex: 1; min-height: 0; overflow: auto; }
.cr-tscroll { flex: 1; min-height: 0; overflow: hidden; }
.cr-table { width: 100%; border-collapse: collapse; }
.cr-table th { padding: 0 12px; height: 36px; font-size: 12px; font-weight: 600; color: #6b7280; background: #fafafa; border-bottom: 1px solid #f3f4f6; white-space: nowrap; position: sticky; top: 0; z-index: 1; }
.cr-table td { padding: 8px 12px; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
.cr-srow { cursor: pointer; }
.cr-srow:hover td { background: #faf5ff; }
.cr-srow.sel td { background: #ede9fe; }
.cr-srow.parent td { background: #faf8ff; font-weight: 700; }
.cr-srow.sel.parent td { background: #ede9fe; }
.cr-lab { font-weight: 500; color: #111827; }
.cr-srow.parent .cr-lab { font-weight: 700; }
.cr-mini { height: 4px; border-radius: 99px; background: #fecaca; margin-top: 5px; overflow: hidden; min-width: 60px; }
.cr-mini > span { display: block; height: 100%; background: #16a34a; }
.cr-total td { position: sticky; bottom: 0; background: #f5f3ff; font-weight: 700; color: #111827; border-top: 1px solid #ede9fe; }
.cr .g { color: #16a34a; font-weight: 600; }
.cr .r { color: #dc2626; font-weight: 600; }
.cr .bl { color: #2563eb; font-weight: 600; }
.cr .pk { color: #db2777; font-weight: 600; }

/* children table (5 columns, fixed layout → no horizontal scroll) */
.cr-details { table-layout: fixed; }
.cr-details td { padding: 0 12px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.cr-drow { cursor: pointer; }
.cr-drow:nth-child(even) td { background: #fafafa; }
.cr-drow:hover td, .cr-drow:focus-visible td { background: #faf5ff; outline: none; }
.cr-details .c-gen { width: 110px; }
.cr-details .c-age { width: 70px; }
.cr-details .c-mob { width: 170px; }
.cr-details .c-plc { width: 26%; }
.cr-details .c-date { width: 120px; }
.cr-name { display: flex; align-items: center; gap: 10px; font-weight: 500; color: #111827; min-width: 0; }
.cr-nm { display: flex; flex-direction: column; min-width: 0; }
.cr-nm .t, .cr-ic .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.cr-place-m { display: none; font-size: 11px; font-weight: 400; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cr-av { width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.cr-ic { display: flex; align-items: center; gap: 6px; min-width: 0; }
.cr-ic svg { color: #7c3aed; flex-shrink: 0; }
.cr-pill { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.cr-pill.male { background: #eff6ff; color: #2563eb; }
.cr-pill.female { background: #fdf2f8; color: #db2777; }
.cr-pill.unk { background: #f3f4f6; color: #6b7280; }
.cr-status { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.cr-status::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.cr-status.present { background: #f0fdf4; color: #16a34a; }
.cr-status.absent { background: #fef2f2; color: #dc2626; }
.cr-muted { color: #9ca3af; }

/* pagination */
.cr-pag { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 14px; border-top: 1px solid #f3f4f6; }
.cr-showing { font-size: 12.5px; color: #6b7280; white-space: nowrap; }
.cr-pages { display: flex; align-items: center; gap: 5px; }
.cr .cr-pg { min-width: 30px; height: 30px; padding: 0 8px; border-radius: 6px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-size: 13px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.cr .cr-pg:hover:not(:disabled):not(.on) { border-color: #c4b5fd; color: #7c3aed; }
.cr .cr-pg.on { background: #7c3aed; border-color: #7c3aed; color: #fff; font-weight: 600; }
.cr .cr-pg.nav { border-color: transparent; background: transparent; }
.cr .cr-pg:disabled { opacity: .35; cursor: default; }
.cr-dots { width: 20px; text-align: center; color: #9ca3af; font-size: 13px; }
.cr-pageof { display: none; font-size: 12.5px; color: #374151; font-weight: 600; min-width: 48px; text-align: center; }

/* states */
.cr-empty { padding: 40px 20px; text-align: center; color: #9ca3af; font-size: 14px; }
.cr-empty * { text-align: center; }
.cr-spin { width: 24px; height: 24px; border: 3px solid #ede9fe; border-top-color: #7c3aed; border-radius: 50%; animation: cr-rot .8s linear infinite; margin: 0 auto 12px; }
@keyframes cr-rot { to { transform: rotate(360deg); } }

/* child popup (card layout) */
.cr-modal-bg { position: fixed; inset: 0; background: rgba(17, 24, 39, .5); z-index: 400; display: flex; align-items: center; justify-content: center; padding: 16px; }
.cr-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 860px; max-height: 92vh; max-height: 92dvh; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0, 0, 0, .25); overflow: hidden; }
.cr-mhead { flex: none; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 18px 24px; border-bottom: 1px solid #e5e7eb; }
.cr-mname { font-size: 18px; font-weight: 700; margin: 0; color: #111827; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.cr-mb { display: inline-flex; align-items: center; padding: 2px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 11px; font-weight: 600; color: #374151; background: #fff; white-space: nowrap; }
.cr-mb.gen { border-color: #2563eb; color: #2563eb; }
.cr-mb.ok { background: #dcfce7; border-color: #bbf7d0; color: #15803d; }
.cr-mb.no { background: #fee2e2; border-color: #fecaca; color: #b91c1c; }
.cr .cr-mclose { margin-left: auto; width: 32px; height: 32px; border-radius: 50%; border: none; background: transparent; color: #374151; font-size: 16px; cursor: pointer; flex-shrink: 0; }
.cr .cr-mclose:hover { background: #f3f4f6; }
.cr-mbody { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 16px 24px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-content: start; }
.cr-dc { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; min-width: 0; }
.cr .cr-dch { text-align: center; padding: 10px; font-size: 12px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #374151; border-bottom: 1px solid #e5e7eb; }
.cr-dcb { padding: 8px 0 10px; }
.cr-kv { display: grid; grid-template-columns: 112px 14px minmax(0, 1fr); align-items: baseline; padding: 5px 18px; font-size: 13px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.cr-k { color: #6b7280; }
.cr-c { color: #6b7280; }
.cr-v { color: #111827; font-weight: 600; word-break: break-word; }
.cr .cr-tel { color: #2563eb; text-decoration: none; font-weight: 600; }
.cr .cr-tel:hover { text-decoration: underline; }
.cr-mfoot { flex: none; display: flex; justify-content: flex-end; padding: 12px 24px; border-top: 1px solid #e5e7eb; }
.cr .cr-mfbtn { background: #fff; color: #111827; border: 1.5px solid #d1d5db; border-radius: 8px; padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
.cr .cr-mfbtn:hover { background: #f9fafb; }

/* ── tablet & below: one panel at a time ── */
@media (max-width: 1100px) {
  .cr-seg { display: flex; }
  .cr-body { grid-template-columns: minmax(0, 1fr); }
  .cr-pane.off { display: none; }
  .cr-hint { display: none; }
}

/* ── mobile ── */
@media (max-width: 600px) {
  .cr-wrap { padding: 8px 10px; gap: 8px; }
  .cr-sub, .cr-bt { display: none; }
  .cr-ico { width: 32px; height: 32px; }
  .cr-title { font-size: 17px; }
  .cr .cr-btn { padding: 0 11px; }
  .cr .cr-input, .cr .cr-select { font-size: 16px; }

  .cr-stats { gap: 6px; }
  .cr-stat { padding: 6px 8px; }
  .cr-stat-ico, .cr-stat-note { display: none; }
  .cr-stat-label { font-size: 11px; }
  .cr-stat-val { font-size: 17px; }

  .cr .cr-tab { padding: 6px 11px; font-size: 12.5px; }
  .cr .cr-fbtn { height: 40px; padding: 0 11px; }

  /* filters become a bottom sheet */
  .cr-backdrop { display: block; position: fixed; inset: 0; background: rgba(17, 24, 39, .45); z-index: 250; }
  .cr-fcard { position: fixed; left: 0; right: 0; bottom: 0; z-index: 300; max-height: 82vh; max-height: 82dvh; overflow: auto;
    border-radius: 16px 16px 0 0; border: none; padding: 14px 14px 20px; }
  .cr-fgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .cr .cr-done { display: inline-block; }

  .cr-chead { padding: 8px 10px; gap: 8px; }
  .cr-tools { width: 100%; }
  .cr-search { flex: 1; min-width: 0; }
  .cr-search .cr-input { width: 100%; }
  .cr-tools .cr-select { max-width: 130px; }

  .cr-table th, .cr-table td { padding-left: 8px; padding-right: 8px; font-size: 12px; }
  .cr-mini { display: none; }

  /* children table: name + place share a cell */
  .cr-details .c-gen { width: 64px; }
  .cr-details .c-age { width: 40px; }
  .cr-details .c-mob { width: 104px; }
  .cr-details .hide-m { display: none; }
  .cr-details td { padding-left: 8px; padding-right: 8px; }
  .cr-details .cr-av, .cr-details .cr-ic svg { display: none; }
  .cr-details .cr-pill { padding: 2px 7px; font-size: 11px; }
  .cr-place-m { display: block; }

  .cr-showing { font-size: 12px; }
  .cr-pag { padding: 6px 10px; }
  .cr-pg.num, .cr-dots { display: none; }
  .cr-pageof { display: inline-block; }

  /* popup becomes a bottom sheet */
  .cr-modal-bg { align-items: flex-end; padding: 0; }
  .cr-modal { max-width: none; border-radius: 16px 16px 0 0; max-height: 90vh; max-height: 90dvh; }
  .cr-mhead { padding: 14px 16px; }
  .cr-mbody { grid-template-columns: minmax(0, 1fr); padding: 12px 14px; gap: 12px; }
  .cr-kv { grid-template-columns: 96px 12px minmax(0, 1fr); padding: 4px 14px; }
  .cr-mfoot { padding: 10px 16px; }
  .cr .cr-mfbtn { width: 100% !important; }
}
`;

// ─── Main Component ─────────────────────────────────────────────────────
export default function ChildReports() {
  const [kids, setKids] = useState<Child[]>([]);
  const [presentByDate, setPresentByDate] = useState<
    Record<string, Record<string, PresentInfo>>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [weeks, setWeeks] = useState(1); // today + yesterday + last N Sundays (default view)
  const loadedDates = useRef<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<TabKey>("age");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(SORTS[0]);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<"summary" | "details">("summary"); // tablet / mobile only
  const [openRec, setOpenRec] = useState<AttendanceRecord | null>(null);

  const isStacked = useMedia("(max-width: 1100px)");
  const isMobile = useMedia("(max-width: 600px)");
  const rowH = isMobile ? 54 : 44;
  const [tableRef, perPage] = useFitRows(rowH, 36);

  const reload = () => {
    clearCaches();
    loadedDates.current = new Set();
    setPresentByDate({});
    setReloadKey((k) => k + 1);
  };

  // close popup on Esc
  useEffect(() => {
    if (!openRec) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenRec(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openRec]);

  // ─── Load children + present lists for the dates the filters need ───
  const { date: fDate, month: fMonth, year: fYear, week: fWeek } = filters;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const kidList = await getKids();
        if (cancelled) return;
        setKids(kidList);

        const missing = datesNeeded(fDate, fMonth, fYear, fWeek, weeks).filter(
          (d) => !loadedDates.current.has(d),
        );
        if (missing.length === 0) {
          setLoading(false);
          return;
        }
        setLoading(true);

        const fetched: Record<string, Record<string, PresentInfo>> = {};
        let failed = 0;
        const BATCH = 6;
        for (let i = 0; i < missing.length; i += BATCH) {
          const slice = missing.slice(i, i + BATCH);
          const results = await Promise.allSettled(
            slice.map((d) => getPresent(d)),
          );
          if (cancelled) return;
          results.forEach((r, j) => {
            if (r.status === "fulfilled") fetched[slice[j]] = r.value;
            else failed += 1;
          });
        }
        Object.keys(fetched).forEach((d) => loadedDates.current.add(d));
        setPresentByDate((prev) => ({ ...prev, ...fetched }));
        setError(
          failed === missing.length
            ? "Could not load attendance from the server."
            : "",
        );
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setKids([]);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load the report data.",
        );
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fDate, fMonth, fYear, fWeek, weeks, reloadKey]);

  // ─── One record per child per session date ─────────────────────────
  const records = useMemo<AttendanceRecord[]>(() => {
    const dates = Object.keys(presentByDate)
      .filter((d) => Object.keys(presentByDate[d]).length > 0)
      .sort();

    return dates.flatMap((date) =>
      kids.flatMap((c) => {
        const info = presentByDate[date][c.id];
        const isPresent = info !== undefined;
        if (!isPresent && c.createdDate && c.createdDate > date) return [];
        return [
          {
            ...c,
            recordId: `${c.id}-${date}`,
            date,
            status: isPresent ? ("Present" as const) : ("Absent" as const),
            checkInTime: isPresent ? info.inTime : "",
            checkOutTime: isPresent ? info.outTime : "",
          },
        ];
      }),
    );
  }, [kids, presentByDate]);

  const latestDate = records.reduce((m, r) => (r.date > m ? r.date : m), "");

  const updateFilter = (patch: Partial<Filters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      if (patch.date) {
        next.month = "";
        next.year = "";
        next.week = "";
      }
      if (next.week) {
        const r = getRefMonth(next);
        if (Number(next.week) > getSundays(r.year, r.month0).length)
          next.week = "";
      }
      return next;
    });
    setSelectedGroup(null);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ ...emptyFilters });
    setSelectedGroup(null);
    setSearch("");
    setPage(1);
  };

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    setSelectedGroup(null);
    setPage(1);
  };

  const isNotSunday =
    !!filters.date && new Date(`${filters.date}T00:00:00`).getDay() !== 0;
  const hasData =
    !!filters.date &&
    !!presentByDate[filters.date] &&
    Object.keys(presentByDate[filters.date]).length > 0;

  const tabMeta = TABS.find((t) => t.key === activeTab)!;

  // district name + number of children in it (for the filter dropdown)
  const districtCount = new Map<string, number>();
  kids.forEach((k) =>
    districtCount.set(k.district, (districtCount.get(k.district) ?? 0) + 1),
  );
  const districts = Array.from(districtCount.keys()).sort();

  const religions = uniqueSorted(kids.map((r) => r.religion));
  const years = uniqueSorted([
    ...records.map((r) => r.date.slice(0, 4)),
    String(new Date().getFullYear()),
  ]);

  const ref = getRefMonth(filters);
  const sundays = getSundays(ref.year, ref.month0);

  // ─── Filtering ──────────────────────────────────────────────────────
  const filtered = records.filter((r) => {
    if (filters.date && r.date !== filters.date) return false;
    if (filters.month && r.date.slice(5, 7) !== filters.month) return false;
    if (filters.year && r.date.slice(0, 4) !== filters.year) return false;
    if (
      filters.week &&
      Math.ceil(Number(r.date.slice(8, 10)) / 7) !== Number(filters.week)
    )
      return false;
    if (filters.district && r.district !== filters.district) return false;
    if (filters.religion && r.religion !== filters.religion) return false;
    if (filters.gender && r.gender !== filters.gender) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.ageMin && r.age < Number(filters.ageMin)) return false;
    if (filters.ageMax && r.age > Number(filters.ageMax)) return false;
    if (activeTab === "time" && (filters.timeFrom || filters.timeTo)) {
      if (!r.checkInTime) return false;
      if (filters.timeFrom && r.checkInTime < filters.timeFrom) return false;
      if (filters.timeTo && r.checkInTime > filters.timeTo) return false;
    }
    return true;
  });

  const activeFilterCount =
    Object.values(filters).filter((v) => v).length + (search ? 1 : 0);

  // ─── Summary (every tab is split date-wise) ─────────────────────────
  const isStatusTab = activeTab === "status";
  const isMonthTab = activeTab === "month";
  const isDateTab = activeTab === "date";

  // header of the first summary column
  const firstColHeader = isStatusTab
    ? "Date / Status / Age"
    : isDateTab || isMonthTab
      ? tabMeta.groupHeader
      : `Date / ${tabMeta.groupHeader}`;

  type KidFlag = { present: boolean; gender: string };
  const addKid = (map: Map<string, KidFlag>, r: AttendanceRecord) => {
    const prev = map.get(r.id);
    map.set(r.id, {
      present: (prev?.present ?? false) || r.status === "Present",
      gender: r.gender,
    });
  };
  const countKids = (set: Map<string, KidFlag>) => {
    let present = 0;
    let male = 0;
    let female = 0;
    set.forEach((k) => {
      if (k.present) present += 1;
      if (k.gender === "Male") male += 1;
      else if (k.gender === "Female") female += 1;
    });
    return {
      present,
      absent: set.size - present,
      male,
      female,
      total: set.size,
    };
  };

  const groupKids = new Map<
    string,
    { g: SumGroup; kids: Map<string, KidFlag> }
  >();
  const bump = (g: SumGroup, r: AttendanceRecord) => {
    const entry = groupKids.get(g.key) ?? {
      g,
      kids: new Map<string, KidFlag>(),
    };
    addKid(entry.kids, r);
    groupKids.set(g.key, entry);
  };

  filtered.forEach((r) => {
    const date = r.date;
    const dLabel = formatDate(date);
    // date header row (level 0)
    const dateRow = (ord = "0"): SumGroup => ({
      key: `d:${date}`,
      label: dLabel,
      chip: dLabel,
      date,
      ord,
      level: 0,
      match: (x) => x.date === date,
    });

    if (isDateTab) {
      bump(dateRow(), r);
    } else if (isMonthTab) {
      // month total, then every session date of that month under it
      const m = date.slice(0, 7);
      const [y, mm] = m.split("-");
      const monthLabel = `${MONTH_FULL[Number(mm) - 1]} ${y}`;
      bump(
        {
          key: `m:${m}`,
          label: `${monthLabel} – Total`,
          chip: monthLabel,
          date: m,
          ord: "0",
          level: 0,
          match: (x) => x.date.slice(0, 7) === m,
        },
        r,
      );
      const inv = 99999999 - Number(date.replace(/-/g, "")); // latest date first
      bump({ ...dateRow(`1-${inv}`), date: m, level: 1 }, r);
    } else if (isStatusTab) {
      // date → Present / Absent → age
      const sc = r.status === "Present" ? "0" : "1";
      bump(dateRow(), r);
      bump(
        {
          key: `s:${date}:${r.status}`,
          label: r.status,
          chip: `${dLabel} · ${r.status}`,
          date,
          ord: `1-${sc}`,
          level: 1,
          match: (x) => x.date === date && x.status === r.status,
        },
        r,
      );
      bump(
        {
          key: `a:${date}:${r.status}:${r.age}`,
          label: `${r.age} years`,
          chip: `${dLabel} · ${r.status} · ${r.age} years`,
          date,
          ord: `1-${sc}-${String(r.age).padStart(3, "0")}`,
          level: 2,
          match: (x) =>
            x.date === date && x.status === r.status && x.age === r.age,
        },
        r,
      );
    } else {
      // age / district / religion / time: date → group
      const g = getGroup(activeTab, r);
      bump(dateRow(), r);
      bump(
        {
          key: `g:${date}:${g.key}`,
          label: g.label,
          chip: `${dLabel} · ${g.label}`,
          date,
          ord: `1-${sortStr(g.sort)}`,
          level: 1,
          match: (x) => x.date === date && getGroup(activeTab, x).key === g.key,
        },
        r,
      );
    }
  });

  const summaryRows: SummaryRow[] = Array.from(groupKids.values())
    .map(({ g, kids: set }) => ({ ...g, ...countKids(set) }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.ord.localeCompare(b.ord));

  const allKids = new Map<string, KidFlag>();
  filtered.forEach((r) => addKid(allKids, r));
  const totals = countKids(allKids);
  const totalPresent = totals.present;
  const totalAbsent = totals.absent;
  const totalMale = totals.male;
  const totalFemale = totals.female;
  const childCount = totals.total;
  const attendancePct = childCount
    ? Math.round((totalPresent / childCount) * 100)
    : 0;
  const sessionCount = new Set(filtered.map((r) => r.date)).size;
  const isDefaultRange = !fDate && !fMonth && !fYear && !fWeek;
  const multiDates = sessionCount > 1; // show a Date column when several sessions are listed

  // ─── Details (row click → search → sort → page) ─────────────────────
  const selectedRow = summaryRows.find((g) => g.key === selectedGroup);
  const q = search.trim().toLowerCase();
  const details = sortRecords(
    filtered.filter(
      (r) =>
        (!selectedRow || selectedRow.match(r)) &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          r.mobile.includes(q) ||
          r.district.toLowerCase().includes(q)),
    ),
    sortBy,
  );
  const selectedLabel = selectedRow?.chip;

  const totalPages = Math.max(1, Math.ceil(details.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const pageRows = details.slice(startIdx, startIdx + perPage);

  // popup: this child's attendance over the loaded sessions
  const childHistory = openRec
    ? records.filter((x) => x.id === openRec.id)
    : [];
  const childPresent = childHistory.filter(
    (x) => x.status === "Present",
  ).length;

  // ─── Excel export ───────────────────────────────────────────────────
  const handleDownload = () => {
    const summarySheetRows = [
      ...summaryRows.map((g) => ({
        [firstColHeader]: `${"   ".repeat(g.level)}${g.label}`,
        ...(isStatusTab ? {} : { Present: g.present, Absent: g.absent }),
        Male: g.male,
        Female: g.female,
        Total: g.total,
      })),
      {
        [firstColHeader]: "Total",
        ...(isStatusTab ? {} : { Present: totalPresent, Absent: totalAbsent }),
        Male: totalMale,
        Female: totalFemale,
        Total: childCount,
      },
    ];

    const detailSheetRows = details.map((r, idx) => ({
      "SL No": idx + 1,
      Name: r.name,
      Gender: r.gender,
      Age: r.age,
      Standard: r.standard,
      Mobile: r.mobile,
      District: r.district,
      City: r.city,
      Religion: r.religion,
      Date: formatDate(r.date),
      Status: r.status,
      "Check-in Time": r.checkInTime ? formatTime(r.checkInTime) : "",
      "Check-out Time": r.checkOutTime ? formatTime(r.checkOutTime) : "",
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(summarySheetRows),
      "Summary",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(detailSheetRows),
      "Details",
    );

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `${tabMeta.label.replace(/[\s/]+/g, "_")}_Report_${today}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="cr">
      <style>{pageCss}</style>
      <div className="cr-top">
        <Header />
      </div>

      <div className="cr-wrap">
        {/* Page header */}
        <div className="cr-head">
          <div className="cr-head-l">
            <div className="cr-ico">
              <ChartIcon size={20} />
            </div>
            <div>
              <p className="cr-title">Children Reports</p>
            </div>
          </div>
          <div className="cr-actions">
            <button
              type="button"
              className="cr-btn cr-btn-primary"
              onClick={handleDownload}
              disabled={filtered.length === 0}
              title="Download Excel"
              aria-label="Download Excel"
            >
              <DownloadIcon /> <span className="cr-bt">Download Excel</span>
            </button>
            <button
              type="button"
              className="cr-btn cr-btn-light"
              onClick={reload}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshIcon />{" "}
              <span className="cr-bt">
                {loading ? "Loading..." : "Refresh"}
              </span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="cr-stats">
          <div className="cr-stat">
            <div
              className="cr-stat-ico"
              style={{ background: "#ede9fe", color: "#7c3aed" }}
            >
              <UsersIcon />
            </div>
            <div className="cr-stat-body">
              <p className="cr-stat-label">Total</p>
              <p className="cr-stat-val">{childCount}</p>
              <p className="cr-stat-note">
                children · {sessionCount} session{sessionCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="cr-stat">
            <div
              className="cr-stat-ico"
              style={{ background: "#f0fdf4", color: "#16a34a" }}
            >
              <CheckCircleIcon />
            </div>
            <div className="cr-stat-body">
              <p className="cr-stat-label">Present</p>
              <p className="cr-stat-val" style={{ color: "#16a34a" }}>
                {totalPresent}
              </p>
              <p className="cr-stat-note">
                {sessionCount > 1 ? "At least once" : "Checked in"}
              </p>
            </div>
          </div>
          <div className="cr-stat">
            <div
              className="cr-stat-ico"
              style={{ background: "#fef2f2", color: "#dc2626" }}
            >
              <XCircleIcon />
            </div>
            <div className="cr-stat-body">
              <p className="cr-stat-label">Absent</p>
              <p className="cr-stat-val" style={{ color: "#dc2626" }}>
                {totalAbsent}
              </p>
              <p className="cr-stat-note">
                {sessionCount > 1 ? "Never in range" : "Not attended"}
              </p>
            </div>
          </div>
          <div className="cr-stat">
            <div
              className="cr-stat-ico"
              style={{ background: "#ede9fe", color: "#7c3aed" }}
            >
              <TrendIcon />
            </div>
            <div className="cr-stat-body">
              <p className="cr-stat-label">Attendance</p>
              <p className="cr-stat-val" style={{ color: "#7c3aed" }}>
                {attendancePct}%
              </p>
              <div className="cr-bar">
                <span style={{ width: `${attendancePct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="cr-error">
            <span>{error}</span>
            <button type="button" className="cr-link" onClick={reload}>
              Retry
            </button>
          </div>
        )}

        {!loading && (sessionCount > 1 || isDefaultRange) && (
          <div className="cr-info">
            <span>
              Showing {sessionCount} session date{sessionCount === 1 ? "" : "s"}
              {isDefaultRange
                ? ` (today, yesterday + last ${weeks} Sunday${weeks === 1 ? "" : "s"})`
                : ""}{" "}
              – each date is listed separately; the Total row counts each child
              once.
            </span>
            <div style={{ display: "flex", gap: 14, flexShrink: 0 }}>
              {isDefaultRange && weeks < 260 && (
                <button
                  type="button"
                  className="cr-link"
                  onClick={() => setWeeks((w) => w + 4)}
                >
                  Load older
                </button>
              )}
              {latestDate && (
                <button
                  type="button"
                  className="cr-link"
                  onClick={() => updateFilter({ date: latestDate })}
                >
                  Latest day only
                </button>
              )}
            </div>
          </div>
        )}

        {/* View tabs + filter toggle */}
        <div className="cr-bar2">
          <div className="cr-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`cr-tab${activeTab === t.key ? " on" : ""}`}
                onClick={() => switchTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`cr-btn cr-btn-light cr-fbtn${showFilters ? " on" : ""}`}
            onClick={() => setShowFilters((s) => !s)}
          >
            <FilterIcon /> Filters
            {activeFilterCount > 0 && (
              <span className="cr-count">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Filters (inline on desktop, bottom sheet on mobile) */}
        {showFilters && (
          <div className="cr-backdrop" onClick={() => setShowFilters(false)} />
        )}
        {showFilters && (
          <div className="cr-card cr-fcard">
            <div className="cr-fhead">
              <div className="cr-ftitle">
                <FilterIcon /> Filters
                {activeFilterCount > 0 && (
                  <span className="cr-count">{activeFilterCount} active</span>
                )}
              </div>
              <div className="cr-fh-r">
                <button
                  type="button"
                  className="cr-clear"
                  onClick={clearFilters}
                >
                  <ResetIcon /> Clear
                </button>
                <button
                  type="button"
                  className="cr-done"
                  onClick={() => setShowFilters(false)}
                >
                  Done
                </button>
              </div>
            </div>

            <div className="cr-fgrid">
              <div>
                <div className="cr-lrow">
                  <label className="cr-label">Date</label>
                  {filters.date && (
                    <button
                      type="button"
                      className="cr-link"
                      onClick={() => updateFilter({ date: "" })}
                    >
                      All dates
                    </button>
                  )}
                </div>
                <input
                  className="cr-input"
                  type="date"
                  value={filters.date}
                  onChange={(e) => updateFilter({ date: e.target.value })}
                />
                {isNotSunday && !hasData && !loading && (
                  <p className="cr-warn">Meetings are held on Sundays only</p>
                )}
              </div>
              <div>
                <div className="cr-lrow">
                  <label className="cr-label">Month</label>
                </div>
                <select
                  className="cr-select"
                  disabled={!!filters.date}
                  value={filters.month}
                  onChange={(e) => updateFilter({ month: e.target.value })}
                >
                  <option value="">All Months</option>
                  {MONTH_FULL.map((m, i) => (
                    <option key={m} value={pad(i + 1)}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="cr-lrow">
                  <label className="cr-label">Year</label>
                </div>
                <select
                  className="cr-select"
                  disabled={!!filters.date}
                  value={filters.year}
                  onChange={(e) => updateFilter({ year: e.target.value })}
                >
                  <option value="">All Years</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="cr-lrow">
                  <label className="cr-label">Week (Sunday)</label>
                </div>
                <select
                  className="cr-select"
                  disabled={!!filters.date}
                  value={filters.week}
                  onChange={(e) => updateFilter({ week: e.target.value })}
                >
                  <option value="">All Weeks</option>
                  {sundays.map((d, i) => (
                    <option key={d} value={String(i + 1)}>
                      {WEEK_NAMES[i]} Week
                      {filters.month
                        ? ` · ${pad(d)} ${MONTHS[ref.month0]}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="cr-lrow">
                  <label className="cr-label">District</label>
                </div>
                <select
                  className="cr-select"
                  value={filters.district}
                  onChange={(e) => updateFilter({ district: e.target.value })}
                >
                  <option value="">All ({kids.length})</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d} ({districtCount.get(d)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="cr-lrow">
                  <label className="cr-label">Religion</label>
                </div>
                <select
                  className="cr-select"
                  value={filters.religion}
                  onChange={(e) => updateFilter({ religion: e.target.value })}
                >
                  <option value="">All</option>
                  {religions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="cr-lrow">
                  <label className="cr-label">Gender</label>
                </div>
                <select
                  className="cr-select"
                  value={filters.gender}
                  onChange={(e) => updateFilter({ gender: e.target.value })}
                >
                  <option value="">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <div className="cr-lrow">
                  <label className="cr-label">Status</label>
                </div>
                <select
                  className="cr-select"
                  value={filters.status}
                  onChange={(e) => updateFilter({ status: e.target.value })}
                >
                  <option value="">All</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
              <div>
                <div className="cr-lrow">
                  <label className="cr-label">Age From</label>
                </div>
                <input
                  className="cr-input"
                  type="number"
                  min={1}
                  placeholder="Min"
                  value={filters.ageMin}
                  onChange={(e) => updateFilter({ ageMin: e.target.value })}
                />
              </div>
              <div>
                <div className="cr-lrow">
                  <label className="cr-label">Age To</label>
                </div>
                <input
                  className="cr-input"
                  type="number"
                  min={1}
                  placeholder="Max"
                  value={filters.ageMax}
                  onChange={(e) => updateFilter({ ageMax: e.target.value })}
                />
              </div>
              {activeTab === "time" && (
                <>
                  <div>
                    <div className="cr-lrow">
                      <label className="cr-label">Check-in From</label>
                    </div>
                    <input
                      className="cr-input"
                      type="time"
                      value={filters.timeFrom}
                      onChange={(e) =>
                        updateFilter({ timeFrom: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <div className="cr-lrow">
                      <label className="cr-label">Check-in To</label>
                    </div>
                    <input
                      className="cr-input"
                      type="time"
                      value={filters.timeTo}
                      onChange={(e) => updateFilter({ timeTo: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Summary / Children switch (tablet & mobile) */}
        <div className="cr-seg">
          <button
            type="button"
            className={view === "summary" ? "on" : ""}
            onClick={() => setView("summary")}
          >
            Summary
          </button>
          <button
            type="button"
            className={view === "details" ? "on" : ""}
            onClick={() => setView("details")}
          >
            Children ({details.length})
          </button>
        </div>

        <div className="cr-body">
          {/* Summary */}
          <div className={`cr-card cr-pane${view === "summary" ? "" : " off"}`}>
            <div className="cr-chead">
              <div className="cr-ctitle">
                <TableIcon />
                {tabMeta.label} Summary
              </div>
              <span className="cr-hint">Click a row to filter</span>
            </div>
            <div className="cr-sumscroll">
              {loading ? (
                <div className="cr-empty">
                  <div className="cr-spin" />
                  Loading report...
                </div>
              ) : summaryRows.length === 0 ? (
                <div className="cr-empty">
                  No data for the selected filters.
                </div>
              ) : (
                <table className="cr-table">
                  <thead>
                    <tr>
                      <th>{firstColHeader}</th>
                      {!isStatusTab && <th>Present</th>}
                      {!isStatusTab && <th>Absent</th>}
                      <th>Male</th>
                      <th>Female</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((g) => {
                      const isSel = selectedGroup === g.key;
                      const isParent = g.level === 0 && !isDateTab;
                      const pct = g.total
                        ? Math.round((g.present / g.total) * 100)
                        : 0;
                      return (
                        <tr
                          key={g.key}
                          className={`cr-srow${isSel ? " sel" : ""}${isParent ? " parent" : ""}`}
                          onClick={() => {
                            setSelectedGroup(isSel ? null : g.key);
                            setPage(1);
                            if (!isSel && isStacked) setView("details");
                          }}
                        >
                          <td
                            style={{
                              paddingLeft:
                                g.level === 0 ? undefined : 12 + g.level * 16,
                            }}
                          >
                            <div className="cr-lab">{g.label}</div>
                            {!isStatusTab && (
                              <div className="cr-mini">
                                <span style={{ width: `${pct}%` }} />
                              </div>
                            )}
                          </td>
                          {!isStatusTab && <td className="g">{g.present}</td>}
                          {!isStatusTab && <td className="r">{g.absent}</td>}
                          <td className="bl">{g.male}</td>
                          <td className="pk">{g.female}</td>
                          <td style={{ fontWeight: 700 }}>{g.total}</td>
                        </tr>
                      );
                    })}
                    <tr className="cr-total">
                      <td>Total</td>
                      {!isStatusTab && <td>{totalPresent}</td>}
                      {!isStatusTab && <td>{totalAbsent}</td>}
                      <td>{totalMale}</td>
                      <td>{totalFemale}</td>
                      <td>{childCount}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Details */}
          <div className={`cr-card cr-pane${view === "details" ? "" : " off"}`}>
            <div className="cr-chead">
              <div className="cr-ctitle">
                <TableIcon />
                Children
                <span className="cr-badge">
                  {multiDates
                    ? `${new Set(details.map((r) => r.id)).size} children · ${details.length} records`
                    : details.length}
                </span>
                {selectedLabel && (
                  <span className="cr-chip">
                    {selectedLabel}
                    <button
                      type="button"
                      title="Clear selection"
                      onClick={() => {
                        setSelectedGroup(null);
                        setPage(1);
                      }}
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
              <div className="cr-tools">
                <div className="cr-search">
                  <SearchIcon />
                  <input
                    className="cr-input"
                    type="text"
                    placeholder="Search name, mobile, place..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <select
                  className="cr-select"
                  value={sortBy}
                  title="Sort by"
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                >
                  {SORTS.map((o) => (
                    <option key={o} value={o}>
                      Sort: {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="cr-tscroll" ref={tableRef}>
              {loading ? (
                <div className="cr-empty">
                  <div className="cr-spin" />
                  Loading children...
                </div>
              ) : pageRows.length === 0 ? (
                <div className="cr-empty">No children found.</div>
              ) : (
                <table className="cr-table cr-details">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th className="c-gen">Gender</th>
                      <th className="c-age">Age</th>
                      <th className="c-mob">Mobile</th>
                      <th className="c-plc hide-m">Place</th>
                      {multiDates && <th className="c-date hide-m">Date</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => {
                      const [bg, fg] = avatarFor(r.name);
                      return (
                        <tr
                          key={r.recordId}
                          className="cr-drow"
                          style={{ height: rowH }}
                          tabIndex={0}
                          onClick={() => setOpenRec(r)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setOpenRec(r);
                          }}
                        >
                          <td>
                            <div className="cr-name">
                              <span
                                className="cr-av"
                                style={{ background: bg, color: fg }}
                              >
                                {initials(r.name)}
                              </span>
                              <span className="cr-nm">
                                <span className="t">{r.name}</span>
                                <span className="cr-place-m">
                                  {r.district}
                                  {multiDates ? ` · ${formatDate(r.date)}` : ""}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`cr-pill ${genderClass(r.gender)}`}
                            >
                              {r.gender}
                            </span>
                          </td>
                          <td>{r.age || "—"}</td>
                          <td>
                            <div className="cr-ic">
                              <PhoneIcon />
                              <span className="t">{r.mobile}</span>
                            </div>
                          </td>
                          <td className="hide-m">
                            <div className="cr-ic">
                              <PinIcon />
                              <span className="t">{r.district}</span>
                            </div>
                          </td>
                          {multiDates && (
                            <td className="hide-m">{formatDate(r.date)}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {!loading && details.length > 0 && (
              <div className="cr-pag">
                <span className="cr-showing">
                  {startIdx + 1}–{Math.min(startIdx + perPage, details.length)}{" "}
                  of {details.length}
                </span>
                <div className="cr-pages">
                  <button
                    type="button"
                    className="cr-pg nav"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                    aria-label="Previous page"
                  >
                    <ChevLeft />
                  </button>
                  {pageNumbers(currentPage, totalPages).map((p) =>
                    typeof p === "string" ? (
                      <span key={p} className="cr-dots">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        className={`cr-pg num${p === currentPage ? " on" : ""}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <span className="cr-pageof">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="cr-pg nav"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(currentPage + 1)}
                    aria-label="Next page"
                  >
                    <ChevRight />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full child info popup */}
      {openRec && (
        <div className="cr-modal-bg" onClick={() => setOpenRec(null)}>
          <div
            className="cr-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cr-mhead">
              <p className="cr-mname">Child Details — {openRec.name}</p>
              <span className="cr-mb gen">{openRec.gender}</span>
              <span
                className={`cr-mb ${openRec.status === "Present" ? "ok" : "no"}`}
              >
                {openRec.status}
              </span>
              <button
                type="button"
                className="cr-mclose"
                onClick={() => setOpenRec(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="cr-mbody">
              <Card title="Personal">
                <Row label="ID">{openRec.id}</Row>
                <Row label="Gender">{openRec.gender}</Row>
                <Row label="Age">{openRec.age || "—"}</Row>
                <Row label="Standard">{openRec.standard}</Row>
                <Row label="Religion">{openRec.religion}</Row>
                <Row label="Joined">
                  {openRec.createdDate ? formatDate(openRec.createdDate) : "—"}
                </Row>
              </Card>

              <Card title="Contact">
                <Row label="Self">
                  <Phone n={openRec.selfNo} />
                </Row>
                <Row label="Mother">
                  <Phone n={openRec.motherNo} />
                </Row>
                <Row label="Father">
                  <Phone n={openRec.fatherNo} />
                </Row>
                <Row label="Guardian">
                  <Phone n={openRec.guardianNo} />
                </Row>
              </Card>

              <Card title="Address">
                <Row label="Address 1">
                  <Val v={openRec.address1} />
                </Row>
                <Row label="Address 2">
                  <Val v={openRec.address2} />
                </Row>
                <Row label="City">
                  <Val v={openRec.city} />
                </Row>
                <Row label="State">
                  <Val v={openRec.state} />
                </Row>
              </Card>

              <Card title="Attendance">
                <Row label="Session">{formatDate(openRec.date)}</Row>
                <Row label="Status">{openRec.status}</Row>
                <Row label="Check-in">
                  {openRec.checkInTime ? formatTime(openRec.checkInTime) : "—"}
                </Row>
                <Row label="Check-out">
                  {openRec.checkOutTime
                    ? formatTime(openRec.checkOutTime)
                    : "—"}
                </Row>
                <Row label="Overall">
                  {childPresent} / {childHistory.length} present
                </Row>
              </Card>
            </div>

            <div className="cr-mfoot">
              <button
                type="button"
                className="cr-mfbtn"
                onClick={() => setOpenRec(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
