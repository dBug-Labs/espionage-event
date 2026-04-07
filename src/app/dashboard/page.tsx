'use client';

import { useEffect, useState } from 'react';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  createdAt: string;
}

interface EventConfig {
  round1Active: boolean;
  round2Active: boolean;
}

interface ParticipantData {
  participantId: string;
  name: string;
  round1Score: number | null;
  round1SubmittedAt: string | null;
  isShortlisted: boolean;
  round2Score: number | null;
  attendanceRound1?: { present: boolean; checkedAt: string | null };
  attendanceRound2?: { present: boolean; checkedAt: string | null };
}

export default function DashboardPage() {
  const session = getSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [config, setConfig] = useState<EventConfig>({ round1Active: false, round2Active: false });
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [notifRes, configRes, partRes] = await Promise.all([
          fetch('/api/dashboard/notifications'),
          fetch('/api/dashboard/config'),
          fetch(`/api/dashboard/me?email=${encodeURIComponent(session?.email || '')}`),
        ]);
        if (notifRes.ok) {
          const d = await notifRes.json();
          setNotifications(d.notifications || []);
        }
        if (configRes.ok) {
          const d = await configRes.json();
          setConfig(d.config || { round1Active: false, round2Active: false });
        }
        if (partRes.ok) {
          const d = await partRes.json();
          setParticipant(d.participant || null);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [session?.email]);

  const handleLogout = () => {
    localStorage.removeItem('espionage_session');
    router.push('/login');
  };

  const round1Status = participant?.round1SubmittedAt
    ? 'COMPLETED'
    : config.round1Active
      ? 'ACTIVE'
      : 'LOCKED';

  const round2Status = !participant?.isShortlisted
    ? 'CLASSIFIED'
    : config.round2Active
      ? 'ACTIVE'
      : 'LOCKED';

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-surface font-body flex items-center justify-center terminal-bg">
        <div className="fixed inset-0 scanlines z-[60] opacity-20"></div>
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-headline text-sm tracking-[0.2em] text-primary uppercase">Decrypting Intel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface font-body selection:bg-primary selection:text-on-primary min-h-screen relative terminal-bg">
      <div className="fixed inset-0 scanlines z-[60] opacity-20"></div>

      <header className="flex justify-between items-center w-full px-6 py-4 fixed top-0 z-50 bg-[#131313] border-b border-white/10 shadow-[0_0_15px_rgba(255,0,0,0.1)]">
        <div className="flex flex-col gap-1">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logog.png" alt="dBug Labs" className="w-8 h-8 object-contain" />
            <div className="flex flex-col">
              <div className="text-xl font-black text-red-600 dark:text-red-500 tracking-tighter font-headline leading-none">ESPIONAGE</div>
              <div className="text-[9px] text-gray-400 font-headline uppercase tracking-widest leading-none mt-1">by dBug Labs</div>
            </div>
          </Link>
          <div className="text-[10px] tracking-widest text-primary font-bold">INTEL_TERMINAL_V1.0</div>
        </div>
        <nav className="hidden md:flex gap-8 items-center">
          <a className="font-headline uppercase tracking-widest text-sm text-red-500 font-bold border-b-2 border-red-500 pb-1" href="/dashboard">MISSIONS</a>
          <a className="font-headline uppercase tracking-widest text-sm text-zinc-500 hover:text-red-400 transition-colors" href="#">STATUS</a>
          <a className="font-headline uppercase tracking-widest text-sm text-zinc-500 hover:text-red-400 transition-colors" href="#">ENCRYPTION</a>
        </nav>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-red-500 cursor-pointer hover:bg-red-500/10 p-2 transition-all">terminal</span>
          <span className="material-symbols-outlined text-red-500 cursor-pointer hover:bg-red-500/10 p-2 transition-all">security</span>
          <button
            onClick={handleLogout}
            className="bg-primary-container text-on-primary-container px-4 py-1.5 font-headline text-xs font-bold tracking-widest uppercase active:scale-95 duration-75 brightness-125 hover:bg-red-600/20 hover:text-red-500 transition-all border border-transparent hover:border-red-500/50"
          >
            DISCONNECT
          </button>
        </div>
      </header>

      <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto grid grid-cols-12 gap-6 relative z-10">
        <section className="col-span-12 lg:col-span-8 space-y-6">
          <div className="relative bg-surface-container-low p-8 border border-outline-variant/15 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 font-headline text-[10px] tracking-widest text-secondary opacity-50">
              ID: {session?.participantId || 'UNKNOWN'}
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-headline text-primary text-xs tracking-[0.3em] font-bold uppercase">WELCOME BACK, {session?.name || 'AGENT'}</span>
              <h1 className="font-headline text-4xl md:text-6xl font-black text-on-surface tracking-tighter mb-4 uppercase">
                {config.round2Active && participant?.isShortlisted ? 'ROUND 2: BLACKOUT' : 'ROUND 1: BUG BREACH'}
              </h1>
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="bg-error-container/20 border border-error/30 px-3 py-1 flex items-center gap-2">
                  <span className="w-2 h-2 bg-error animate-pulse"></span>
                  <span className="font-headline text-[10px] text-error font-bold tracking-widest uppercase">ENCRYPTION_ACTIVE</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              {/* Progress Card 1 */}
              <div className="bg-surface-container-high p-4 relative tactical-bracket">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-headline text-[10px] text-on-surface-variant tracking-widest uppercase">ROUND_01</span>
                  <span className="font-headline text-xl font-bold text-primary">{round1Status}</span>
                </div>
                <div className={`h-1 w-full overflow-hidden ${round1Status === 'COMPLETED' ? 'bg-primary/20' : 'bg-surface-variant'}`}>
                  <div className="h-full bg-primary" style={{ width: round1Status === 'COMPLETED' ? '100%' : '0%' }}></div>
                </div>
                <p className="mt-3 font-headline text-[10px] text-secondary tracking-widest uppercase">
                  SCORE: {participant?.round1Score ?? '--'}
                </p>
              </div>

              {/* Progress Card 2 */}
              <div className="bg-surface-container-high p-4 relative tactical-bracket">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-headline text-[10px] text-on-surface-variant tracking-widest uppercase">ROUND_02</span>
                  <span className="font-headline text-xl font-bold text-zinc-600">{round2Status}</span>
                </div>
                <div className="h-1 bg-surface-variant w-full overflow-hidden">
                  <div className="h-full bg-zinc-600" style={{ width: '0%' }}></div>
                </div>
                <p className="mt-3 font-headline text-[10px] text-zinc-500 tracking-widest uppercase">CODING_PROBLEMS</p>
              </div>

              {/* Progress Card 3 */}
              <div className="bg-surface-container-high p-4 relative tactical-bracket">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-headline text-[10px] text-on-surface-variant tracking-widest uppercase">STATUS</span>
                  <span className="font-headline text-xl font-bold text-secondary">
                    {participant?.isShortlisted ? 'CLEARED' : 'PENDING'}
                  </span>
                </div>
                <div className="h-1 bg-surface-variant w-full overflow-hidden">
                  <div className={`h-full ${participant?.isShortlisted ? 'bg-secondary shadow-[0_0_10px_rgba(254,179,0,0.5)]' : 'bg-surface-variant'}`} style={{ width: participant?.isShortlisted ? '100%' : '0%' }}></div>
                </div>
                <p className="mt-3 font-headline text-[10px] text-secondary tracking-widest uppercase">CLEARANCE</p>
              </div>
            </div>

            <div className="mt-10 flex gap-4 flex-wrap">
              {round1Status === 'ACTIVE' && (
                participant?.attendanceRound1?.present ? (
                  <Link href="/dashboard/round1">
                    <button className="bg-primary text-on-primary px-8 py-3 font-headline font-black tracking-widest uppercase text-sm hover:shadow-[0_0_20px_rgba(255,180,168,0.4)] transition-all flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">terminal</span>
                      LAUNCH_R1_TERMINAL
                    </button>
                  </Link>
                ) : (
                  <button disabled className="bg-surface-variant text-on-surface-variant px-8 py-3 font-headline font-black tracking-widest uppercase text-sm opacity-70 cursor-not-allowed border border-orange-500/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-orange-500">badge</span>
                    <span className="text-orange-500">ATTENDANCE REQUIRED</span>
                  </button>
                )
              )}
              {round2Status === 'ACTIVE' && (
                participant?.attendanceRound2?.present ? (
                  <Link href="/dashboard/round2">
                    <button className="bg-primary text-on-primary px-8 py-3 font-headline font-black tracking-widest uppercase text-sm hover:shadow-[0_0_20px_rgba(255,180,168,0.4)] transition-all flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">code</span>
                      LAUNCH_R2_TERMINAL
                    </button>
                  </Link>
                ) : (
                  <button disabled className="bg-surface-variant text-on-surface-variant px-8 py-3 font-headline font-black tracking-widest uppercase text-sm opacity-70 cursor-not-allowed border border-orange-500/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-orange-500">badge</span>
                    <span className="text-orange-500">ATTENDANCE REQUIRED</span>
                  </button>
                )
              )}
              {round1Status !== 'ACTIVE' && round2Status !== 'ACTIVE' && (
                <button disabled className="bg-surface-variant text-on-surface-variant px-8 py-3 font-headline font-black tracking-widest uppercase text-sm opacity-50 cursor-not-allowed border border-outline-variant/30 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  STAND_BY
                </button>
              )}
              <Link href="/">
                <button className="border border-outline-variant/30 text-primary px-8 py-3 font-headline font-bold tracking-widest uppercase text-sm hover:bg-primary/5 transition-all">
                  VIEW_BRIEFING
                </button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-container-low border border-outline-variant/15 p-6">
              <h3 className="font-headline text-xs font-bold tracking-[0.2em] text-secondary mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">target</span> MISSION_OBJECTIVES
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 group">
                  <div className="mt-1 w-4 h-4 border border-primary flex items-center justify-center">
                    {round1Status === 'COMPLETED' && <span className="material-symbols-outlined text-[10px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                  </div>
                  <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">Infiltrate the Bug Breach mainframe and isolate malicious nodes.</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <div className="mt-1 w-4 h-4 border border-primary flex items-center justify-center">
                    {round1Status === 'COMPLETED' && <span className="material-symbols-outlined text-[10px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                  </div>
                  <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">Resolve 25 advanced breach-analysis MCQs under secure test conditions.</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <div className="mt-1 w-4 h-4 border border-outline-variant flex items-center justify-center">
                    {participant?.round2Score && <span className="material-symbols-outlined text-[10px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                  </div>
                  <span className={`text-xs ${participant?.isShortlisted ? 'text-on-surface-variant' : 'text-zinc-600'}`}>Execute 5 surgical code injections to bypass firewalls. {participant?.isShortlisted ? '' : '(LOCKED)'}</span>
                </li>
              </ul>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/15 p-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <h3 className="font-headline text-xs font-bold tracking-[0.2em] text-on-surface mb-6 uppercase">INTEL_FEED</h3>
              <div className="space-y-4 relative z-10 max-h-48 overflow-y-auto pr-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-zinc-500 font-mono">No new intel received. Scanning channels...</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n._id} className="flex gap-4 text-[10px]">
                      <span className={`font-mono font-bold ${n.type === 'danger' ? 'text-error' : n.type === 'success' ? 'text-primary' : n.type === 'warning' ? 'text-secondary' : 'text-primary'}`}>
                        {new Date(n.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className="text-zinc-400 uppercase tracking-wide">{n.title}: {n.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest p-6 border border-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 to-transparent"></div>
            <h3 className="font-headline text-xs font-bold tracking-[0.2em] text-on-surface mb-6 uppercase">Active Session</h3>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-secondary">
                <span>Connection Stability</span>
                <span>99.8%</span>
              </div>
              <div className="h-0.5 bg-surface-variant w-full">
                <div className="h-full bg-secondary w-[99.8%] shadow-[0_0_5px_#feb300]"></div>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-500">
                <span>Packet Latency</span>
                <span>12ms</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
                <div className="flex justify-between text-[8px] tracking-[0.2em] uppercase text-on-surface-variant">
                  <span>OPERATOR_LOC</span>
                  <span>NODE_4.2.1-Z</span>
                </div>
                <div className="flex justify-between text-[8px] tracking-[0.2em] uppercase text-on-surface-variant">
                  <span>AUTH_KEY</span>
                  <span className="text-primary truncate ml-2 max-w-[150px]">{session?.email || 'OFFLINE'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container p-6 border border-outline-variant/15">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xs font-bold tracking-[0.2em] text-on-surface">LEADERBOARD_STUB</h3>
              <span className="material-symbols-outlined text-primary text-sm">leaderboard</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-container-low border-l-2 border-transparent opacity-50">
                <p className="text-xs text-on-surface-variant text-center w-full uppercase tracking-widest font-headline">Leaderboard is offline during live operations.</p>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <footer className="fixed bottom-0 w-full flex justify-between items-center px-8 py-2 z-50 bg-[#0e0e0e] border-t border-orange-500/20">
        <div className="font-headline text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          © 2026 CLASSIFIED DIRECTIVE // EYES ONLY
        </div>
        <div className="flex gap-6">
          <button onClick={handleLogout} className="font-headline text-[10px] uppercase tracking-[0.2em] text-zinc-600 hover:text-orange-400 transition-colors">TERMINATE_SESSION</button>
        </div>
      </footer>
    </div>
  );
}
