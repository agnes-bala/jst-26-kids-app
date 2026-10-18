import { useState, useEffect, useRef } from "react";
import type { CSSProperties, ChangeEvent, KeyboardEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPortal } from "react-dom";
import Header from "../components/Header";

const API_BASE_URL = "/api"; // proxied by Vite -> http://10.12.1.118:8081

// ─── API contract ────────────────────────────────────────────────────────
// kidsId looks like JT-26-102, JT-26-103, ... The backend requires it in the
// POST body, so the frontend works out the next number (highest existing + 1).

const KIDS_URL = `${API_BASE_URL}/kids`;
const ATTENDANCE_URL = `${API_BASE_URL}/attendance`;

// The API's `photo` field is a string, so the image is sent as a base64 data URL
const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

// Shrinks the photo (max 480px, JPEG) so the request body stays small
const compressImage = (file: File, maxSide = 480, quality = 0.8) =>
  new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process the photo"));
        return;
      }
      ctx.fillStyle = "#ffffff"; // PNG transparency -> white
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the photo"));
    };
    img.src = url;
  });

// Logged-in user (saved in localStorage as "username" by the login page)
const getUsername = (): string => {
  try {
    return localStorage.getItem("username") || "system";
  } catch {
    return "system";
  }
};

// Full child record as the API returns it
interface ApiKid {
  kidsId: string;
  name: string;
  age?: number | string | null;
  std?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  academic?: string | null;
  institute?: string | null;
  religion?: string | null;
  transport?: boolean | string | null;
  aadharNo?: string | null;
  photo?: string | null;
  hobbies?: string | null;
  interest?: string | null;
  languageKnown?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  motherName?: string | null;
  fatherName?: string | null;
  motherNo?: string | null;
  fatherNo?: string | null;
  guardianName?: string | null;
  guardianNo?: string | null;
  occupation?: string | null; // legacy
  fatherOccupation?: string | null;
  selfNo?: string | null; // legacy -> mobileNo
  mobileNo?: string | null;
  fathermobileNo?: string | null;
  mothermobileNo?: string | null;
  guardianmobileNo?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const nowTime = () => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const toArray = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  const obj = data as { content?: T[]; data?: T[] } | null;
  return obj?.content ?? obj?.data ?? [];
};

