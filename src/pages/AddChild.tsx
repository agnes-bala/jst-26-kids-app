import { useState, useEffect, useRef } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "../components/Header";

const API_BASE_URL = "/api"; // proxied by Vite -> http://10.12.1.118:8081

// ─── API contract ────────────────────────────────────────────────────────
//  POST   /api/kids          add
//  PUT    /api/kids/{id}     update
//  GET    /api/kids          list      GET /api/kids/{id}  single
//  POST   /api/attendance    mark one child present
const KIDS_URL = `${API_BASE_URL}/kids`;
const ATTENDANCE_URL = `${API_BASE_URL}/attendance`;

const newUuid = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h
    .slice(6, 8)
    .join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
};

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
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  momName?: string | null;
  dadName?: string | null;
  momNo?: string | null;
  dadNo?: string | null;
  guardianName?: string | null;
  guardianNo?: string | null;
  occupation?: string | null;
  selfNo?: string | null;
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

const phonesOf = (k: ApiKid) => [k.selfNo, k.momNo, k.dadNo, k.guardianNo];

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

// Same local cache the Attendance page uses (key "attendance:YYYY-MM-DD")
const attendanceCacheKey = () => `attendance:${todayStr()}`;

const readAttendanceCache = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(attendanceCacheKey());
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
};

const saveAttendanceCache = (kidsId: string, inTime: string) => {
  try {
    const map = readAttendanceCache();
    map[kidsId] = inTime;
    localStorage.setItem(attendanceCacheKey(), JSON.stringify(map));
  } catch {
    /* storage unavailable – ignore */
  }
};

