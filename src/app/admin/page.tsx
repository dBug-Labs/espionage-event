'use client';

import { useState, useEffect, useCallback } from 'react';

interface Partner {
  name: string;
  email: string;
  collegeEmail: string;
  regNo: string;
  phone: string;
}

interface Participant {
  _id: string;
  participantId: string;
  name: string;
  email: string;
  collegeEmail: string;
  regNo: string;
  phone: string;
  teamType: 'solo' | 'duo';
  partner?: Partner;
  rsvpStatus: 'PENDING' | 'CONFIRMED' | 'DECLINED';
  rsvpAt: string | null;
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

  const [sendingRSVP, setSendingRSVP] = useState(false);
  const [sendingQR, setSendingQR] = useState(false);

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
    if (!confirm(`Shortlist the top ${shortlistCount} teams by Round 1 score?\n\nThis will also send shortlist emails to all team members.`)) return;
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

  async function handleSendRSVP() {
    if (!confirm('Send RSVP emails to ALL registered team leaders who haven\'t received one yet?')) return;
    setSendingRSVP(true);
    try {
      const res = await fetch('/api/admin/send-rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword }),
      });
      const data = await res.json();
      alert(data.message || 'Done!');
      fetchParticipants(savedPassword);
    } catch { alert('Failed to send RSVP emails.'); }
    finally { setSendingRSVP(false); }
  }

  async function handleSendAttendanceQR() {
    if (!confirm('Send attendance QR emails to ALL RSVP-confirmed teams?\n\nThis includes venue, time, QR code, and dashboard login link.')) return;
    setSendingQR(true);
    try {
      const res = await fetch('/api/admin/send-attendance-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword }),
      });
      const data = await res.json();
      alert(data.message || 'Done!');
    } catch { alert('Failed to send attendance QR emails.'); }
    finally { setSendingQR(false); }
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

  async function handleSeedDefaults() {
    if (!confirm('Replace the current Round 1 and Round 2 question banks with the espionage defaults?')) return;
    try {
      const res = await fetch('/api/admin/seed-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to seed.');
        return;
      }
      alert(`Seeded ${data.mcqInserted} MCQs and ${data.codingInserted} coding questions.`);
      fetchQuestions(savedPassword, 'mcq');
      fetchQuestions(savedPassword, 'coding');
    } catch {
      alert('Failed to seed default questions.');
    }
  }

  async function handleDeleteParticipant(participantId: string) {
    if (!confirm(`Are you sure you want to permanently delete participant ${participantId}? This action cannot be undone.`)) return;
    try {
      const res = await fetch('/api/admin/delete-participant', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword, participantId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Deleted successfully.');
        fetchParticipants(savedPassword);
      } else {
        alert(data.error || 'Failed to delete.');
      }
    } catch {
      alert('Error deleting participant.');
    }
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

  const totalMembers = participants.reduce((sum, p) => sum + (p.teamType === 'duo' ? 2 : 1), 0);
  const rsvpConfirmed = participants.filter((p) => p.rsvpStatus === 'CONFIRMED').length;
  const rsvpConfirmedMembers = participants.filter((p) => p.rsvpStatus === 'CONFIRMED').reduce((sum, p) => sum + (p.teamType === 'duo' ? 2 : 1), 0);

  const stats = {
    total: participants.length,
    totalMembers,
    rsvpConfirmed,
    rsvpConfirmedMembers,
    checkedIn: participants.filter((p) => p.attendance?.present).length,
    round1Done: participants.filter((p) => p.round1SubmittedAt).length,
    shortlisted: participants.filter((p) => p.isShortlisted).length,
  };

  const rsvpColor = (s: string) => s === 'CONFIRMED' ? 'text-green-500 bg-green-500/10 border-green-500/40' : s === 'PENDING' ? 'text-orange-500 bg-orange-500/10 border-orange-500/40' : 'text-error bg-error/10 border-error/40';

  const wrapperClass = "bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-hidden terminal-bg relative min-h-screen";

  // ── Password Gate ──
  if (!authed) {
    return (
      <div className={wrapperClass + " flex items-center justify-center p-6"}>
        <div className="fixed inset-0 scanline opacity-10 pointer-events-none z-0"></div>
        <div className="relative z-10 w-full max-w-sm">
          <div className="bg-surface-container-low p-8 relative border border-outline-variant/30 shadow-[0_0_30px_rgba(255,85,64,0.05)] text-center">
            <span className="material-symbols-outlined text-primary text-5xl mb-4">admin_panel_settings</span>
            <h2 className="font-headline text-xl font-black uppercase tracking-widest text-on-surface mb-2">
              ADMIN ROOT ACCESS
            </h2>
            <div className="h-px w-1/2 mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-4 mb-8"></div>

            <div className="group mb-6 text-left">
              <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Clearance Code</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                className="w-full bg-surface-container-highest border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 text-on-surface font-headline tracking-widest transition-all px-4 py-3 placeholder:text-outline-variant/40 text-center"
              />
            </div>
            {authError && <p className="text-error font-headline text-[10px] uppercase tracking-widest mb-4">{authError}</p>}

            <button
              className="w-full py-4 bg-primary text-on-primary font-headline font-black text-xs tracking-[0.2em] uppercase transition-all hover:bg-primary-container active:scale-[0.98] shadow-[0_0_20px_rgba(255,85,64,0.2)] flex justify-center items-center gap-2"
              onClick={handleAuth}
              disabled={authLoading}
            >
              <span className="material-symbols-outlined text-sm">{authLoading ? 'autorenew' : 'lock_open'}</span>
              {authLoading ? 'VERIFYING...' : 'ENTER COMMAND CENTER'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin Dashboard ──
  return (
    <div className={wrapperClass + " pt-10 pb-20 px-4 md:px-8"}>
      <div className="fixed inset-0 scanline opacity-10 pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-outline-variant/30 gap-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <img src="/logog.png" alt="dBug Labs" className="w-10 h-10 object-contain" />
              <div className="flex flex-col">
                <h1 className="font-headline text-2xl md:text-3xl font-black uppercase tracking-widest text-on-surface leading-none">
                  <span className="text-primary glow-red">ESPIONAGE</span> — ADMIN TERMINAL
                </h1>
                <div className="text-[10px] text-secondary font-headline uppercase tracking-widest leading-none mt-1">by dBug Labs</div>
              </div>
            </div>
            <p className="text-secondary font-headline text-[10px] tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live telemetry active
            </p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => fetchParticipants(savedPassword)} className="px-6 py-2 border border-outline-variant text-on-surface font-headline font-bold text-[10px] tracking-widest uppercase transition-all hover:border-primary hover:text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              REFRESH
            </button>
            <button onClick={handleExport} disabled={exporting} className="px-6 py-2 bg-primary text-on-primary font-headline font-bold text-[10px] tracking-widest uppercase transition-all hover:bg-primary-container shadow-[0_0_15px_rgba(255,85,64,0.3)] flex items-center gap-2">
              <span className={exporting ? "material-symbols-outlined text-[14px] animate-spin" : "material-symbols-outlined text-[14px]"}>
                {exporting ? 'sync' : 'download'}
              </span>
              {exporting ? 'EXPORTING...' : 'EXPORT CSV'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Teams', value: stats.total, icon: 'group', color: 'text-purple-500 glow-purple' },
            { label: 'Members', value: stats.totalMembers, icon: 'groups', color: 'text-blue-500 glow-blue' },
            { label: 'RSVP Yes', value: `${stats.rsvpConfirmed}/${50}`, icon: 'how_to_reg', color: 'text-green-500 glow-green' },
            { label: 'RSVP Members', value: `${stats.rsvpConfirmedMembers}/${100}`, icon: 'verified', color: 'text-primary glow-red' },
            { label: 'R1 Done', value: stats.round1Done, icon: 'psychology', color: 'text-cyan-500 glow-cyan' },
            { label: 'Shortlisted', value: stats.shortlisted, icon: 'military_tech', color: 'text-orange-500 glow-orange' },
          ].map((s) => (
            <div key={s.label} className="bg-surface-container-low border border-outline-variant/30 p-4 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <div className="flex items-center justify-between mb-2 opacity-70 border-b border-outline-variant/20 pb-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">{s.icon}</span>
                <span className="font-headline text-[9px] text-secondary tracking-widest uppercase">{s.label}</span>
              </div>
              <p className={`font-headline text-2xl md:text-3xl font-black mt-2 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-outline-variant/30 overflow-x-auto custom-scrollbar pb-1">
          {([
            { id: 'participants', label: 'AGENTS', icon: 'group' },
            { id: 'controls', label: 'SYSTEM CONTROLS', icon: 'settings' },
            { id: 'round1', label: 'R1 INTELLIGENCE', icon: 'analytics' },
            { id: 'announcements', label: 'BROADCASTS', icon: 'campaign' },
            { id: 'questions', label: 'MISSION DATABASE', icon: 'database' },
          ] as { id: Tab; label: string; icon: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-headline text-[10px] font-bold tracking-[0.15em] uppercase transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-primary/10 text-primary border-primary' : 'bg-transparent text-secondary border-transparent hover:text-on-surface hover:bg-surface-container-highest'}`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-surface-container-low border border-outline-variant/30 p-4 md:p-8 min-h-[500px]">

          {/* ── Tab: Participants ── */}
          {activeTab === 'participants' && (
            <>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-xl">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">search</span>
                  <input
                    placeholder="Search name, ID, email, reg no..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-surface-container-highest border border-outline-variant focus:border-primary focus:ring-0 text-on-surface font-headline tracking-widest text-sm px-12 py-3 placeholder:text-outline-variant/40 outline-none"
                  />
                </div>
                <div className="bg-surface-container-highest border border-outline-variant/30 px-6 py-3 flex items-center max-w-fit">
                  <span className="font-headline text-[10px] tracking-widest uppercase text-secondary">
                    MATCHING: <strong className="text-primary">{filtered.length}</strong> / {participants.length}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-20 text-center">
                  <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4">settings</span>
                  <p className="font-headline text-[10px] text-primary tracking-[0.2em] uppercase animate-pulse">Running query...</p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar border border-outline-variant/30">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-[#0a0a0a] border-b border-outline-variant text-[9px] font-headline tracking-widest uppercase text-primary">
                        {['ID', 'Name', 'Email', 'Reg No', 'Phone', 'Type', 'Partner', 'RSVP', 'Attendance', 'Actions'].map(h => (
                          <th key={h} className="p-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p, idx) => (
                        <tr key={p._id} className={`border-b border-outline-variant/10 text-xs ${idx % 2 === 0 ? 'bg-surface-container-highest/20' : 'bg-transparent'} hover:bg-surface-container-highest transition-colors`}>
                          <td className="p-4 font-mono font-bold text-primary">{p.participantId}</td>
                          <td className="p-4 font-bold text-on-surface">{p.name}</td>
                          <td className="p-4 text-on-surface-variant">{p.email}</td>
                          <td className="p-4 text-on-surface-variant font-mono">{p.regNo}</td>
                          <td className="p-4 text-on-surface-variant font-mono">{p.phone}</td>
                          <td className="p-4">
                            <span className={`font-headline text-[8px] tracking-widest px-2 py-1 border rounded-sm ${p.teamType === 'duo' ? 'text-blue-400 bg-blue-500/10 border-blue-500/40' : 'text-secondary bg-surface-container-highest border-outline-variant/40'}`}>
                              {p.teamType.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-on-surface-variant text-[10px]">
                            {p.partner ? p.partner.name : '—'}
                          </td>
                          <td className="p-4">
                            <span className={`font-headline text-[8px] tracking-widest px-2 py-1 border rounded-sm flex items-center justify-center max-w-fit ${rsvpColor(p.rsvpStatus)}`}>
                              {p.rsvpStatus}
                            </span>
                          </td>
                          <td className="p-4">
                            {p.attendance?.present ? <span className="text-green-500 material-symbols-outlined text-[16px]">check_circle</span> : <span className="text-outline-variant material-symbols-outlined text-[16px]">cancel</span>}
                          </td>
                          <td className="p-4">
                            <button onClick={() => handleDeleteParticipant(p.participantId)} className="text-secondary hover:text-error transition-colors" title="Delete">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length === 0 && <p className="text-center p-8 text-secondary font-headline text-xs tracking-widest uppercase">No identities found in database.</p>}
                </div>
              )}
            </>
          )}

          {/* ── Tab: Event Controls ── */}
          {activeTab === 'controls' && (
            <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#0a0a0a] border border-outline-variant/30 p-6">
                <h3 className="font-headline text-sm text-primary mb-6 tracking-[0.2em] uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">toggle_on</span>
                  System Toggles
                </h3>
                {([
                  { field: 'registrationOpen', label: 'RECRUITMENT (REG)', value: config.registrationOpen },
                  { field: 'round1Active', label: 'ROUND 1 ACCESS', value: config.round1Active },
                  { field: 'round2Active', label: 'ROUND 2 ACCESS', value: config.round2Active },
                ] as { field: string; label: string; value: boolean }[]).map((toggle) => (
                  <div key={toggle.field} className="flex items-center justify-between py-4 border-b border-outline-variant/10">
                    <span className="font-headline text-xs tracking-widest text-on-surface">{toggle.label}</span>
                    <button
                      onClick={() => toggleConfig(toggle.field, !toggle.value)}
                      disabled={configLoading}
                      className={`relative w-12 h-6 rounded-full transition-colors ${toggle.value ? 'bg-primary shadow-[0_0_10px_rgba(255,85,64,0.3)]' : 'bg-surface-container-highest border border-outline-variant/50'}`}
                    >
                      <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white transition-all ${toggle.value ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                {/* RSVP Controls */}
                <div className="bg-[#0a0a0a] border border-outline-variant/30 p-6 border-t-4 border-t-green-500">
                  <h3 className="font-headline text-sm text-green-500 mb-4 tracking-[0.2em] uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                    RSVP Controls
                  </h3>
                  <p className="text-secondary font-body text-xs leading-relaxed mb-4">
                    Send RSVP emails to all team leaders. They must confirm to secure their spot. Cap: <strong className="text-green-400">50 teams / 100 members</strong>.
                  </p>
                  <div className="bg-surface-container-highest border border-outline-variant/30 p-3 mb-4 text-center">
                    <span className="font-headline text-[10px] tracking-widest uppercase text-secondary">
                      RSVP: <strong className="text-green-500">{stats.rsvpConfirmed}</strong>/50 teams • <strong className="text-green-500">{stats.rsvpConfirmedMembers}</strong>/100 members
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleSendRSVP}
                      disabled={sendingRSVP}
                      className="w-full py-3 bg-green-600 text-white font-headline font-bold text-[10px] tracking-widest uppercase hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[14px]">{sendingRSVP ? 'sync' : 'send'}</span>
                      {sendingRSVP ? 'SENDING...' : 'SEND RSVP EMAILS'}
                    </button>
                    <button
                      onClick={handleSendAttendanceQR}
                      disabled={sendingQR}
                      className="w-full py-3 bg-primary text-on-primary font-headline font-bold text-[10px] tracking-widest uppercase hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[14px]">{sendingQR ? 'sync' : 'qr_code'}</span>
                      {sendingQR ? 'SENDING...' : 'SEND ATTENDANCE QR EMAILS'}
                    </button>
                  </div>
                </div>

                {/* Shortlist */}
                <div className="bg-[#0a0a0a] border border-outline-variant/30 p-6 border-t-4 border-t-primary">
                  <h3 className="font-headline text-sm text-primary mb-4 tracking-[0.2em] uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">gavel</span>
                    Shortlist Command
                  </h3>
                  <p className="text-secondary font-body text-xs leading-relaxed mb-6">
                    Select the top N teams by Round 1 score. All team members will be notified via email.
                  </p>
                  <div className="flex gap-4">
                    <div className="relative w-24">
                      <span className="absolute top-1/2 -translate-y-1/2 left-3 font-headline text-[10px] text-secondary">TOP</span>
                      <input
                        type="number"
                        value={shortlistCount}
                        onChange={(e) => setShortlistCount(Number(e.target.value))}
                        className="w-full bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-on-surface font-headline px-10 py-3 text-center"
                      />
                    </div>
                    <button
                      onClick={handleShortlist}
                      disabled={shortlisting}
                      className="flex-1 bg-primary text-on-primary font-headline font-bold text-[10px] tracking-widest uppercase hover:bg-primary-container transition-colors disabled:opacity-50"
                    >
                      {shortlisting ? 'PROCESSING...' : 'EXECUTE O.R.D.E.R'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Round 1 Results ── */}
          {activeTab === 'round1' && (
            <div className="overflow-x-auto custom-scrollbar border border-outline-variant/30">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-[#0a0a0a] border-b border-outline-variant text-[9px] font-headline tracking-widest uppercase text-primary">
                    {['Rank', 'ID', 'Name', 'Type', 'Score', 'Warnings', 'Submitted', 'Target'].map((h) => (
                      <th key={h} className="p-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {participants
                    .filter((p) => p.round1Score !== null)
                    .sort((a, b) => (b.round1Score ?? 0) - (a.round1Score ?? 0))
                    .map((p, idx) => (
                      <tr key={p._id} className={`border-b border-outline-variant/10 text-xs hover:bg-surface-container-highest transition-colors ${idx < 3 ? 'bg-primary/5 text-primary' : ''}`}>
                        <td className="p-4 font-headline font-bold">#{idx + 1}</td>
                        <td className="p-4 font-mono">{p.participantId}</td>
                        <td className="p-4 font-bold text-on-surface">{p.name}</td>
                        <td className="p-4">
                          <span className={`font-headline text-[8px] tracking-widest px-2 py-0.5 border rounded-sm ${p.teamType === 'duo' ? 'text-blue-400 border-blue-500/40' : 'text-secondary border-outline-variant/40'}`}>
                            {p.teamType.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 font-headline text-lg glow-red text-primary font-black">{p.round1Score}</td>
                        <td className={`p-4 ${p.round1Warnings > 0 ? 'text-error' : 'text-secondary'}`}>
                          {p.round1Warnings > 0 ? `⚠️ ${p.round1Warnings}` : 'CLEAN'}
                        </td>
                        <td className="p-4 text-secondary font-mono">{p.round1SubmittedAt ? new Date(p.round1SubmittedAt).toLocaleString('en-IN', { timeStyle: 'short' }) : '—'}</td>
                        <td className="p-4">
                          {p.isShortlisted ? <span className="text-primary font-headline text-[10px] tracking-widest border border-primary/30 px-2 py-1 bg-primary/10">SHORTLISTED</span> : <span className="text-secondary">—</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {participants.filter((p) => p.round1Score !== null).length === 0 && (
                <p className="text-center p-8 text-secondary font-headline text-xs tracking-widest uppercase">No Round 1 logs found.</p>
              )}
            </div>
          )}

          {/* ── Tab: Announcements ── */}
          {activeTab === 'announcements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
              <div className="bg-[#0a0a0a] border border-outline-variant/30 p-6 flex flex-col gap-4">
                <h3 className="font-headline text-sm text-primary tracking-[0.2em] uppercase mb-2">Issue Broadcast</h3>
                <input
                  placeholder="Subject Line"
                  value={newNotif.title}
                  onChange={(e) => setNewNotif((p) => ({ ...p, title: e.target.value }))}
                  className="bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-on-surface font-body px-4 py-3 outline-none"
                />
                <textarea
                  placeholder="Message payload..."
                  value={newNotif.message}
                  onChange={(e) => setNewNotif((p) => ({ ...p, message: e.target.value }))}
                  className="bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-on-surface font-body px-4 py-3 outline-none min-h-[120px]"
                />
                <div className="flex gap-4">
                  <select
                    value={newNotif.type}
                    onChange={(e) => setNewNotif((p) => ({ ...p, type: e.target.value }))}
                    className="flex-1 bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-secondary font-headline text-[10px] tracking-widest uppercase px-4 py-3 outline-none"
                  >
                    <option value="info">INFO</option>
                    <option value="warning">WARNING</option>
                    <option value="success">SUCCESS</option>
                    <option value="danger">CRITICAL</option>
                  </select>
                  <button onClick={handleCreateNotification} className="flex-1 bg-primary text-on-primary font-headline font-bold text-[10px] tracking-widest uppercase hover:bg-primary-container transition-colors">
                    BROADCAST
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-headline text-xs text-secondary tracking-widest uppercase mb-4 border-b border-outline-variant/20 pb-2">Transmission Log</h3>
                <div className="flex flex-col gap-4">
                  {notifications.length === 0 ? (
                    <p className="text-secondary font-headline text-[10px] tracking-widest uppercase">No active transmissions.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n._id} className="bg-surface-container-low border border-outline-variant/30 p-4 border-l-2 border-l-primary relative">
                        <button onClick={() => handleDeleteNotification(n._id)} className="absolute top-4 right-4 text-secondary hover:text-error transition-colors">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                        <span className="font-mono text-[8px] bg-primary/10 text-primary px-1 border border-primary/20 mb-2 inline-block uppercase">{n.type}</span>
                        <h4 className="font-bold text-on-surface mb-1">{n.title}</h4>
                        <p className="text-sm text-on-surface-variant mb-3">{n.message}</p>
                        <p className="text-[10px] text-secondary font-mono">{new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Questions ── */}
          {activeTab === 'questions' && (
            <div>
              <div className="flex flex-wrap gap-4 mb-8 pb-4 border-b border-outline-variant/20">
                <button onClick={() => setQTab('mcq')} className={`px-6 py-2 font-headline text-[10px] font-bold tracking-widest uppercase border ${qTab === 'mcq' ? 'bg-primary/10 text-primary border-primary' : 'border-outline-variant/50 text-secondary hover:text-on-surface'}`}>ROUND 1 (MCQ)</button>
                <button onClick={() => setQTab('coding')} className={`px-6 py-2 font-headline text-[10px] font-bold tracking-widest uppercase border ${qTab === 'coding' ? 'bg-primary/10 text-primary border-primary' : 'border-outline-variant/50 text-secondary hover:text-on-surface'}`}>ROUND 2 (CODING)</button>
                <button onClick={handleSeedDefaults} className="ml-auto px-6 py-2 border border-error/50 bg-error/10 text-error hover:bg-error hover:text-on-error font-headline text-[10px] tracking-widest uppercase transition-colors">
                  LOAD ESPIONAGE DEFAULTS
                </button>
              </div>

              {questionsLoading && (
                <div className="flex items-center justify-center p-12">
                  <span className="material-symbols-outlined text-3xl text-primary animate-spin">settings</span>
                </div>
              )}

              {qTab === 'mcq' ? (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 overflow-x-auto border border-outline-variant/30 custom-scrollbar max-h-[600px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-[#0a0a0a] border-b border-outline-variant/50 text-[9px] font-headline tracking-widest uppercase text-primary">
                        <tr>
                          {['#', 'Payload', 'Cat', 'Pts', 'Del'].map((h) => <th key={h} className="p-3">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {mcqQuestions.map((q) => (
                          <tr key={q._id} className="border-b border-outline-variant/10 hover:bg-surface-container-highest">
                            <td className="p-3 text-secondary font-mono">{q.order}</td>
                            <td className="p-3 text-on-surface max-w-xs truncate" title={q.questionText}>{q.questionText}</td>
                            <td className="p-3 text-secondary font-mono">{q.category}</td>
                            <td className="p-3 font-bold text-primary">{q.points}</td>
                            <td className="p-3">
                              <button onClick={() => handleDeleteQuestion(q._id, 'mcq')} className="text-secondary hover:text-error"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-[#0a0a0a] border border-outline-variant/30 p-6 flex flex-col gap-4 h-fit">
                    <h3 className="font-headline text-sm text-primary tracking-[0.2em] uppercase border-b border-outline-variant/20 pb-2">ADD INTEL (MCQ)</h3>
                    <textarea
                      placeholder="Question Text"
                      value={newMCQ.questionText}
                      onChange={(e) => setNewMCQ({ ...newMCQ, questionText: e.target.value })}
                      className="bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-on-surface text-sm p-3 outline-none min-h-[80px]"
                    />
                    {newMCQ.options.map((opt, i) => (
                      <div key={i} className="flex gap-3 items-center">
                        <div className="relative flex items-center justify-center">
                          <input type="radio" name="correct" checked={newMCQ.correctAnswer === i} onChange={() => setNewMCQ({ ...newMCQ, correctAnswer: i })} className="peer w-4 h-4 opacity-0 absolute cursor-pointer" />
                          <div className="w-4 h-4 border border-outline-variant/50 rounded-full peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center transition-colors"></div>
                        </div>
                        <input
                          placeholder={`Option ${i + 1}`}
                          value={opt}
                          onChange={(e) => { const opts = [...newMCQ.options]; opts[i] = e.target.value; setNewMCQ({ ...newMCQ, options: opts }); }}
                          className="flex-1 bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-on-surface text-sm p-2 outline-none"
                        />
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-4">
                      <select value={newMCQ.category} onChange={(e) => setNewMCQ({ ...newMCQ, category: e.target.value })} className="bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-secondary text-xs uppercase tracking-widest p-2 outline-none">
                        <option value="logic">LOGIC</option>
                        <option value="cyber">CYBER</option>
                        <option value="coding">CODING</option>
                      </select>
                      <input type="number" placeholder="Pts" value={newMCQ.points} onChange={(e) => setNewMCQ({ ...newMCQ, points: Number(e.target.value) })} className="bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-on-surface text-sm p-2 outline-none text-center" />
                    </div>
                    <button onClick={handleAddMCQ} className="bg-primary text-on-primary font-headline font-bold text-[10px] tracking-widest uppercase hover:bg-primary-container p-3 mt-2 transition-colors">
                      IMPORT DATA
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 overflow-x-auto border border-outline-variant/30 custom-scrollbar max-h-[800px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-[#0a0a0a] border-b border-outline-variant/50 text-[9px] font-headline tracking-widest uppercase text-primary">
                        <tr>
                          {['#', 'Title', 'Pts', 'Actions'].map((h) => <th key={h} className="p-3">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {codingQuestions.map((q) => (
                          <tr key={q._id} className="border-b border-outline-variant/10 hover:bg-surface-container-highest">
                            <td className="p-3 text-secondary font-mono">{q.order}</td>
                            <td className="p-3 font-bold text-on-surface">{q.title}</td>
                            <td className="p-3 font-bold text-primary">{q.points}</td>
                            <td className="p-3">
                              <button onClick={() => handleDeleteQuestion(q._id, 'coding')} className="text-secondary hover:text-error"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-[#0a0a0a] border border-outline-variant/30 p-6 flex flex-col gap-4 h-fit">
                    <h3 className="font-headline text-sm text-primary tracking-[0.2em] uppercase border-b border-outline-variant/20 pb-2">ADD EXPLOIT (CODING)</h3>
                    <input placeholder="Codename (Title)" value={newCoding.title} onChange={(e) => setNewCoding({ ...newCoding, title: e.target.value })} className="bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-on-surface p-3 text-sm outline-none" />
                    <textarea placeholder="Mission Brief (Markdown)" value={newCoding.description} onChange={(e) => setNewCoding({ ...newCoding, description: e.target.value })} className="bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-on-surface p-3 text-sm outline-none min-h-[100px] font-mono text-xs" />
                    <div className="grid grid-cols-2 gap-4">
                      <textarea placeholder="Input Format" value={newCoding.inputFormat} onChange={(e) => setNewCoding({ ...newCoding, inputFormat: e.target.value })} className="bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-on-surface p-2 text-xs outline-none min-h-[60px]" />
                      <textarea placeholder="Output Format" value={newCoding.outputFormat} onChange={(e) => setNewCoding({ ...newCoding, outputFormat: e.target.value })} className="bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-on-surface p-2 text-xs outline-none min-h-[60px]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <textarea placeholder="Sample Input" value={newCoding.sampleInput} onChange={(e) => setNewCoding({ ...newCoding, sampleInput: e.target.value })} className="bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-on-surface p-2 text-xs outline-none min-h-[60px] font-mono" />
                      <textarea placeholder="Sample Output" value={newCoding.sampleOutput} onChange={(e) => setNewCoding({ ...newCoding, sampleOutput: e.target.value })} className="bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-on-surface p-2 text-xs outline-none min-h-[60px] font-mono" />
                    </div>
                    <input type="number" placeholder="Points" value={newCoding.points} onChange={(e) => setNewCoding({ ...newCoding, points: Number(e.target.value) })} className="bg-surface-container-highest border border-outline-variant/50 focus:border-primary text-on-surface p-3 text-sm outline-none" />
                    <button onClick={handleAddCoding} className="bg-primary text-on-primary font-headline font-bold text-[10px] tracking-widest uppercase hover:bg-primary-container p-3 mt-2 transition-colors">
                      IMPORT EXPLOIT
                    </button>
                    <p className="text-center font-headline tracking-widest text-[8px] uppercase text-secondary mt-2">Use direct db/api config for hidden test cases.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
