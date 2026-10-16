import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "../components/Header";

const API_BASE_URL = "/jrmobile"; // uses the CRA/Vite proxy — no CORS needed

// ─── API contract assumed for this page ──────────────────────────────────
// GET    {API_BASE_URL}/church/list          -> BranchItem[]
// POST   {API_BASE_URL}/church/add           -> JSON body: BranchFormValues
// PUT    {API_BASE_URL}/church/update/:id    -> JSON body: BranchFormValues  (used when editing)
// DELETE {API_BASE_URL}/church/delete/:id    -> deletes one church
// Adjust the paths below if your backend uses different routes.

interface BranchItem {
  RCID: string | number;
  churchName: string;
  churchAddress1: string;
  churchAddress2?: string;
  taluk: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
  churchMobile: string;
  churchEmail: string;
  churchLandline?: string;
  churchLatitude: string;
  churchLongitude: string;
  createdAt?: string;
}

// ─── Validation schema ────────────────────────────────────────────────────
const branchSchema = z.object({
  churchName: z.string().trim().min(1, "Please enter the church name."),
  churchAddress1: z.string().trim().min(1, "Please enter address line 1."),
  churchAddress2: z.string().trim().optional(),
  taluk: z.string().trim().min(1, "Please enter the taluk."),
  district: z.string().trim().min(1, "Please enter the district."),
  state: z.string().trim().min(1, "Please enter the state."),
  country: z.string().trim().min(1, "Please enter the country."),
  pincode: z
    .string()
    .trim()
    .min(1, "Please enter the pincode.")
    .regex(/^[0-9]{4,10}$/, "Please enter a valid pincode (numbers only)."),
  churchMobile: z
    .string()
    .trim()
    .min(1, "Please enter a mobile number.")
    .regex(/^[0-9+\-\s]{7,15}$/, "Please enter a valid mobile number."),
  churchEmail: z
    .string()
    .trim()
    .min(1, "Please enter an email address.")
    .email("Please enter a valid email address."),
  churchLandline: z.string().trim().optional(),
  churchLatitude: z
    .string()
    .trim()
    .min(1, "Please enter the latitude.")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= -90 && Number(v) <= 90, {
      message: "Latitude must be a number between -90 and 90.",
    }),
  churchLongitude: z
    .string()
    .trim()
    .min(1, "Please enter the longitude.")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= -180 && Number(v) <= 180, {
      message: "Longitude must be a number between -180 and 180.",
    }),
});

type BranchFormValues = z.infer<typeof branchSchema>;

const emptyValues: BranchFormValues = {
  churchName: "",
  churchAddress1: "",
  churchAddress2: "",
  taluk: "",
  district: "",
  state: "",
  country: "",
  pincode: "",
  churchMobile: "",
  churchEmail: "",
  churchLandline: "",
  churchLatitude: "",
  churchLongitude: "",
};

// ─── Icons ──────────────────────────────────────────────────────────────
const BranchIcon = () => (
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
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
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

const EditIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#7c3aed"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
  </svg>
);

const MapPinIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#7c3aed"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

