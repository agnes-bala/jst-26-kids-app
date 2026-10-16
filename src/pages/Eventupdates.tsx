import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '../components/Header';

const API_BASE_URL = "/jrmobile"; // uses the CRA/Vite proxy — no CORS needed

// ─── API contract assumed for this page ──────────────────────────────────
// GET    {API_BASE_URL}/events/list           -> EventItem[]
// POST   {API_BASE_URL}/events/add            -> JSON body: { eventName, eventDate, eventPlace, eventSpeakers, registerLink }
// DELETE {API_BASE_URL}/events/delete/:id     -> deletes one event
// Adjust the paths below if your backend uses different routes.

interface EventItem {
  id: string | number;
  eventName: string;
  eventDate: string; // ISO date string, e.g. "2026-09-20"
  eventPlace: string;
  eventSpeakers: string;
  registerLink: string;
  createdAt?: string;
}

// ─── Validation schema ────────────────────────────────────────────────────
const eventSchema = z.object({
  eventName: z.string().trim().min(1, 'Please enter the event name.'),
  eventDate: z.string().min(1, 'Please choose the event date.'),
  eventPlace: z.string().trim().min(1, 'Please enter the event place.'),
  eventSpeakers: z.string().trim().min(1, 'Please enter the event speaker(s).'),
  registerLink: z
    .string()
    .trim()
    .min(1, 'Please enter the register link.')
    .url('Please enter a valid URL (e.g. https://example.com/register).'),
});

type EventFormValues = z.infer<typeof eventSchema>;

