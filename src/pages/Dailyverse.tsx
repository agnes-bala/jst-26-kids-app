import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "../components/Header";

const API_BASE_URL = "/jrmobile"; // uses the CRA/Vite proxy — no CORS needed

// ─── API contract assumed for this page ──────────────────────────────────
// GET    {API_BASE_URL}/dailyverse/list          -> DailyVerseEntry[]
// POST   {API_BASE_URL}/dailyverse/add           -> JSON body: { date, verseReference, verseText, passage }
// DELETE {API_BASE_URL}/dailyverse/delete/:id    -> deletes one entry
// Adjust the paths below if your backend uses different routes.

interface DailyVerseEntry {
  id: string | number;
  date: string; // ISO datetime string
  verseReference: string;
  verseText: string;
  passage: string;
  createdAt?: string;
}

// ─── Validation schema ────────────────────────────────────────────────────
const dailyVerseSchema = z.object({
  date: z.string().min(1, "Please choose a date and time."),
  verseReference: z.string().trim().min(1, "Please enter the verse reference."),
  verseText: z.string().trim().min(1, "Please enter the verse text."),
  passage: z.string().trim().min(1, "Please enter the daily reading passage."),
});

type DailyVerseFormValues = z.infer<typeof dailyVerseSchema>;

// ─── Icons ──────────────────────────────────────────────────────────────
const BookIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ef4444"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// ─── Helper: format ISO datetime for display ─────────────────────────────
const formatDateTime = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
};

