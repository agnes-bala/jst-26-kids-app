import { useState, useEffect } from "react";
// import type { CSSProperties } from "react";
import Header from "../components/Header";

// ─── API ────────────────────────────────────────────────────────────────
const API_BASE_URL = "/api";
const STAFF_ALL_URL = `${API_BASE_URL}/staff/all`;
const STAFF_ADD_URL = `${API_BASE_URL}/staff/add`;
const STAFF_UPDATE_URL = `${API_BASE_URL}/staff/update`;
const STAFF_CHECKIN_URL = `${API_BASE_URL}/staff/checkin`;
const STAFF_BY_STAFF_URL = `${API_BASE_URL}/staff/by-staff`;
const STAFF_BY_DATE_URL = `${API_BASE_URL}/staff/by-date`;
const STAFF_RANGE_URL = `${API_BASE_URL}/staff/range`;

// ─── Types ──────────────────────────────────────────────────────────────
interface ApiStaff {
  id?: string | number;
  staffId?: string;
  staffName?: string;
  name?: string;
  department?: string;
  dept?: string;
  staffDpt?: string;
  mobile?: string;
  staffMobile?: string;
  role?: string;
  staffRole?: string;
}

interface Staff {
  key: string;
  staffId: string;
  name: string;
  dept: string;
  mobile: string;
  role: string;
}

interface FormState {
  staffId: string;
  name: string;
  dept: string;
  mobile: string;
  role: string;
}

interface ApiAttendance {
  id?: string | number;
  staffId?: string;
  staffName?: string;
  date?: string;
  attendanceDate?: string;
  checkIn?: string;
  checkOut?: string;
  inTime?: string | null;
  outTime?: string | null;
  status?: string;
}

interface AttRow {
  key: string;
  staffId: string;
  staffName: string;
  date: string;
  inTime: string;
  outTime: string;
  status: string;
}

type Tab = "list" | "attendance";
type AttTab = "all" | "checkedIn" | "checkedOut" | "absent";
type Notice = { type: "error" | "success"; text: string } | null;
type AttMode = "today" | "date" | "staff" | "range";

// ─── Constants ──────────────────────────────────────────────────────────
const emptyForm: FormState = {
  staffId: "",
  name: "",
  dept: "",
  mobile: "",
  role: "",
};
const ROLES = ["Teacher", "Coordinator", "Volunteer", "Admin", "Helper"];
const PAGE_SIZE_OPTIONS = [5, 10, 20];