// Builds a readable error: server message (JSON or plain text) + HTTP status
const readError = async (res: Response, fallback: string) => {
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

const normName = (t?: string | null) =>
  (t ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const last10 = (t?: string | null) => (t ?? "").replace(/\D/g, "").slice(-10);

const phonesOf = (k: ApiKid) => [
  k.mobileNo ?? k.selfNo,
  k.mothermobileNo ?? k.motherNo,
  k.fathermobileNo ?? k.fatherNo,
  k.guardianmobileNo ?? k.guardianNo,
];

// Every child that has this mobile (self / mom / dad / guardian)
const findKidsByMobile = async (mobile: string): Promise<ApiKid[]> => {
  const want = last10(mobile);
  if (!want) return [];
  const res = await fetch(KIDS_URL);
  if (!res.ok) {
    throw new Error(
      await readError(res, "Could not check the existing children list"),
    );
  }
  const kids = toArray<ApiKid>(await res.json().catch(() => []));
  return kids.filter((k) => phonesOf(k).some((m) => last10(m) === want));
};

// Same person = same mobile AND same name
const findExistingChild = async (
  name: string,
  mobile: string,
): Promise<ApiKid | null> => {
  const wantName = normName(name);
  return (
    (await findKidsByMobile(mobile)).find(
      (k) => normName(k.name) === wantName,
    ) ?? null
  );
};

// Next kidsId = highest existing JT-26-<n> + 1 (first one is JT-26-102)
const KIDS_ID_PREFIX = "JT-26";
const KIDS_ID_START = 102;

const generateKidsId = async (): Promise<string> => {
  const res = await fetch(KIDS_URL);
  if (!res.ok) {
    throw new Error(await readError(res, "Could not generate the child ID"));
  }
  const kids = toArray<ApiKid>(await res.json().catch(() => []));
  const re = new RegExp(`^${KIDS_ID_PREFIX}-(\\d+)$`, "i");
  let max = KIDS_ID_START - 1;
  kids.forEach((k) => {
    const m = re.exec((k.kidsId ?? "").trim());
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `${KIDS_ID_PREFIX}-${max + 1}`;
};

// ─── Local cache of today's attendance ───────────────────────────────────

interface Mark {
  inTime: string;
  outTime: string;
}

const attendanceCacheKey = () => `attendance:${todayStr()}`;

const readAttendanceCache = (): Record<string, Mark | string> => {
  try {
    const raw = localStorage.getItem(attendanceCacheKey());
    return raw ? (JSON.parse(raw) as Record<string, Mark | string>) : {};
  } catch {
    return {};
  }
};

const saveAttendanceCache = (kidsId: string, inTime: string) => {
  try {
    const map = readAttendanceCache();
    map[kidsId] = { inTime, outTime: "" }; // fresh check-in, not checked out yet
    localStorage.setItem(attendanceCacheKey(), JSON.stringify(map));
  } catch {
    /* storage unavailable – ignore */
  }
};

// Attendance record: { kidsId, kidName, date, inTime, outTime, status, createdBy, updatedBy }
const markPresent = async (kidsId: string, kidName: string) => {
  const inTime = nowTime();
  const username = getUsername();
  const res = await fetch(ATTENDANCE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kidsId,
      kidName,
      date: todayStr(),
      inTime,
      outTime: null,
      status: "PRESENT",
      createdBy: username,
      updatedBy: username,
    }),
  });
  if (!res.ok) throw new Error(await readError(res, "Attendance failed"));
  saveAttendanceCache(kidsId, inTime);
};

// Is this child already checked in today? (local cache first, then the server)
const isPresentToday = async (kidsId: string): Promise<boolean> => {
  if (readAttendanceCache()[kidsId]) return true;
  try {
    const res = await fetch(`${ATTENDANCE_URL}/present?date=${todayStr()}`);
    if (res.ok) {
      const list = toArray<{ kidsId?: string }>(
        await res.json().catch(() => []),
      );
      return list.some((x) => x.kidsId === kidsId);
    }
  } catch {
    /* fall through */
  }
  return false;
};

const markPresentWithRetry = async (
  kidsId: string,
  kidName: string,
  mobile: string,
): Promise<string> => {
  try {
    await markPresent(kidsId, kidName);
    return kidsId;
  } catch {
    await sleep(800);
  }
  try {
    await markPresent(kidsId, kidName);
    return kidsId;
  } catch (lastErr) {
    const found = await findExistingChild(kidName, mobile).catch(() => null);
    if (found) {
      await markPresent(found.kidsId, found.name);
      return found.kidsId;
    }
    throw lastErr;
  }
};

const MAX_PHOTO_MB = 2;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const GENDERS = ["Male", "Female"];
const LOCATIONS = [
  "ALADIVILAI",
  "ANBU NAGAR",
  "ANGAMANGALAM",
  "ARUMUGANERI",
  "IDAIYANVILAI",
  "KALLAMPARAI",
  "KANNIVILAI",
  "KURUKATTUR",
  "KURUMBUR",
  "LAKSHMIPURAM",
  "MARANTHALAI",
  "MUKKANI",
  "MUKKUPERI",
  "NALLANVILAI",
  "NALLUR",
  "NALUMAVADI",
  "NAZARETH",
  "PURAIYOOR",
  "SHUNMUGAPURAM",
  "SUNDARA RAJAPURAM",
  "THANGAMMAL PURAM",
  "THENTHIRUPPERAI",
  "THIRUMALAR PURAM",
  "TIRUNELVELI",
  "TUTICORIN",
  "UMARIKADU",
  "VALLIOOR",
  "YOHARATHINA NAGAR",
];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RELIGIONS = ["Christian", "Hindu", "Muslim"];
const BASIC_FIELDS = ["name", "gender", "age", "std", "selfNo"];

type Option = { value: string; label: string };

// The API stores std as "3" (not "3rd"), so value = what is sent, label = what is shown
const STANDARDS: Option[] = [
  { value: "LKG", label: "LKG" },
  { value: "UKG", label: "UKG" },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => {
    const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
    return { value: String(n), label: `${n}${suffix}` };
  }),
  { value: "College", label: "College" },
];

// Academic year runs June – May, e.g. "2026-2027"
const currentAcademicStart = () => {
  const now = new Date();
  return now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
};
const ACADEMIC_START = currentAcademicStart();
const ACADEMIC_YEARS = [
  ACADEMIC_START - 1,
  ACADEMIC_START,
  ACADEMIC_START + 1,
].map((y) => `${y}-${y + 1}`);
const CURRENT_ACADEMIC = `${ACADEMIC_START}-${ACADEMIC_START + 1}`;

// ─── Validation schema ───────────────────────────────────────────────────
const opt = z.string().trim().optional();
const PHONE_RE = /^[0-9+\-\s]{7,15}$/;
const optPhone = opt.refine((v) => !v || PHONE_RE.test(v), {
  message: "Please enter a valid mobile number.",
});

