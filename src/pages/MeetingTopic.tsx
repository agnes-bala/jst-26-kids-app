import { useState, useEffect } from "react";
import Header from "../components/Header";

// ─── API ────────────────────────────────────────────────────────────────
const TOPICS_URL = `/api/meeting-topics`; // POST | GET | GET /{date} | PUT /{date} | DELETE /{date}

// ─── Types ──────────────────────────────────────────────────────────────
interface ApiTopic {
  meetingDate?: string;
  topic?: string;
  createdAt?: string;
  createdBy?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
}

interface Topic {
  date: string; // yyyy-MM-dd (also the key)
  topic: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

interface FormState {
  meetingDate: string;
  topic: string;
}

type Notice = { type: "error" | "success"; text: string } | null;

// ─── Helpers ────────────────────────────────────────────────────────────
const emptyForm: FormState = { meetingDate: "", topic: "" };

// Logged-in user name (same lookup as ChildAdd) -> sent as createdBy / updatedBy
const USERNAME_KEYS = ["username", "userName", "name", "user"];
const getUsername = (): string => {
  try {
    for (const key of USERNAME_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const name =
          typeof parsed === "string"
            ? parsed
            : (parsed?.name ?? parsed?.username ?? parsed?.userName);
        if (name) return String(name);
      } catch {
        return raw; // plain string
      }
    }
  } catch {
    /* storage unavailable – ignore */
  }
  return "system";
};

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayIso = () => toIso(new Date());

const parseIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const isSunday = (iso: string) => !!iso && parseIso(iso).getDay() === 0;

// next Sunday that has no topic yet (today counts if it is Sunday)
const nextFreeSunday = (taken: Set<string>) => {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  for (let i = 0; i < 104; i++) {
    const iso = toIso(d);
    if (!taken.has(iso)) return iso;
    d.setDate(d.getDate() + 7);
  }
  return toIso(d);
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const formatDate = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
};
const formatStamp = (s: string) => {
  if (!s) return "—";
  const [date, time = ""] = s.split("T");
  return `${formatDate(date.slice(0, 10))}${time ? ` ${time.slice(0, 5)}` : ""}`;
};

const toArray = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  const obj = data as { content?: T[]; data?: T[] } | null;
  return obj?.content ?? obj?.data ?? [];
};

const toTopic = (a: ApiTopic): Topic => ({
  date: String(a.meetingDate ?? "").slice(0, 10),
  topic: a.topic ?? "",
  createdAt: a.createdAt ?? "",
  createdBy: a.createdBy ?? "",
  updatedAt: a.updatedAt ?? "",
  updatedBy: a.updatedBy ?? "",
});

const readError = async (res: Response, fallback: string) => {
  const raw = await res.text().catch(() => "");
  let msg : string ;
  try {
    const d = JSON.parse(raw);
    msg = d?.message || d?.error || "";
  } catch {
    msg = raw.trim().slice(0, 200);
  }
  if (res.status === 409) return "A topic already exists for this date. Edit it instead.";
  if (res.status === 400) return msg || "Invalid request. Meeting date must be a Sunday.";
  if (res.status === 404) return msg || "No topic found for this date.";
  return `${fallback} (HTTP ${res.status}${msg ? `: ${msg}` : ""})`;
};