const markPresent = async (kidsId: string, kidName: string) => {
  const inTime = nowTime();
  const res = await fetch(ATTENDANCE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kidsId,
      kidName,
      date: todayStr(),
      inTime,
      status: "PRESENT",
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
) => {
  try {
    await markPresent(kidsId, kidName);
    return;
  } catch {
    await sleep(800);
  }
  try {
    await markPresent(kidsId, kidName);
    return;
  } catch (lastErr) {
    const found = await findExistingChild(kidName, mobile).catch(() => null);
    if (found) {
      await markPresent(found.kidsId, found.name);
      return;
    }
    throw lastErr;
  }
};

const MAX_PHOTO_MB = 2;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const GENDERS = ["Male", "Female"];
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
  state: opt,
  country: opt,
  pincode: opt.refine((v) => !v || /^[0-9]{6}$/.test(v), {
    message: "Pincode must be 6 digits.",
  }),

  dadName: opt,
  dadNo: optPhone,
  momName: opt,
  momNo: optPhone,
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
  state: "",
  country: "India",
  pincode: "",
  dadName: "",
  dadNo: "",
  momName: "",
  momNo: "",
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
  selfNo: s0(k.selfNo),
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
  state: s0(k.state),
  country: s0(k.country),
  pincode: s0(k.pincode),
  dadName: s0(k.dadName),
  dadNo: s0(k.dadNo),
  momName: s0(k.momName),
  momNo: s0(k.momNo),
  guardianName: s0(k.guardianName),
  guardianNo: s0(k.guardianNo),
  occupation: s0(k.occupation),
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

// ─── Main Component ─────────────────────────────────────────────────────
export default function ChildAdd() {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [info, setInfo] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [existingPhoto, setExistingPhoto] = useState(""); // saved photo of the child being edited
  const [photoError, setPhotoError] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [editId, setEditId] = useState<string | null>(null); // set => update mode
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
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childSchema),
    defaultValues: emptyValues,
  });

  const isEdit = editId !== null;
  const shownPhoto = photoPreview || existingPhoto;

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
    setEditId(null);
    setEditMeta(null);
    setFamilyPrompt(null);
    answered.current.clear();
  };

  // Feed an existing child into the form and switch to update mode
  const loadKid = (k: ApiKid) => {
    reset(toFormValues(k));
    setEditId(k.kidsId);
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
        setInfo(
          `${same.name} is already in the list. Details loaded - edit and press Update Child.`,
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
    (["address1", "address2", "state", "country", "pincode"] as const).forEach(
      (f) =>
        setValue(f, s0(k[f]) || (f === "country" ? "India" : ""), {
          shouldDirty: true,
        }),
    );
    answered.current.add(familyPrompt.key);
    setFamilyPrompt(null);
    setShowMore(true);
  };

  const skipAddress = () => {
    if (familyPrompt) answered.current.add(familyPrompt.key);
    setFamilyPrompt(null);
  };

  // Same payload for add (POST) and update (PUT)
  const buildPayload = async (values: ChildFormValues, kidsId: string) => {
    const v = (key: keyof ChildFormValues) =>
      (values[key] ?? "").toString().trim();
    const n = (key: keyof ChildFormValues) => v(key) || null;
    const username = getUsername();

    const payload: Record<string, string | number | boolean | null> = {
      kidsId,

      // required
      name: v("name"),
      gender: v("gender"),
      age: Number(v("age")),
      std: v("std"),
      selfNo: v("selfNo"),

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
      state: n("state"),
      country: n("country"),
      pincode: n("pincode"),
      momName: n("momName"),
      dadName: n("dadName"),
      momNo: n("momNo"),
      dadNo: n("dadNo"),
      guardianName: n("guardianName"),
      guardianNo: n("guardianNo"),
      occupation: n("occupation"),
      // new file > saved photo > none
      photo: photo
        ? await compressImage(photo).catch(() => fileToDataUrl(photo))
        : existingPhoto || null,

      createdAt: editMeta?.createdAt ?? null,
      updatedAt: null,
      createdBy: editMeta?.createdBy ?? username,
      updatedBy: username,
    };
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
        } catch (err) {
          setSaveError(
            `${name} was updated, but attendance could not be saved. ${
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
          `${existing.name} is already in the list. Details loaded - edit and press Update Child.`,
        );
        return;
      }

      // C) New child -> add, then mark attendance
      const payload = await buildPayload(values, newUuid());
      const res = await fetch(KIDS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readError(res, "Save failed"));

      // Use the id the server actually stored (falls back to ours)
      const saved = await res.json().catch(() => null);
      const savedId = String(saved?.kidsId ?? saved?.id ?? payload.kidsId);

      try {
        await markPresentWithRetry(
          savedId,
          String(payload.name),
          values.selfNo,
        );
      } catch (err) {
        setSaveError(
          `${payload.name} was added, but attendance could not be saved. ${
            err instanceof Error ? err.message : ""
          } Press Save Child again to retry attendance.`,
        );
        return;
      }

      setSaveSuccess(`${payload.name} was added and marked present.`);
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
            {saveSuccess && <div style={s.successBanner}>{saveSuccess}</div>}
            {saveError && <div style={s.errorBanner}>{saveError}</div>}

            <div className="child-grid" style={s.formBody}>
              {/* ── Basic details (always visible) ── */}
              {textField("selfNo", "Mobile", "e.g. 9876543210", {
                inputMode: "tel",
                lookup: true,
              })}
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
                  {textField("address1", "Address Line 1", "House no, street", {
                    cls: "span-2",
                  })}
                  {textField("address2", "Address Line 2", "Area, town", {
                    cls: "span-2",
                  })}
                  {textField("state", "State", "e.g. Tamil Nadu")}
                  {textField("country", "Country", "e.g. India")}
                  {textField("pincode", "Pincode", "e.g. 635001", {
                    maxLength: 6,
                    inputMode: "numeric",
                  })}

                  <p className="span-full" style={s.sectionTitle}>
                    Family Details
                  </p>
                  {textField("dadName", "Father's Name", "Dad's name")}
                  {textField("dadNo", "Father's Mobile", "e.g. 9000000002", {
                    inputMode: "tel",
                  })}
                  {textField("momName", "Mother's Name", "Mom's name")}
                  {textField("momNo", "Mother's Mobile", "e.g. 9000000001", {
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