const childSchema = z.object({
  name: z.string().trim().min(1, "Please enter the child's name."),
  gender: z.string().min(1, "Please select the gender."),
  age: z
    .string()
    .trim()
    .min(1, "Please enter the age.")
    .refine(
      (v) => /^[0-9]{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 25,
      {
        message: "Please enter a valid age (1 - 25).",
      },
    ),
  std: z.string().min(1, "Please select the standard."),
  selfNo: z
    .string()
    .trim()
    .min(1, "Please enter a mobile number.")
    .regex(PHONE_RE, "Please enter a valid mobile number."),

  // ── More details (all optional) ──
  bloodGroup: opt,
  religion: opt,
  aadharNo: opt.refine((v) => !v || /^[0-9]{12}$/.test(v), {
    message: "Aadhar must be 12 digits.",
  }),

  academic: opt,
  institute: opt,
  transport: opt, // "Yes" | "No" -> sent as true / false

  address1: opt,
  address2: opt,
  city: opt,
  state: opt,
  country: opt,
  pincode: opt.refine((v) => !v || /^[0-9]{6}$/.test(v), {
    message: "Pincode must be 6 digits.",
  }),

  fatherName: opt,
  fatherNo: optPhone,
  motherName: opt,
  motherNo: optPhone,
  guardianName: opt,
  guardianNo: optPhone,
  occupation: opt,

  languageKnown: opt,
  interest: opt,
  hobbies: opt,
});

type ChildFormValues = z.infer<typeof childSchema>;

const emptyValues: ChildFormValues = {
  name: "",
  gender: "",
  age: "",
  std: "",
  selfNo: "",
  bloodGroup: "",
  religion: "",
  aadharNo: "",
  academic: CURRENT_ACADEMIC,
  institute: "",
  transport: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  fatherName: "",
  fatherNo: "",
  motherName: "",
  motherNo: "",
  guardianName: "",
  guardianNo: "",
  occupation: "",
  languageKnown: "",
  interest: "",
  hobbies: "",
};

// API record -> form values (used to feed an existing child into the form)
const s0 = (t?: string | number | null) => (t == null ? "" : String(t));
const toFormValues = (k: ApiKid): ChildFormValues => ({
  name: s0(k.name),
  gender: s0(k.gender),
  age: s0(k.age),
  std: s0(k.std),
  selfNo: s0(k.mobileNo ?? k.selfNo),
  bloodGroup: s0(k.bloodGroup),
  religion: s0(k.religion),
  aadharNo: s0(k.aadharNo),
  academic: s0(k.academic),
  institute: s0(k.institute),
  transport:
    k.transport === true || k.transport === "Yes" || k.transport === "true"
      ? "Yes"
      : k.transport === false || k.transport === "No" || k.transport === "false"
        ? "No"
        : "",
  address1: s0(k.address1),
  address2: s0(k.address2),
  city: s0(k.city),
  state: s0(k.state),
  country: s0(k.country),
  pincode: s0(k.pincode),
  fatherName: s0(k.fatherName),
  fatherNo: s0(k.fathermobileNo ?? k.fatherNo),
  motherName: s0(k.motherName),
  motherNo: s0(k.mothermobileNo ?? k.motherNo),
  guardianName: s0(k.guardianName),
  guardianNo: s0(k.guardianmobileNo ?? k.guardianNo),
  occupation: s0(k.fatherOccupation ?? k.occupation),
  languageKnown: s0(k.languageKnown),
  interest: s0(k.interest),
  hobbies: s0(k.hobbies),
});

const pageCss = `
html, body, #root { overflow: hidden !important; height: 100%; }
.child-page, .child-page * { text-align: left; }
.child-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 14px;
}
.child-grid .span-2 { grid-column: span 2; }
.child-grid .span-full { grid-column: 1 / -1; }
.child-page button {
  width: auto;
  transform: none !important;
  box-shadow: none !important;
}
.child-page input:focus,
.child-page select:focus {
  border-color: #7c3aed !important;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12) !important;
}
.place-link-btn {
  margin-top: 6px;
  background: none;
  border: none;
  color: #7c3aed;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.place-link-btn:hover { color: #5b21b6; }
.place-option-active { background: #f5f3ff !important; }
.kid-id-chip {
  display: inline-block;
  margin-left: 10px;
  background: #ede9fe;
  color: #6d28d9;
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  vertical-align: middle;
}
@media (max-width: 1000px) {
  .child-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .child-grid { grid-template-columns: minmax(0, 1fr); }
  .child-grid .span-2 { grid-column: span 1; }
  .child-page input, .child-page select { font-size: 16px !important; }
}
`;

const ChildIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="7" r="4" />
    <path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
  </svg>
);