// ─── CSS ────────────────────────────────────────────────────────────────
const css = `
html, body, #root { overflow: hidden !important; height: 100%; }
.mt { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; background: #f8f7ff; color: #111827;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.mt, .mt * { text-align: left; box-sizing: border-box; }
.mt button { width: auto; transform: none !important; font-family: inherit; box-shadow: none !important; }
.mt button:disabled { cursor: not-allowed !important; opacity: 0.6; }

.mt-wrap { flex: 1; min-height: 0; width: 100%; max-width: 1200px; margin: 0 auto; padding: 12px 24px 16px; display: flex; flex-direction: column; gap: 10px; }
.mt-body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(300px, 360px) minmax(0, 1fr); gap: 14px; }

.mt-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.mt-ch { flex: none; padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; gap: 10px; }

.mt-form { padding: 14px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.mt label { display: block; font-size: 12px; font-weight: 500; color: #374151; }
.mt input, .mt textarea { width: 100%; margin-top: 4px; padding: 0 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; color: #374151; background: #fff; outline: none; font-family: inherit; }
.mt input { height: 36px; }
.mt textarea { padding: 8px 10px; min-height: 72px; resize: vertical; }
.mt input:focus, .mt textarea:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
.mt input:disabled { background: #f3f4f6; color: #6b7280; }
.mt-err { font-size: 11px; color: #dc2626; margin: 3px 0 0; }
.mt-hint { font-size: 11px; color: #6b7280; margin: 3px 0 0; }
.mt-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }

.mt .mt-btn { height: 36px; padding: 0 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1.5px solid #e5e7eb; background: #fff; color: #6b7280; }
.mt .mt-btn.p { background: #7c3aed; border-color: #7c3aed; color: #fff; }
.mt .mt-sm { height: 30px; padding: 0 12px; font-size: 12px; }
.mt .mt-edit { color: #7c3aed; border-color: #c4b5fd; }
.mt .mt-red { background: #fff; color: #dc2626; border: 1.5px solid #fecaca; border-radius: 8px; font-weight: 600; cursor: pointer; }
.mt .mt-link { background: none; border: none; color: #7c3aed; font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; text-decoration: underline; }

.mt-msg { padding: 8px 12px; border-radius: 8px; font-size: 13px; flex: none; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.mt-msg.ok { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.mt-msg.bad { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.mt-msg button { background: transparent; border: none; color: inherit; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: underline; }

.mt-tools { flex: none; padding: 10px 16px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.mt-tools input { width: auto; margin: 0; max-width: 160px; }
.mt-tools .mt-search { flex: 1 1 200px; max-width: 320px; }
.mt-tools span.mt-to { color: #6b7280; font-size: 12px; }
.mt-badge { background: #ede9fe; color: #7c3aed; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 20px; }

.mt-tw { flex: 1; min-height: 0; overflow: auto; }
.mt-table { width: 100%; border-collapse: collapse; min-width: 720px; }
.mt-table th { position: sticky; top: 0; padding: 11px 16px; font-size: 12px; font-weight: 600; color: #6b7280; background: #fafafa; border-bottom: 1px solid #f3f4f6; white-space: nowrap; z-index: 1; }
.mt-table td { padding: 13px 16px; font-size: 13px; border-bottom: 1px solid #f9fafb; color: #374151; vertical-align: top; }
.mt-table td.nw { white-space: nowrap; }
.mt-table tr:hover td { background: #faf5ff; }
.mt-table tr.sel td { background: #f5f3ff; }
.mt-day { font-size: 11px; color: #6b7280; }
.mt-up { background: #dcfce7; color: #16a34a; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; margin-left: 6px; }
.mt-empty { padding: 40px 20px; text-align: center; color: #9ca3af; font-size: 14px; }

@media (max-width: 900px) {
  .mt-body { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); overflow-y: auto; }
  .mt-wrap { padding: 8px 10px; }
  .mt input, .mt textarea { font-size: 16px; }
  .mt-card.list { min-height: 360px; }
}
`;

