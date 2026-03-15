'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function AttendancePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error' | 'warning', message: string, teamInfo?: any } | null>(null);
  const [manualTeamId, setManualTeamId] = useState('');
  const [stats, setStats] = useState({ checkedIn: 0, totalPaid: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  
  // To prevent double scans in quick succession
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
      const interval = setInterval(fetchStats, 10000); // refresh every 10s
      
      // Initialize Scanner
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
      alert('Incorrect password');
    }
  }

  const markAttendance = async (teamId: string) => {
    if (isProcessing) return;
    if (lastScannedRef.current === teamId) return; // Prevent double trigger
    
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
          message: `Check-in Successful!`,
          teamInfo: data
        });
        fetchStats(); // Update counters immediately
        
        // Play success beep
        const audio = new Audio('/success-beep.mp3'); // Optional placeholder
        audio.play().catch(()=>{}).then(() => {});

      } else if (data.alreadyCheckedIn) {
        setScanResult({
          type: 'warning',
          message: data.error
        });
      } else {
        setScanResult({
          type: 'error',
          message: data.error || 'Failed to mark present'
        });
      }
    } catch (err) {
      setScanResult({ type: 'error', message: 'Network error occurred' });
    } finally {
      setIsProcessing(false);
      // Reset scan memory after 3 seconds so we can scan again if needed
      setTimeout(() => { lastScannedRef.current = ''; }, 3000);
    }
  };

  function onScanSuccess(decodedText: string) {
    // Expected format: HOU-XXX
    if (decodedText.startsWith('HOU-')) {
      markAttendance(decodedText);
    }
  }

  function onScanFailure(error: any) {
    // handle scan failure, usually better to ignore and keep scanning
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={login} className="glass-card" style={{ padding: 40, width: 320, textAlign: 'center' }}>
          <h2 style={{ color: 'var(--gold)', marginBottom: 20 }}>Organizer Access</h2>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Attendance Password"
            style={{ width: '100%', padding: 12, borderRadius: 8, background: '#111', border: '1px solid #333', color: '#fff', marginBottom: 20 }}
          />
          <button className="btn-red" style={{ width: '100%', padding: 12 }}>Unlock System</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', padding: 20, color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        
        {/* Header & Stats */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ color: 'var(--gold)', fontSize: 24, marginBottom: 8 }}>Entry Verification</h1>
          <div style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '12px 20px', display: 'inline-block' }}>
            <span style={{ fontSize: 13, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 1 }}>Live Check-ins</span>
            <div style={{ fontSize: 28, fontWeight: 'bold' }}>{stats.checkedIn} <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>/ {stats.totalPaid}</span></div>
          </div>
        </div>

        {/* QR Scanner */}
        <div style={{ background: '#111', borderRadius: 16, overflow: 'hidden', border: '1px solid #333', marginBottom: 24, padding: 16 }}>
          <style>{`
            #reader { border: none !important; }
            #reader button {
              background: #8B0000 !important;
              color: white !important;
              border: none !important;
              padding: 12px 24px !important;
              font-size: 16px !important;
              font-weight: bold !important;
              border-radius: 8px !important;
              margin: 10px !important;
              cursor: pointer !important;
              transition: all 0.2s;
            }
            #reader button:hover {
              background: #a30000 !important;
              transform: translateY(-2px);
            }
            #reader select {
              padding: 10px 14px !important;
              border-radius: 8px !important;
              background: #222 !important;
              color: white !important;
              border: 1px solid #444 !important;
              font-size: 14px !important;
              margin-bottom: 12px !important;
              width: 100% !important;
              max-width: 300px !important;
              outline: none !important;
            }
            #reader__dashboard_section_csr span { color: var(--gold) !important; font-size: 14px !important; }
            #reader a { color: var(--gold) !important; text-decoration: none !important; }
            #reader__scan_region { background: #000 !important; margin-top: 10px !important; border-radius: 8px !important; overflow: hidden !important; }
          `}</style>
          <div id="reader"></div>
        </div>

        {/* Manual Entry Fallback */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <input 
            type="text" 
            placeholder="Manual Team ID (HOU-001)" 
            value={manualTeamId}
            onChange={(e) => setManualTeamId(e.target.value.toUpperCase())}
            style={{ flex: 1, padding: '12px 16px', borderRadius: 8, background: '#111', border: '1px solid #333', color: '#fff', outline: 'none' }}
          />
          <button 
            onClick={() => manualTeamId && markAttendance(manualTeamId)}
            className="btn-red" 
            style={{ padding: '0 20px', borderRadius: 8 }}
            disabled={isProcessing}
          >
            {isProcessing ? '...' : 'Verify'}
          </button>
        </div>

        {/* Scan Result Notification */}
        {scanResult && (
          <div style={{ 
            padding: 20, 
            borderRadius: 12, 
            background: scanResult.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : scanResult.type === 'warning' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${scanResult.type === 'success' ? '#22c55e' : scanResult.type === 'warning' ? '#eab308' : '#ef4444'}`,
            animation: 'fadeInUp 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: scanResult.teamInfo ? 12 : 0 }}>
              <span style={{ fontSize: 24 }}>
                {scanResult.type === 'success' ? '✅' : scanResult.type === 'warning' ? '⚠️' : '❌'}
              </span>
              <h3 style={{ fontSize: 18, color: scanResult.type === 'success' ? '#22c55e' : scanResult.type === 'warning' ? '#eab308' : '#ef4444', margin: 0 }}>
                {scanResult.message}
              </h3>
            </div>
            
            {scanResult.teamInfo && (
              <div style={{ padding: '12px 0 0 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--gold)' }}>Team ID: {scanResult.teamInfo.teamId}</p>
                <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 'bold' }}>{scanResult.teamInfo.teamName}</p>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>Leader: {scanResult.teamInfo.leaderName} • Members: {scanResult.teamInfo.membersCount}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
