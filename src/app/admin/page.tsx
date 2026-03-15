'use client';

import { useState, useEffect, useCallback } from 'react';

interface Participant {
  _id: string;
  participantId: string;
  name: string;
  email: string;
  collegeEmail: string;
  regNo: string;
  phone: string;
  amountPaid: number;
  paymentId: string;
  paymentStatus: 'PAID' | 'FAILED' | 'REFUNDED' | 'PENDING';
  attendance?: { present: boolean; checkedAt: string };
  round1Score: number | null;
  round1SubmittedAt: string | null;
  round1Warnings: number;
  isShortlisted: boolean;
  round2Score: number | null;
  createdAt: string;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}

interface EventConfig {
  round1Active: boolean;
  round2Active: boolean;
  registrationOpen: boolean;
}

interface MCQQuestion {
  _id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: string;
  points: number;
  order: number;
}

interface CodingQuestion {
  _id: string;
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  sampleInput: string;
  sampleOutput: string;
  points: number;
  order: number;
}

type Tab = 'participants' | 'controls' | 'round1' | 'announcements' | 'questions';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [savedPassword, setSavedPassword] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('participants');

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [config, setConfig] = useState<EventConfig>({ round1Active: false, round2Active: false, registrationOpen: true });
  const [configLoading, setConfigLoading] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newNotif, setNewNotif] = useState({ title: '', message: '', type: 'info' });
  const [shortlistCount, setShortlistCount] = useState(30);
  const [shortlisting, setShortlisting] = useState(false);

  // Questions State
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [codingQuestions, setCodingQuestions] = useState<CodingQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [qTab, setQTab] = useState<'mcq' | 'coding'>('mcq');

  const [newMCQ, setNewMCQ] = useState({
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    category: 'logic',
    difficulty: 'easy',
    points: 1,
    order: 0
  });

  const [newCoding, setNewCoding] = useState({
    title: '',
    description: '',
    inputFormat: '',
    outputFormat: '',
    sampleInput: '',
    sampleOutput: '',
    points: 10,
    order: 0
  });

  const fetchParticipants = useCallback(async (pw: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/teams', { headers: { Authorization: `Bearer ${pw}` } });
      const data = await res.json();
      setParticipants(data.participants || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/event-config');
      const data = await res.json();
      if (data.config) setConfig(data.config);
    } catch (err) { console.error(err); }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchQuestions = useCallback(async (pw: string, type: 'mcq' | 'coding') => {
    setQuestionsLoading(true);
    try {
      const res = await fetch(`/api/admin/questions?type=${type}`, {
        headers: { Authorization: `Bearer ${pw}` }
      });
      const data = await res.json();
      if (type === 'mcq') setMcqQuestions(data.questions || []);
      else setCodingQuestions(data.questions || []);
    } catch (err) { console.error(err); }
    finally { setQuestionsLoading(false); }
  }, []);

  async function handleAuth() {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (res.ok) {
        setSavedPassword(password);
        setAuthed(true);
        fetchParticipants(password);
        fetchConfig();
        fetchNotifications();
        fetchQuestions(password, 'mcq');
        fetchQuestions(password, 'coding');
      } else {
        setAuthError('Incorrect password.');
      }
    } catch { setAuthError('Server error.'); }
    finally { setAuthLoading(false); }
  }

  useEffect(() => {
    if (authed && savedPassword) {
      const interval = setInterval(() => {
        fetchParticipants(savedPassword);
        fetchConfig();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [authed, savedPassword, fetchParticipants, fetchConfig]);

  async function toggleConfig(field: string, value: boolean) {
    setConfigLoading(true);
    try {
      await fetch('/api/admin/event-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword, [field]: value }),
      });
      await fetchConfig();
    } catch (err) { console.error(err); }
    finally { setConfigLoading(false); }
  }

  async function handleShortlist() {
    if (!confirm(`Shortlist the top ${shortlistCount} participants by Round 1 score?\n\nThis will also send shortlist emails to all selected participants.`)) return;
    setShortlisting(true);
    try {
      const res = await fetch('/api/admin/shortlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword, count: shortlistCount }),
      });
      const data = await res.json();
      alert(data.message || 'Shortlisted!');
      fetchParticipants(savedPassword);
    } catch { alert('Shortlisting failed.'); }
    finally { setShortlisting(false); }
  }

  async function handleCreateNotification() {
    if (!newNotif.title || !newNotif.message) return alert('Title and message required.');
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword, ...newNotif }),
      });
      setNewNotif({ title: '', message: '', type: 'info' });
      fetchNotifications();
    } catch { alert('Failed.'); }
  }

  async function handleDeleteNotification(id: string) {
    if (!confirm('Delete this notification?')) return;
    try {
      await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword, id }),
      });
      fetchNotifications();
    } catch { alert('Failed.'); }
  }

  async function handleDeleteQuestion(id: string, type: 'mcq' | 'coding') {
    if (!confirm('Delete this question?')) return;
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword, id, type }),
      });
      if (res.ok) fetchQuestions(savedPassword, type);
      else alert('Failed to delete.');
    } catch { alert('Error.'); }
  }

  async function handleAddMCQ() {
    if (!newMCQ.questionText || newMCQ.options.some(o => !o)) return alert('Fill all fields.');
    try {
      const res = await fetch('/api/admin/seed-mcq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword, questions: [newMCQ] }),
      });
      if (res.ok) {
        alert('Added!');
        fetchQuestions(savedPassword, 'mcq');
        setNewMCQ({ questionText: '', options: ['', '', '', ''], correctAnswer: 0, category: 'logic', difficulty: 'easy', points: 1, order: mcqQuestions.length });
      } else alert('Failed.');
    } catch { alert('Error.'); }
  }

  async function handleAddCoding() {
    if (!newCoding.title || !newCoding.description || !newCoding.inputFormat || !newCoding.outputFormat) return alert('Fill title, description, input and output format.');
    try {
      const res = await fetch('/api/admin/seed-coding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword, questions: [newCoding] }),
      });
      if (res.ok) {
        alert('Added!');
        fetchQuestions(savedPassword, 'coding');
        setNewCoding({ title: '', description: '', inputFormat: '', outputFormat: '', sampleInput: '', sampleOutput: '', points: 10, order: codingQuestions.length });
      } else alert('Failed.');
    } catch { alert('Error.'); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/export', { headers: { Authorization: `Bearer ${savedPassword}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `espionage-participants-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed.'); }
    finally { setExporting(false); }
  }

  const filtered = participants.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.participantId.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.regNo.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: participants.length,
    paid: participants.filter((p) => p.paymentStatus === 'PAID').length,
    revenue: participants.filter((p) => p.paymentStatus === 'PAID').reduce((s, p) => s + p.amountPaid, 0),
    checkedIn: participants.filter((p) => p.attendance?.present).length,
    round1Done: participants.filter((p) => p.round1SubmittedAt).length,
    shortlisted: participants.filter((p) => p.isShortlisted).length,
  };

  const statusColor = (s: string) => s === 'PAID' ? '#22c55e' : s === 'PENDING' ? '#f59e0b' : '#ef4444';

  // ── Password Gate ──
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: 400, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🔐</p>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, color: 'var(--spy-green)', marginBottom: 8, letterSpacing: 3 }}>ADMIN ACCESS</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>Espionage — Command Center</p>
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            className="form-input"
            style={{ marginBottom: 8, textAlign: 'center' }}
          />
          {authError && <p style={{ color: 'var(--spy-red)', fontSize: 13, marginBottom: 12 }}>{authError}</p>}
          <button className="btn-spy" style={{ width: '100%', padding: 14, marginTop: 8 }} onClick={handleAuth} disabled={authLoading}>
            <span>{authLoading ? 'Verifying…' : 'Enter Command Center'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Admin Dashboard ──
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', padding: '24px 20px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="font-display" style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: 2 }}>
              <span className="text-spy-gradient">ESPIONAGE</span> — Command Center
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Live dashboard • Auto-refresh 30s</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fetchParticipants(savedPassword)} className="btn-gold" style={{ padding: '8px 16px', fontSize: 13 }}>🔄 Refresh</button>
            <button onClick={handleExport} className="btn-spy" style={{ padding: '8px 16px', fontSize: 13 }} disabled={exporting}>
              <span>{exporting ? 'Exporting…' : '📥 CSV'}</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Registered', value: stats.total, icon: '👥', color: '#a855f7' },
            { label: 'Verified', value: stats.paid, icon: '✅', color: '#22c55e' },
            { label: 'Revenue', value: `₹${stats.revenue}`, icon: '💰', color: '#00ff41' },
            { label: 'Checked In', value: stats.checkedIn, icon: '📍', color: '#3b82f6' },
            { label: 'R1 Done', value: stats.round1Done, icon: '🧠', color: '#00e5ff' },
            { label: 'Shortlisted', value: stats.shortlisted, icon: '⭐', color: '#ffb300' },
          ].map((s) => (
            <div key={s.label} className="spy-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
              </div>
              <p className="font-display" style={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: 0.5 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0, overflowX: 'auto' }}>
          {([
            { id: 'participants', label: '👥 Participants' },
            { id: 'controls', label: '⚙️ Event Controls' },
            { id: 'round1', label: '🧠 Round 1 Results' },
            { id: 'announcements', label: '📣 Announcements' },
            { id: 'questions', label: '❓ Questions' },
          ] as { id: Tab; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                background: activeTab === tab.id ? 'rgba(0,255,65,0.08)' : 'transparent',
                color: activeTab === tab.id ? 'var(--spy-green)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--spy-green)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Participants ── */}
        {activeTab === 'participants' && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <input
                placeholder="Search name, ID, email, reg no…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ flex: 1, minWidth: 240 }}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center' }}>
                {filtered.length} / {participants.length}
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ width: 48, height: 48, border: '3px solid rgba(0,255,65,0.15)', borderTop: '3px solid var(--spy-green)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(13,17,23,0.8)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', minWidth: 900 }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, rgba(0,51,17,0.4), rgba(13,17,23,0.9))', borderBottom: '1px solid var(--border-bright)' }}>
                      {['ID', 'Name', 'Email', 'Reg No', 'Phone', 'Attendance', 'Amount', 'Status', 'Payment ID', 'Date'].map((h) => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--spy-green)', letterSpacing: 1.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, idx) => (
                      <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <span className="font-mono" style={{ fontWeight: 700, fontSize: 12, color: 'var(--spy-green)', background: 'rgba(0,255,65,0.08)', padding: '3px 8px', borderRadius: 4 }}>{p.participantId}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{p.name}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{p.email}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{p.regNo}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{p.phone}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: p.attendance?.present ? '#22c55e' : '#888' }}>
                            {p.attendance?.present ? '✅' : '❌'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#22c55e' }}>₹{p.amountPaid}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(p.paymentStatus), background: `${statusColor(p.paymentStatus)}18`, border: `1px solid ${statusColor(p.paymentStatus)}40`, borderRadius: 999, padding: '3px 8px', letterSpacing: 1 }}>
                            {p.paymentStatus}
                          </span>
                          {p.paymentStatus === 'PENDING' && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Verify payment for ${p.participantId}?`)) return;
                                try {
                                  const res = await fetch('/api/admin/verify-payment', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${savedPassword}` },
                                    body: JSON.stringify({ participantId: p.participantId }),
                                  });
                                  if (res.ok) fetchParticipants(savedPassword);
                                  else alert('Failed');
                                } catch { alert('Error'); }
                              }}
                              style={{ marginLeft: 6, padding: '3px 8px', fontSize: 10, background: 'var(--spy-green)', color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                            >
                              Verify
                            </button>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 10, color: 'var(--text-dim)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.paymentId}</td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                          {new Date(p.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Event Controls ── */}
        {activeTab === 'controls' && (
          <div style={{ maxWidth: 500 }}>
            <div className="spy-card" style={{ padding: 28, marginBottom: 20 }}>
              <h3 className="font-display" style={{ fontSize: 16, color: 'var(--spy-green)', marginBottom: 20, letterSpacing: 2 }}>⚙️ EVENT TOGGLES</h3>
              {([
                { field: 'registrationOpen', label: 'Registration Open', value: config.registrationOpen },
                { field: 'round1Active', label: 'Round 1 Active', value: config.round1Active },
                { field: 'round2Active', label: 'Round 2 Active', value: config.round2Active },
              ] as { field: string; label: string; value: boolean }[]).map((toggle) => (
                <div key={toggle.field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>{toggle.label}</span>
                  <button
                    onClick={() => toggleConfig(toggle.field, !toggle.value)}
                    disabled={configLoading}
                    style={{
                      width: 52,
                      height: 28,
                      borderRadius: 14,
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      background: toggle.value ? 'var(--spy-green)' : 'rgba(255,255,255,0.1)',
                      transition: 'background 0.3s',
                    }}
                  >
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: 3,
                      left: toggle.value ? 27 : 3,
                      transition: 'left 0.3s',
                    }} />
                  </button>
                </div>
              ))}
            </div>

            <div className="spy-card" style={{ padding: 28 }}>
              <h3 className="font-display" style={{ fontSize: 16, color: 'var(--spy-amber)', marginBottom: 16, letterSpacing: 2 }}>⭐ SHORTLIST FOR ROUND 2</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                Select the top N participants by Round 1 score. They will be marked as shortlisted and receive notification emails.
              </p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>Top</span>
                <input
                  type="number"
                  value={shortlistCount}
                  onChange={(e) => setShortlistCount(Number(e.target.value))}
                  className="form-input"
                  style={{ width: 80, textAlign: 'center' }}
                />
                <button
                  onClick={handleShortlist}
                  disabled={shortlisting}
                  className="btn-classified"
                  style={{ padding: '10px 20px', fontSize: 13 }}
                >
                  <span>{shortlisting ? 'Processing…' : '🎯 Shortlist & Notify'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Round 1 Results ── */}
        {activeTab === 'round1' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(13,17,23,0.8)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, rgba(0,51,17,0.4), rgba(13,17,23,0.9))', borderBottom: '1px solid var(--border-bright)' }}>
                  {['Rank', 'ID', 'Name', 'Email', 'Score', 'Warnings', 'Submitted At', 'Shortlisted'].map((h) => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--spy-green)', letterSpacing: 1.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participants
                  .filter((p) => p.round1Score !== null)
                  .sort((a, b) => (b.round1Score ?? 0) - (a.round1Score ?? 0))
                  .map((p, idx) => (
                    <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: idx < 3 ? 'rgba(0,255,65,0.03)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="font-display" style={{ fontWeight: 900, fontSize: 16, color: idx < 3 ? 'var(--spy-green)' : 'var(--text-muted)' }}>#{idx + 1}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="font-mono" style={{ fontSize: 12, color: 'var(--spy-green)' }}>{p.participantId}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{p.name}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{p.email}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="font-display" style={{ fontSize: 18, fontWeight: 900, color: 'var(--spy-green)' }}>{p.round1Score}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: p.round1Warnings > 0 ? 'var(--spy-red)' : 'var(--text-dim)' }}>
                        {p.round1Warnings > 0 ? `⚠️ ${p.round1Warnings}` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-dim)' }}>
                        {p.round1SubmittedAt ? new Date(p.round1SubmittedAt).toLocaleString('en-IN', { timeStyle: 'short' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {p.isShortlisted ? (
                          <span style={{ color: 'var(--spy-green)', fontSize: 12, fontWeight: 700 }}>⭐ Yes</span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {participants.filter((p) => p.round1Score !== null).length === 0 && (
              <div className="spy-card" style={{ padding: 40, textAlign: 'center', marginTop: 16 }}>
                <p style={{ color: 'var(--text-muted)' }}>No Round 1 submissions yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Announcements ── */}
        {activeTab === 'announcements' && (
          <div style={{ maxWidth: 600 }}>
            <div className="spy-card" style={{ padding: 28, marginBottom: 24 }}>
              <h3 className="font-display" style={{ fontSize: 16, color: 'var(--spy-green)', marginBottom: 16, letterSpacing: 2 }}>📣 NEW ANNOUNCEMENT</h3>
              <input
                placeholder="Title"
                value={newNotif.title}
                onChange={(e) => setNewNotif((p) => ({ ...p, title: e.target.value }))}
                className="form-input"
                style={{ marginBottom: 10 }}
              />
              <textarea
                placeholder="Message to all agents…"
                value={newNotif.message}
                onChange={(e) => setNewNotif((p) => ({ ...p, message: e.target.value }))}
                className="form-input"
                style={{ marginBottom: 10, minHeight: 80, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select
                  value={newNotif.type}
                  onChange={(e) => setNewNotif((p) => ({ ...p, type: e.target.value }))}
                  className="form-input"
                  style={{ width: 140 }}
                >
                  <option value="info">ℹ️ Info</option>
                  <option value="warning">⚠️ Warning</option>
                  <option value="success">✅ Success</option>
                  <option value="danger">🚨 Danger</option>
                </select>
                <button onClick={handleCreateNotification} className="btn-spy" style={{ padding: '10px 20px', fontSize: 13 }}>
                  <span>📡 Broadcast</span>
                </button>
              </div>
            </div>

            <h4 style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12, letterSpacing: 1 }}>ACTIVE ANNOUNCEMENTS</h4>
            {notifications.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No announcements yet.</p>
            ) : (
              notifications.map((n) => (
                <div key={n._id} className="spy-card" style={{ padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 2 }}>{n.title}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{n.message}</p>
                    <p style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 4 }}>
                      {new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteNotification(n._id)}
                    style={{ background: 'rgba(255,0,60,0.1)', border: '1px solid rgba(255,0,60,0.3)', color: 'var(--spy-red)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Tab: Questions ── */}
        {activeTab === 'questions' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              <button
                onClick={() => setQTab('mcq')}
                className={qTab === 'mcq' ? 'btn-spy' : 'btn-gold'}
                style={{ padding: '8px 20px', fontSize: 13 }}
              >
                <span>Round 1 (MCQ)</span>
              </button>
              <button
                onClick={() => setQTab('coding')}
                className={qTab === 'coding' ? 'btn-spy' : 'btn-gold'}
                style={{ padding: '8px 20px', fontSize: 13 }}
              >
                <span>Round 2 (Coding)</span>
              </button>
            </div>

            {qTab === 'mcq' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(13,17,23,0.8)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, rgba(0,51,17,0.4), rgba(13,17,23,0.9))', borderBottom: '1px solid var(--border-bright)' }}>
                        {['Order', 'Question', 'Category', 'Points', 'Actions'].map((h) => (
                          <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--spy-green)', letterSpacing: 1.5, textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mcqQuestions.map((q) => (
                        <tr key={q._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{q.order}</td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-primary)', maxWidth: 400 }}>{q.questionText}</td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--spy-amber)' }}>{q.category}</td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--spy-green)', fontWeight: 700 }}>{q.points}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <button onClick={() => handleDeleteQuestion(q._id, 'mcq')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {mcqQuestions.length === 0 && <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>No questions found.</p>}
                </div>

                <div className="spy-card" style={{ padding: 20, height: 'fit-content' }}>
                  <h3 className="font-display" style={{ fontSize: 14, color: 'var(--spy-green)', marginBottom: 16, letterSpacing: 1 }}>➕ ADD MCQ</h3>
                  <textarea
                    placeholder="Question Text"
                    value={newMCQ.questionText}
                    onChange={(e) => setNewMCQ({ ...newMCQ, questionText: e.target.value })}
                    className="form-input"
                    style={{ marginBottom: 10, minHeight: 80 }}
                  />
                  {newMCQ.options.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input
                        type="radio"
                        name="correct"
                        checked={newMCQ.correctAnswer === i}
                        onChange={() => setNewMCQ({ ...newMCQ, correctAnswer: i })}
                      />
                      <input
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const opts = [...newMCQ.options];
                          opts[i] = e.target.value;
                          setNewMCQ({ ...newMCQ, options: opts });
                        }}
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    <select
                      value={newMCQ.category}
                      onChange={(e) => setNewMCQ({ ...newMCQ, category: e.target.value })}
                      className="form-input"
                    >
                      <option value="logic">Logic</option>
                      <option value="cyber">Cyber</option>
                      <option value="coding">Coding</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Points"
                      value={newMCQ.points}
                      onChange={(e) => setNewMCQ({ ...newMCQ, points: Number(e.target.value) })}
                      className="form-input"
                    />
                  </div>
                  <button onClick={handleAddMCQ} className="btn-spy" style={{ width: '100%', padding: 12 }}>
                    <span>Create Question</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24 }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(13,17,23,0.8)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, rgba(0,51,17,0.4), rgba(13,17,23,0.9))', borderBottom: '1px solid var(--border-bright)' }}>
                        {['Order', 'Title', 'Points', 'Actions'].map((h) => (
                          <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--spy-green)', letterSpacing: 1.5, textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {codingQuestions.map((q) => (
                        <tr key={q._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{q.order}</td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-primary)' }}>{q.title}</td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--spy-green)', fontWeight: 700 }}>{q.points}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <button onClick={() => handleDeleteQuestion(q._id, 'coding')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {codingQuestions.length === 0 && <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>No questions found.</p>}
                </div>

                <div className="spy-card" style={{ padding: 20, height: 'fit-content' }}>
                  <h3 className="font-display" style={{ fontSize: 14, color: 'var(--spy-green)', marginBottom: 16, letterSpacing: 1 }}>➕ ADD CODING QUESTION</h3>
                  <input
                    placeholder="Title"
                    value={newCoding.title}
                    onChange={(e) => setNewCoding({ ...newCoding, title: e.target.value })}
                    className="form-input"
                    style={{ marginBottom: 10 }}
                  />
                  <textarea
                    placeholder="Description (Markdown)"
                    value={newCoding.description}
                    onChange={(e) => setNewCoding({ ...newCoding, description: e.target.value })}
                    className="form-input"
                    style={{ marginBottom: 10, minHeight: 120 }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <textarea
                      placeholder="Input Format"
                      value={newCoding.inputFormat}
                      onChange={(e) => setNewCoding({ ...newCoding, inputFormat: e.target.value })}
                      className="form-input"
                      style={{ fontSize: 12, minHeight: 60 }}
                    />
                    <textarea
                      placeholder="Output Format"
                      value={newCoding.outputFormat}
                      onChange={(e) => setNewCoding({ ...newCoding, outputFormat: e.target.value })}
                      className="form-input"
                      style={{ fontSize: 12, minHeight: 60 }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <textarea
                      placeholder="Sample Input"
                      value={newCoding.sampleInput}
                      onChange={(e) => setNewCoding({ ...newCoding, sampleInput: e.target.value })}
                      className="form-input"
                      style={{ fontSize: 12, minHeight: 60 }}
                    />
                    <textarea
                      placeholder="Sample Output"
                      value={newCoding.sampleOutput}
                      onChange={(e) => setNewCoding({ ...newCoding, sampleOutput: e.target.value })}
                      className="form-input"
                      style={{ fontSize: 12, minHeight: 60 }}
                    />
                  </div>
                  <input
                    type="number"
                    placeholder="Points"
                    value={newCoding.points}
                    onChange={(e) => setNewCoding({ ...newCoding, points: Number(e.target.value) })}
                    className="form-input"
                    style={{ marginBottom: 16 }}
                  />
                  <button onClick={handleAddCoding} className="btn-spy" style={{ width: '100%', padding: 12 }}>
                    <span>Create Question</span>
                  </button>
                  <p style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 10, textAlign: 'center' }}>
                    Note: Hidden test cases must be added via direct API / DB for now.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