// ─── Main Component ─────────────────────────────────────────────────────
export default function RevivalChurches() {
  const [churches, setChurches] = useState<BranchItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch(`${API_BASE_URL}/revivalchurches/list`);
      if (!res.ok) throw new Error("Failed to fetch revival churches");
      const data = await res.json();
      setChurches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setFetchError("Could not load revival churches. Is the backend endpoint set up?");
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (values: BranchFormValues) => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const payload = {
        churchName: values.churchName.trim(),
        churchAddress1: values.churchAddress1.trim(),
        churchAddress2: values.churchAddress2?.trim() || "",
        taluk: values.taluk.trim(),
        district: values.district.trim(),
        state: values.state.trim(),
        country: values.country.trim(),
        pincode: values.pincode.trim(),
        churchMobile: values.churchMobile.trim(),
        churchEmail: values.churchEmail.trim(),
        churchLandline: values.churchLandline?.trim() || "",
        churchLatitude: values.churchLatitude.trim(),
        churchLongitude: values.churchLongitude.trim(),
      };

      const url = editingId
        ? `${API_BASE_URL}/revivalchurches/update/${editingId}`
        : `${API_BASE_URL}/revivalchurches/add`;

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");

      setSaveSuccess(
        editingId
          ? "Revival church updated successfully."
          : "Revival church added successfully.",
      );
      setEditingId(null);
      reset(emptyValues);
      fetchBranches();
    } catch (err) {
      console.error(err);
      setSaveError("Failed to save revival church. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (church: BranchItem) => {
    setEditingId(church.RCID);
    setSaveError("");
    setSaveSuccess("");
    reset({
      churchName: church.churchName,
      churchAddress1: church.churchAddress1,
      churchAddress2: church.churchAddress2 || "",
      taluk: church.taluk,
      district: church.district,
      state: church.state,
      country: church.country,
      pincode: church.pincode,
      churchMobile: church.churchMobile,
      churchEmail: church.churchEmail,
      churchLandline: church.churchLandline || "",
      churchLatitude: church.churchLatitude,
      churchLongitude: church.churchLongitude,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    reset(emptyValues);
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm("Delete this revival church? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/revivalchurches/delete/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setChurches((prev) => prev.filter((b) => b.RCID !== id));
      if (editingId === id) handleCancelEdit();
    } catch (err) {
      console.error(err);
      alert("Failed to delete revival church.");
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
    editingBadge: {
      fontSize: "12px",
      fontWeight: 600,
      color: "#7c3aed",
      backgroundColor: "#ede9fe",
      padding: "4px 12px",
      borderRadius: "20px",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "18px 24px",
    },
    fieldFull: {
      gridColumn: "1 / -1",
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
    fieldError: {
      fontSize: "12px",
      color: "#dc2626",
      margin: "5px 0 0 0",
    },
    btnRow: {
      display: "flex",
      gap: "10px",
      marginTop: "22px",
      gridColumn: "1 / -1",
    },
    saveBtn: {
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
    cancelBtn: {
      backgroundColor: "white",
      color: "#6b7280",
      border: "1.5px solid #e5e7eb",
      borderRadius: "10px",
      padding: "10px 20px",
      fontSize: "14px",
      fontWeight: 600,
      cursor: "pointer",
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
    branchesGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: "18px",
    },
    branchCard: {
      backgroundColor: "white",
      borderRadius: "14px",
      border: "1px solid #e5e7eb",
      padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    },
    branchTopRow: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "8px",
      marginBottom: "8px",
    },
    branchName: {
      fontSize: "15px",
      fontWeight: 700,
      color: "#111827",
      margin: 0,
    },
    branchActions: {
      display: "flex",
      gap: "4px",
      flexShrink: 0,
    },
    actionBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "6px",
      display: "flex",
    },
    branchAddress: {
      fontSize: "13px",
      color: "#6b7280",
      margin: "0 0 10px 0",
      lineHeight: "1.5",
    },
    branchDetailRow: {
      fontSize: "12px",
      color: "#374151",
      margin: "4px 0",
    },
    branchDetailLabel: {
      color: "#9ca3af",
      marginRight: "4px",
    },
    mapLink: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      fontSize: "12px",
      fontWeight: 600,
      color: "#7c3aed",
      textDecoration: "none",
      marginTop: "10px",
    },
    noBranches: {
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
            <BranchIcon />
          </div>
          <div>
            <h1 style={s.headerTitle}>Revival Church Address Update</h1>
            <p style={s.headerSub}>
              Add or update your revival church locations and contact details
            </p>
          </div>
        </div>

        {/* Add/Edit Church Card */}
        <div style={s.card}>
          <div style={s.cardTitleRow}>
            <h2 style={s.cardTitle}>
              {editingId ? "Edit Revival Church" : "Add Revival Church"}
            </h2>
            {editingId && (
              <span style={s.editingBadge}>Editing existing church</span>
            )}
          </div>

          <form style={s.formGrid} onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label style={s.label}>Church Name</label>
              <input
                style={{ ...s.input, marginTop: "6px" }}
                type="text"
                placeholder="e.g. Salem Church"
                {...register("churchName")}
              />
              {errors.churchName && (
                <p style={s.fieldError}>{errors.churchName.message}</p>
              )}
            </div>

            <div>
              <label style={s.label}>Church Email</label>
              <input
                style={{ ...s.input, marginTop: "6px" }}
                type="text"
                placeholder="e.g. salem@example.org"
                {...register("churchEmail")}
              />
              {errors.churchEmail && (
                <p style={s.fieldError}>{errors.churchEmail.message}</p>
              )}
            </div>

            <div style={s.fieldFull}>
              <label style={s.label}>Church Address Line 1</label>
              <input
                style={{ ...s.input, marginTop: "6px" }}
                type="text"
                placeholder="Building name, street"
                {...register("churchAddress1")}
              />
              {errors.churchAddress1 && (
                <p style={s.fieldError}>{errors.churchAddress1.message}</p>
              )}
            </div>

            <div style={s.fieldFull}>
              <label style={s.label}>Church Address Line 2</label>
              <input
                style={{ ...s.input, marginTop: "6px" }}
                type="text"
                placeholder="Area, landmark (optional)"
                {...register("churchAddress2")}
              />
              {errors.churchAddress2 && (
                <p style={s.fieldError}>{errors.churchAddress2.message}</p>
              )}
            </div>

            <div>
              <label style={s.label}>Church City or Taluk</label>
              <input
                style={{ ...s.input, marginTop: "6px" }}
                type="text"
                placeholder="e.g. Salem"
                {...register("taluk")}
              />
              {errors.taluk && (
                <p style={s.fieldError}>{errors.taluk.message}</p>
              )}
            </div>

            <div>
              <label style={s.label}>Church District</label>
              <input
                style={{ ...s.input, marginTop: "6px" }}
                type="text"
                placeholder="e.g. Salem"
                {...register("district")}
              />
              {errors.district && (
                <p style={s.fieldError}>{errors.district.message}</p>
              )}
            </div>

            <div>
              <label style={s.label}>Church State</label>
              <input
                style={{ ...s.input, marginTop: "6px" }}
                type="text"
                placeholder="e.g. Tamil Nadu"
                {...register("state")}
              />
              {errors.state && (
                <p style={s.fieldError}>{errors.state.message}</p>
              )}
            </div>

            <div>
              <label style={s.label}>Church Country</label>
              <input
                style={{ ...s.input, marginTop: "6px" }}
                type="text"
                placeholder="e.g. India"
                {...register("country")}
              />
              {errors.country && (
                <p style={s.fieldError}>{errors.country.message}</p>
              )}
            </div>

            <div>
              <label style={s.label}>Church Pincode</label>
              <input
                style={{ ...s.input, marginTop: "6px" }}
                type="text"
                placeholder="e.g. 636001"
                {...register("pincode")}
              />
              {errors.pincode && (
                <p style={s.fieldError}>{errors.pincode.message}</p>
              )}
            </div>

            <div>
              <label style={s.label}>Church Mobile</label>
              <input
                style={{ ...s.input, marginTop: "6px" }}
                type="text"
                placeholder="e.g. 9876543210"
                {...register("churchMobile")}
              />
              {errors.churchMobile && (
                <p style={s.fieldError}>{errors.churchMobile.message}</p>
              )}
            </div>

            <div>
              <label style={s.label}>Church Landline</label>
              <input
                style={{ ...s.input, marginTop: "6px" }}
                type="text"
                placeholder="e.g. 0427-1234567 (optional)"
                {...register("churchLandline")}
              />
              {errors.churchLandline && (
                <p style={s.fieldError}>{errors.churchLandline.message}</p>
              )}
            </div>

            <div>
              <label style={s.label}>Church Latitude</label>
              <input
                style={{ ...s.input, marginTop: "6px" }}
                type="text"
                placeholder="e.g. 11.664325"
                {...register("churchLatitude")}
              />
              {errors.churchLatitude && (
                <p style={s.fieldError}>{errors.churchLatitude.message}</p>
              )}
            </div>

            <div>
              <label style={s.label}>Church Longitude</label>
              <input
                style={{ ...s.input, marginTop: "6px" }}
                type="text"
                placeholder="e.g. 78.146011"
                {...register("churchLongitude")}
              />
              {errors.churchLongitude && (
                <p style={s.fieldError}>{errors.churchLongitude.message}</p>
              )}
            </div>

            <div style={s.btnRow}>
              <button type="submit" style={s.saveBtn} disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Church"
                    : "Save Church"}
              </button>
              {editingId && (
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {saveError && <div style={s.errorBanner}>{saveError}</div>}
          {saveSuccess && <div style={s.successBanner}>{saveSuccess}</div>}
        </div>

        {/* Existing Churches */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Churches</h2>

          {fetchError && <div style={s.errorBanner}>{fetchError}</div>}

          {fetching ? (
            <div style={s.noBranches}>Loading churches...</div>
          ) : churches.length === 0 ? (
            <div style={s.noBranches}>No churches added yet.</div>
          ) : (
            <div style={{ ...s.branchesGrid, marginTop: "16px" }}>
              {churches.map((church) => (
                <div key={church.RCID} style={s.branchCard}>
                  <div style={s.branchTopRow}>
                    <p style={s.branchName}>{church.churchName}</p>
                    <div style={s.branchActions}>
                      <button
                        style={s.actionBtn}
                        onClick={() => handleEdit(church)}
                        title="Edit church"
                      >
                        <EditIcon />
                      </button>
                      <button
                        style={s.actionBtn}
                        onClick={() => handleDelete(church.RCID)}
                        disabled={deletingId === church.RCID}
                        title="Delete church"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  <p style={s.branchAddress}>
                    {church.churchAddress1}
                    {church.churchAddress2 ? `, ${church.churchAddress2}` : ""}
                    {`, ${church.taluk}, ${church.district}, ${church.state}, ${church.country} - ${church.pincode}`}
                  </p>

                  <p style={s.branchDetailRow}>
                    <span style={s.branchDetailLabel}>Mobile:</span>
                    {church.churchMobile}
                  </p>
                  {church.churchLandline && (
                    <p style={s.branchDetailRow}>
                      <span style={s.branchDetailLabel}>Landline:</span>
                      {church.churchLandline}
                    </p>
                  )}
                  <p style={s.branchDetailRow}>
                    <span style={s.branchDetailLabel}>Email:</span>
                    {church.churchEmail}
                  </p>

                  {church.churchLatitude && church.churchLongitude && (
                    <a
                      href={`https://www.google.com/maps?q=${church.churchLatitude},${church.churchLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={s.mapLink}
                    >
                      <MapPinIcon />
                      View on map
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