// ─── Place autocomplete ──────────────────────────────────────────────────
// Free-text allowed at all times: the user may pick from the list or type
// their own place. The "Not in list?" button switches to a plain input.
function PlaceAutocomplete({
  value,
  options,
  onChange,
  hasError,
  inputStyle,
  errorMessage,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  hasError?: boolean;
  inputStyle: CSSProperties;
  errorMessage?: string;
}) {
  const query = value;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Position state for the portal
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  // Update dropdown position when opened or on scroll/resize
  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        // Add window.scrollY in case the body scrolls
        setCoords({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true); // true catches scrolling inside containers
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (
        boxRef.current &&
        !boxRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.toLowerCase().includes(q))
    : options;

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
    setHighlight(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && highlight >= 0 && filtered[highlight]) {
        e.preventDefault();
        commit(filtered[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
  };

  // The dropdown menu rendered via Portal
  const dropdownMenu =
    open && filtered.length > 0
      ? createPortal(
          <ul
            ref={listRef}
            role="listbox"
            style={{
              position: "absolute",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 9999, // Ensure it floats above everything
              margin: 0,
              padding: "4px 0",
              listStyle: "none",
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
              maxHeight: "220px",
              overflowY: "auto", // Scroll inside the dropdown itself
            }}
          >
            {filtered.map((option, i) => (
              <li
                key={option}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => {
                  e.preventDefault(); // Keep input focused
                  commit(option);
                }}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  padding: "8px 12px",
                  fontSize: "13px",
                  cursor: "pointer",
                  color: "#374151",
                  background: i === highlight ? "#f5f3ff" : "white",
                }}
              >
                {option}
              </li>
            ))}
          </ul>,
          document.body, // Render directly to body
        )
      : null;

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="Type or select a place"
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value); // Free text allowed
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        style={{
          ...inputStyle,
          borderColor: hasError ? "#dc2626" : "#e5e7eb",
        }}
      />
      {dropdownMenu}
      {errorMessage && (
        <p style={{ fontSize: "11px", color: "#dc2626", margin: "3px 0 0 0" }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────
export default function ChildAdd() {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [savedId, setSavedId] = useState(""); // kidsId of the child just saved (shown in the success banner)
  const [info, setInfo] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [existingPhoto, setExistingPhoto] = useState(""); // saved photo of the child being edited
  const [photoError, setPhotoError] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [customPlace, setCustomPlace] = useState(false); // true => free-text place input
  const [editId, setEditId] = useState<string | null>(null); // set => update mode
  // full record as loaded, merged into the PUT so fields not on this form are kept
  const [editKid, setEditKid] = useState<Record<string, unknown> | null>(null);
  const [editMeta, setEditMeta] = useState<{
    createdAt: string | null;
    createdBy: string | null;
  } | null>(null);
  // same mobile, different name -> "same family?" question
  const [familyPrompt, setFamilyPrompt] = useState<{
    source: ApiKid;
    names: string;
    key: string;
  } | null>(null);
  const matchToken = useRef(0);
  const answered = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    setValue,
    // watch,
    formState: { errors },
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childSchema),
    defaultValues: emptyValues,
  });

  const isEdit = editId !== null;
  const shownPhoto = photoPreview || existingPhoto;
  const placeValue = useWatch({ control, name: "address1" }) ?? "";

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    if (!photo && fileInputRef.current) fileInputRef.current.value = "";
  }, [photo]);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError("");
    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Only JPG, PNG or WEBP images are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`Photo must be smaller than ${MAX_PHOTO_MB} MB.`);
      e.target.value = "";
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // removes the new file AND the saved photo
  const clearPhoto = () => {
    setPhoto(null);
    setPhotoPreview("");
    setExistingPhoto("");
    setPhotoError("");
  };

  // Back to a blank "Add Child" form
  const resetAll = () => {
    reset(emptyValues);
    clearPhoto();
    setShowMore(false);
    setCustomPlace(false);
    setEditId(null);
    setEditKid(null);
    setEditMeta(null);
    setFamilyPrompt(null);
    answered.current.clear();
  };

  // Feed an existing child into the form and switch to update mode
  const loadKid = (k: ApiKid) => {
    reset(toFormValues(k));
    // If the saved place is not in the known list, open in free-text mode
    const savedPlace = (k.address1 ?? "").trim();
    setCustomPlace(!!savedPlace && !LOCATIONS.includes(savedPlace));
    setEditId(k.kidsId);
    setEditKid(k as unknown as Record<string, unknown>);
    setFamilyPrompt(null);
    setEditMeta({
      createdAt: k.createdAt ?? null,
      createdBy: k.createdBy ?? null,
    });
    setPhoto(null);
    setPhotoPreview("");
    setExistingPhoto(k.photo || "");
    setPhotoError("");
    setShowMore(true);
  };

  // Open straight into edit mode with /child-add?id=<kidsId>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${KIDS_URL}/${encodeURIComponent(id)}`);
        if (!res.ok)
          throw new Error(await readError(res, "Could not load the child"));
        const kid = (await res.json()) as ApiKid;
        loadKid({ ...kid, kidsId: kid.kidsId ?? id });
        setInfo("Details loaded. Edit and press Update Child.");
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Could not load the child.",
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While adding: after the mobile / name is entered, check the list.
  //  same mobile + same name       -> same person: load data, update mode
  //  same mobile + different name  -> same family: ask to copy address & place
  const evaluateMatch = async () => {
    if (isEdit || saving) return;
    const mobile = getValues("selfNo") ?? "";
    const name = getValues("name") ?? "";
    const token = ++matchToken.current;
    if (last10(mobile).length < 10) {
      setFamilyPrompt(null);
      return;
    }
    try {
      const matches = await findKidsByMobile(mobile);
      if (token !== matchToken.current) return;
      if (matches.length === 0) {
        setFamilyPrompt(null);
        setInfo("");
        return;
      }
      const names = matches
        .slice(0, 3)
        .map((k) => k.name)
        .join(", ");

      if (!name.trim()) {
        setInfo(
          `This mobile is already registered for ${names}. Enter the child's name to continue.`,
        );
        return;
      }

      const same = matches.find((k) => normName(k.name) === normName(name));
      if (same) {
        loadKid(same);
        setSaveError("");
        setSaveSuccess("");
        setSavedId("");
        setInfo(
          `${same.name} (${same.kidsId}) is already in the list. Details loaded - edit and press Update Child.`,
        );
        return;
      }

      // same mobile, different person
      setInfo("");
      const key = `${last10(mobile)}|${normName(name)}`;
      if (answered.current.has(key)) return;
      setFamilyPrompt({ source: matches[0], names, key });
    } catch {
      /* ignore – it is checked again on save */
    }
  };

  const copyAddress = () => {
    if (!familyPrompt) return;
    const k = familyPrompt.source;
    (
      ["address1", "address2", "city", "state", "country", "pincode"] as const
    ).forEach((f) =>
      setValue(f, s0(k[f]) || (f === "country" ? "India" : ""), {
        shouldDirty: true,
      }),
    );
    const copiedPlace = (k.address1 ?? "").trim();
    setCustomPlace(!!copiedPlace && !LOCATIONS.includes(copiedPlace));
    answered.current.add(familyPrompt.key);
    setFamilyPrompt(null);
    setShowMore(true);
  };

  const skipAddress = () => {
    if (familyPrompt) answered.current.add(familyPrompt.key);
    setFamilyPrompt(null);
  };

  // Same payload for add (POST) and update (PUT).
  //  add    -> kidsId = newly generated JT-26-xxx
  //  update -> kidsId of the loaded child is kept
  const buildPayload = async (
    values: ChildFormValues,
    kidsId: string | null,
  ) => {
    const v = (key: keyof ChildFormValues) =>
      (values[key] ?? "").toString().trim();
    const n = (key: keyof ChildFormValues) => v(key) || null;
    const username = getUsername();

    const payload: Record<string, unknown> = {
      // edit: start from the saved record; add: sensible defaults
      ...(editKid ?? { isActive: true }),
      ...(kidsId ? { kidsId } : {}),

      // required
      name: v("name"),
      gender: v("gender"),
      age: Number(v("age")),
      std: v("std"),
      mobileNo: v("selfNo"),

      // optional -> null when left empty
      bloodGroup: n("bloodGroup"),
      academic: n("academic"),
      institute: n("institute"),
      religion: n("religion"),
      transport: v("transport") === "" ? null : v("transport") === "Yes",
      aadharNo: n("aadharNo"),
      hobbies: n("hobbies"),
      interest: n("interest"),
      languageKnown: n("languageKnown"),
      address1: n("address1"),
      address2: n("address2"),
      city: n("city"),
      state: n("state"),
      country: n("country"),
      pincode: n("pincode"),
      motherName: n("motherName"),
      fatherName: n("fatherName"),
      mothermobileNo: n("motherNo"),
      fathermobileNo: n("fatherNo"),
      guardianName: n("guardianName"),
      guardianmobileNo: n("guardianNo"),
      fatherOccupation: n("occupation"),
      // new file > saved photo > none
      photo: photo
        ? await compressImage(photo).catch(() => fileToDataUrl(photo))
        : existingPhoto || null,

      createdAt: editMeta?.createdAt ?? null,
      updatedAt: null,
      createdBy: editMeta?.createdBy ?? username,
      updatedBy: username,
    };
    // old field names are no longer part of the API
    ["selfNo", "fatherNo", "motherNo", "guardianNo", "occupation"].forEach(
      (key) => delete payload[key],
    );
    return payload;
  };

  // ─── Save → API ───────────────────────────────────────────────────────
  // withAttendance is passed explicitly, avoiding a ref read during render.
  const submitChild = async (
    values: ChildFormValues,
    withAttendance: boolean,
  ) => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    setSavedId("");
    setInfo("");
    try {
      // A) UPDATE – child was loaded from the list
      if (editId) {
        const payload = await buildPayload(values, editId);
        const res = await fetch(`${KIDS_URL}/${encodeURIComponent(editId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await readError(res, "Update failed"));

        const name = String(payload.name);

        // plain update -> no attendance
        if (!withAttendance) {
          setSaveSuccess(`${name} was updated.`);
          setSavedId(editId);
          resetAll();
          return;
        }

        try {
          if (await isPresentToday(editId)) {
            setSaveSuccess(`${name} was updated (already checked in today).`);
          } else {
            await markPresentWithRetry(editId, name, values.selfNo);
            setSaveSuccess(`${name} was updated and marked present.`);
          }
          setSavedId(editId);
        } catch (err) {
          setSaveError(
            `${name} (${editId}) was updated, but attendance could not be saved. ${
              err instanceof Error ? err.message : ""
            } Press Update Child & Attendance again to retry.`,
          );
          return;
        }
        resetAll();
        return;
      }

      // B) ADD – first check the list: already there? -> load it for update
      const existing = await findExistingChild(values.name, values.selfNo);
      if (existing) {
        loadKid(existing);
        setInfo(
          `${existing.name} (${existing.kidsId}) is already in the list. Details loaded - edit and press Update Child.`,
        );
        return;
      }

      // C) New child -> generate the next JT-26-xxx id, add, then mark attendance
      const newKidsId = await generateKidsId();
      const payload = await buildPayload(values, newKidsId);
      const res = await fetch(KIDS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readError(res, "Save failed"));

      // Use the id the server actually stored (falls back to ours)
      const saved = await res.json().catch(() => null);
      let newId = String(saved?.kidsId ?? saved?.id ?? newKidsId);

      try {
        newId = await markPresentWithRetry(
          newId,
          String(payload.name),
          values.selfNo,
        );
      } catch (err) {
        setSaveSuccess(`${payload.name} was added.`);
        setSavedId(newId);
        setSaveError(
          `${payload.name} (${newId}) was added, but attendance could not be saved. ${
            err instanceof Error ? err.message : ""
          } Mark attendance from the Attendance page.`,
        );
        resetAll();
        return;
      }

      setSaveSuccess(`${payload.name} was added and marked present.`);
      setSavedId(newId);
      resetAll();
    } catch (err) {
      console.error(err);
      setSaveError(
        err instanceof Error && err.message
          ? err.message
          : "Failed to save child. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Plain save/update (no attendance side-effect)
  const onSubmit = (values: ChildFormValues) => submitChild(values, false);

  // Update + mark attendance (edit mode only)
  const onSubmitWithAttendance = (values: ChildFormValues) =>
    submitChild(values, true);

  const onInvalid = (errs: Record<string, unknown>) => {
    if (Object.keys(errs).some((k) => !BASIC_FIELDS.includes(k)))
      setShowMore(true);
  };

  const handleClear = () => {
    resetAll();
    setSaveError("");
    setSaveSuccess("");
    setSavedId("");
    setInfo("");
  };

  // ─── Styles ───────────────────────────────────────────────────────────
  const s: { [key: string]: CSSProperties } = {
    page: {
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      backgroundColor: "#f8f7ff",
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      boxSizing: "border-box",
      textAlign: "left",
    },
    contentWrapper: {
      width: "100%",
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "12px 24px 16px",
      boxSizing: "border-box",
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
    },
    headerSection: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "10px",
      flexShrink: 0,
    },
    headerIconBox: {
      width: "40px",
      height: "40px",
      borderRadius: "10px",
      backgroundColor: "#ede9fe",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#7c3aed",
    },
    headerTitle: {
      fontSize: "20px",
      fontWeight: 700,
      color: "#111827",
      margin: 0,
      lineHeight: 1.2,
    },
    card: {
      backgroundColor: "white",
      borderRadius: "14px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
      flex: "0 1 auto",
      minHeight: 0,
      overflow: "hidden",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      flex: "1 1 auto",
      minHeight: 0,
    },
    formBody: {
      padding: "14px 20px",
      overflowY: "auto",
      flex: "1 1 auto",
      minHeight: 0,
      alignContent: "start",
    },
    sectionTitle: {
      fontSize: "12px",
      fontWeight: 700,
      color: "#7c3aed",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      margin: "6px 0 0 0",
      paddingBottom: "6px",
      borderBottom: "1px solid #f3f4f6",
    },
    label: {
      display: "block",
      fontSize: "12px",
      fontWeight: 500,
      color: "#374151",
    },
    input: {
      width: "100%",
      height: "36px",
      padding: "0 10px",
      border: "1.5px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "13px",
      color: "#374151",
      outline: "none",
      boxSizing: "border-box",
      backgroundColor: "white",
      marginTop: "4px",
    },
    fieldError: { fontSize: "11px", color: "#dc2626", margin: "3px 0 0 0" },
    photoRow: { display: "flex", alignItems: "center", gap: "14px" },
    photoBox: {
      width: "64px",
      height: "64px",
      borderRadius: "50%",
      border: "1.5px dashed #c4b5fd",
      backgroundColor: "#f5f3ff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#7c3aed",
      overflow: "hidden",
      flexShrink: 0,
    },
    photoImg: { width: "100%", height: "100%", objectFit: "cover" },
    photoBtn: {
      background: "#ede9fe",
      color: "#7c3aed",
      border: "none",
      borderRadius: "8px",
      padding: "7px 14px",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
    },
    photoRemoveBtn: {
      background: "white",
      color: "#6b7280",
      border: "1.5px solid #e5e7eb",
      borderRadius: "8px",
      padding: "6px 12px",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
      marginLeft: "8px",
    },
    photoHint: { fontSize: "11px", color: "#9ca3af", margin: "6px 0 0 0" },
    btnRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "10px",
      flexWrap: "wrap",
      padding: "12px 20px",
      borderTop: "1px solid #f3f4f6",
      flexShrink: 0,
    },
    saveBtn: {
      background: "#7c3aed",
      color: "white",
      border: "none",
      borderRadius: "8px",
      padding: "9px 22px",
      fontSize: "13px",
      fontWeight: 600,
      cursor: saving ? "not-allowed" : "pointer",
      opacity: saving ? 0.7 : 1,
    },
    cancelBtn: {
      background: "white",
      color: "#6b7280",
      border: "1.5px solid #e5e7eb",
      borderRadius: "8px",
      padding: "8px 20px",
      fontSize: "13px",
      fontWeight: 600,
      cursor: "pointer",
    },
    moreBtn: {
      background: "#f5f3ff",
      color: "#7c3aed",
      border: "1.5px solid #ddd6fe",
      borderRadius: "8px",
      padding: "8px 16px",
      fontSize: "13px",
      fontWeight: 600,
      cursor: "pointer",
    },
    btnGroup: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
      justifyContent: "flex-end",
    },
    altBtn: {
      background: "#f5f3ff",
      color: "#7c3aed",
      border: "1.5px solid #c4b5fd",
      borderRadius: "8px",
      padding: "8px 18px",
      fontSize: "13px",
      fontWeight: 600,
      cursor: saving ? "not-allowed" : "pointer",
      opacity: saving ? 0.7 : 1,
    },
    errorBanner: {
      backgroundColor: "#fef2f2",
      color: "#dc2626",
      padding: "8px 14px",
      borderRadius: "8px",
      fontSize: "13px",
      margin: "12px 20px 0",
      flexShrink: 0,
      border: "1px solid #fecaca",
      wordBreak: "break-word",
    },
    successBanner: {
      backgroundColor: "#f0fdf4",
      color: "#16a34a",
      padding: "8px 14px",
      borderRadius: "8px",
      fontSize: "13px",
      margin: "12px 20px 0",
      flexShrink: 0,
      border: "1px solid #bbf7d0",
    },
    promptBanner: {
      backgroundColor: "#fffbeb",
      color: "#92400e",
      padding: "10px 14px",
      borderRadius: "8px",
      fontSize: "13px",
      margin: "12px 20px 0",
      flexShrink: 0,
      border: "1px solid #fde68a",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      flexWrap: "wrap",
    },
    promptYes: {
      background: "#7c3aed",
      color: "white",
      border: "none",
      borderRadius: "8px",
      padding: "7px 14px",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
    },
    promptNo: {
      background: "white",
      color: "#6b7280",
      border: "1.5px solid #e5e7eb",
      borderRadius: "8px",
      padding: "6px 14px",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
    },
    infoBanner: {
      backgroundColor: "#eff6ff",
      color: "#1d4ed8",
      padding: "8px 14px",
      borderRadius: "8px",
      fontSize: "13px",
      margin: "12px 20px 0",
      flexShrink: 0,
      border: "1px solid #bfdbfe",
    },
  };

  const textField = (
    name: keyof ChildFormValues,
    label: string,
    placeholder = "",
    opts: {
      cls?: string;
      maxLength?: number;
      inputMode?: "numeric" | "tel" | "email";
      lookup?: boolean; // check the list for an existing child on blur
    } = {},
  ) => {
    const reg = register(name);
    return (
      <div className={opts.cls}>
        <label style={s.label}>{label}</label>
        <input
          style={s.input}
          type="text"
          placeholder={placeholder}
          maxLength={opts.maxLength}
          inputMode={opts.inputMode}
          {...reg}
          onBlur={(e) => {
            reg.onBlur(e);
            if (opts.lookup) void evaluateMatch();
          }}
        />
        {errors[name] && <p style={s.fieldError}>{errors[name]?.message}</p>}
      </div>
    );
  };

  const selectField = (
    name: keyof ChildFormValues,
    label: string,
    options: (string | Option)[],
    placeholder: string,
  ) => (
    <div>
      <label style={s.label}>{label}</label>
      <select style={s.input} {...register(name)}>
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
      {errors[name] && <p style={s.fieldError}>{errors[name]?.message}</p>}
    </div>
  );

  return (
    <div className="child-page" style={s.page}>
      <style>{pageCss}</style>

      <div style={{ flexShrink: 0 }}>
        <Header />
      </div>

      <div style={s.contentWrapper}>
        <div style={s.headerSection}>
          <div style={s.headerIconBox}>
            <ChildIcon size={20} />
          </div>
          <div>
            <h1 style={s.headerTitle}>
              {isEdit ? "Update Child" : "Add Child"}
              {isEdit && editId && (
                <span className="kid-id-chip">{editId}</span>
              )}
            </h1>
          </div>
        </div>

        <div style={s.card}>
          <form
            style={s.form}
            onSubmit={(event) => {
              void handleSubmit(onSubmit, onInvalid)(event);
            }}
            noValidate
          >
            {info && <div style={s.infoBanner}>{info}</div>}
            {familyPrompt && (
              <div style={s.promptBanner}>
                <span>
                  This mobile is already registered for{" "}
                  <b>{familyPrompt.names}</b> - same family? Copy their address
                  and place to this child?
                </span>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button
                    type="button"
                    style={s.promptYes}
                    onClick={copyAddress}
                  >
                    Yes, copy address
                  </button>
                  <button
                    type="button"
                    style={s.promptNo}
                    onClick={skipAddress}
                  >
                    No
                  </button>
                </div>
              </div>
            )}
            {saveSuccess && (
              <div style={s.successBanner}>
                {saveSuccess}
                {savedId && (
                  <>
                    {" "}
                    ID: <b>{savedId}</b>
                  </>
                )}
              </div>
            )}
            {saveError && <div style={s.errorBanner}>{saveError}</div>}

            <div className="child-grid" style={s.formBody}>
              {/* ── Basic details (always visible) ── */}
              {textField("selfNo", "Mobile", "e.g. 9876543210", {
                inputMode: "tel",
                lookup: true,
              })}
              {/* ── Place: autocomplete + free-text fallback ── */}
              <div>
                <label style={s.label}>Place</label>
                {customPlace ? (
                  <input
                    style={s.input}
                    type="text"
                    placeholder="Type the place name"
                    maxLength={80}
                    {...register("address1")}
                  />
                ) : (
                  <PlaceAutocomplete
                    value={placeValue}
                    options={LOCATIONS}
                    onChange={(v) =>
                      setValue("address1", v, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    hasError={!!errors.address1}
                    inputStyle={s.input}
                    errorMessage={errors.address1?.message}
                  />
                )}
                {customPlace && errors.address1 && (
                  <p style={s.fieldError}>{errors.address1.message}</p>
                )}
                <button
                  type="button"
                  className="place-link-btn"
                  onClick={() => {
                    if (!customPlace) {
                      // entering free-text mode: clear so they can type fresh
                      setValue("address1", "", {
                        shouldDirty: true,
                        shouldValidate: false,
                      });
                    }
                    setCustomPlace((v) => !v);
                  }}
                >
                  {customPlace
                    ? "← Choose from list instead"
                    : "My place is not in the list"}
                </button>
              </div>
              {textField("name", "Name", "Child's full name", { lookup: true })}
              {selectField("gender", "Gender", GENDERS, "Select gender")}
              {textField("age", "Age", "e.g. 10", {
                maxLength: 2,
                inputMode: "numeric",
              })}
              {selectField("std", "Standard", STANDARDS, "Select standard")}

              {/* ── More details (toggle) ── */}
              {showMore && (
                <>
                  <p className="span-full" style={s.sectionTitle}>
                    Personal Details
                  </p>

                  <div className="span-full" style={s.photoRow}>
                    <div style={s.photoBox}>
                      {shownPhoto ? (
                        <img
                          src={shownPhoto}
                          alt="Child preview"
                          style={s.photoImg}
                        />
                      ) : (
                        <ChildIcon size={26} />
                      )}
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange}
                        style={{ display: "none" }}
                      />
                      <button
                        type="button"
                        style={s.photoBtn}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {shownPhoto ? "Change Photo" : "Upload Photo"}
                      </button>
                      {shownPhoto && (
                        <button
                          type="button"
                          style={s.photoRemoveBtn}
                          onClick={clearPhoto}
                        >
                          Remove
                        </button>
                      )}
                      <p style={s.photoHint}>
                        JPG, PNG or WEBP, up to {MAX_PHOTO_MB} MB.
                        {photo ? ` Selected: ${photo.name}` : ""}
                      </p>
                      {photoError && <p style={s.fieldError}>{photoError}</p>}
                    </div>
                  </div>

                  {selectField(
                    "bloodGroup",
                    "Blood Group",
                    BLOOD_GROUPS,
                    "Select",
                  )}
                  {selectField(
                    "religion",
                    "Religion",
                    RELIGIONS,
                    "Select religion",
                  )}
                  {textField("aadharNo", "Aadhar No", "12-digit number", {
                    maxLength: 12,
                    inputMode: "numeric",
                  })}

                  <p className="span-full" style={s.sectionTitle}>
                    School Details
                  </p>
                  {selectField(
                    "academic",
                    "Academic Year",
                    ACADEMIC_YEARS,
                    "Select",
                  )}
                  {textField(
                    "institute",
                    "Institute",
                    "School / college name",
                    { cls: "span-2" },
                  )}
                  {selectField(
                    "transport",
                    "Transport Required",
                    ["Yes", "No"],
                    "Select",
                  )}

                  <p className="span-full" style={s.sectionTitle}>
                    Address
                  </p>

                  {textField("address2", "Address Line 2", "Area, town", {
                    cls: "span-2",
                  })}
                  {textField("city", "City", "e.g. Tuticorin")}
                  {textField("state", "State", "e.g. Tamil Nadu")}
                  {textField("country", "Country", "e.g. India")}
                  {textField("pincode", "Pincode", "e.g. 635001", {
                    maxLength: 6,
                    inputMode: "numeric",
                  })}

                  <p className="span-full" style={s.sectionTitle}>
                    Family Details
                  </p>
                  {textField("fatherName", "Father's Name", "Dad's name")}
                  {textField("fatherNo", "Father's Mobile", "e.g. 9000000002", {
                    inputMode: "tel",
                  })}
                  {textField("motherName", "Mother's Name", "Mom's name")}
                  {textField("motherNo", "Mother's Mobile", "e.g. 9000000001", {
                    inputMode: "tel",
                  })}
                  {textField("guardianName", "Guardian Name", "If different")}
                  {textField("guardianNo", "Guardian Mobile", "If different", {
                    inputMode: "tel",
                  })}
                  {textField("occupation", "Occupation", "Parent / guardian", {
                    cls: "span-2",
                  })}

                  <p className="span-full" style={s.sectionTitle}>
                    Languages, Interests &amp; Hobbies
                  </p>
                  {textField(
                    "languageKnown",
                    "Languages Known",
                    "e.g. Tamil, English, Hindi",
                    {
                      cls: "span-2",
                    },
                  )}
                  {textField("interest", "Interest", "e.g. Music, Drawing")}
                  {textField("hobbies", "Hobbies", "e.g. Reading, Cricket")}
                </>
              )}
            </div>

            <div style={s.btnRow}>
              <button
                type="button"
                style={s.moreBtn}
                onClick={() => setShowMore((v) => !v)}
              >
                {showMore ? "Hide Details ▲" : "More Details ▼"}
              </button>
              <div style={s.btnGroup}>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={handleClear}
                  disabled={saving}
                >
                  {isEdit ? "New Child" : "Clear"}
                </button>
                {isEdit ? (
                  <>
                    <button
                      type="button"
                      style={s.altBtn}
                      disabled={saving}
                      onClick={() => {
                        void handleSubmit(onSubmitWithAttendance, onInvalid)();
                      }}
                    >
                      Update Child &amp; Attendance
                    </button>
                    <button type="submit" style={s.saveBtn} disabled={saving}>
                      {saving ? "Updating..." : "Update Child"}
                    </button>
                  </>
                ) : (
                  <button type="submit" style={s.saveBtn} disabled={saving}>
                    {saving ? "Saving..." : "Save Child"}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