// ─── Component ──────────────────────────────────────────────────────────
export default function MeetingTopicsPage() {
  const [list, setList] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editDate, setEditDate] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [msg, setMsg] = useState<Notice>(null);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const buildUrl = (f = from, t = to) => {
    const p = new URLSearchParams();
    if (f) p.set("from", f);
    if (t) p.set("to", t);
    const qs = p.toString();
    return qs ? `${TOPICS_URL}?${qs}` : TOPICS_URL;
  };

  const load = async (f = from, t = to) => {
    if (f && t && f > t) {
      setMsg({ type: "error", text: "From date must be before To date." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(buildUrl(f, t));
      if (!res.ok) throw new Error(await readError(res, "Could not load topics"));
      setList(toArray<ApiTopic>(await res.json().catch(() => [])).map(toTopic));
    } catch (e) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "Could not load topics." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(TOPICS_URL);
        if (!res.ok) throw new Error(await readError(res, "Could not load topics"));
        const data = toArray<ApiTopic>(await res.json().catch(() => [])).map(toTopic);
        if (!cancelled) setList(data);
      } catch (e) {
        if (!cancelled)
          setMsg({ type: "error", text: e instanceof Error ? e.message : "Could not load topics." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, []);

  // ── Form ─────────────────────────────────────────────────────────────
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.meetingDate) e.meetingDate = "Pick the meeting date.";
    else if (!isSunday(form.meetingDate)) e.meetingDate = "Meeting date must be a Sunday.";
    else if (!editDate && list.some((t) => t.date === form.meetingDate))
      e.meetingDate = "A topic already exists for this date.";
    if (!form.topic.trim()) e.topic = "Enter the topic.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const reset = () => {
    setForm(emptyForm);
    setEditDate(null);
    setErrors({});
  };

  const edit = (t: Topic) => {
    setForm({ meetingDate: t.date, topic: t.topic });
    setEditDate(t.date);
    setErrors({});
    setMsg(null);
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    setMsg(null);
    const topic = form.topic.trim();
    const username = getUsername();
    try {
      const res = await fetch(
        editDate ? `${TOPICS_URL}/${encodeURIComponent(editDate)}` : TOPICS_URL,
        {
          method: editDate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editDate
              ? { topic, updatedBy: username }
              : { meetingDate: form.meetingDate, topic, createdBy: username },
          ),
        },
      );
      if (!res.ok) throw new Error(await readError(res, editDate ? "Update failed" : "Save failed"));
      setMsg({
        type: "success",
        text: `Topic for ${formatDate(form.meetingDate)} was ${editDate ? "updated" : "added"}.`,
      });
      reset();
      await load();
    } catch (e) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: Topic) => {
    if (!window.confirm(`Delete the topic for ${formatDate(t.date)}?`)) return;
    setMsg(null);
    try {
      const res = await fetch(`${TOPICS_URL}/${encodeURIComponent(t.date)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res, "Delete failed"));
      setMsg({ type: "success", text: `Topic for ${formatDate(t.date)} was deleted.` });
      if (editDate === t.date) reset();
      await load();
    } catch (e) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "Could not delete." });
    }
  };

  const clearRange = () => {
    setFrom("");
    setTo("");
    void load("", "");
  };

  // ── Derived ──────────────────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const today = todayIso();
  const shown = list.filter(
    (t) => !q || t.topic.toLowerCase().includes(q) || t.date.includes(q) || formatDate(t.date).toLowerCase().includes(q),
  );
  const nextUpcoming = list
    .map((t) => t.date)
    .filter((d) => d >= today)
    .sort()[0];

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="mt">
      <style>{css}</style>
      <div style={{ flexShrink: 0 }}>
        <Header />
      </div>
      <div className="mt-wrap">
        {msg && (
          <div className={`mt-msg ${msg.type === "error" ? "bad" : "ok"}`}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)}>Dismiss</button>
          </div>
        )}

        <div className="mt-body">
          {/* Form */}
          <div className="mt-card" style={{ alignSelf: "start" }}>
            <div className="mt-ch">{editDate ? "Edit Topic" : "Add Topic"}</div>
            <form
              className="mt-form"
              noValidate
              onSubmit={(e) => { e.preventDefault(); void save(); }}
            >
              <div>
                <label>Meeting Date (Sunday)</label>
                <input
                  type="date"
                  value={form.meetingDate}
                  disabled={!!editDate}
                  onChange={(e) => set("meetingDate", e.target.value)}
                />
                {editDate ? (
                  <p className="mt-hint">Date can't be changed. Delete and add again to move it.</p>
                ) : (
                  <p className="mt-hint">
                    <button
                      type="button"
                      className="mt-link"
                      onClick={() => set("meetingDate", nextFreeSunday(new Set(list.map((t) => t.date))))}
                    >
                      Use next free Sunday
                    </button>
                  </p>
                )}
                {errors.meetingDate && <p className="mt-err">{errors.meetingDate}</p>}
              </div>
              <div>
                <label>Topic</label>
                <textarea
                  value={form.topic}
                  placeholder="e.g. Love of God"
                  onChange={(e) => set("topic", e.target.value)}
                />
                {errors.topic && <p className="mt-err">{errors.topic}</p>}
              </div>
              <div className="mt-row" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="mt-btn" onClick={reset} disabled={saving}>
                  {editDate ? "Cancel" : "Clear"}
                </button>
                <button type="submit" className="mt-btn p" disabled={saving}>
                  {saving ? "Saving..." : editDate ? "Update Topic" : "Add Topic"}
                </button>
              </div>
            </form>
          </div>

          {/* List */}
          <div className="mt-card list">
            <div className="mt-ch">
              <span>
                Meeting Topics <span className="mt-badge">{shown.length}</span>
              </span>
              <button
                type="button"
                className="mt-btn mt-sm"
                onClick={() => void load()}
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            <div className="mt-tools">
              <input
                className="mt-search"
                placeholder="Search topic or date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
              <span className="mt-to">to</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
              <button type="button" className="mt-btn p mt-sm" onClick={() => void load()} disabled={loading}>
                Apply
              </button>
              {(from || to) && (
                <button type="button" className="mt-btn mt-sm" onClick={clearRange} disabled={loading}>
                  Reset
                </button>
              )}
            </div>

            <div className="mt-tw">
              {loading ? (
                <div className="mt-empty">Loading topics...</div>
              ) : shown.length === 0 ? (
                <div className="mt-empty">
                  {q || from || to ? "No matching topics." : "No topics yet. Add the first Sunday topic."}
                </div>
              ) : (
                <table className="mt-table">
                  <thead>
                    <tr>
                      <th>Meeting Date</th>
                      <th>Topic</th>
                      <th>Created</th>
                      <th>Updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((t) => (
                      <tr key={t.date} className={editDate === t.date ? "sel" : ""}>
                        <td className="nw">
                          <b>{formatDate(t.date)}</b>
                          {t.date === nextUpcoming && <span className="mt-up">Next</span>}
                          <div className="mt-day">Sunday</div>
                        </td>
                        <td>{t.topic}</td>
                        <td className="nw">
                          {formatStamp(t.createdAt)}
                          {t.createdBy && <div className="mt-day">{t.createdBy}</div>}
                        </td>
                        <td className="nw">
                          {t.updatedBy || t.updatedAt !== t.createdAt ? (
                            <>
                              {formatStamp(t.updatedAt)}
                              {t.updatedBy && <div className="mt-day">{t.updatedBy}</div>}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="nw">
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" className="mt-btn mt-sm mt-edit" onClick={() => edit(t)}>
                              Edit
                            </button>
                            <button type="button" className="mt-red mt-sm" onClick={() => void remove(t)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}