// ─── Icons ──────────────────────────────────────────────────────────────
const CalendarEventIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const PlaceIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const SpeakerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// ─── Helper: format ISO date for display ──────────────────────────────────
const formatDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// ─── Main Component ─────────────────────────────────────────────────────
export default function EventsUpdate() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      eventName: '',
      eventDate: '',
      eventPlace: '',
      eventSpeakers: '',
      registerLink: '',
    },
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setFetching(true);
    setFetchError('');
    try {
      const res = await fetch(`${API_BASE_URL}/events/list`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      const list: EventItem[] = Array.isArray(data) ? data : [];
      list.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
      setEvents(list);
    } catch (err) {
      console.error(err);
      setFetchError('Could not load events. Is the backend endpoint set up?');
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (values: EventFormValues) => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/events/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: values.eventName.trim(),
          eventDate: values.eventDate,
          eventPlace: values.eventPlace.trim(),
          eventSpeakers: values.eventSpeakers.trim(),
          registerLink: values.registerLink.trim(),
        }),
      });

      if (!res.ok) throw new Error('Save failed');

      setSaveSuccess('Event saved successfully.');
      reset();
      fetchEvents();
    } catch (err) {
      console.error(err);
      setSaveError('Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/events/delete/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete event.');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Styles ───────────────────────────────────────────────────────────
  const s: { [key: string]: CSSProperties } = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#f8f7ff',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      boxSizing: 'border-box',
    },
    contentWrapper: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem 1.5rem',
      paddingTop: '100px',
    },
    headerSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      marginBottom: '28px',
    },
    headerIconBox: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      backgroundColor: '#ede9fe',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#7c3aed',
    },
    headerTitle: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#111827',
      margin: 0,
    },
    headerSub: {
      fontSize: '14px',
      color: '#6b7280',
      margin: '4px 0 0 0',
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '16px',
      border: '1px solid #e5e7eb',
      padding: '28px 32px',
      marginBottom: '32px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#111827',
      margin: '0 0 16px 0',
    },
    formCol: {
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
    },
    fieldRow: {
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap',
    },
    fieldItem: {
      flex: '1 1 220px',
    },
    label: {
      fontSize: '13px',
      fontWeight: 500,
      color: '#374151',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1.5px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '14px',
      color: '#374151',
      outline: 'none',
      boxSizing: 'border-box',
      backgroundColor: 'white',
    },
    fieldError: {
      fontSize: '12px',
      color: '#dc2626',
      margin: '5px 0 0 0',
    },
    btnRow: {
      display: 'flex',
      gap: '10px',
    },
    saveBtn: {
      backgroundColor: '#7c3aed',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      padding: '10px 22px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: saving ? 'not-allowed' : 'pointer',
      opacity: saving ? 0.7 : 1,
    },
    errorBanner: {
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      padding: '10px 16px',
      borderRadius: '10px',
      fontSize: '13px',
      marginTop: '14px',
      border: '1px solid #fecaca',
    },
    successBanner: {
      backgroundColor: '#f0fdf4',
      color: '#16a34a',
      padding: '10px 16px',
      borderRadius: '10px',
      fontSize: '13px',
      marginTop: '14px',
      border: '1px solid #bbf7d0',
    },
    eventsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: '18px',
    },
    eventCard: {
      backgroundColor: 'white',
      borderRadius: '14px',
      border: '1px solid #e5e7eb',
      padding: '16px 18px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    },
    eventTopRow: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '8px',
    },
    eventName: {
      fontSize: '15px',
      fontWeight: 700,
      color: '#111827',
      margin: 0,
    },
    eventDateBadge: {
      display: 'inline-block',
      fontSize: '11px',
      fontWeight: 700,
      color: '#7c3aed',
      backgroundColor: '#ede9fe',
      padding: '3px 10px',
      borderRadius: '20px',
      marginTop: '6px',
    },
    eventDetailRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      color: '#6b7280',
      marginTop: '10px',
    },
    eventLink: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      fontWeight: 600,
      color: '#7c3aed',
      textDecoration: 'none',
      marginTop: '10px',
    },
    deleteBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#9ca3af',
      padding: '4px',
      borderRadius: '6px',
      flexShrink: 0,
      display: 'flex',
    },
    noEvents: {
      textAlign: 'center',
      color: '#9ca3af',
      fontSize: '15px',
      padding: '40px 0',
    },
  };

  return (
    <div style={s.page}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <Header />
      </div>

      <div style={s.contentWrapper}>
        {/* Page Title */}
        <div style={s.headerSection}>
          <div style={s.headerIconBox}>
            <CalendarEventIcon />
          </div>
          <div>
            <h1 style={s.headerTitle}>Events Update</h1>
            <p style={s.headerSub}>Add upcoming events to show on your website</p>
          </div>
        </div>

        {/* Add Event Card */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Add New Event</h2>

          <form style={s.formCol} onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={s.fieldRow}>
              <div style={s.fieldItem}>
                <label style={s.label}>Event Name</label>
                <input
                  style={{ ...s.input, marginTop: '6px' }}
                  type="text"
                  placeholder="e.g. Annual Youth Convention"
                  {...register('eventName')}
                />
                {errors.eventName && <p style={s.fieldError}>{errors.eventName.message}</p>}
              </div>

              <div style={s.fieldItem}>
                <label style={s.label}>Event Date</label>
                <input
                  style={{ ...s.input, marginTop: '6px' }}
                  type="date"
                  {...register('eventDate')}
                />
                {errors.eventDate && <p style={s.fieldError}>{errors.eventDate.message}</p>}
              </div>
            </div>

            <div style={s.fieldRow}>
              <div style={s.fieldItem}>
                <label style={s.label}>Event Place</label>
                <input
                  style={{ ...s.input, marginTop: '6px' }}
                  type="text"
                  placeholder="e.g. JR Auditorium, Salem"
                  {...register('eventPlace')}
                />
                {errors.eventPlace && <p style={s.fieldError}>{errors.eventPlace.message}</p>}
              </div>

              <div style={s.fieldItem}>
                <label style={s.label}>Event Speakers</label>
                <input
                  style={{ ...s.input, marginTop: '6px' }}
                  type="text"
                  placeholder="e.g. Rev. John Doe, Pastor Mary Smith"
                  {...register('eventSpeakers')}
                />
                {errors.eventSpeakers && <p style={s.fieldError}>{errors.eventSpeakers.message}</p>}
              </div>
            </div>

            <div>
              <label style={s.label}>Register Link</label>
              <input
                style={{ ...s.input, marginTop: '6px' }}
                type="text"
                placeholder="e.g. https://example.com/register"
                {...register('registerLink')}
              />
              {errors.registerLink && <p style={s.fieldError}>{errors.registerLink.message}</p>}
            </div>

            <div style={s.btnRow}>
              <button type="submit" style={s.saveBtn} disabled={saving}>
                {saving ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </form>

          {saveError && <div style={s.errorBanner}>{saveError}</div>}
          {saveSuccess && <div style={s.successBanner}>{saveSuccess}</div>}
        </div>

        {/* Existing Events */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Upcoming Events</h2>

          {fetchError && <div style={s.errorBanner}>{fetchError}</div>}

          {fetching ? (
            <div style={s.noEvents}>Loading events...</div>
          ) : events.length === 0 ? (
            <div style={s.noEvents}>No events added yet.</div>
          ) : (
            <div style={s.eventsGrid}>
              {events.map((ev) => (
                <div key={ev.id} style={s.eventCard}>
                  <div style={s.eventTopRow}>
                    <div>
                      <p style={s.eventName}>{ev.eventName}</p>
                      <span style={s.eventDateBadge}>{formatDate(ev.eventDate)}</span>
                    </div>
                    <button
                      style={s.deleteBtn}
                      onClick={() => handleDelete(ev.id)}
                      disabled={deletingId === ev.id}
                      title="Delete event"
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  <div style={s.eventDetailRow}>
                    <PlaceIcon />
                    <span>{ev.eventPlace}</span>
                  </div>

                  <div style={s.eventDetailRow}>
                    <SpeakerIcon />
                    <span>{ev.eventSpeakers}</span>
                  </div>

                  {ev.registerLink && (
                    <a
                      href={ev.registerLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={s.eventLink}
                    >
                      <LinkIcon />
                      Register Link
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
