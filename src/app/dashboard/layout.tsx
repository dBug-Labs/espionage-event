'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, isLoggedIn } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid rgba(0,255,65,0.15)', borderTop: '3px solid var(--spy-green)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p className="font-display" style={{ color: 'var(--spy-green)', fontSize: 14, letterSpacing: 2 }}>AUTHENTICATING…</p>
        </div>
      </div>
    );
  }

  const session = getSession();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Top bar */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(13,17,23,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🕵️</span>
          <span className="font-display" style={{ fontSize: 16, color: 'var(--spy-green)', letterSpacing: 3, fontWeight: 700 }}>ESPIONAGE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--spy-green)', background: 'rgba(0,255,65,0.08)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
            {session?.participantId}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{session?.name}</span>
          <button
            onClick={() => {
              localStorage.removeItem('espionage_session');
              router.replace('/login');
            }}
            style={{
              background: 'rgba(255,0,60,0.1)',
              border: '1px solid rgba(255,0,60,0.3)',
              color: 'var(--spy-red)',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      {children}
    </div>
  );
}