// ─── Main Component ─────────────────────────────────────────────────────
export default function DailyVerse() {
  const [entries, setEntries] = useState<DailyVerseEntry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DailyVerseFormValues>({
    resolver: zodResolver(dailyVerseSchema),
    defaultValues: { date: "", verseReference: "", verseText: "", passage: "" },
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch(`${API_BASE_URL}/dailyverse/list`);
      if (!res.ok) throw new Error("Failed to fetch entries");
      const data = await res.json();
      const list: DailyVerseEntry[] = Array.isArray(data) ? data : [];
      list.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setEntries(list);
    } catch (err) {
      console.error(err);
      setFetchError("Could not load entries. Is the backend endpoint set up?");
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (values: DailyVerseFormValues) => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    console.log("Submitting values:", values);
    try {
      const res = await fetch(`${API_BASE_URL}/dailyverse/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: values.date,
          verseReference: values.verseReference.trim(),
          verseText: values.verseText.trim(),
          passage: values.passage.trim(),
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      setSaveSuccess("Saved successfully.");
      reset();
      fetchEntries();
    } catch (err) {
      console.error(err);
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/dailyverse/delete/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete entry.");
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Styles ───────────────────────────────────────────────────────────
  const s: { [key: string]: CSSProperties } = {
    page: {
      minHeight: "100vh",
      backgroundColor: "#f8f7ff",
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      boxSizing: "border-box",
    },
    contentWrapper: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "2rem 1.5rem",
      paddingTop: "100px",
    },
    headerSection: {
      display: "flex",
      alignItems: "center",
      gap: "14px",
      marginBottom: "28px",
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
    headerSub: {
      fontSize: "14px",
      color: "#6b7280",
      margin: "4px 0 0 0",
    },
    card: {
      backgroundColor: "white",
      borderRadius: "16px",
      border: "1px solid #e5e7eb",
      padding: "28px 32px",
      marginBottom: "32px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    },
    cardTitle: {
      fontSize: "16px",
      fontWeight: 600,
      color: "#111827",
      margin: "0 0 16px 0",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "32px",
      alignItems: "start",
    },
    formCol: {
      display: "flex",
      flexDirection: "column",
      gap: "18px",
    },
    label: {
      fontSize: "13px",
      fontWeight: 500,
      color: "#374151",
    },
    fieldError: {
      fontSize: "12px",
      color: "#dc2626",
      margin: "5px 0 0 0",
    },
    input: {
      width: "100%",
      padding: "10px 12px",
      border: "1.5px solid #e5e7eb",
      borderRadius: "10px",
      fontSize: "14px",
      color: "#374151",
      outline: "none",
      boxSizing: "border-box",
      backgroundColor: "white",
    },
    textarea: {
      width: "100%",
      padding: "10px 12px",
      border: "1.5px solid #e5e7eb",
      borderRadius: "10px",
      fontSize: "14px",
      color: "#374151",
      outline: "none",
      boxSizing: "border-box",
      backgroundColor: "white",
      fontFamily: "inherit",
      resize: "vertical",
      minHeight: "150px",
      lineHeight: "1.5",
    },
    btnRow: {
      display: "flex",
      gap: "10px",
    },
    saveBtn: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "#7c3aed",
      color: "white",
      border: "none",
      borderRadius: "10px",
      padding: "10px 22px",
      fontSize: "14px",
      fontWeight: 600,
      cursor: saving ? "not-allowed" : "pointer",
      opacity: saving ? 0.7 : 1,
    },
    errorBanner: {
      backgroundColor: "#fef2f2",
      color: "#dc2626",
      padding: "10px 16px",
      borderRadius: "10px",
      fontSize: "13px",
      marginTop: "14px",
      border: "1px solid #fecaca",
    },
    successBanner: {
      backgroundColor: "#f0fdf4",
      color: "#16a34a",
      padding: "10px 16px",
      borderRadius: "10px",
      fontSize: "13px",
      marginTop: "14px",
      border: "1px solid #bbf7d0",
    },
    entriesList: {
      display: "flex",
      flexDirection: "column",
      gap: "14px",
    },
    entryCard: {
      backgroundColor: "white",
      borderRadius: "14px",
      border: "1px solid #e5e7eb",
      padding: "16px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    },
    entryTopRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "10px",
    },
    entryDate: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "12px",
      fontWeight: 600,
      color: "#7c3aed",
      backgroundColor: "#ede9fe",
      padding: "4px 10px",
      borderRadius: "20px",
    },
    deleteBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#9ca3af",
      padding: "4px",
      borderRadius: "6px",
      display: "flex",
    },
    entryVerseRef: {
      fontSize: "14px",
      fontWeight: 700,
      color: "#111827",
      margin: "0 0 4px 0",
    },
    entryVerseText: {
      fontSize: "14px",
      color: "#374151",
      margin: "0 0 10px 0",
      fontStyle: "italic",
      lineHeight: "1.5",
    },
    entryPassageRow: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "13px",
      color: "#6b7280",
    },
    entryPassageLabel: {
      fontWeight: 600,
      color: "#374151",
    },
    noEntries: {
      textAlign: "center",
      color: "#9ca3af",
      fontSize: "15px",
      padding: "40px 0",
    },
  };

  return (
    <div style={s.page}>
      <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
        <Header />
      </div>

      <div style={s.contentWrapper}>
        {/* Page Title */}
        <div style={s.headerSection}>
          <div style={s.headerIconBox}>
            <BookIcon />
          </div>
          <div>
            <h1 style={s.headerTitle}>Daily Verse & Passage</h1>
            <p style={s.headerSub}>
              Add the day's promise verse and reading passage for your website
            </p>
          </div>
        </div>

        {/* Add Entry Card */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Add New Entry</h2>

          <form style={s.formGrid} onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={s.formCol}>
              <div>
                <label style={s.label}>Verse (Promise Word)</label>
                <textarea
                  style={{ ...s.textarea, marginTop: "6px" }}
                  placeholder="I can do all things through Christ who strengthens me."
                  {...register("verseText")}
                />
                {errors.verseText && (
                  <p style={s.fieldError}>{errors.verseText.message}</p>
                )}
              </div>

              <div>
                <label style={s.label}>Verse Reference</label>
                <input
                  style={{ ...s.input, marginTop: "6px" }}
                  type="text"
                  placeholder="e.g. Philippians 4:13"
                  {...register("verseReference")}
                />
                {errors.verseReference && (
                  <p style={s.fieldError}>{errors.verseReference.message}</p>
                )}
              </div>
            </div>

            <div style={s.formCol}>
              <div>
                <label style={s.label}>Passage (Daily Reading Plan)</label>
                <input
                  style={{ ...s.input, marginTop: "6px" }}
                  type="text"
                  placeholder="e.g. Mark 15:1-47"
                  {...register("passage")}
                />
                {errors.passage && (
                  <p style={s.fieldError}>{errors.passage.message}</p>
                )}
              </div>
              <div>
                <label style={s.label}>Scheduled Date & Time</label>
                <input
                  style={{
                    ...s.input,
                    marginTop: "6px",
                    backgroundColor: "white",
                    borderRadius: "12px",
                    colorScheme: "light",
                  }}
                  type="datetime-local"
                  onClick={(e) => {
                    const input = e.currentTarget as HTMLInputElement;
                    if ("showPicker" in input) {
                      input.showPicker();
                    }
                  }}
                />
                {errors.date && (
                  <p style={s.fieldError}>{errors.date.message}</p>
                )}
              </div>

              <div style={s.btnRow}>
                <button type="submit" style={s.saveBtn} disabled={saving}>
                  {saving ? "Saving..." : "Save Entry"}
                </button>
              </div>
            </div>
          </form>

          {saveError && <div style={s.errorBanner}>{saveError}</div>}
          {saveSuccess && <div style={s.successBanner}>{saveSuccess}</div>}
        </div>

        {/* Existing Entries */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Saved Entries</h2>

          {fetchError && <div style={s.errorBanner}>{fetchError}</div>}

          {fetching ? (
            <div style={s.noEntries}>Loading entries...</div>
          ) : entries.length === 0 ? (
            <div style={s.noEntries}>No entries added yet.</div>
          ) : (
            <div style={s.entriesList}>
              {entries.map((entry) => (
                <div key={entry.id} style={s.entryCard}>
                  <div style={s.entryTopRow}>
                    <span style={s.entryDate}>
                      <CalendarIcon />
                      {formatDateTime(entry.date)}
                    </span>
                    <button
                      style={s.deleteBtn}
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      title="Delete entry"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  <p style={s.entryVerseRef}>{entry.verseReference}</p>
                  <p style={s.entryVerseText}>"{entry.verseText}"</p>
                  <div style={s.entryPassageRow}>
                    <span style={s.entryPassageLabel}>Today's Reading:</span>
                    <span>{entry.passage}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
