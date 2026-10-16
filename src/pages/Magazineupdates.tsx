import { useState, useEffect, useRef } from "react";
import type { CSSProperties, ChangeEvent, DragEvent } from "react";
import Header from "../components/Header";

const API_BASE_URL = "/jrmobile"; // uses the CRA/Vite proxy — no CORS needed

// ─── API contract assumed for this page ──────────────────────────────────
// GET    {API_BASE_URL}/magazine/list          -> MagazineItem[]
// POST   {API_BASE_URL}/magazine/upload        -> multipart/form-data, fields:
//          "pdf" (file), "magazineType", "language", "name", "monthYear", "scheduleDateTime"
// DELETE {API_BASE_URL}/magazine/delete/:id    -> deletes one magazine
// Adjust the paths below if your backend uses different routes.

interface MagazineItem {
  id: string | number;
  name: string;
  magazineType: string;
  language: string;
  monthYear?: string; // e.g. "2026-09" (from an <input type="month">)
  fileUrl: string;
  scheduleDateTime?: string;
  createdAt?: string;
}

const MAGAZINE_TYPES = ["JR Magazine", "Youth Magazine", "Kids Magazine"];
const LANGUAGES = [
  "English",
  "Tamil",
  "Hindi",
  "Malayalam",
  "Telugu",
  "Kannada",
  "Other",
];

// ─── Icons ──────────────────────────────────────────────────────────────
const UploadCloudIcon = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 16l-4-4-4 4" />
    <path d="M12 12v9" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    <path d="M16 16l-4-4-4 4" />
  </svg>
);

