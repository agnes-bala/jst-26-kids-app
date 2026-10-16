import { useState, useRef } from "react";
import type { CSSProperties, ChangeEvent, DragEvent } from "react";
import Header from "../components/Header";

const API_BASE_URL = "/jrmobile"; // uses the CRA/Vite proxy — no CORS needed

// ─── API contract assumed for this page ──────────────────────────────────
// GET    {API_BASE_URL}/video/list           -> VideoItem[]
// POST   {API_BASE_URL}/video/upload         -> multipart/form-data, fields: "video" (file, optional), "name", "description", "videoUrl", "scheduleDateTime"
// DELETE {API_BASE_URL}/video/delete/:id     -> deletes one video
// Adjust the paths below if your backend uses different routes.

interface VideoItem {
  id: string | number;
  name: string;
  description?: string;
  videoUrl?: string; // external link (e.g. YouTube) — optional
  fileUrl?: string; // uploaded file path returned by backend — optional
  scheduleDateTime?: string; // ISO datetime string — when the video should go live
  createdAt?: string;
}

// ─── Icons ──────────────────────────────────────────────────────────────
const UploadCloudIcon = () => (
  <svg
    width="30"
    height="30"
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

const VideoIcon = () => (
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
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
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
    stroke="white"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlayCircleIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="white" stroke="none">
    <circle cx="12" cy="12" r="11" fill="rgba(17,24,39,0.55)" />
    <polygon points="10 8 16 12 10 16 10 8" fill="white" />
  </svg>
);

// ─── Helper: resolve a file URL returned by the backend ──────────────────
const resolveFileUrl = (url: string) => {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  )
    return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

// ─── Helper: pull a YouTube thumbnail if the link is a YouTube URL ────────
const getYouTubeThumbnail = (url?: string) => {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
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

// ─── Main Component ─────────────────────────────────────────────────────
export default function WalkWithJesus() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  //   useEffect(() => {
  //     fetchVideos();
  //   }, []);

  const fetchVideos = async () => {
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch(`${API_BASE_URL}/video/list`);
      if (!res.ok) throw new Error("Failed to fetch videos");
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setFetchError("Could not load videos. Is the backend endpoint set up?");
    } finally {
      setFetching(false);
    }
  };

  const pickFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setUploadError("Please choose a video file.");
      return;
    }
    setUploadError("");
    setUploadSuccess("");
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
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
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearForm = () => {
    clearFile();
    setVideoName("");
    setDescription("");
    setVideoUrl("");
    setScheduleDateTime("");
  };

  const handleUpload = async () => {
    if (!videoName.trim()) {
      setUploadError("Please enter a video name.");
      return;
    }
    if (!selectedFile && !videoUrl.trim()) {
      setUploadError("Please either upload a video file or enter a video URL.");
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
      formData.append("name", videoName.trim());
      if (description.trim())
        formData.append("description", description.trim());
      if (videoUrl.trim()) formData.append("videoUrl", videoUrl.trim());
      if (selectedFile) formData.append("video", selectedFile);
      formData.append("scheduleDateTime", scheduleDateTime);

      const res = await fetch(`${API_BASE_URL}/video/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      setUploadSuccess("Video uploaded successfully.");
      clearForm();
      fetchVideos();
    } catch (err) {
      console.error(err);
      setUploadError("Failed to upload video. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm("Delete this video? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/video/delete/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete video.");
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
      minHeight: "90px",
      lineHeight: "1.5",
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
    previewThumb: {
      width: "72px",
      height: "48px",
      objectFit: "cover",
      borderRadius: "8px",
      backgroundColor: "#000",
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
    videosGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
      gap: "20px",
    },
    videoCard: {
      backgroundColor: "white",
      borderRadius: "14px",
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    },
    videoThumbWrapper: {
      position: "relative",
      width: "100%",
      height: "140px",
      backgroundColor: "#111827",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    videoThumbImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
    playOverlay: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    },
    videoCardBody: {
      padding: "12px 14px",
    },
    videoTitleRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
    },
    videoTitle: {
      fontSize: "13px",
      fontWeight: 600,
      color: "#111827",
      margin: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    videoDescription: {
      fontSize: "12px",
      color: "#6b7280",
      margin: "4px 0 0 0",
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
    },
    videoSchedule: {
      fontSize: "11px",
      color: "#9ca3af",
      margin: "8px 0 0 0",
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
    noVideos: {
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
            <VideoIcon />
          </div>
          <div>
            <h1 style={s.headerTitle}>Video Management</h1>
            <p style={s.headerSub}>
              Upload videos or link external video URLs to show on your website
            </p>
          </div>
        </div>

        {/* Upload Card */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Upload New Video</h2>

          <div style={s.formCol}>
            <div style={s.fieldRow}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Video Name</label>
                <input
                  style={{ ...s.input, marginTop: "6px" }}
                  type="text"
                  placeholder="e.g. Sunday Service Highlights"
                  value={videoName}
                  onChange={(e) => setVideoName(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Video URL (optional)</label>
                <input
                  style={{ ...s.input, marginTop: "6px" }}
                  type="text"
                  placeholder="e.g. https://youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
              </div>
            </div>

            <div style={s.formCol}>
              <div style={s.fieldRow}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Video Description</label>
                  <textarea
                    style={{ ...s.textarea, marginTop: "6px" }}
                    placeholder="Short description of this video..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Schedule Date & Time</label>
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
                </div>
              </div>
            </div>

            <div>
              <label style={s.label}>Video Upload</label>
              <div style={{ marginTop: "6px" }}>
                {!previewUrl ? (
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
                      Click to browse or drag & drop a video file here
                    </p>
                    <p style={s.dropzoneSub}>
                      MP4, MOV or WEBM — or leave empty and use a Video URL
                      instead
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                  </div>
                ) : (
                  <div style={s.previewFileRow}>
                    <video src={previewUrl} style={s.previewThumb} />
                    <div style={s.previewFileInfo}>
                      <p style={s.previewFileName}>{selectedFile?.name}</p>
                      <p style={s.previewFileSize}>
                        {selectedFile
                          ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                          : ""}
                      </p>
                    </div>
                    <button
                      style={s.previewRemoveBtn}
                      onClick={clearFile}
                      disabled={uploading}
                      title="Remove video file"
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
                  {uploading ? "Uploading..." : "Upload Video"}
                </button>
              </div>
            </div>
          </div>

          {uploadError && <div style={s.errorBanner}>{uploadError}</div>}
          {uploadSuccess && <div style={s.successBanner}>{uploadSuccess}</div>}
        </div>

        {/* Existing Videos */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Uploaded Videos</h2>

          {fetchError && <div style={s.errorBanner}>{fetchError}</div>}

          {fetching ? (
            <div style={s.noVideos}>Loading videos...</div>
          ) : videos.length === 0 ? (
            <div style={s.noVideos}>No videos uploaded yet.</div>
          ) : (
            <div style={s.videosGrid}>
              {videos.map((vid) => {
                const ytThumb = getYouTubeThumbnail(vid.videoUrl);
                return (
                  <div key={vid.id} style={s.videoCard}>
                    <div style={s.videoThumbWrapper}>
                      {ytThumb ? (
                        <img
                          src={ytThumb}
                          alt={vid.name}
                          style={s.videoThumbImg}
                        />
                      ) : vid.fileUrl ? (
                        <video
                          src={resolveFileUrl(vid.fileUrl)}
                          style={s.videoThumbImg}
                        />
                      ) : (
                        <VideoIcon />
                      )}
                      <div style={s.playOverlay}>
                        <PlayCircleIcon />
                      </div>
                    </div>
                    <div style={s.videoCardBody}>
                      <div style={s.videoTitleRow}>
                        <p style={s.videoTitle}>{vid.name || "Untitled"}</p>
                        <button
                          style={s.deleteBtn}
                          onClick={() => handleDelete(vid.id)}
                          disabled={deletingId === vid.id}
                          title="Delete video"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                      {vid.description && (
                        <p style={s.videoDescription}>{vid.description}</p>
                      )}
                      {vid.scheduleDateTime && (
                        <p style={s.videoSchedule}>
                          {formatDateTime(vid.scheduleDateTime)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
