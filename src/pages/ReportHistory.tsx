import  { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import Header from '../components/Header';
import { Search, Eye, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const API_BASE_URL = "/jrmobile";

interface ReportLog {
  id: string | number;
  reportName: string;
  generatedAt: string;
}

export default function ReportHistory() {
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const stored: ReportLog[] = JSON.parse(localStorage.getItem('reportLogs') || '[]');
    stored.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    setLogs(stored);
  }, []);

  const filtered = logs.filter((l) =>
    l.reportName.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd} ${mm} ${yyyy}`;
  };

  const handleView = (log: ReportLog) => {
    alert(`Report: ${log.reportName}\nGenerated: ${formatDate(log.generatedAt)}`);
  };

  const handleDownload = async (log: ReportLog) => {
    try {
      const res = await fetch(`${API_BASE_URL}/soul/list`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const exportData = data.map((u: {
        name: string;
        mobile: string;
        email: string;
        dob: string;
        gender: string;
        place: string;
      }, idx: number) => ({
        'SL No': idx + 1,
        'Name': u.name,
        'Mobile': u.mobile,
        'Email': u.email,
        'DOB': u.dob,
        'Gender': u.gender,
        'Place': u.place,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      XLSX.writeFile(wb, `${log.reportName.replace(/\s+/g, '_')}_${formatDate(log.generatedAt).replace(/\s+/g, '_')}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Failed to download report.');
    }
  };

  const s: { [key: string]: CSSProperties } = {
    page: { minHeight: '100vh', backgroundColor: '#f8f7ff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    contentWrapper: { maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem', paddingTop: '100px' },
    title: { fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 },
    subtitle: { fontSize: '13px', color: '#6b7280', margin: '4px 0 20px 0' },
    searchWrapper: { position: 'relative', marginBottom: '20px', maxWidth: '360px' },
    searchIcon: { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
    searchInput: { width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
    card: { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '11px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' },
    td: { padding: '13px 16px', fontSize: '13px', color: '#374151', borderBottom: '1px solid #f9fafb' },
    actionIcon: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginRight: '12px' },
    noData: { padding: '40px 20px', textAlign: 'center', color: '#6b7280' },
  };

  return (
    <div style={s.page}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <Header />
      </div>
      <div style={s.contentWrapper}>
        <p style={s.title}>Report History</p>
        <p style={s.subtitle}>All reports generated from the Reports page</p>

        <div style={s.searchWrapper}>
          <span style={s.searchIcon}><Search size={16} /></span>
          <input
            style={s.searchInput}
            type="text"
            placeholder="Search by report name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={s.card}>
          {filtered.length === 0 ? (
            <div style={s.noData}>No reports generated yet.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Report Name</th>
                  <th style={s.th}>Date</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td style={s.td}>{log.reportName}</td>
                    <td style={s.td}>{formatDate(log.generatedAt)}</td>
                    <td style={s.td}>
                      {/* View icon – clickable, no button */}
                      <span
                        style={s.actionIcon}
                        title="View"
                        onClick={() => handleView(log)}
                      >
                        <Eye size={15} color="#7c3aed" />
                      </span>
                      {/* Download icon – clickable, no button */}
                      <span
                        style={{ ...s.actionIcon, marginRight: 0 }}
                        title="Download"
                        onClick={() => handleDownload(log)}
                      >
                        <Download size={15} color="#3b82f6" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}