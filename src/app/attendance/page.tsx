'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Link from 'next/link';

export default function AttendancePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error' | 'warning', message: string, teamInfo?: any } | null>(null);
  const [manualTeamId, setManualTeamId] = useState('');
  const [stats, setStats] = useState({ checkedIn: 0, totalPaid: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const lastScannedRef = useRef<string>('');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/attendance/stats', {
        headers: { Authorization: `Bearer ${password}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) { }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      const interval = setInterval(fetchStats, 10000);

      const scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      }, false);

      scanner.render(onScanSuccess, onScanFailure);

      return () => {
        scanner.clear();
        clearInterval(interval);
      };
    }
  }, [isAuthenticated]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect access code');
    }
  }

  const markAttendance = async (teamId: string) => {
    if (isProcessing) return;
    if (lastScannedRef.current === teamId) return;

    setIsProcessing(true);
    lastScannedRef.current = teamId;
    setScanResult(null);

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: teamId.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        setScanResult({
          type: 'success',
          message: `CHECK-IN SUCCESSFUL`,
          teamInfo: data
        });
        fetchStats();

        const audio = new Audio('/success-beep.mp3');
        audio.play().catch(() => { }).then(() => { });

      } else if (data.alreadyCheckedIn) {
        setScanResult({
          type: 'warning',
          message: data.error
        });
      } else {
        setScanResult({
          type: 'error',
          message: data.error || 'VERIFICATION FAILED'
        });
      }
    } catch (err) {
      setScanResult({ type: 'error', message: 'NETWORK ERROR' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => { lastScannedRef.current = ''; }, 3000);
    }
  };

  function onScanSuccess(decodedText: string) {
    if (decodedText.startsWith('HOU-')) {
      markAttendance(decodedText);
    }
  }

  function onScanFailure(error: any) { }

  const wrapperClass = "bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-hidden terminal-bg relative min-h-screen flex items-center justify-center p-6";

  if (!isAuthenticated) {
    return (
      <div className={wrapperClass}>
        <div className="fixed inset-0 scanline opacity-10 pointer-events-none z-0"></div>
        <div className="relative z-10 w-full max-w-sm">
          <form onSubmit={login} className="bg-surface-container-low p-8 relative border border-outline-variant/30 shadow-[0_0_30px_rgba(255,85,64,0.05)] text-center">
            <div className="absolute top-0 right-0 p-3 font-headline text-[8px] text-outline-variant uppercase tracking-widest">
              Ref: ORG-AUTH
            </div>

            <span className="material-symbols-outlined text-primary text-5xl mb-4">admin_panel_settings</span>
            <h2 className="font-headline text-xl font-black uppercase tracking-widest text-on-surface mb-2">
              ORGANIZER ACCESS
            </h2>
            <div className="h-px w-1/2 mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-4 mb-8"></div>

            <div className="group mb-6 text-left">
              <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Clearance Code</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-container-highest border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 text-on-surface font-headline tracking-widest transition-all px-4 py-3 placeholder:text-outline-variant/40"
              />
            </div>

            <button className="w-full py-4 bg-primary text-on-primary font-headline font-black text-xs tracking-[0.2em] uppercase transition-all hover:bg-primary-container active:scale-[0.98] shadow-[0_0_20px_rgba(255,85,64,0.2)] flex justify-center items-center gap-2">
              <span className="material-symbols-outlined text-sm">lock_open</span>
              UNLOCK SYSTEM
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-hidden terminal-bg relative min-h-screen pt-12 pb-24 px-4">
      <div className="fixed inset-0 scanline opacity-10 pointer-events-none z-0"></div>

      <nav className="flex justify-between items-center w-full px-6 py-4 fixed top-0 z-50 bg-[#0e0e0e] border-b border-outline-variant/30 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-1">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logog.png" alt="dBug Labs" className="w-8 h-8 object-contain" />
            <div className="flex flex-col">
              <div className="text-xl font-black text-primary tracking-tighter font-headline leading-none">ESPIONAGE</div>
              <div className="text-[9px] text-gray-400 font-headline uppercase tracking-widest leading-none mt-1">by dBug Labs</div>
            </div>
          </Link>
          <div className="text-[10px] tracking-widest text-primary font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px]">qr_code_scanner</span>
            ORG_SCANNER
          </div>
        </div>
        <div className="hidden md:flex gap-6 items-center">
          <div className="font-headline text-[10px] uppercase tracking-widest text-secondary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            SYSTEM ONLINE
          </div>
        </div>
      </nav>

      <div className="relative z-10 w-full max-w-xl mx-auto mt-12">

        {/* Header & Stats */}
        <div className="text-center mb-8">
          <h1 className="font-headline text-3xl font-black uppercase text-on-surface tracking-widest mb-4">
            ENTRY <span className="text-primary glow-red">VERIFICATION</span>
          </h1>
          <div className="bg-primary/5 border border-primary/20 p-4 inline-block shadow-[0_0_15px_rgba(255,85,64,0.1)]">
            <span className="block font-headline text-[10px] text-primary uppercase tracking-[0.2em] mb-1">Live Check-ins</span>
            <div className="font-headline text-3xl font-black text-on-surface tracking-widest">
              {stats.checkedIn} <span className="text-on-surface-variant text-xl">/ {stats.totalPaid}</span>
            </div>
          </div>
        </div>

        {/* QR Scanner */}
        <div className="bg-surface-container-low border border-outline-variant/30 p-2 mb-8 shadow-2xl relative">
          <div className="absolute top-0 right-0 p-2 font-headline text-[8px] text-outline-variant uppercase tracking-widest z-20 bg-surface-container-low">
            OPTICAL-SENSOR_01
          </div>
          <style>{`
            #reader { border: none !important; width: 100% !important; background: transparent !important; }
            #reader button {
              background: var(--color-primary-container) !important;
              color: var(--color-on-primary-container) !important;
              border: 1px solid var(--color-outline) !important;
              padding: 10px 20px !important;
              font-family: 'Space Grotesk', sans-serif !important;
              font-size: 12px !important;
              letter-spacing: 0.1em !important;
              text-transform: uppercase !important;
              font-weight: 700 !important;
              border-radius: 0 !important;
              margin: 10px !important;
              cursor: pointer !important;
              transition: all 0.2s !important;
            }
            #reader button:hover {
              background: var(--color-primary) !important;
              color: var(--color-on-primary) !important;
            }
            #reader select {
              padding: 8px 12px !important;
              border-radius: 0 !important;
              background: var(--color-surface-container-highest) !important;
              color: var(--color-on-surface) !important;
              border: 1px solid var(--color-outline-variant) !important;
              font-family: 'Space Grotesk', sans-serif !important;
              font-size: 12px !important;
              letter-spacing: 0.05em !important;
              margin-bottom: 12px !important;
              outline: none !important;
            }
            #reader__dashboard_section_csr span { color: var(--color-secondary) !important; font-family: 'Space Grotesk', sans-serif !important; font-size: 12px !important; letter-spacing: 0.1em !important; }
            #reader a { color: var(--color-primary) !important; text-decoration: none !important; }
            #reader__scan_region { background: #050505 !important; margin-top: 10px !important; border-radius: 0 !important; overflow: hidden !important; border: 1px solid var(--color-outline-variant) !important; }
            #reader__dashboard_section_swaplink { text-decoration: none !important; font-family: 'Space Grotesk', sans-serif !important; font-size: 10px !important; letter-spacing: 0.1em !important; opacity: 0.7 !important; margin-top: 10px !important; display: inline-block !important; }
          `}</style>
          <div id="reader" className="w-full"></div>
        </div>

        {/* Manual Entry Fallback */}
        <div className="flex gap-4 mb-8">
          <input
            type="text"
            placeholder="MANUAL ID (HOU-001)"
            value={manualTeamId}
            onChange={(e) => setManualTeamId(e.target.value.toUpperCase())}
            className="flex-1 bg-surface-container-highest border border-outline-variant/50 focus:border-primary focus:ring-0 text-on-surface font-headline tracking-widest text-sm px-4 py-3 placeholder:text-outline-variant/40 outline-none uppercase"
          />
          <button
            onClick={() => manualTeamId && markAttendance(manualTeamId)}
            className="px-8 bg-primary text-on-primary font-headline font-bold text-xs tracking-widest uppercase hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-50 border border-primary/50"
            disabled={isProcessing}
          >
            {isProcessing ? 'SCANNING...' : 'VERIFY'}
          </button>
        </div>

        {/* Scan Result Notification */}
        {scanResult && (
          <div className={`p-6 border relative overflow-hidden animate-[fadeInUp_0.3s_ease] ${scanResult.type === 'success' ? 'bg-green-500/10 border-green-500/30' : scanResult.type === 'warning' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-error/10 border-error/30'}`}>
            {/* Background absolute tint */}
            <div className={`absolute inset-0 opacity-10 ${scanResult.type === 'success' ? 'bg-green-500' : scanResult.type === 'warning' ? 'bg-orange-500' : 'bg-error'}`}></div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <span className={`material-symbols-outlined text-4xl ${scanResult.type === 'success' ? 'text-green-500' : scanResult.type === 'warning' ? 'text-orange-500' : 'text-error glow-red'}`}>
                  {scanResult.type === 'success' ? 'check_circle' : scanResult.type === 'warning' ? 'warning' : 'cancel'}
                </span>
                <h3 className={`font-headline text-xl font-black tracking-widest uppercase m-0 ${scanResult.type === 'success' ? 'text-green-500' : scanResult.type === 'warning' ? 'text-orange-500' : 'text-error'}`}>
                  {scanResult.message}
                </h3>
              </div>

              {scanResult.teamInfo && (
                <div className="pt-4 border-t border-white/10 mt-2">
                  <p className="font-headline text-[10px] tracking-widest uppercase text-secondary mb-1">TEAM ID</p>
                  <p className="font-headline text-2xl font-black text-on-surface tracking-widest mb-4">{scanResult.teamInfo.teamId}</p>

                  <div className="bg-surface-container-highest border border-outline-variant/20 p-4">
                    <p className="font-body text-on-surface font-bold text-lg mb-1">{scanResult.teamInfo.teamName}</p>
                    <p className="font-mono text-xs text-secondary mt-2 border-t border-outline-variant/10 pt-2"><span className="text-on-surface-variant">COMMANDER:</span> {scanResult.teamInfo.leaderName} <span className="mx-2 text-outline-variant">|</span> <span className="text-on-surface-variant">SQUAD SIZE:</span> {scanResult.teamInfo.membersCount}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
