import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import * as XLSX from 'xlsx'; 
//import { ChevronLeft } from 'lucide-react';
const API_BASE_URL = "/jrmobile";

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f7f5fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f0f2f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f2eff6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconMapPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f1f4f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconChevronDown = ({ color = '#6b7280' }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconPhone = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const IconMail = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const IconLocation = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconCalSmall = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconTable = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const IconSort = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f0f2f5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const IconClearFilter = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const IconChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// ─── Options ──────────────────────────────────────────────────────────
const sortOptions = ['Latest First', 'Name A-Z', 'Name Z-A', 'Oldest First'];
const perPageOptions = [5, 10, 20, 50];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const ageGroupOptions = ['All Ages', 'Kids (0-12)', 'Youth (13-19)', 'Adult (20-59)', 'Elder (60+)'];

// ─── Helper: read year/month directly from a "YYYY-MM-DD" dateAdded string.
// We deliberately avoid `new Date(str).getMonth()` here — that parses the
// string as UTC and then reads it back in the browser's local timezone,
// which can silently shift the date to the previous day/month (e.g. an
// August 1st entry showing up as July). Splitting the string ourselves
// keeps the month range filter tied to exactly what was stored in dateAdded.
interface UserRecord {
  id: string | number;
  name: string;
  mobile: string;
  email: string;
  dob: string;
  gender: string;
  place: string;
  dateAdded: string;
}

function parseDateAddedParts(dateAddedStr: string | undefined | null) {
  if (!dateAddedStr) return null;
  const parts = dateAddedStr.split('-');
  if (parts.length < 2) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-12
  if (!year || !month) return null;
  return { year, monthIndex: month - 1 }; // monthIndex: 0-11
}

// ─── Helper: compute age from DOB ──────────────────────────────────
function getAge(dob: string) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ─── Main Component ──────────────────────────────────────────────────
export default function UserReportsPage() {

  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    fetchSouls();
  }, []);

  const fetchSouls = async () => {
    setFetching(true);
    setFetchError('');
    try {
      const res = await fetch(`${API_BASE_URL}/soul/list`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // Map backend fields to what this page expects
      const mapped = data.map((s: {
        id: string | number;
        name: string;
        mobile: string;
        email: string;
        dob: string;
        gender: string;
        place: string;
        dataadded?: string | null;
      }) => ({
        id: s.id,
        name: s.name,
        mobile: s.mobile,
        email: s.email,
        dob: s.dob,
        gender: s.gender,
        place: s.place,
        dateAdded: s.dataadded ? s.dataadded.split('T')[0].split(' ')[0] : '',
      }));
      setAllUsers(mapped);
    } catch (err) {
      console.error(err);
      setFetchError('Could not load user data from server.');
    } finally {
      setFetching(false);
    }
  };

  const places = ['All Places', ...new Set(allUsers.map(u => u.place).filter(Boolean))];

  // ─── State ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [selectedPlace, setSelectedPlace] = useState('All Places');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('All Ages');
  const [sortBy, setSortBy] = useState('Latest First');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Month Range: click the field -> pick a Year -> pick a Month that has data in that year
  const [monthStep, setMonthStep] = useState('year'); // 'year' | 'month'
  const [browseYear, setBrowseYear] = useState<number | null>(null); // year currently being browsed inside the dropdown
  const [selectedMonthLabel, setSelectedMonthLabel] = useState('All Months');
  const [selectedFilterYear, setSelectedFilterYear] = useState<number | null>(null);
  const [selectedFilterMonthIndex, setSelectedFilterMonthIndex] = useState<number | null>(null); // 0-11

  const [placeOpen, setPlaceOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [perPageOpen, setPerPageOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [ageOpen, setAgeOpen] = useState(false);

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedPlace, setAppliedPlace] = useState('All Places');
  const [, setAppliedMonthLabel] = useState('All Months');
  const [appliedFilterYear, setAppliedFilterYear] = useState<number | null>(null);
  const [appliedFilterMonthIndex, setAppliedFilterMonthIndex] = useState<number | null>(null);
  const [appliedAgeGroup, setAppliedAgeGroup] = useState('All Ages');
  const [appliedSort, setAppliedSort] = useState('Latest First');

  // Years that actually have data, newest first
  const availableYears = [...new Set(
    allUsers
      .map((u) => parseDateAddedParts(u.dateAdded))
      .filter((parts): parts is { year: number; monthIndex: number } => parts !== null)
      .map((parts) => parts.year)
  )].sort((a, b) => (b as number) - (a as number));

  // Only the months within `year` that actually have data
  const getMonthsForYear = (year: number) => {
    const monthsWithData = new Set(
      allUsers
        .map((u) => parseDateAddedParts(u.dateAdded))
        .filter((parts): parts is { year: number; monthIndex: number } => parts !== null && parts.year === year)
        .map((parts) => parts.monthIndex)
    );
    return monthNames
      .map((name, index) => ({ name, index }))
      .filter((m) => monthsWithData.has(m.index));
  };

  const handleSelectYear = (year: number) => {
    // Selecting a year applies as its own filter (whole year);
    // picking a month afterwards narrows it further.
    setBrowseYear(year);
    setMonthStep('month');
    setSelectedMonthLabel(`${year}`);
    setSelectedFilterYear(year);
    setSelectedFilterMonthIndex(null);
  };

  const handleBackToYears = () => {
    setMonthStep('year');
    setBrowseYear(null);
  };

  const handleSelectMonth = (monthName: string, monthIndex: number) => {
    setSelectedMonthLabel(`${monthName} ${browseYear}`);
    setSelectedFilterYear(browseYear);
    setSelectedFilterMonthIndex(monthIndex);
    setMonthOpen(false);
    setMonthStep('year');
    setBrowseYear(null);
  };

  const handleSelectAllMonths = () => {
    setSelectedMonthLabel('All Months');
    setSelectedFilterYear(null);
    setSelectedFilterMonthIndex(null);
    setMonthOpen(false);
    setMonthStep('year');
    setBrowseYear(null);
  };

  const [hoveredDropdownItem, setHoveredDropdownItem] = useState<string | null>(null);

  // ─── Edit popup state ──────────────────────────────────────────────
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editForm, setEditForm] = useState<UserRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleEditClick = (user: UserRecord) => {
    setEditingUser(user);
    setEditForm({ ...user });
    setSaveError('');
  };

  const handleEditFormChange = (field: keyof UserRecord, value: string) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
    setEditForm(null);
    setSaveError('');
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    setSavingEdit(true);
    setSaveError('');
    try {
      const res = await fetch(`${API_BASE_URL}/soul/update/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          mobile: editForm.mobile,
          email: editForm.email,
          dob: editForm.dob,
          gender: editForm.gender,
          place: editForm.place,
          dataadded: editForm.dateAdded,
        }),
      });
      if (!res.ok) throw new Error('Update failed');

      // Reflect the change locally so the table updates immediately
      setAllUsers((prev) => prev.map((u) => (u.id === editForm.id ? { ...editForm } : u)));
      handleCloseEdit();
    } catch (err) {
      console.error(err);
      setSaveError('Could not save changes. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleApplyFilters = () => {
    setAppliedSearch(search);
    setAppliedPlace(selectedPlace);
    setAppliedMonthLabel(selectedMonthLabel);
    setAppliedFilterYear(selectedFilterYear);
    setAppliedFilterMonthIndex(selectedFilterMonthIndex);
    setAppliedAgeGroup(selectedAgeGroup);
    setAppliedSort(sortBy);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedPlace('All Places');
    setSelectedMonthLabel('All Months');
    setSelectedFilterYear(null);
    setSelectedFilterMonthIndex(null);
    setMonthStep('year');
    setBrowseYear(null);
    setSelectedAgeGroup('All Ages');
    setSortBy('Latest First');
    setAppliedSearch('');
    setAppliedPlace('All Places');
    setAppliedMonthLabel('All Months');
    setAppliedFilterYear(null);
    setAppliedFilterMonthIndex(null);
    setAppliedAgeGroup('All Ages');
    setAppliedSort('Latest First');
    setCurrentPage(1);
  };

  // ─── Filtering ─────────────────────────────────────────────────────
  let filtered = allUsers.filter((u) => {
    const matchSearch = appliedSearch
      ? u.name.toLowerCase().includes(appliedSearch.toLowerCase()) ||
        u.mobile.includes(appliedSearch) ||
        u.email.toLowerCase().includes(appliedSearch.toLowerCase())
      : true;

    const matchPlace = appliedPlace !== 'All Places' ? u.place === appliedPlace : true;

    let matchMonth = true;
    if (appliedFilterYear !== null) {
      const parts = parseDateAddedParts(u.dateAdded);
      if (!parts) {
        matchMonth = false;
      } else if (appliedFilterMonthIndex !== null) {
        matchMonth = parts.year === appliedFilterYear && parts.monthIndex === appliedFilterMonthIndex;
      } else {
        matchMonth = parts.year === appliedFilterYear;
      }
    }

    let matchAge = true;
    if (appliedAgeGroup !== 'All Ages') {
      const age = getAge(u.dob);
      if (appliedAgeGroup === 'Kids (0-12)') matchAge = age >= 0 && age <= 12;
      else if (appliedAgeGroup === 'Youth (13-19)') matchAge = age >= 13 && age <= 19;
      else if (appliedAgeGroup === 'Adult (20-59)') matchAge = age >= 20 && age <= 59;
      else if (appliedAgeGroup === 'Elder (60+)') matchAge = age >= 60;
    }

    return matchSearch && matchPlace && matchMonth && matchAge;
  });

  // Sorting
  if (appliedSort === 'Name A-Z') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  else if (appliedSort === 'Name Z-A') filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name));
  else if (appliedSort === 'Oldest First') filtered = [...filtered].sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
  else if (appliedSort === 'Latest First') filtered = [...filtered].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

  const totalUsers = filtered.length;
  const totalPages = Math.ceil(totalUsers / perPage);
  const startIdx = (currentPage - 1) * perPage;
  const endIdx = Math.min(startIdx + perPage, totalUsers);
  const pageUsers = filtered.slice(startIdx, endIdx);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // ─── Export Excel (filtered data only, filename depends on active filter) ──
  const handleExportExcel = () => {
    if (filtered.length === 0) {
      alert('No data to export.');
      return;
    }
    const exportData = filtered.map((u, idx) => ({
      'SL No': idx + 1,
      'Name': u.name,
      'Mobile': u.mobile,
      'Email': u.email,
      'DOB': u.dob,
      'Gender': u.gender,
      'Place': u.place,
      'Date Added': u.dateAdded,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');

    // Decide the file name based on the currently applied filter.
    // Place filter takes priority over age group (e.g. "Tirupur" selected -> Tirupur_Report.xlsx).
    let fileName = 'Filtered_Users_Report';
    if (appliedPlace !== 'All Places') {
      fileName = `${appliedPlace}_Report`;
    } else if (appliedAgeGroup !== 'All Ages') {
      const ageLabel = appliedAgeGroup.split(' ')[0]; // "Kids", "Youth", "Adult", "Elder"
      fileName = `${ageLabel}_Report`;
    }

    XLSX.writeFile(wb, `${fileName}.xlsx`);

    // Log this export for Analytics + Report History
    const existing = JSON.parse(localStorage.getItem('reportLogs') || '[]');
    existing.push({
      id: existing.length + 1,
      reportName: fileName,
      generatedAt: new Date().toISOString(),
    });
    localStorage.setItem('reportLogs', JSON.stringify(existing));
  };

  // ─── Styles (exactly as you designed – unchanged, plus new additions) ────
  const s: { [key: string]: React.CSSProperties } = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#f8f7ff',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: 0,
      boxSizing: 'border-box',
    },
    contentWrapper: {
      maxWidth: '1440px',
      margin: '0 auto',
      padding: '2rem 1.5rem',
      paddingTop: '40px',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
    },
    headerIconBox: {
      width: '44px',
      height: '44px',
      borderRadius: '10px',
      backgroundColor: '#ede9fe',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: '22px',
      fontWeight: '700',
      color: '#111827',
      margin: 0,
      lineHeight: 1.2,
    },
    headerSubtitle: {
      fontSize: '13px',
      color: '#6b7280',
      margin: 0,
      marginTop: '2px',
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    btnExcel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: '#a79db8',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      padding: '9px 18px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    },
    btnRefresh: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: 'white',
      color: '#f3f7f4',
      border: '1.5px solid #e5e7eb',
      borderRadius: '8px',
      padding: '9px 18px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    },
    filtersCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      padding: '18px 20px',
      marginBottom: '20px',
    },
    filtersHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
    },
    filtersTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '15px',
      fontWeight: '600',
      color: '#282c36',
    },
    clearFiltersBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: 'none',
      width: '10%',
      border: 'none',
      color: '#322d3b',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
    },
    filtersRow: {
      display: 'grid',
      gridTemplateColumns: '1.5fr 0.8fr 0.8fr 0.8fr 0.8fr auto',
      gap: '14px',
      alignItems: 'end',
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    filterLabel: {
      fontSize: '13px',
      fontWeight: '500',
      color: '#222c3d',
    },
    searchInputWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    searchIcon: {
      position: 'absolute',
      left: '10px',
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
    },
    searchInput: {
      width: '100%',
      padding: '9px 12px 9px 34px',
      border: '1.5px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#111827',
      outline: 'none',
      boxSizing: 'border-box',
      backgroundColor: 'white',
    },
    dropdownWrapper: {
      position: 'relative',
      backgroundColor: 'white'
    },
    dropdownBtn: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '9px 12px',
      border: '1.5px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#f8fafd',
      backgroundColor: 'white',
      cursor: 'pointer',
      outline: 'none',
      boxSizing: 'border-box',
    },
    dropdownBtnInner: {
      display: 'flex',
      alignItems: 'center',
      color:'white',
      gap: '7px',
    },
    dropdownMenu: {
      position: 'absolute',
      top: 'calc(100% + 4px)',
      left: 0,
      right: 0,
      backgroundColor: 'white',
      border: '1.5px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 4px 16px rgba(252, 244, 244, 0.1)',
      zIndex: 100,
      maxHeight: '200px',
      overflowY: 'auto',
    },
    dropdownItem: {
      padding: '9px 14px',
      fontSize: '13px',
      color: '#1b1e22',
      cursor: 'pointer',
    },
    dropdownItemHover: {
      backgroundColor: '#f3f0ff',
      color: '#7c3aed',
    },
    btnApply: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: '#7a5eaa',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      padding: '9px 20px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      height: '38px',
    },

    tableCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
    },
    tableHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid #f3f4f6',
    },
    tableHeaderLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    tableTitle: {
      fontSize: '15px',
      fontWeight: '600',
      color: '#111827',
    },
    totalBadge: {
      backgroundColor: '#ede9fe',
      color: '#7c3aed',
      fontSize: '12px',
      fontWeight: '600',
      padding: '3px 10px',
      borderRadius: '20px',
    },
    tableHeaderRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    showingText: {
      fontSize: '13px',
      color: '#6b7280',
    },
    perPageWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    perPageBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '5px 10px',
      border: '1.5px solid #e5e7eb',
      borderRadius: '6px',
      fontSize: '13px',
      color: '#374151',
      backgroundColor: 'white',
      cursor: 'pointer',
      outline: 'none',
    },
    perPageLabel: {
      fontSize: '13px',
      color: '#6b7280',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    thead: {
      backgroundColor: '#fafafa',
    },
    th: {
      padding: '11px 16px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: '#6b7280',
      borderBottom: '1px solid #f3f4f6',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '13px 16px',
      fontSize: '13px',
      color: '#374151',
      borderBottom: '1px solid #f9fafb',
      verticalAlign: 'middle',
    },
    tdNum: {
      padding: '13px 16px',
      fontSize: '13px',
      color: '#6b7280',
      borderBottom: '1px solid #f9fafb',
      verticalAlign: 'middle',
    },
    cellWithIcon: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    editBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '5px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
    },
    pagination: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      padding: '16px 20px',
    },
    pageBtn: {
      width: '32px',
      height: '32px',
      borderRadius: '6px',
      border: '1.5px solid #e5e7eb',
      backgroundColor: 'white',
      color: '#374151',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageBtnActive: {
      width: '32px',
      height: '32px',
      borderRadius: '6px',
      border: '1.5px solid #7c3aed',
      backgroundColor: '#7759ab',
      color: 'white',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Boxless nav buttons: just the arrow, no border/background
    pageBtnNav: {
      width: '32px',
      height: '32px',
      border: 'none',
      backgroundColor: 'transparent',
      color: '#374151',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageDots: {
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '13px',
      color: '#9ca3af',
    },
    // Edit popup modal styles
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(17, 24, 39, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      width: '480px',
      maxWidth: '92vw',
      maxHeight: '85vh',
      overflowY: 'auto',
      boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
    },
    modalHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid #f3f4f6',
    },
    modalTitle: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#111827',
    },
    modalCloseBtn: {
      background: 'none',
      border: 'none',
      fontSize: '20px',
      lineHeight: 1,
      cursor: 'pointer',
      color: '#6b7280',
    },
    modalBody: {
      padding: '20px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '14px',
    },
    modalField: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    modalInput: {
      padding: '9px 12px',
      border: '1.5px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#111827',
      outline: 'none',
      boxSizing: 'border-box',
    },
    modalFooter: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      padding: '16px 20px',
      borderTop: '1px solid #f3f4f6',
    },
    modalCancelBtn: {
      background: 'white',
      border: '1.5px solid #e5e7eb',
      borderRadius: '8px',
      padding: '9px 20px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      color: '#374151',
    },
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div style={s.page} onClick={() => { setPlaceOpen(false); setSortOpen(false); setPerPageOpen(false); setMonthOpen(false); setAgeOpen(false); }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <Header />
      </div>
      <div style={s.contentWrapper}>
        {/* Page Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.headerIconBox}>
              <IconTable />
            </div>
            <div>
              <p style={s.headerTitle}>User Reports</p>
              <p style={s.headerSubtitle}>View, filter and download user details</p>
            </div>
          </div>
          <div style={s.headerRight}>
            <button style={s.btnExcel} onClick={handleExportExcel}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              Export to Excel
            </button>
            <button style={s.btnRefresh} onClick={fetchSouls}>
              <IconRefresh />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <div style={s.filtersCard}>
          <div style={s.filtersHeader}>
            <div style={s.filtersTitle}>
              Filters
            </div>
            <button style={s.clearFiltersBtn} onClick={handleClearFilters}>
              <IconClearFilter />
              Clear Filters
            </button>
          </div>
          <div style={s.filtersRow}>
            {/* Search */}
            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Search</label>
              <div style={s.searchInputWrapper}>
                <span style={s.searchIcon}><IconSearch /></span>
                <input
                  style={s.searchInput}
                  type="text"
                  placeholder="Search by name or mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Place */}
            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Place</label>
              <div style={s.dropdownWrapper} onClick={(e) => e.stopPropagation()}>
                <button style={s.dropdownBtn} onClick={() => { setPlaceOpen(!placeOpen); setSortOpen(false); setMonthOpen(false); setAgeOpen(false); }}>
                  <span style={s.dropdownBtnInner}>
                    <IconMapPin />
                    {selectedPlace}
                  </span>
                  <IconChevronDown />
                </button>
                {placeOpen && (
                  <div style={s.dropdownMenu}>
                    {places.map((p) => (
                      <div
                        key={p}
                        style={{ ...s.dropdownItem, ...(hoveredDropdownItem === `place-${p}` ? s.dropdownItemHover : {}) }}
                        onMouseEnter={() => setHoveredDropdownItem(`place-${p}`)}
                        onMouseLeave={() => setHoveredDropdownItem(null)}
                        onClick={() => { setSelectedPlace(p); setPlaceOpen(false); }}
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Month Range: pick Year first, then a Month that has data in that year */}
            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Month Range</label>
              <div
                style={s.dropdownWrapper}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  style={s.dropdownBtn}
                  onClick={() => {
                    const opening = !monthOpen;
                    setMonthOpen(opening);
                    setPlaceOpen(false);
                    setSortOpen(false);
                    setAgeOpen(false);
                    if (opening) {
                      // Always start from the Year list when reopened
                      setMonthStep('year');
                      setBrowseYear(null);
                    }
                  }}
                >
                  <span style={s.dropdownBtnInner}>
                    <IconCalendar />
                    {selectedMonthLabel}
                  </span>
                  <IconChevronDown />
                </button>
                {monthOpen && (
                  <div style={s.dropdownMenu}>
                    {monthStep === 'year' ? (
                      <>
                        <div
                          style={{ ...s.dropdownItem, fontWeight: '600', ...(hoveredDropdownItem === 'month-all' ? s.dropdownItemHover : {}) }}
                          onMouseEnter={() => setHoveredDropdownItem('month-all')}
                          onMouseLeave={() => setHoveredDropdownItem(null)}
                          onClick={handleSelectAllMonths}
                        >
                          All Months
                        </div>
                        {availableYears.length === 0 ? (
                          <div style={{ ...s.dropdownItem, color: '#9ca3af', cursor: 'default' }}>
                            No years available
                          </div>
                        ) : (
                          availableYears.map((year) => (
                            <div
                              key={year}
                              style={{ ...s.dropdownItem, ...(hoveredDropdownItem === `year-${year}` ? s.dropdownItemHover : {}) }}
                              onMouseEnter={() => setHoveredDropdownItem(`year-${year}`)}
                              onMouseLeave={() => setHoveredDropdownItem(null)}
                              onClick={() => handleSelectYear(year)}
                            >
                              {year}
                            </div>
                          ))
                        )}
                      </>
                    ) : (
                      <>
                        <div
                          style={{ ...s.dropdownItem, fontWeight: '600', color: '#7c3aed', ...(hoveredDropdownItem === 'month-back' ? s.dropdownItemHover : {}) }}
                          onMouseEnter={() => setHoveredDropdownItem('month-back')}
                          onMouseLeave={() => setHoveredDropdownItem(null)}
                          onClick={handleBackToYears}
                        >
                          ← Back to years
                        </div>
                        {getMonthsForYear(browseYear ?? 0).map((m) => (
                          <div
                            key={m.index}
                            style={{ ...s.dropdownItem, ...(hoveredDropdownItem === `monthval-${m.index}` ? s.dropdownItemHover : {}) }}
                            onMouseEnter={() => setHoveredDropdownItem(`monthval-${m.index}`)}
                            onMouseLeave={() => setHoveredDropdownItem(null)}
                            onClick={() => handleSelectMonth(m.name, m.index)}
                          >
                            {m.name}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Age Group */}
            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Age Group</label>
              <div style={s.dropdownWrapper} onClick={(e) => e.stopPropagation()}>
                <button style={s.dropdownBtn} onClick={() => { setAgeOpen(!ageOpen); setPlaceOpen(false); setSortOpen(false); setMonthOpen(false); }}>
                  <span style={s.dropdownBtnInner}>
                    <IconSort />
                    {selectedAgeGroup}
                  </span>
                  <IconChevronDown />
                </button>
                {ageOpen && (
                  <div style={s.dropdownMenu}>
                    {ageGroupOptions.map((a) => (
                      <div
                        key={a}
                        style={{ ...s.dropdownItem, ...(hoveredDropdownItem === `age-${a}` ? s.dropdownItemHover : {}) }}
                        onMouseEnter={() => setHoveredDropdownItem(`age-${a}`)}
                        onMouseLeave={() => setHoveredDropdownItem(null)}
                        onClick={() => { setSelectedAgeGroup(a); setAgeOpen(false); }}
                      >
                        {a}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Apply */}
            <button style={s.btnApply} onClick={handleApplyFilters}>
              <IconFilter />
              Apply Filters
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div style={s.tableCard}>
          <div style={s.tableHeader}>
            <div style={s.tableHeaderLeft}>
              <IconTable />
              <span style={s.tableTitle}>User Details</span>
              <span style={s.totalBadge}>{totalUsers} Total Users</span>
            </div>
            <div style={s.tableHeaderRight}>
              <div style={s.perPageWrapper} onClick={(e) => e.stopPropagation()}>
                {perPageOpen && (
                  <div style={{ ...s.dropdownMenu, right: 0, left: 'auto', width: '80px' }}>
                    {perPageOptions.map((n) => (
                      <div
                        key={n}
                        style={{ ...s.dropdownItem, ...(hoveredDropdownItem === `pp-${n}` ? s.dropdownItemHover : {}) }}
                        onMouseEnter={() => setHoveredDropdownItem(`pp-${n}`)}
                        onMouseLeave={() => setHoveredDropdownItem(null)}
                        onClick={() => { setPerPage(n); setPerPageOpen(false); setCurrentPage(1); }}
                      >
                        {n}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ ...s.filterGroup, width: '10%', marginLeft: '1230px', marginTop: '-40px', marginBottom: '10px' }}>
            <label style={s.filterLabel}>Sort By</label>
            <div style={s.dropdownWrapper} onClick={(e) => e.stopPropagation()}>
              <button style={s.dropdownBtn} onClick={() => { setSortOpen(!sortOpen); setPlaceOpen(false); setMonthOpen(false); setAgeOpen(false); }}>
                <span style={s.dropdownBtnInner}>
                  <IconSort />
                  {sortBy}
                </span>
                <IconChevronDown />
              </button>
              {sortOpen && (
                <div style={s.dropdownMenu}>
                  {sortOptions.map((opt) => (
                    <div
                      key={opt}
                      style={{ ...s.dropdownItem, ...(hoveredDropdownItem === `sort-${opt}` ? s.dropdownItemHover : {}) }}
                      onMouseEnter={() => setHoveredDropdownItem(`sort-${opt}`)}
                      onMouseLeave={() => setHoveredDropdownItem(null)}
                      // onClick={() => { setSortBy(opt); setSortOpen(false); }}
                      onClick={() => { setSortBy(opt); setAppliedSort(opt); setSortOpen(false); }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {fetching ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280', fontSize: '16px' }}>
              Loading users...
            </div>
          ) : fetchError ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#dc2626', fontSize: '16px' }}>
              {fetchError}
            </div>
          ) : totalUsers === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280', fontSize: '16px' }}>
              No user data available. Add users to see them here.
            </div>
          ) : (
            <table style={s.table}>
              <thead style={s.thead}>
                <tr>
                  <th style={{ ...s.th, width: '40px' }}>#</th>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Mobile</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>DOB</th>
                  <th style={s.th}>Gender</th>
                  <th style={s.th}>Place</th>
                  <th style={s.th}>Date Added</th>
                  <th style={s.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageUsers.map((user, idx) => (
                  <tr key={user.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={s.tdNum}>{startIdx + idx + 1}</td>
                    <td style={{ ...s.td, fontWeight: '500', color: '#111827' }}>{user.name}</td>
                    <td style={s.td}>
                      <div style={s.cellWithIcon}>
                        <IconPhone />
                        {user.mobile}
                      </div>
                    </td>
                    <td style={s.td}>
                      <div style={s.cellWithIcon}>
                        <IconMail />
                        {user.email}
                      </div>
                    </td>
                    <td style={s.td}>
                      <div style={s.cellWithIcon}>
                        <IconCalSmall />
                       {user.dob || '-'}
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={{ textTransform: 'capitalize' }}>{user.gender}</span>
                    </td>
                    <td style={s.td}>
                      <div style={s.cellWithIcon}>
                        <IconLocation />
                        {user.place}
                      </div>
                    </td>
                    <td style={s.td}>
                      <div style={s.cellWithIcon}>
                        <IconCalSmall />
                        {user.dateAdded}
                      </div>
                    </td>
                    <td style={s.td}>
                      <button style={s.editBtn} onClick={() => handleEditClick(user)} title="Edit">
                        <IconEdit />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalUsers > 0 && (
            <div style={s.pagination}>
              <span
                style={{
                  ...s.pageBtnNav,
                  opacity: currentPage === 1 ? 0.35 : 1,
                  cursor: currentPage === 1 ? 'default' : 'pointer',
                }}
                onClick={() => currentPage !== 1 && setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <IconChevronLeft />
              </span>
              {getPageNumbers().map((pg, i) =>
                typeof pg === 'string' ? (
                  <span key={`dots-${i}`} style={s.pageDots}>...</span>
                ) : (
                  <button
                    key={pg}
                    style={currentPage === pg ? s.pageBtnActive : s.pageBtn}
                    onClick={() => setCurrentPage(pg)}
                  >
                    {pg}
                  </button>
                )
              )}
              <span
                style={{
                  ...s.pageBtnNav,
                  opacity: currentPage === totalPages ? 0.35 : 1,
                  cursor: currentPage === totalPages ? 'default' : 'pointer',
                }}
                onClick={() => currentPage !== totalPages && setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <IconChevronRight />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Popup */}
      {editingUser && editForm && (
        <div style={s.modalOverlay} onClick={handleCloseEdit}>
          <div style={s.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Edit User</span>
              <button style={s.modalCloseBtn} onClick={handleCloseEdit}>×</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.modalField}>
                <label style={s.filterLabel}>Name</label>
                <input
                  style={s.modalInput}
                  value={editForm.name}
                  onChange={(e) => handleEditFormChange('name', e.target.value)}
                />
              </div>
              <div style={s.modalField}>
                <label style={s.filterLabel}>Mobile</label>
                <input
                  style={s.modalInput}
                  value={editForm.mobile}
                  onChange={(e) => handleEditFormChange('mobile', e.target.value)}
                />
              </div>
              <div style={s.modalField}>
                <label style={s.filterLabel}>Email</label>
                <input
                  style={s.modalInput}
                  value={editForm.email}
                  onChange={(e) => handleEditFormChange('email', e.target.value)}
                />
              </div>
              <div style={s.modalField}>
                <label style={s.filterLabel}>DOB</label>
                <input
                  style={s.modalInput}
                  type="date"
                  value={editForm.dob}
                  onChange={(e) => handleEditFormChange('dob', e.target.value)}
                />
              </div>
              <div style={s.modalField}>
                <label style={s.filterLabel}>Gender</label>
                <select
                  style={s.modalInput}
                  value={editForm.gender}
                  onChange={(e) => handleEditFormChange('gender', e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={s.modalField}>
                <label style={s.filterLabel}>Place</label>
                <input
                  style={s.modalInput}
                  value={editForm.place}
                  onChange={(e) => handleEditFormChange('place', e.target.value)}
                />
              </div>
              <div style={s.modalField}>
                <label style={s.filterLabel}>Date Added</label>
                <input
                  style={s.modalInput}
                  type="date"
                  value={editForm.dateAdded}
                  onChange={(e) => handleEditFormChange('dateAdded', e.target.value)}
                />
              </div>
            </div>
            <div style={s.modalFooter}>
              {saveError && (
                <span style={{ color: '#dc2626', fontSize: '13px', marginRight: 'auto' }}>{saveError}</span>
              )}
              <button style={s.modalCancelBtn} onClick={handleCloseEdit} disabled={savingEdit}>Cancel</button>
              <button style={{ ...s.btnApply, opacity: savingEdit ? 0.7 : 1 }} onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