// ─── Helpers ────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const formatTime = (hhmmss: string) => {
  if (!hhmmss) return "—";
  const [h, m] = hhmmss.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${pad(m)} ${suffix}`;
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const formatDate = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
};

const toArray = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  const obj = data as { content?: T[]; data?: T[] } | null;
  return obj?.content ?? obj?.data ?? [];
};

const toStaff = (a: ApiStaff): Staff => ({
  key: String(a.id ?? a.staffId ?? ""),
  staffId: a.staffId ?? "",
  name: a.staffName ?? a.name ?? "",
  dept: a.department ?? a.dept ?? a.staffDpt ?? "",
  mobile: a.mobile ?? a.staffMobile ?? "",
  role: a.role ?? a.staffRole ?? "",
});

const toAtt = (a: ApiAttendance): AttRow => ({
  key: String(a.id ?? `${a.staffId ?? ""}-${a.date ?? a.attendanceDate ?? ""}`),
  staffId: a.staffId ?? "",
  staffName: a.staffName ?? "",
  date: String(a.date ?? a.attendanceDate ?? "").slice(0, 10),
  inTime: String(a.checkIn ?? a.inTime ?? "").slice(0, 8),
  outTime: String(a.checkOut ?? a.outTime ?? "").slice(0, 8),
  status: a.status ?? (a.checkIn || a.inTime ? "PRESENT" : ""),
});

const readError = async (res: Response, fallback: string) => {
  const raw = await res.text().catch(() => "");
  let msg: string;
  try {
    const d = JSON.parse(raw);
    msg = d?.message || d?.error || "";
  } catch {
    msg = raw.trim().slice(0, 200);
  }
  return `${fallback} (HTTP ${res.status}${msg ? `: ${msg}` : ""})`;
};

const getUsername = () => {
  try {
    return localStorage.getItem("username") || "system";
  } catch {
    return "system";
  }
};

const digits = (t: string) => t.replace(/\D/g, "");

// ─── CSS ────────────────────────────────────────────────────────────────
const css = `
html, body, #root { overflow: hidden !important; height: 100%; }
.st { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; background: #f8f7ff; color: #111827;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.st, .st * { text-align: left; box-sizing: border-box; }
.st button { width: auto; transform: none !important; font-family: inherit; box-shadow: none !important; }
.st button:disabled { cursor: not-allowed !important; opacity: 0.6; }
.st input[type="checkbox"] { width: 16px; height: 16px; accent-color: #7c3aed; cursor: pointer; }

.st-wrap { flex: 1; min-height: 0; width: 100%; max-width: 1200px; margin: 0 auto; padding: 12px 24px 16px; display: flex; flex-direction: column; gap: 10px; }

/* top tabs */
.st-tabs { flex: none; display: flex; gap: 4px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 4px; align-self: flex-start; }
.st-tab { height: 34px; padding: 0 18px; border: none; background: transparent; border-radius: 8px; font-size: 13px; font-weight: 600; color: #6b7280; cursor: pointer; }
.st-tab.on { background: #7c3aed; color: #fff; }

/* list grid */
.st-body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(300px, 360px) minmax(0, 1fr); gap: 14px; }
.st-body.single { grid-template-columns: minmax(0, 1fr); }

.st-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.st-ch { flex: none; padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; gap: 10px; }

/* form */
.st-form { padding: 14px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.st label { display: block; font-size: 12px; font-weight: 500; color: #374151; }
.st input, .st select { width: 100%; height: 36px; margin-top: 4px; padding: 0 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; color: #374151; background: #fff; outline: none; font-family: inherit; }
.st input:focus, .st select:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
.st-err { font-size: 11px; color: #dc2626; margin: 3px 0 0; }
.st-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }

/* buttons */
.st .st-btn { height: 36px; padding: 0 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1.5px solid #e5e7eb; background: #fff; color: #6b7280; }
.st .st-btn.p { background: #7c3aed; border-color: #7c3aed; color: #fff; }
.st .st-edit { height: 30px; padding: 0 12px; font-size: 12px; color: #7c3aed; border-color: #c4b5fd; }
.st .st-in { background: #7c3aed; color: #fff; border: none; padding: 7px 14px; font-size: 12px; border-radius: 8px; font-weight: 600; }
.st .st-out { background: #ea580c; color: #fff; border: none; padding: 7px 14px; font-size: 12px; border-radius: 8px; font-weight: 600; }
.st .st-red { background: #fff; color: #dc2626; border: 1.5px solid #fecaca; padding: 6px 12px; font-size: 12px; border-radius: 8px; font-weight: 600; }

/* notice */
.st-msg { padding: 8px 12px; border-radius: 8px; font-size: 13px; flex: none; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.st-msg.ok { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.st-msg.bad { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.st-msg button { background: transparent; border: none; color: inherit; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: underline; }

/* summary */
.st-sum { flex: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.st-sumcard { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 8px 16px; }
.st-sumlabel { font-size: 12px; font-weight: 500; color: #6b7280; margin: 0; }
.st-sumval { font-size: 20px; font-weight: 700; color: #111827; margin: 0; }

/* attendance tabs */
.st-atabs { flex: none; display: flex; gap: 4px; padding: 0 16px; border-bottom: 1px solid #f3f4f6; overflow-x: auto; }
.st-atab { display: flex; align-items: center; gap: 8px; padding: 12px 14px; background: none; border: none; border-bottom: 3px solid transparent; color: #6b7280; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.st-atab.on { border-bottom-color: #7c3aed; color: #7c3aed; }
.st-count { background: #f3f4f6; color: #6b7280; font-size: 12px; font-weight: 600; padding: 2px 9px; border-radius: 20px; }
.st-atab.on .st-count { background: #ede9fe; color: #7c3aed; }

/* toolbar */
.st-tools { flex: none; padding: 10px 16px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.st-search { position: relative; flex: 1 1 260px; max-width: 360px; }
.st-search input { margin: 0; padding-left: 34px; padding-right: 34px; }
.st-search .st-si { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; color: #9ca3af; pointer-events: none; }
.st-search .st-clr { position: absolute; right: 6px; top: 50%; margin-top: -14px; width: 28px; height: 28px; border-radius: 50%; border: none; background: #f3f4f6; color: #6b7280; font-size: 12px; cursor: pointer; padding: 0; }
.st-seg { display: inline-flex; padding: 3px; gap: 2px; background: #f3f4f6; border-radius: 10px; }
.st-seg button { background: transparent; color: #6b7280; border: none; border-radius: 8px; padding: 6px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
.st-seg button.on { background: #fff; color: #7c3aed; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.st-perpage { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6b7280; }
.st-perpage select { width: auto; margin: 0; height: 32px; padding: 0 8px; }

/* bulk bar */
.st-bulk { flex: none; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 8px 16px; background: #f5f3ff; border-top: 1px solid #ede9fe; border-bottom: 1px solid #ede9fe; font-size: 13px; color: #5b21b6; font-weight: 600; }

/* table */
.st-tw { flex: 1; min-height: 0; overflow: auto; }
.st-table { width: 100%; border-collapse: collapse; min-width: 760px; }
.st-table th { position: sticky; top: 0; padding: 11px 16px; font-size: 12px; font-weight: 600; color: #6b7280; background: #fafafa; border-bottom: 1px solid #f3f4f6; white-space: nowrap; text-align: left; z-index: 1; }
.st-table td { padding: 13px 16px; font-size: 13px; border-bottom: 1px solid #f9fafb; white-space: nowrap; color: #374151; }
.st-table tr:hover td { background: #faf5ff; }
.st-badge { background: #ede9fe; color: #7c3aed; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 20px; }
.st-inb { background: #ede9fe; color: #7c3aed; border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.st-outb { background: #ffedd5; color: #ea580c; border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.st-pill { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.st-pill.in { background: #dcfce7; color: #16a34a; }
.st-pill.out { background: #fee2e2; color: #dc2626; }
.st-pill.na { background: #f3f4f6; color: #9ca3af; }
.st-empty { padding: 40px 20px; text-align: center; color: #9ca3af; font-size: 14px; }

/* footer */
.st-foot { flex: none; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 10px 16px; border-top: 1px solid #f3f4f6; }
.st-showing { font-size: 13px; color: #6b7280; }
.st-pager { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.st-pager button { min-width: 32px; height: 32px; padding: 0 8px; border-radius: 6px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-size: 13px; font-weight: 500; cursor: pointer; }
.st-pager button.on { background: #7c3aed; border-color: #7c3aed; color: #fff; }
.st-pager button:disabled { opacity: .5; cursor: default; }

/* mobile card list */
.st-cards { display: none; flex: 1; min-height: 0; overflow-y: auto; }
.st-selall { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #fafafa; border-bottom: 1px solid #f3f4f6; font-size: 12px; font-weight: 600; color: #6b7280; cursor: pointer; }
.st-mcard { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
.st-mcard input[type="checkbox"] { width: 20px; height: 20px; flex-shrink: 0; }
.st-minfo { flex: 1; min-width: 0; }
.st-mname { font-weight: 600; font-size: 14px; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-mmeta { font-size: 12px; color: #6b7280; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-mtel { color: #2563eb; text-decoration: none; font-weight: 600; }
.st-mtime { margin-top: 4px; display: flex; gap: 6px; flex-wrap: wrap; }
.st-mactions { display: flex; gap: 6px; flex-wrap: wrap; }

/* responsive */
@media (max-width: 900px) {
  .st-body { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); overflow-y: auto; }
  .st-wrap { padding: 8px 10px; }
  .st input, .st select { font-size: 16px; }
}

@media (max-width: 700px) {
  .st-wrap { padding: 8px 10px !important; }
  .st-sum { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 6px !important; }
  .st-sumcard { padding: 6px 8px !important; }
  .st-atabs { padding: 0 6px !important; }
  .st-atab { flex: 1; justify-content: center; padding: 12px 8px !important; }
  .st-tools { padding: 8px 10px !important; gap: 8px !important; }
  .st-search { flex: 1 1 100% !important; max-width: none !important; }
  .st-search input { font-size: 16px !important; }
  .st-seg { flex: 1 1 100%; overflow-x: auto; }
  .st-seg button { flex: 1; white-space: nowrap; }
  .st-bulk { padding: 8px 10px !important; }
  .st-tw { display: none !important; }
  .st-cards { display: block; }
  .st-mactions { flex-direction: column; }
  .st-foot { padding: 8px 10px !important; }
  .st-num { display: none !important; }
  .st-pageof { display: inline-block; font-size: 13px; font-weight: 600; color: #374151; min-width: 52px; text-align: center; }
}
`;

// ─── Small components ───────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
  </svg>
);

// ─── Component ──────────────────────────────────────────────────────────
export default function StaffPage() {
  const [tab, setTab] = useState<Tab>("list");

  // ── List state ───────────────────────────────────────────────────────
  const [list, setList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [msg, setMsg] = useState<Notice>(null);
  const [search, setSearch] = useState("");

  // ── Attendance state ─────────────────────────────────────────────────
  const [attMode, setAttMode] = useState<AttMode>("today");
  const [attRows, setAttRows] = useState<AttRow[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attMsg, setAttMsg] = useState<Notice>(null);
  const [attStaffId, setAttStaffId] = useState("");
  const [attDate, setAttDate] = useState(todayIso());
  const [attFrom, setAttFrom] = useState(todayIso());
  const [attTo, setAttTo] = useState(todayIso());
  const [attTab, setAttTab] = useState<AttTab>("all");
  const [attSearch, setAttSearch] = useState("");
  const [attPerPage, setAttPerPage] = useState(10);
  const [attPage, setAttPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  // ── Loaders (no synchronous setState in effect body) ─────────────────
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(STAFF_ALL_URL);
      if (!res.ok) throw new Error(await readError(res, "Could not load staff"));
      setList(toArray<ApiStaff>(await res.json().catch(() => [])).map(toStaff));
    } catch (e) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "Could not load staff." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(STAFF_ALL_URL);
        if (!res.ok) throw new Error(await readError(res, "Could not load staff"));
        const data = toArray<ApiStaff>(await res.json().catch(() => [])).map(toStaff);
        if (!cancelled) setList(data);
      } catch (e) {
        if (!cancelled)
          setMsg({ type: "error", text: e instanceof Error ? e.message : "Could not load staff." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, []);

  // ── List actions ─────────────────────────────────────────────────────
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.staffId.trim()) e.staffId = "Enter the staff ID.";
    if (!form.name.trim()) e.name = "Enter the staff name.";
    if (!form.dept.trim()) e.dept = "Enter the department.";
    if (!/^[0-9+\-\s]{7,15}$/.test(form.mobile.trim())) e.mobile = "Enter a valid mobile number.";
    if (!form.role.trim()) e.role = "Enter the role.";
    const dup = list.find(
      (s) => s.staffId.toLowerCase() === form.staffId.trim().toLowerCase() && s.key !== editKey,
    );
    if (dup) e.staffId = "This staff ID already exists.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const reset = () => {
    setForm(emptyForm);
    setEditKey(null);
    setErrors({});
  };

  const edit = (s: Staff) => {
    setForm({ staffId: s.staffId, name: s.name, dept: s.dept, mobile: s.mobile, role: s.role });
    setEditKey(s.key);
    setErrors({});
    setMsg(null);
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    setMsg(null);
    const body = {
      staffId: form.staffId.trim(),
      staffName: form.name.trim(),
      department: form.dept.trim(),
      mobile: form.mobile.trim(),
      role: form.role.trim(),
      updatedBy: getUsername(),
      ...(editKey ? {} : { createdBy: getUsername() }),
    };
    try {
      const res = await fetch(
        editKey ? `${STAFF_UPDATE_URL}/${encodeURIComponent(editKey)}` : STAFF_ADD_URL,
        {
          method: editKey ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error(await readError(res, editKey ? "Update failed" : "Save failed"));
      setMsg({ type: "success", text: `${body.staffName} was ${editKey ? "updated" : "added"}.` });
      reset();
      await load();
    } catch (e) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  const q = search.trim().toLowerCase();
  const qDig = digits(q);
  const shown = list.filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.staffId.toLowerCase().includes(q) ||
      s.dept.toLowerCase().includes(q) ||
      s.mobile.includes(q) ||
      (qDig !== "" && digits(s.mobile).includes(qDig)) ||
      s.role.toLowerCase().includes(q),
  );

  // ── Attendance: fetch based on mode ─────────────────────────────────
  const buildAttUrl = () => {
    if (attMode === "staff") {
      if (!attStaffId.trim()) throw new Error("Enter a staff ID.");
      return `${STAFF_BY_STAFF_URL}/${encodeURIComponent(attStaffId.trim())}`;
    }
    if (attMode === "date") {
      if (!attDate) throw new Error("Pick a date.");
      return `${STAFF_BY_DATE_URL}?date=${attDate}`;
    }
    if (attMode === "range") {
      if (!attStaffId.trim() || !attFrom || !attTo)
        throw new Error("Enter staff ID, from and to dates.");
      return `${STAFF_RANGE_URL}?staffId=${encodeURIComponent(attStaffId.trim())}&from=${attFrom}&to=${attTo}`;
    }
    return `${STAFF_BY_DATE_URL}?date=${todayIso()}`;
  };

  const fetchAttendance = async () => {
    setAttLoading(true);
    setAttMsg(null);
    setAttRows([]);
    try {
      const url = buildAttUrl();
      const res = await fetch(url);
      if (!res.ok) throw new Error(await readError(res, "Could not load attendance"));
      const rows = toArray<ApiAttendance>(await res.json().catch(() => [])).map(toAtt);
      setAttRows(rows);
      if (rows.length === 0) setAttMsg({ type: "error", text: "No records found." });
    } catch (e) {
      setAttMsg({ type: "error", text: e instanceof Error ? e.message : "Could not load attendance." });
    } finally {
      setAttLoading(false);
    }
  };

  // Auto-load today's attendance when tab/mode = today.
  // Fetch first, then setState after the await — no sync setState in effect body.
  useEffect(() => {
    if (tab !== "attendance" || attMode !== "today") return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(`${STAFF_BY_DATE_URL}?date=${todayIso()}`);
        if (!res.ok) throw new Error(await readError(res, "Could not load attendance"));
        const rows = toArray<ApiAttendance>(await res.json().catch(() => [])).map(toAtt);
        if (cancelled) return;
        setAttRows(rows);
        setAttLoading(false);
        if (rows.length === 0) setAttMsg({ type: "error", text: "No records found for today." });
      } catch (e) {
        if (!cancelled) {
          setAttLoading(false);
          setAttMsg({ type: "error", text: e instanceof Error ? e.message : "Could not load attendance." });
        }
      }
    };
    // Kick off async; initial attLoading is already false, we just flip it inside the async fn
    void run();
    return () => { cancelled = true; };
  }, [tab, attMode]);

  // ── Derived attendance lists ─────────────────────────────────────────
  const todayRows = attRows.filter((r) => r.date === todayIso());
  const inList = todayRows.filter((r) => r.inTime && !r.outTime);
  const outList = todayRows.filter((r) => r.outTime);
  const absentList = list.filter(
    (s) => !todayRows.some((r) => r.staffId === s.staffId && r.inTime),
  );
  const allList = attRows;

  const byTab: Record<AttTab, AttRow[]> = {
    all: allList,
    checkedIn: inList,
    checkedOut: outList,
    absent: absentList.map((s) => ({
      key: s.staffId,
      staffId: s.staffId,
      staffName: s.name,
      date: todayIso(),
      inTime: "",
      outTime: "",
      status: "ABSENT",
    })),
  };

  const aq = attSearch.trim().toLowerCase();
  const aqDig = digits(aq);
  const filteredAtt = byTab[attTab].filter(
    (r) =>
      !aq ||
      r.staffName.toLowerCase().includes(aq) ||
      r.staffId.toLowerCase().includes(aq) ||
      (aqDig !== "" && digits(r.staffId).includes(aqDig)),
  );

  const totalPages = Math.max(1, Math.ceil(filteredAtt.length / attPerPage));
  const currentPage = Math.min(attPage, totalPages);
  const startIdx = (currentPage - 1) * attPerPage;
  const pageRows = filteredAtt.slice(startIdx, startIdx + attPerPage);

  // ── Selection helpers ────────────────────────────────────────────────
  const selectedList = filteredAtt.filter((r) => selected[r.key]);
  const allSelected = filteredAtt.length > 0 && selectedList.length === filteredAtt.length;
  const toggleOne = (key: string) => setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleAll = () => {
    if (allSelected) setSelected({});
    else {
      const next: Record<string, boolean> = {};
      filteredAtt.forEach((r) => (next[r.key] = true));
      setSelected(next);
    }
  };

  // ── Single check-in / out / absent ──────────────────────────────────
  const setRowBusy = (id: string, v: boolean) => setBusy((p) => ({ ...p, [id]: v }));

  const runCheckIn = async (staffId: string) => {
    setRowBusy(staffId, true);
    setAttMsg(null);
    try {
      const res = await fetch(STAFF_CHECKIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          inTime: nowTime(),
          date: todayIso(),
          status: "PRESENT",
          createdBy: getUsername(),
        }),
      });
      if (!res.ok) throw new Error(await readError(res, "Check-in failed"));
      await fetchAttendance();
    } catch (e) {
      setAttMsg({ type: "error", text: e instanceof Error ? e.message : "Could not check in." });
    } finally {
      setRowBusy(staffId, false);
    }
  };

  const runCheckOut = async (staffId: string) => {
    setRowBusy(staffId, true);
    setAttMsg(null);
    try {
      const res = await fetch(STAFF_CHECKIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          outTime: nowTime(),
          date: todayIso(),
          status: "PRESENT",
          updatedBy: getUsername(),
        }),
      });
      if (!res.ok) throw new Error(await readError(res, "Check-out failed"));
      await fetchAttendance();
    } catch (e) {
      setAttMsg({ type: "error", text: e instanceof Error ? e.message : "Could not check out." });
    } finally {
      setRowBusy(staffId, false);
    }
  };

  const runUndoOut = async (staffId: string) => {
    setRowBusy(staffId, true);
    setAttMsg(null);
    try {
      const res = await fetch(STAFF_CHECKIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          outTime: null,
          date: todayIso(),
          status: "PRESENT",
          updatedBy: getUsername(),
        }),
      });
      if (!res.ok) throw new Error(await readError(res, "Undo failed"));
      await fetchAttendance();
    } catch (e) {
      setAttMsg({ type: "error", text: e instanceof Error ? e.message : "Could not undo check-out." });
    } finally {
      setRowBusy(staffId, false);
    }
  };

  const runMarkAbsent = async (staffId: string, name: string) => {
    if (!window.confirm(`Mark ${name} as absent today?`)) return;
    setRowBusy(staffId, true);
    setAttMsg(null);
    try {
      const res = await fetch(STAFF_CHECKIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          date: todayIso(),
          status: "ABSENT",
          createdBy: getUsername(),
        }),
      });
      if (!res.ok) throw new Error(await readError(res, "Mark absent failed"));
      await fetchAttendance();
    } catch (e) {
      setAttMsg({ type: "error", text: e instanceof Error ? e.message : "Could not mark absent." });
    } finally {
      setRowBusy(staffId, false);
    }
  };

  // ── Bulk actions ─────────────────────────────────────────────────────
  const runBulk = async (action: "in" | "out" | "absent") => {
    if (bulkBusy || selectedList.length === 0) return;
    const list = selectedList.filter((r) => {
      if (action === "in") return !r.inTime;
      if (action === "out") return r.inTime && !r.outTime;
      return r.status !== "ABSENT";
    });
    if (list.length === 0) {
      setAttMsg({
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
    if (action === "absent" && !window.confirm(`Mark ${list.length} staff as absent?`)) return;

    setBulkBusy(true);
    setAttMsg(null);
    try {
      const stamp = nowTime();
      await Promise.all(
        list.map((r) =>
          fetch(STAFF_CHECKIN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              staffId: r.staffId,
              inTime: action === "in" ? stamp : r.inTime || null,
              outTime: action === "out" ? stamp : r.outTime || null,
              date: todayIso(),
              status: action === "absent" ? "ABSENT" : "PRESENT",
              createdBy: getUsername(),
              updatedBy: getUsername(),
            }),
          }).then(async (res) => {
            if (!res.ok) throw new Error(await readError(res, "Bulk update failed"));
          }),
        ),
      );
      setSelected({});
      setAttMsg({
        type: "success",
        text:
          action === "in"
            ? `${list.length} staff checked in.`
            : action === "out"
              ? `${list.length} staff checked out.`
              : `${list.length} staff marked absent.`,
      });
      await fetchAttendance();
    } catch (e) {
      setAttMsg({ type: "error", text: e instanceof Error ? e.message : "Bulk update failed." });
    } finally {
      setBulkBusy(false);
    }
  };

  // ── JSX helpers ──────────────────────────────────────────────────────
  const field = (k: keyof FormState, label: string, ph: string) => (
    <div>
      <label>{label}</label>
      <input
        value={form[k]}
        placeholder={ph}
        inputMode={k === "mobile" ? "tel" : undefined}
        onChange={(e) => set(k, e.target.value)}
      />
      {errors[k] && <p className="st-err">{errors[k]}</p>}
    </div>
  );

  const attTabs: { key: AttTab; label: string; count: number }[] = [
    { key: "all", label: "All Records", count: allList.length },
    { key: "checkedIn", label: "Checked In", count: inList.length },
    { key: "checkedOut", label: "Checked Out", count: outList.length },
    { key: "absent", label: "Absent", count: absentList.length },
  ];

  const attEmpty: Record<AttTab, string> = {
    all: "No attendance records.",
    checkedIn: "No one is currently checked in.",
    checkedOut: "No one has checked out today.",
    absent: "Everyone is present today.",
  };

  // Row action buttons (used by table + mobile)
  const rowActions = (row: AttRow) => {
    const rowBusy = !!busy[row.staffId] || bulkBusy;
    if (row.status === "ABSENT") {
      return (
        <button
          type="button"
          className="st-in"
          disabled={rowBusy}
          onClick={() => runCheckIn(row.staffId)}
        >
          <CheckIcon /> {busy[row.staffId] ? "Saving..." : "Check In"}
        </button>
      );
    }
    if (row.inTime && row.outTime) {
      return (
        <button
          type="button"
          className="st-red"
          disabled={rowBusy}
          onClick={() => runUndoOut(row.staffId)}
        >
          <EditIcon /> {busy[row.staffId] ? "Updating..." : "Undo Check Out"}
        </button>
      );
    }
    if (row.inTime && !row.outTime) {
      return (
        <div className="st-mactions">
          <button
            type="button"
            className="st-out"
            disabled={rowBusy}
            onClick={() => runCheckOut(row.staffId)}
          >
            <LogoutIcon /> {busy[row.staffId] ? "Saving..." : "Check Out"}
          </button>
          <button
            type="button"
            className="st-red"
            disabled={rowBusy}
            onClick={() => runMarkAbsent(row.staffId, row.staffName)}
          >
            <EditIcon /> Not Attended
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        className="st-in"
        disabled={rowBusy}
        onClick={() => runCheckIn(row.staffId)}
      >
        <CheckIcon /> {busy[row.staffId] ? "Saving..." : "Check In"}
      </button>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="st">
      <style>{css}</style>
      <div style={{ flexShrink: 0 }}>
        <Header />
      </div>
      <div className="st-wrap">
        {/* Top tabs */}
        <div className="st-tabs">
          <button className={`st-tab ${tab === "list" ? "on" : ""}`} onClick={() => setTab("list")}>
            Staff List
          </button>
          <button className={`st-tab ${tab === "attendance" ? "on" : ""}`} onClick={() => setTab("attendance")}>
            Staff Attendance
          </button>
        </div>

        {tab === "list" ? (
          <>
            {msg && (
              <div className={`st-msg ${msg.type === "error" ? "bad" : "ok"}`}>
                <span>{msg.text}</span>
                <button onClick={() => setMsg(null)}>Dismiss</button>
              </div>
            )}
            <div className="st-body">
              {/* Form */}
              <div className="st-card" style={{ alignSelf: "start" }}>
                <div className="st-ch">{editKey ? "Edit Staff" : "Add Staff"}</div>
                <form
                  className="st-form"
                  noValidate
                  onSubmit={(e) => { e.preventDefault(); void save(); }}
                >
                  {field("staffId", "Staff ID", "e.g. JR001")}
                  {field("name", "Staff Name", "Full name")}
                  {field("dept", "Department", "e.g. Education")}
                  {field("mobile", "Mobile", "e.g. 9876543210")}
                  <div>
                    <label>Role</label>
                    <input
                      list="st-roles"
                      value={form.role}
                      placeholder="Select or type a role"
                      onChange={(e) => set("role", e.target.value)}
                    />
                    <datalist id="st-roles">
                      {ROLES.map((r) => <option key={r} value={r} />)}
                    </datalist>
                    {errors.role && <p className="st-err">{errors.role}</p>}
                  </div>
                  <div className="st-row" style={{ justifyContent: "flex-end" }}>
                    <button type="button" className="st-btn" onClick={reset} disabled={saving}>
                      {editKey ? "Cancel" : "Clear"}
                    </button>
                    <button type="submit" className="st-btn p" disabled={saving}>
                      {saving ? "Saving..." : editKey ? "Update Staff" : "Add Staff"}
                    </button>
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="st-card">
                <div className="st-ch">
                  <span>
                    Staff List <span className="st-badge">{shown.length}</span>
                  </span>
                  <button
                    type="button"
                    className="st-btn"
                    style={{ height: 30, padding: "0 12px" }}
                    onClick={() => void load()}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Refresh"}
                  </button>
                </div>
                <div className="st-tools">
                  <div className="st-search">
                    <span className="st-si">🔍</span>
                    <input
                      placeholder="Search name, ID, department, mobile, role..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button className="st-clr" onClick={() => setSearch("")} aria-label="Clear">✕</button>
                    )}
                  </div>
                </div>
                <div className="st-tw">
                  {loading ? (
                    <div className="st-empty">Loading staff...</div>
                  ) : shown.length === 0 ? (
                    <div className="st-empty">{q ? "No matching staff." : "No staff added yet."}</div>
                  ) : (
                    <table className="st-table">
                      <thead>
                        <tr>
                          <th>Staff ID</th>
                          <th>Name</th>
                          <th>Department</th>
                          <th>Mobile</th>
                          <th>Role</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map((s) => (
                          <tr key={s.key || s.staffId} className={editKey === s.key ? "sel" : ""}>
                            <td><b>{s.staffId}</b></td>
                            <td>{s.name}</td>
                            <td>{s.dept || "—"}</td>
                            <td>
                              {s.mobile ? (
                                <a href={`tel:${s.mobile}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
                                  {s.mobile}
                                </a>
                              ) : "—"}
                            </td>
                            <td>{s.role || "—"}</td>
                            <td>
                              <button type="button" className="st-btn st-edit" onClick={() => edit(s)}>
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {attMsg && (
              <div className={`st-msg ${attMsg.type === "error" ? "bad" : "ok"}`}>
                <span>{attMsg.text}</span>
                <span style={{ display: "flex", gap: 12 }}>
                  {attMsg.type === "error" && (
                    <button onClick={() => void fetchAttendance()}>Retry</button>
                  )}
                  <button onClick={() => setAttMsg(null)}>Dismiss</button>
                </span>
              </div>
            )}

            {/* Summary cards */}
            <div className="st-sum">
              <div className="st-sumcard">
                <p className="st-sumlabel">Expected</p>
                <p className="st-sumval">{list.length}</p>
              </div>
              <div className="st-sumcard">
                <p className="st-sumlabel">C In</p>
                <p className="st-sumval" style={{ color: "#16a34a" }}>{inList.length}</p>
              </div>
              <div className="st-sumcard">
                <p className="st-sumlabel">C Out</p>
                <p className="st-sumval" style={{ color: "#ea580c" }}>{outList.length}</p>
              </div>
              <div className="st-sumcard">
                <p className="st-sumlabel">Absent</p>
                <p className="st-sumval" style={{ color: "#dc2626" }}>{absentList.length}</p>
              </div>
            </div>

            {/* Filters + table card */}
            <div className="st-body single">
              <div className="st-card">
                {/* Query mode tabs */}
                <div className="st-atabs">
                  {attTabs.map((t) => (
                    <button
                      key={t.key}
                      className={`st-atab ${attTab === t.key ? "on" : ""}`}
                      onClick={() => { setAttTab(t.key); setAttPage(1); setSelected({}); }}
                    >
                      {t.label} <span className="st-count">{t.count}</span>
                    </button>
                  ))}
                </div>

                {/* Toolbar */}
                <div className="st-tools">
                  <div className="st-search">
                    <span className="st-si">🔍</span>
                    <input
                      placeholder="Search staff ID or name..."
                      value={attSearch}
                      onChange={(e) => { setAttSearch(e.target.value); setAttPage(1); }}
                    />
                    {attSearch && (
                      <button className="st-clr" onClick={() => setAttSearch("")} aria-label="Clear">✕</button>
                    )}
                  </div>

                  <div className="st-seg">
                    <button
                      className={attMode === "today" ? "on" : ""}
                      onClick={() => { setAttMode("today"); setAttTab("all"); }}
                    >Today</button>
                    <button
                      className={attMode === "date" ? "on" : ""}
                      onClick={() => setAttMode("date")}
                    >By Date</button>
                    <button
                      className={attMode === "staff" ? "on" : ""}
                      onClick={() => setAttMode("staff")}
                    >By Staff</button>
                    <button
                      className={attMode === "range" ? "on" : ""}
                      onClick={() => setAttMode("range")}
                    >Range</button>
                  </div>

                  {(attMode === "staff" || attMode === "range") && (
                    <input
                      placeholder="Staff ID"
                      value={attStaffId}
                      onChange={(e) => setAttStaffId(e.target.value)}
                      style={{ maxWidth: 160, margin: 0 }}
                    />
                  )}
                  {attMode === "date" && (
                    <input
                      type="date"
                      value={attDate}
                      onChange={(e) => setAttDate(e.target.value)}
                      style={{ maxWidth: 160, margin: 0 }}
                    />
                  )}
                  {attMode === "range" && (
                    <>
                      <input type="date" value={attFrom} onChange={(e) => setAttFrom(e.target.value)} style={{ maxWidth: 160, margin: 0 }} />
                      <span style={{ color: "#6b7280", fontSize: 12 }}>to</span>
                      <input type="date" value={attTo} onChange={(e) => setAttTo(e.target.value)} style={{ maxWidth: 160, margin: 0 }} />
                    </>
                  )}

                  {attMode !== "today" && (
                    <button type="button" className="st-btn p" onClick={() => void fetchAttendance()} disabled={attLoading}>
                      {attLoading ? "Loading..." : "Fetch"}
                    </button>
                  )}

                  <div className="st-perpage">
                    <span>Rows</span>
                    <select
                      value={attPerPage}
                      onChange={(e) => { setAttPerPage(Number(e.target.value)); setAttPage(1); }}
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>

                  <button type="button" className="st-btn" style={{ height: 32, padding: "0 12px" }} onClick={() => void fetchAttendance()} disabled={attLoading}>
                    {attLoading ? "..." : "Refresh"}
                  </button>
                </div>

                {/* Bulk bar */}
                {selectedList.length > 0 && (
                  <div className="st-bulk">
                    <span>{selectedList.length} selected</span>
                    {attTab !== "checkedOut" && (
                      <button type="button" className="st-in" disabled={bulkBusy} onClick={() => void runBulk("in")}>
                        <CheckIcon /> {bulkBusy ? "Saving..." : "Check In"}
                      </button>
                    )}
                    {attTab !== "absent" && (
                      <button type="button" className="st-out" disabled={bulkBusy} onClick={() => void runBulk("out")}>
                        <LogoutIcon /> {bulkBusy ? "Saving..." : "Check Out"}
                      </button>
                    )}
                    {attTab === "checkedIn" && (
                      <button type="button" className="st-red" disabled={bulkBusy} onClick={() => void runBulk("absent")}>
                        <EditIcon /> Mark Absent
                      </button>
                    )}
                    <button
                      type="button"
                      className="st-btn"
                      style={{ height: 30, padding: "0 12px" }}
                      disabled={bulkBusy}
                      onClick={() => setSelected({})}
                    >Clear</button>
                  </div>
                )}

                {/* Table (desktop) */}
                <div className="st-tw">
                  {attLoading ? (
                    <div className="st-empty">Loading attendance...</div>
                  ) : pageRows.length === 0 ? (
                    <div className="st-empty">{aq ? "No matching records." : attEmpty[attTab]}</div>
                  ) : (
                    <table className="st-table">
                      <thead>
                        <tr>
                          <th style={{ width: 44 }}>
                            <input type="checkbox" checked={allSelected} onChange={toggleAll} title="Select all" />
                          </th>
                          <th>Action</th>
                          <th>Date</th>
                          <th>Staff ID</th>
                          <th>Name</th>
                          <th>Check In</th>
                          <th>Check Out</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((r) => (
                          <tr key={r.key}>
                            <td>
                              <input
                                type="checkbox"
                                checked={!!selected[r.key]}
                                onChange={() => toggleOne(r.key)}
                              />
                            </td>
                            <td>{rowActions(r)}</td>
                            <td>{formatDate(r.date)}</td>
                            <td><b>{r.staffId}</b></td>
                            <td>{r.staffName || "—"}</td>
                            <td>
                              {r.inTime ? (
                                <span className="st-inb">{formatTime(r.inTime)}</span>
                              ) : (
                                <span className="st-pill na">—</span>
                              )}
                            </td>
                            <td>
                              {r.outTime ? (
                                <span className="st-outb">{formatTime(r.outTime)}</span>
                              ) : (
                                <span className="st-pill na">—</span>
                              )}
                            </td>
                            <td>
                              <span className={`st-pill ${r.status === "ABSENT" ? "out" : r.outTime ? "out" : r.inTime ? "in" : "na"}`}>
                                {r.status || (r.inTime ? "PRESENT" : "—")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Mobile card list */}
                <div className="st-cards">
                  {attLoading ? (
                    <div className="st-empty">Loading attendance...</div>
                  ) : pageRows.length === 0 ? (
                    <div className="st-empty">{aq ? "No matching records." : attEmpty[attTab]}</div>
                  ) : (
                    <>
                      <label className="st-selall">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                        Select all ({filteredAtt.length})
                      </label>
                      {pageRows.map((r) => (
                        <div className="st-mcard" key={r.key}>
                          <input
                            type="checkbox"
                            checked={!!selected[r.key]}
                            onChange={() => toggleOne(r.key)}
                            aria-label={`Select ${r.staffName}`}
                          />
                          <div className="st-minfo">
                            <div className="st-mname">{r.staffName || r.staffId}</div>
                            <div className="st-mmeta">
                              <b>{r.staffId}</b> · {formatDate(r.date)}
                            </div>
                            <div className="st-mtime">
                              {r.inTime && <span className="st-inb">In {formatTime(r.inTime)}</span>}
                              {r.outTime && <span className="st-outb">Out {formatTime(r.outTime)}</span>}
                              {!r.inTime && !r.outTime && (
                                <span className="st-pill na">{r.status || "—"}</span>
                              )}
                            </div>
                          </div>
                          {rowActions(r)}
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Footer / pagination */}
                {!attLoading && filteredAtt.length > 0 && (
                  <div className="st-foot">
                    <span className="st-showing">
                      Showing {startIdx + 1}–{Math.min(startIdx + attPerPage, filteredAtt.length)} of {filteredAtt.length}
                    </span>
                    <div className="st-pager">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setAttPage(currentPage - 1)}
                      >‹</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .map((p, i, arr) => (
                          <span key={p} className="st-num" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                            {i > 0 && p - arr[i - 1] > 1 && <span style={{ color: "#9ca3af" }}>…</span>}
                            <button
                              type="button"
                              className={p === currentPage ? "on" : ""}
                              onClick={() => setAttPage(p)}
                            >{p}</button>
                          </span>
                        ))}
                      <span className="st-pageof">{currentPage} / {totalPages}</span>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setAttPage(currentPage + 1)}
                      >›</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}