const MagazineIcon = () => (
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

const PdfIcon = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#dc2626"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
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

const CloseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#374151"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Helper: resolve a file URL returned by the backend ──────────────────
const resolveFileUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

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

// ─── Helper: format "YYYY-MM" (from <input type="month">) for display ────
const formatMonthYear = (value: string) => {
  if (!value) return "";
  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return value;
  const monthNames = [
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
  return `${monthNames[month - 1]} ${year}`;
};

// ─── Main Component ─────────────────────────────────────────────────────
export default function MagazineManagement() {
  const [magazines, setMagazines] = useState<MagazineItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [magazineName, setMagazineName] = useState("");
  const [magazineType, setMagazineType] = useState(MAGAZINE_TYPES[0]);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [monthYear, setMonthYear] = useState("");
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchMagazines();
  }, []);

  const fetchMagazines = async () => {
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch(`${API_BASE_URL}/magazine/list`);
      if (!res.ok) throw new Error("Failed to fetch magazines");
      const data = await res.json();
      setMagazines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setFetchError(
        "Could not load magazines. Is the backend endpoint set up?",
      );
    } finally {
      setFetching(false);
    }
  };

  const pickFile = (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setUploadError("Please choose a PDF file.");
      return;
    }
    setUploadError("");
    setUploadSuccess("");
    setSelectedFile(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    pickFile(e.target.files ? e.target.files[0] : null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    pickFile(e.dataTransfer.files ? e.dataTransfer.files[0] : null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearForm = () => {
    clearFile();
    setMagazineName("");
    setMagazineType(MAGAZINE_TYPES[0]);
    setLanguage(LANGUAGES[0]);
    setMonthYear("");
    setScheduleDateTime("");
  };

  const handleUpload = async () => {
    if (!magazineName.trim()) {
      setUploadError("Please enter the magazine name.");
      return;
    }
    if (!monthYear) {
      setUploadError("Please choose the magazine month & year.");
      return;
    }
    if (!selectedFile) {
      setUploadError("Please upload the magazine PDF file.");
      return;
    }
    if (!scheduleDateTime) {
      setUploadError("Please choose a schedule date and time.");
      return;
    }
    setUploading(true);
    setUploadError("");
    setUploadSuccess("");
    try {
      const formData = new FormData();
      formData.append("name", magazineName.trim());
      formData.append("magazineType", magazineType);
      formData.append("language", language);
      formData.append("monthYear", monthYear);
      formData.append("scheduleDateTime", scheduleDateTime);
      formData.append("pdf", selectedFile);

      const res = await fetch(`${API_BASE_URL}/magazine/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      setUploadSuccess("Magazine uploaded successfully.");
      clearForm();
      fetchMagazines();
    } catch (err) {
      console.error(err);
      setUploadError("Failed to upload magazine. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm("Delete this magazine? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/magazine/delete/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setMagazines((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete magazine.");
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
    formCol: {
      display: "flex",
      flexDirection: "column",
      gap: "18px",
    },
    fieldRow: {
      display: "flex",
      gap: "20px",
      flexWrap: "wrap",
       width: "100%"
    },
    fieldItem: {
      flex: "1 1 220px",
    },
    label: {
      fontSize: "13px",
      fontWeight: 500,
      color: "#374151",
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
    dropzone: {
      border: `2px dashed ${dragActive ? "#7c3aed" : "#d1d5db"}`,
      borderRadius: "14px",
      backgroundColor: dragActive ? "#f5f3ff" : "#fafafa",
      padding: "20px",
      textAlign: "center",
      cursor: "pointer",
      transition: "border-color 0.15s, background-color 0.15s",
      color: "#6b7280",
    },
    dropzoneIcon: {
      color: "#7c3aed",
      marginBottom: "6px",
    },
    dropzoneText: {
      fontSize: "13px",
      fontWeight: 500,
      color: "#374151",
      margin: "4px 0 2px 0",
    },
    dropzoneSub: {
      fontSize: "12px",
      color: "#9ca3af",
      margin: 0,
    },
    previewFileRow: {
      display: "flex",
      alignItems: "center",
      gap: "14px",
      border: "1.5px solid #e5e7eb",
      borderRadius: "12px",
      padding: "10px 14px",
      backgroundColor: "#fafafa",
    },
    previewFileIconBox: {
      width: "44px",
      height: "44px",
      borderRadius: "8px",
      backgroundColor: "#fee2e2",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    previewFileInfo: {
      flex: 1,
      minWidth: 0,
    },
    previewFileName: {
      fontSize: "13px",
      fontWeight: 600,
      color: "#111827",
      margin: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    previewFileSize: {
      fontSize: "12px",
      color: "#9ca3af",
      margin: "2px 0 0 0",
    },
    previewRemoveBtn: {
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      backgroundColor: "#f3f4f6",
      border: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      flexShrink: 0,
      padding: 0,
    },
    btnRow: {
      display: "flex",
      gap: "10px",
    },
    uploadBtn: {
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
      cursor: uploading ? "not-allowed" : "pointer",
      opacity: uploading ? 0.7 : 1,
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
    magazinesGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      gap: "18px",
    },
    magazineCard: {
      backgroundColor: "white",
      borderRadius: "14px",
      border: "1px solid #e5e7eb",
      padding: "16px 18px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      display: "flex",
      gap: "14px",
    },
    magazineIconBox: {
      width: "48px",
      height: "48px",
      borderRadius: "10px",
      backgroundColor: "#fee2e2",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    magazineBody: {
      flex: 1,
      minWidth: 0,
    },
    magazineTitleRow: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "8px",
    },
    magazineName: {
      fontSize: "14px",
      fontWeight: 700,
      color: "#111827",
      margin: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    magazineTagsRow: {
      display: "flex",
      gap: "6px",
      marginTop: "6px",
      flexWrap: "wrap",
    },
    magazineTag: {
      fontSize: "11px",
      fontWeight: 600,
      padding: "2px 9px",
      borderRadius: "20px",
      backgroundColor: "#ede9fe",
      color: "#7c3aed",
    },
    magazineSchedule: {
      fontSize: "11px",
      color: "#9ca3af",
      marginTop: "8px",
    },
    magazineLinkRow: {
      marginTop: "8px",
    },
    magazineLink: {
      fontSize: "12px",
      fontWeight: 600,
      color: "#7c3aed",
      textDecoration: "none",
    },
    deleteBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#9ca3af",
      padding: "4px",
      borderRadius: "6px",
      flexShrink: 0,
      display: "flex",
    },
    noMagazines: {
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
            <MagazineIcon />
          </div>
          <div>
            <h1 style={s.headerTitle}>Magazine Management</h1>
            <p style={s.headerSub}>
              Upload magazine PDFs to publish on your website
            </p>
          </div>
        </div>

        {/* Upload Card */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Upload New Magazine</h2>

          <div style={s.formCol}>
            <div style={s.fieldRow}>
              <div style={s.fieldItem}>
                <label style={s.label}>Magazine Name</label>
                <input
                  style={{ ...s.input, marginTop: "6px" }}
                  type="text"
                  placeholder="Jesus Redeems Magazine"
                  value={magazineName}
                  onChange={(e) => setMagazineName(e.target.value)}
                />
              </div>

              <div style={s.fieldItem}>
                <label style={s.label}>Magazine Month Year</label>
                <input
                  style={{
                    ...s.input,
                    marginTop: "6px",
                    backgroundColor: "white",
                    borderRadius: "12px",
                    colorScheme: "light",
                  }}
                  type="date"
                  onClick={(e) => {
                    const input = e.currentTarget as HTMLInputElement;
                    if ("showPicker" in input) {
                      input.showPicker();
                    }
                  }}
                />
              </div>

              <div style={s.fieldItem}>
                <label style={s.label}>Magazine Type</label>
                <select
                  style={{ ...s.input, marginTop: "6px" }}
                  value={magazineType}
                  onChange={(e) => setMagazineType(e.target.value)}
                >
                  {MAGAZINE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ ...s.fieldItem, flex: "1 1 250px" }}>
                <label style={s.label}>Magazine Language</label>
                <select
                  style={{ ...s.input, marginTop: "6px" }}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ ...s.fieldItem,}}>
                <label style={s.label}>Schedule Date & Time</label>
                <input
                  style={{
                    ...s.input,
                    width: "100%", // Input fills the 250px container
                    marginTop: "6px",
                    backgroundColor: "white",
                    color: "black", // Ensures typed text is black
                    borderRadius: "12px",
                    colorScheme: "light", // Keeps picker background white
                    padding: "10px", // Balanced padding
                  }}
                  type="datetime-local"
                  onClick={(e) => {
                    const input = e.currentTarget as HTMLInputElement;
                    if ("showPicker" in input) {
                      input.showPicker();
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <label style={s.label}>Magazine PDF Upload</label>
              <div style={{ marginTop: "6px" }}>
                {!selectedFile ? (
                  <div
                    style={s.dropzone}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <div style={s.dropzoneIcon}>
                      <UploadCloudIcon />
                    </div>
                    <p style={s.dropzoneText}>
                      Click to browse or drag & drop a PDF file here
                    </p>
                    <p style={s.dropzoneSub}>PDF only</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                  </div>
                ) : (
                  <div style={s.previewFileRow}>
                    <div style={s.previewFileIconBox}>
                      <PdfIcon />
                    </div>
                    <div style={s.previewFileInfo}>
                      <p style={s.previewFileName}>{selectedFile.name}</p>
                      <p style={s.previewFileSize}>
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    <button
                      style={s.previewRemoveBtn}
                      onClick={clearFile}
                      disabled={uploading}
                      title="Remove file"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={s.fieldRow}>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
                <button
                  style={s.uploadBtn}
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  <UploadCloudIcon />
                  {uploading ? "Uploading..." : "Upload Magazine"}
                </button>
              </div>
            </div>
          </div>

          {uploadError && <div style={s.errorBanner}>{uploadError}</div>}
          {uploadSuccess && <div style={s.successBanner}>{uploadSuccess}</div>}
        </div>

        {/* Existing Magazines */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Uploaded Magazines</h2>

          {fetchError && <div style={s.errorBanner}>{fetchError}</div>}

          {fetching ? (
            <div style={s.noMagazines}>Loading magazines...</div>
          ) : magazines.length === 0 ? (
            <div style={s.noMagazines}>No magazines uploaded yet.</div>
          ) : (
            <div style={s.magazinesGrid}>
              {magazines.map((mag) => (
                <div key={mag.id} style={s.magazineCard}>
                  <div style={s.magazineIconBox}>
                    <PdfIcon />
                  </div>
                  <div style={s.magazineBody}>
                    <div style={s.magazineTitleRow}>
                      <p style={s.magazineName}>{mag.name || "Untitled"}</p>
                      <button
                        style={s.deleteBtn}
                        onClick={() => handleDelete(mag.id)}
                        disabled={deletingId === mag.id}
                        title="Delete magazine"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                    <div style={s.magazineTagsRow}>
                      {mag.monthYear && (
                        <span style={s.magazineTag}>
                          {formatMonthYear(mag.monthYear)}
                        </span>
                      )}
                      <span style={s.magazineTag}>{mag.magazineType}</span>
                      <span style={s.magazineTag}>{mag.language}</span>
                    </div>
                    {mag.scheduleDateTime && (
                      <p style={s.magazineSchedule}>
                        {formatDateTime(mag.scheduleDateTime)}
                      </p>
                    )}
                    {mag.fileUrl && (
                      <div style={s.magazineLinkRow}>
                        <a
                          href={resolveFileUrl(mag.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={s.magazineLink}
                        >
                          View PDF
                        </a>
                      </div>
                    )}
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
