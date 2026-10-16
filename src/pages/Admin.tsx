import { useState, useEffect } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';
import Header from '../components/Header';

const API_BASE_URL = "/jrmobile"; // uses the CRA/Vite proxy — no CORS needed

// ─── Icons ──────────────────────────────────────────────────────────────
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const RoleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 8v4" />
    <circle cx="12" cy="16" r="0.5" fill="currentColor" />
  </svg>
);

const SaveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
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

// ─── Main Component ─────────────────────────────────────────────────────
interface UserAccount {
  id: string | number;
  userName: string;
  role: string;
  createdBy?: string;
  createdAt?: string;
}

export default function Admin() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [form, setForm] = useState({ name: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  // Fetch real users from backend on mount

  const fetchUsers = async () => {
    setFetching(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/listUser`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data); // [{ id, userName, password(hashed), role, createdBy, createdAt }, ...]
    } catch (err) {
      console.error(err);
      setError('Could not load users from server.');
    } finally {
      setFetching(false);
    }
  };

    useEffect(() => {
    fetchUsers();
  }, []);
  

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.password.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: form.name.trim(),
          password: form.password.trim(),
          role: form.role,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Registration failed');
      }

      setForm({ name: '', password: '', role: 'user' });
      await fetchUsers(); // refresh list from DB
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to add user. Username may already exist.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string | number) => {
    // NOTE: backend has no DELETE endpoint yet — this only removes it
    // from the screen, not from the database. It will reappear on refresh.
    if (window.confirm('Delete this user? (Note: backend delete endpoint not implemented yet — this user will still exist in the database and reappear on page refresh.)')) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  // ─── Styles ───────────────────────────────────────────────────────────
  const s: { [key: string]: CSSProperties } = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#f8f7ff',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: 0,
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
    },
    headerTitle: {
      fontSize: '24px',
      fontWeight: '700',
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
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr auto',
      gap: '18px',
      alignItems: 'end',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    label: {
      fontSize: '13px',
      fontWeight: '500',
      color: '#374151',
    },
    inputWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    inputIcon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#9ca3af',
      pointerEvents: 'none',
    },
    input: {
      width: '100%',
      padding: '10px 12px 10px 38px',
      border: '1.5px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '14px',
      color: '#374151',
      outline: 'none',
      boxSizing: 'border-box',
      backgroundColor: 'white',
    },
    select: {
      width: '100%',
      padding: '10px 12px 10px 38px',
      border: '1.5px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '14px',
      color: '#374151',
      outline: 'none',
      boxSizing: 'border-box',
      backgroundColor: 'white',
      appearance: 'auto',
      cursor: 'pointer',
    },
    saveBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: '#7c3aed',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      padding: '10px 24px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.7 : 1,
      whiteSpace: 'nowrap',
      height: '42px',
      alignSelf: 'end',
    },
    usersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: '20px',
    },
    userCard: {
      backgroundColor: 'white',
      borderRadius: '14px',
      border: '1px solid #e5e7eb',
      padding: '18px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      position: 'relative',
      transition: 'box-shadow 0.2s',
    },
    userCardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '10px',
    },
    userName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#111827',
      margin: 0,
    },
    userRole: {
      fontSize: '12px',
      fontWeight: '600',
      padding: '3px 10px',
      borderRadius: '20px',
      backgroundColor: '#ede9fe',
      color: '#7c3aed',
    },
    userMeta: {
      fontSize: '13px',
      color: '#9ca3af',
      margin: '6px 0 0 0',
    },
    deleteBtn: {
      background: 'none',
      border: 'none',
      // cursor: 'pointer',
      color: '#9ca3af',
      padding: '4px',
      borderRadius: '6px',
      width:'100%',
      // transition: 'background 0.15s, color 0.15s',
    },
    noUsers: {
      textAlign: 'center',
      color: '#9ca3af',
      fontSize: '15px',
      padding: '40px 0',
    },
    errorBanner: {
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      padding: '10px 16px',
      borderRadius: '10px',
      fontSize: '13px',
      marginBottom: '16px',
      border: '1px solid #fecaca',
    },
  };

  // ─── Delete Button - Hover Movement தடுக்கும் CSS ───────────────────
  const deleteBtnStyles = `
    .deleteBtnFix {
      background: none !important;
      border: none !important;
      color: #9ca3af !important;
      padding: 4px !important;
      border-radius: 6px !important;
      width: 100% !important;
      transform: none !important;
      transition: none !important;
      box-shadow: none !important;
      cursor: pointer !important;
    }
    .deleteBtnFix:hover,
    .deleteBtnFix:active,
    .deleteBtnFix:focus {
      transform: none !important;
      background: none !important;
      color: #9ca3af !important;
      border: none !important;
      box-shadow: none !important;
    }
    /* Icon-க்கு ஏதேனும் animation இருந்தால் அதையும் நிறுத்தும் */
    .deleteBtnFix:hover svg,
    .deleteBtnFix:active svg {
      transform: none !important;
      transition: none !important;
    }
  `;

  return (
    <>
      {/* Inject CSS to stop delete button hover movement */}
      <style dangerouslySetInnerHTML={{ __html: deleteBtnStyles }} />

      <div style={s.page}>
        {/* Fixed Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
          <Header />
        </div>

        {/* Main Content */}
        <div style={s.contentWrapper}>
          {/* Page Title */}
          <div style={s.headerSection}>
            <div style={s.headerIconBox}>
              <RoleIcon />
            </div>
            <div>
              <h1 style={s.headerTitle}>Manage Users & Admins</h1>
              <p style={s.headerSub}>Add, view, and manage user accounts</p>
            </div>
          </div>

          {error && <div style={s.errorBanner}>{error}</div>}

          {/* Add User Form */}
          <div style={s.card}>
            <div style={s.formGrid}>
              {/* Name */}
              <div style={s.formGroup}>
                <label style={s.label}>Username</label>
                <div style={s.inputWrapper}>
                  <span style={s.inputIcon}><UserIcon /></span>
                  <input
                    style={s.input}
                    type="text"
                    name="name"
                    placeholder="Enter username"
                    value={form.name}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={s.formGroup}>
                <label style={s.label}>Password</label>
                <div style={s.inputWrapper}>
                  <span style={s.inputIcon}><LockIcon /></span>
                  <input
                    style={s.input}
                    type="password"
                    name="password"
                    placeholder="Enter password"
                    value={form.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Role */}
              <div style={s.formGroup}>
                <label style={s.label}>Role</label>
                <div style={s.inputWrapper}>
                  <span style={s.inputIcon}><RoleIcon /></span>
                  <select
                    style={s.select}
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {/* Save Button */}
              <button style={s.saveBtn} onClick={handleSave} disabled={loading}>
                <SaveIcon />
                {loading ? 'Saving...' : 'Save User'}
              </button>
            </div>
          </div>

          {/* Users Grid */}
          <div style={s.card}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              Registered Users
            </h2>
            {fetching ? (
              <div style={s.noUsers}>Loading users...</div>
            ) : users.length === 0 ? (
              <div style={s.noUsers}>No users added yet.</div>
            ) : (
              <div style={s.usersGrid}>
                {users.map((user) => (
                  <div key={user.id} style={s.userCard}>
                    <div style={s.userCardHeader}>
                      <p style={s.userName}>{user.userName}</p>
                      <span style={s.userRole}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                    <p style={s.userMeta}>
                      Created by {user.createdBy || 'unknown'}
                    </p>
                    {/* 🔥 IMPORTANT: className="deleteBtnFix" add பண்ணியுள்ளேன். Hover-ல் அசையாது */}
                    <button
                      className="deleteBtnFix"
                      style={s.deleteBtn}
                      onClick={() => handleDelete(user.id)}
                      title="Delete user"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}