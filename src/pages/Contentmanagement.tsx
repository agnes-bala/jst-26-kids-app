import { useState, useEffect, useRef } from "react";
import type { CSSProperties, ChangeEvent, DragEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import Header from "../components/Header";

// ─── Supabase Initialization ─────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STORAGE_BUCKET = "Slider Images";
const API_BASE_URL = "/jrmobile"; // uses the CRA/Vite proxy — no CORS needed

interface SliderImage {
  SliderID: string | number;
  SliderName: string;
  SliderDescription?: string;
  SliderTags: string;
  SliderURL: string;
  SliderPosition: number;
  ScheduledUpTime: string; // ISO datetime string
  ScheduledDownTime: string; // ISO datetime string
  IsActive: boolean;
  IsDeleted: boolean;
  CreatedAt?: string;
  CreatedBy?: string;
}

// ─── Validation schema ───────────────────────────────────────────────────
const sliderSchema = z
  .object({
    SliderName: z.string().trim().min(1, "Please enter a slider name."),
    SliderURL: z.string().min(1, "Please upload an image to generate the URL."),
    IsActive: z.boolean(),
    SliderPosition: z
      .string()
      .min(1, "Please enter an order number.")
      .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, {
        message: "Order must be a positive whole number (e.g. 1, 2, 3).",
      }),
    ScheduledUpTime: z.string().min(1, "Please choose a start date and time."),
    ScheduledDownTime: z.string().min(1, "Please choose an end date and time."),
    SliderDescription: z.string().trim().optional(),
    CreatedBy: z.string().trim().optional(),
    IsDeleted: z.boolean(),
  })
  .refine(
    (v) =>
      !v.ScheduledUpTime ||
      !v.ScheduledDownTime ||
      new Date(v.ScheduledDownTime) > new Date(v.ScheduledUpTime),
    {
      message: "End time must be after the start time.",
      path: ["ScheduledDownTime"],
    },
  );

type SliderFormValues = z.infer<typeof sliderSchema>;

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
  </svg>
);

const ImageOutlineIcon = () => (
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
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
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

const GripIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────
const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  )
    return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

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

// ISO string -> "YYYY-MM-DDTHH:mm" (local time) for <input type="datetime-local">
const toInputDateTime = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

const getDefaultValues = (): SliderFormValues => ({
  SliderName: "",
  SliderURL: "",
  IsActive: true,
  IsDeleted: false,
  SliderPosition: "",
  ScheduledUpTime: "",
  ScheduledDownTime: "",
  SliderDescription: "",
  CreatedBy: localStorage.getItem("username") || "",
});

// ─── Main Component ─────────────────────────────────────────────────────
export default function ContentManagement() {
  const [images, setImages] = useState<SliderImage[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [previewUrl, setPreviewUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState("");

  // Edit mode: the SliderID currently loaded into the form (null = create mode)
  const [editingId, setEditingId] = useState<string | number | null>(null);

  // Upload status states
  const [uploadingToSupabase, setUploadingToSupabase] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [togglingId, setTogglingId] = useState<string | number | null>(null);

  // Reorder (drag & drop) states
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SliderFormValues>({
    resolver: zodResolver(sliderSchema),
    defaultValues: getDefaultValues(),
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formCardRef = useRef<HTMLDivElement | null>(null);
  // Name of the file currently uploaded to Supabase but not yet saved to the
  // backend. Used to remove orphaned files if the user discards the image.
  const uploadedFileNameRef = useRef<string | null>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch(`${API_BASE_URL}/imageslider/list`);
      if (!res.ok) throw new Error("Failed to fetch slider images");
      const data = await res.json();
      const list: SliderImage[] = Array.isArray(data) ? data : [];
      list.sort((a, b) => (a.SliderPosition ?? 0) - (b.SliderPosition ?? 0));
      setImages(list);
    } catch (err) {
      console.error(err);
      setFetchError(
        "Could not load slider images. Is the backend endpoint set up?",
      );
    } finally {
      setFetching(false);
    }
  };

  // Upload directly to Supabase when a file is picked
  const pickFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Please choose an image file.");
      return;
    }
    setFileError("");
    setUploadSuccess("");

    try {
      setUploadingToSupabase(true);

      // Unique name: timestamp.extension
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      // 1. Upload to Supabase Storage bucket
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file);

      if (storageError) throw storageError;
      uploadedFileNameRef.current = fileName;

      // 2. Get Public URL
      const { data: publicData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);

      const generatedUrl = publicData.publicUrl;

      // 3. Populate preview and fill the form input field
      setPreviewUrl(generatedUrl);
      setValue("SliderURL", generatedUrl, { shouldValidate: true });
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setFileError("Supabase upload failed: " + err.message);
      } else {
        setFileError("Failed to upload image to Supabase.");
      }
    } finally {
      setUploadingToSupabase(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    pickFile(e.target.files?.[0] ?? null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (uploadingToSupabase) return;
    pickFile(e.dataTransfer.files?.[0] ?? null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  // Clears the local selection only (used after a successful save, where the
  // file in storage must be kept).
  const clearSelection = () => {
    uploadedFileNameRef.current = null;
    setPreviewUrl("");
    setFileError("");
    setValue("SliderURL", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Removes a file that was uploaded in this session but never saved.
  // The ORIGINAL image of an item being edited is never in this ref, so it is
  // never deleted from storage by mistake.
  const discardPendingUpload = async () => {
    const fileName = uploadedFileNameRef.current;
    uploadedFileNameRef.current = null;
    if (!fileName) return;
    try {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([fileName]);
      if (error) console.error("Failed to remove file from storage:", error);
    } catch (err) {
      console.error(err);
    }
  };

  // User discarded the image: also remove the orphaned file from storage.
  const handleRemoveImage = async () => {
    const pending = discardPendingUpload();
    clearSelection();
    await pending;
  };

  // ─── Edit mode ────────────────────────────────────────────────────────
  // Click on a card -> load its details into the form above.
  const handleEdit = (img: SliderImage) => {
    // If a new image was uploaded for a previous (unsaved) edit, clean it up.
    discardPendingUpload();

    setEditingId(img.SliderID);
    setUploadError("");
    setUploadSuccess("");
    setFileError("");

    reset({
      SliderName: img.SliderName || "",
      SliderDescription: img.SliderDescription || "",
      SliderURL: img.SliderURL || "",
      SliderPosition: String(img.SliderPosition ?? ""),
      ScheduledUpTime: toInputDateTime(img.ScheduledUpTime),
      ScheduledDownTime: toInputDateTime(img.ScheduledDownTime),
      IsActive: !!img.IsActive,
      IsDeleted: !!img.IsDeleted,
      CreatedBy: img.CreatedBy || localStorage.getItem("username") || "",
    });
    setPreviewUrl(resolveImageUrl(img.SliderURL));
    if (fileInputRef.current) fileInputRef.current.value = "";

    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCancelEdit = () => {
    discardPendingUpload();
    setEditingId(null);
    setPreviewUrl("");
    setFileError("");
    setUploadError("");
    setUploadSuccess("");
    reset(getDefaultValues());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (values: SliderFormValues) => {
    setFileError("");
    setUploading(true);
    setUploadError("");
    setUploadSuccess("");
    const isEditing = editingId !== null;
    try {
      const payload = {
        SliderName: values.SliderName.trim(),
        SliderDescription: values.SliderDescription?.trim() || "",
        SliderURL: values.SliderURL,
        SliderPosition: String(Number(values.SliderPosition)),
        ScheduledUpTime: values.ScheduledUpTime,
        ScheduledDownTime: values.ScheduledDownTime,
        IsActive: values.IsActive,
        IsDeleted: values.IsDeleted,
        CreatedBy:
          values.CreatedBy?.trim() || localStorage.getItem("username") || "",
      };

      // NOTE: update uses PATCH {API_BASE_URL}/imageslider/update/:id (the same
      // endpoint your reorder code already calls) with the full payload.
      const res = await fetch(
        isEditing
          ? `${API_BASE_URL}/imageslider/update/${editingId}`
          : `${API_BASE_URL}/imageslider/add`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok)
        throw new Error(isEditing ? "Update failed" : "Upload failed");

      setUploadSuccess(
        isEditing
          ? "Slider updated successfully."
          : "Image saved successfully.",
      );
      setEditingId(null);
      clearSelection();
      reset(getDefaultValues());
      fetchImages();
    } catch (err) {
      console.error(err);
      setUploadError(
        isEditing
          ? "Failed to update slider image. Please try again."
          : "Failed to save slider image. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm("Delete this slider image? This cannot be undone."))
      return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/imageslider/delete/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setImages((prev) => prev.filter((img) => img.SliderID !== id));
      // If the deleted item was being edited, leave edit mode.
      if (editingId === id) handleCancelEdit();
    } catch (err) {
      console.error(err);
      alert("Failed to delete image.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (img: SliderImage) => {
    const nextStatus: boolean = !img.IsActive;
    setTogglingId(img.SliderID);
    try {
      const res = await fetch(
        `${API_BASE_URL}/imageslider/update/${img.SliderID}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            IsActive: nextStatus,
            SliderName: img.SliderName,
            SliderDescription: img.SliderDescription,
            SliderURL: img.SliderURL,
            SliderPosition: img.SliderPosition,
            ScheduledUpTime: img.ScheduledUpTime,
            ScheduledDownTime: img.ScheduledDownTime,
            IsDeleted: img.IsDeleted,
            CreatedBy: img.CreatedBy,
          }),
        },
      );
      if (!res.ok) throw new Error("Status update failed");
      setImages((prev) =>
        prev.map((i) =>
          i.SliderID === img.SliderID ? { ...i, IsActive: nextStatus } : i,
        ),
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    } finally {
      setTogglingId(null);
    }
  };

  // ─── Drag & drop reordering ─────────────────────────────────────────────
  // Reorders the local list live while dragging over other cards, then
  // persists only the changed SliderPosition values to the backend on drop.
  const handleCardDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (reordering) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index)); // required by Firefox
    const card = e.currentTarget.closest(
      "[data-slider-card]",
    ) as HTMLElement | null;
    if (card) e.dataTransfer.setDragImage(card, 20, 20); // drag the whole card
    setDraggingIndex(index);
  };

  const handleCardDragEnter = (index: number) => {
    if (draggingIndex === null || draggingIndex === index) return;
    setImages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(draggingIndex, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
    setDraggingIndex(index);
  };

  const handleCardDragOver = (e: DragEvent<HTMLDivElement>) => {
    // Required so the browser allows a drop on this element.
    e.preventDefault();
  };

  const handleCardDragEnd = async () => {
    if (draggingIndex === null) return;
    setDraggingIndex(null);

    // Recompute sequential positions (1, 2, 3...) based on the new order.
    const reordered = images.map((img, idx) => ({
      ...img,
      SliderPosition: idx + 1,
    }));
    // Only send items whose position actually changed.
    const changed = reordered.filter(
      (img, idx) => images[idx].SliderPosition !== idx + 1,
    );
    setImages(reordered);
    if (changed.length === 0) return;

    setReordering(true);
    setReorderError("");
    try {
      // NOTE: assumes a per-item endpoint PATCH {API_BASE_URL}/imageslider/update/:id
      // with body { SliderPosition }. If your backend has a single bulk
      // "reorder" endpoint, swap this for one call.
      await Promise.all(
        changed.map((img) =>
          fetch(`${API_BASE_URL}/imageslider/update/${img.SliderID}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              SliderPosition: img.SliderPosition,
              SliderName: img.SliderName,
              SliderDescription: img.SliderDescription,
              SliderURL: img.SliderURL,
              ScheduledUpTime: img.ScheduledUpTime,
              ScheduledDownTime: img.ScheduledDownTime,
              IsActive: img.IsActive,
              IsDeleted: img.IsDeleted,
              CreatedBy: img.CreatedBy,
            }),
          }).then((res) => {
            if (!res.ok)
              throw new Error(`Failed to update position for ${img.SliderID}`);
          }),
        ),
      );
    } catch (err) {
      console.error(err);
      setReorderError("Failed to save the new order. Reloading the list.");
      fetchImages();
    } finally {
      setReordering(false);
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
      scrollMarginTop: "90px", // keeps the form clear of the sticky header
    },
    cardTitleRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "16px",
    },
    cardTitle: {
      fontSize: "16px",
      fontWeight: 600,
      color: "#111827",
      margin: 0,
    },
    reorderingBadge: {
      fontSize: "12px",
      fontWeight: 600,
      color: "#7c3aed",
      backgroundColor: "#ede9fe",
      padding: "4px 12px",
      borderRadius: "20px",
    },
    formCol: {
      display: "flex",
      flexDirection: "column",
      gap: "18px",
    },
    statusOrderRow: {
      display: "flex",
      gap: "16px",
    },
    uploadGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "32px",
      alignItems: "start",
    },
    dropzone: {
      border: `2px dashed ${dragActive ? "#7c3aed" : "#d1d5db"}`,
      borderRadius: "14px",
      backgroundColor: dragActive ? "#f5f3ff" : "#fafafa",
      padding: "32px",
      textAlign: "center",
      cursor: uploadingToSupabase ? "not-allowed" : "pointer",
      transition: "border-color 0.15s, background-color 0.15s",
      color: "#6b7280",
    },
    dropzoneIcon: {
      color: "#7c3aed",
      marginBottom: "8px",
    },
    dropzoneText: {
      fontSize: "14px",
      fontWeight: 500,
      color: "#374151",
      margin: "4px 0 2px 0",
    },
    dropzoneSub: {
      fontSize: "12px",
      color: "#9ca3af",
      margin: 0,
    },
    previewWrapper: {
      position: "relative",
      width: "100%",
    },
    previewCloseBtn: {
      position: "absolute",
      top: "8px",
      right: "8px",
      width: "26px",
      height: "26px",
      borderRadius: "50%",
      backgroundColor: "rgba(17, 24, 39, 0.6)",
      border: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      padding: 0,
    },
    previewImage: {
      width: "100%",
      height: "220px",
      objectFit: "cover",
      borderRadius: "12px",
      border: "1px solid #e5e7eb",
      backgroundColor: "#f3f4f6",
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
      minHeight: "70px",
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
      cursor: uploading || uploadingToSupabase ? "not-allowed" : "pointer",
      opacity: uploading || uploadingToSupabase ? 0.7 : 1,
    },
    cancelBtn: {
      display: "flex",
      alignItems: "center",
      backgroundColor: "white",
      color: "#374151",
      border: "1.5px solid #e5e7eb",
      borderRadius: "10px",
      padding: "10px 22px",
      fontSize: "14px",
      fontWeight: 600,
      cursor: uploading ? "not-allowed" : "pointer",
    },
    editingBadge: {
      fontSize: "12px",
      fontWeight: 600,
      color: "#7c3aed",
      backgroundColor: "#ede9fe",
      padding: "4px 12px",
      borderRadius: "20px",
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
    imagesGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: "20px",
    },
    imgCard: {
      backgroundColor: "white",
      borderRadius: "14px",
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      transition: "opacity 0.15s, box-shadow 0.15s, border-color 0.15s",
      cursor: "pointer",
    },
    imgThumb: {
      width: "100%",
      height: "130px",
      objectFit: "cover",
      display: "block",
      backgroundColor: "#f3f4f6",
    },
    imgThumbWrapper: {
      position: "relative",
    },
    orderBadge: {
      position: "absolute",
      top: "8px",
      left: "8px",
      backgroundColor: "rgba(17, 24, 39, 0.65)",
      color: "white",
      fontSize: "11px",
      fontWeight: 700,
      padding: "2px 8px",
      borderRadius: "20px",
    },
    dragHandle: {
      position: "absolute",
      top: "8px",
      right: "8px",
      width: "26px",
      height: "26px",
      borderRadius: "8px",
      backgroundColor: "rgba(17, 24, 39, 0.55)",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "grab",
    },
    imgMetaRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      marginTop: "10px",
    },
    imgDateTime: {
      fontSize: "11px",
      color: "#9ca3af",
    },
    imgCardBody: {
      padding: "12px 14px",
    },
    imgTitleRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
    },
    imgTitle: {
      fontSize: "13px",
      fontWeight: 600,
      color: "#111827",
      margin: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    imgDescription: {
      fontSize: "12px",
      color: "#6b7280",
      margin: "4px 0 0 0",
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
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
    noImages: {
      textAlign: "center",
      color: "#9ca3af",
      fontSize: "15px",
      padding: "40px 0",
    },
    switchTrack: {
      position: "relative",
      width: "44px",
      height: "24px",
      borderRadius: "999px",
      border: "none",
      padding: "2px",
      transition: "background-color 0.2s ease",
      display: "inline-flex",
      alignItems: "center",
    },
    switchThumb: {
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      backgroundColor: "#fff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      transition: "transform 0.2s ease",
    },
  };

  const isEditing = editingId !== null;

  return (
    <div style={s.page}>
      <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
        <Header />
      </div>

      <div style={s.contentWrapper}>
        {/* Page Title */}
        <div style={s.headerSection}>
          <div style={s.headerIconBox}>
            <ImageOutlineIcon />
          </div>
          <div>
            <h1 style={s.headerTitle}>Slider Images</h1>
            <p style={s.headerSub}>
              Upload and manage the images shown in your website's homepage
              slider
            </p>
          </div>
        </div>

        {/* Upload / Edit Card */}
        <div style={s.card} ref={formCardRef}>
          <div style={s.cardTitleRow}>
            <h2 style={s.cardTitle}>
              {isEditing ? "Edit Slider Image" : "Upload Slider Image"}
            </h2>
            {isEditing && (
              <span style={s.editingBadge}>Editing #{String(editingId)}</span>
            )}
          </div>

          <form
            style={s.uploadGrid}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div style={s.formCol}>
              <div>
                <label style={s.label}>Slider Name</label>
                <input
                  style={{ ...s.input, marginTop: "6px" }}
                  type="text"
                  placeholder="e.g. Summer Sale Banner"
                  {...register("SliderName")}
                />
                {errors.SliderName && (
                  <p style={s.fieldError}>{errors.SliderName.message}</p>
                )}
              </div>

              <div>
                <label style={s.label}>Slider Description</label>
                <textarea
                  style={{ ...s.textarea, marginTop: "6px" }}
                  placeholder="Short description of this slide..."
                  {...register("SliderDescription")}
                />
                {errors.SliderDescription && (
                  <p style={s.fieldError}>{errors.SliderDescription.message}</p>
                )}
              </div>

              {/* Public Image URL field (auto-filled after upload) */}
              <div>
                <label style={s.label}>Slider Image URL</label>
                <input
                  style={{
                    ...s.input,
                    marginTop: "6px",
                    backgroundColor: "#f9fafb",
                    color: "#6b7280",
                    cursor: "default",
                  }}
                  type="text"
                  readOnly
                  placeholder={
                    uploadingToSupabase
                      ? "Uploading to Supabase..."
                      : "Select an image to generate slider URL..."
                  }
                  {...register("SliderURL")}
                />
                {errors.SliderURL && (
                  <p style={s.fieldError}>{errors.SliderURL.message}</p>
                )}
              </div>

              <div>
                <label style={s.label}>Schedule Up Date & Time</label>
                <input
                  style={{ ...s.input, marginTop: "6px" }}
                  type="datetime-local"
                  {...register("ScheduledUpTime")}
                />
                {errors.ScheduledUpTime && (
                  <p style={s.fieldError}>{errors.ScheduledUpTime.message}</p>
                )}
              </div>

              <div>
                <label style={s.label}>Schedule Down Date & Time</label>
                <input
                  style={{ ...s.input, marginTop: "6px" }}
                  type="datetime-local"
                  {...register("ScheduledDownTime")}
                />
                {errors.ScheduledDownTime && (
                  <p style={s.fieldError}>{errors.ScheduledDownTime.message}</p>
                )}
              </div>

              <div style={s.statusOrderRow}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Slider Position</label>
                  <input
                    style={{ ...s.input, marginTop: "6px" }}
                    type="number"
                    min={1}
                    placeholder="e.g. 1"
                    {...register("SliderPosition")}
                  />
                  {errors.SliderPosition && (
                    <p style={s.fieldError}>{errors.SliderPosition.message}</p>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <label style={s.label}>Status</label>
                  <select
                    style={{ ...s.input, marginTop: "6px" }}
                    {...register("IsActive", {
                      // Converts "true" or "1" to boolean true, and "false" or "0" to boolean false
                      setValueAs: (val) =>
                        val === "true" || val === "1" || val === true,
                    })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  {errors.IsActive && (
                    <p style={s.fieldError}>{errors.IsActive.message}</p>
                  )}
                </div>
              </div>

              <div style={s.btnRow}>
                <button
                  type="submit"
                  style={s.uploadBtn}
                  disabled={uploading || uploadingToSupabase}
                >
                  <UploadCloudIcon />
                  {uploading
                    ? "Saving..."
                    : isEditing
                      ? "Update Image"
                      : "Upload Image"}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    style={s.cancelBtn}
                    onClick={handleCancelEdit}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div>
              <label style={s.label}>
                {isEditing ? "Image (remove to replace it)" : "Image Upload"}
              </label>
              <div style={{ marginTop: "6px" }}>
                {!previewUrl ? (
                  <div
                    style={s.dropzone}
                    onClick={() => {
                      if (!uploadingToSupabase) fileInputRef.current?.click();
                    }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <div style={s.dropzoneIcon}>
                      <UploadCloudIcon />
                    </div>
                    <p style={s.dropzoneText}>
                      {uploadingToSupabase
                        ? "Uploading to Supabase..."
                        : "Click to browse or drag & drop an image here"}
                    </p>
                    <p style={s.dropzoneSub}>
                      PNG, JPG or WEBP — recommended 1600×600px
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                      disabled={uploadingToSupabase}
                    />
                  </div>
                ) : (
                  <div style={s.previewWrapper}>
                    <img
                      src={previewUrl}
                      alt="Preview"
                      style={s.previewImage}
                    />
                    <button
                      type="button"
                      style={s.previewCloseBtn}
                      onClick={handleRemoveImage}
                      disabled={uploading || uploadingToSupabase}
                      title="Remove image"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                )}
              </div>
              {fileError && <p style={s.fieldError}>{fileError}</p>}
            </div>
          </form>

          {uploadError && <div style={s.errorBanner}>{uploadError}</div>}
          {uploadSuccess && <div style={s.successBanner}>{uploadSuccess}</div>}
        </div>

        {/* Existing Images */}
        <div style={s.card}>
          <div style={s.cardTitleRow}>
            <h2 style={s.cardTitle}>Slider Images List</h2>
            {reordering && (
              <span style={s.reorderingBadge}>Saving order...</span>
            )}
          </div>

          {fetchError && <div style={s.errorBanner}>{fetchError}</div>}
          {reorderError && <div style={s.errorBanner}>{reorderError}</div>}

          {fetching ? (
            <div style={s.noImages}>Loading images...</div>
          ) : images.length === 0 ? (
            <div style={s.noImages}>No slider images uploaded yet.</div>
          ) : (
            <div style={s.imagesGrid}>
              {images.map((img, index) => (
                <div
                  key={img.SliderID}
                  data-slider-card
                  title="Click to edit"
                  onClick={() => handleEdit(img)}
                  style={{
                    ...s.imgCard,
                    border:
                      editingId === img.SliderID
                        ? "2px solid #7c3aed"
                        : s.imgCard.border,
                    opacity: draggingIndex === index ? 0.4 : 1,
                    boxShadow:
                      draggingIndex === index
                        ? "0 4px 14px rgba(124,58,237,0.35)"
                        : s.imgCard.boxShadow,
                  }}
                  onDragEnter={() => handleCardDragEnter(index)}
                  onDragOver={handleCardDragOver}
                  onDragEnd={handleCardDragEnd}
                >
                  <div style={s.imgThumbWrapper}>
                    <img
                      src={resolveImageUrl(img.SliderURL)}
                      alt={img.SliderName || "Slider image"}
                      style={s.imgThumb}
                    />
                    <span style={s.orderBadge}>#{img.SliderPosition}</span>
                    <div
                      style={s.dragHandle}
                      draggable={!reordering}
                      onDragStart={(e) => handleCardDragStart(e, index)}
                      onClick={(e) => e.stopPropagation()}
                      title="Drag to reorder"
                    >
                      <GripIcon />
                    </div>
                  </div>
                  <div style={s.imgCardBody}>
                    <div style={s.imgTitleRow}>
                      <p style={s.imgTitle}>{img.SliderName || "Untitled"}</p>
                      <button
                        type="button"
                        style={{
                          ...s.deleteBtn,
                          opacity: deletingId === img.SliderID ? 0.5 : 1,
                          cursor:
                            deletingId === img.SliderID
                              ? "not-allowed"
                              : "pointer",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(img.SliderID);
                        }}
                        disabled={deletingId === img.SliderID}
                        title="Delete image"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                    {img.SliderDescription && (
                      <p style={s.imgDescription}>{img.SliderDescription}</p>
                    )}
                    <div style={s.imgMetaRow}>
                      <button
                        type="button"
                        style={{
                          ...s.switchTrack,
                          backgroundColor: img.IsActive ? "#7c3aed" : "#d1d5db",
                          opacity: togglingId === img.SliderID ? 0.6 : 1,
                          cursor:
                            togglingId === img.SliderID
                              ? "not-allowed"
                              : "pointer",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(img);
                        }}
                        disabled={togglingId === img.SliderID}
                        title="Click to toggle status"
                        aria-checked={img.IsActive}
                        role="switch"
                      >
                        <span
                          style={{
                            ...s.switchThumb,
                            backgroundColor: img.IsActive ? "#fff" : "#9ca3af",
                            boxShadow: img.IsActive
                              ? "0 1px 3px rgba(0,0,0,0.3)"
                              : "none",
                            transform: img.IsActive
                              ? "translateX(20px)"
                              : "translateX(0px)",
                          }}
                        />
                      </button>
                      {img.ScheduledUpTime && (
                        <span style={s.imgDateTime}>
                          {formatDateTime(img.ScheduledUpTime)}
                        </span>
                      )}
                    </div>
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
