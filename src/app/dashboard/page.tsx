'use client';

import { useEffect, useState } from 'react';
import { getSession } from '@/lib/auth';
import Link from 'next/link';

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
}

export default function DashboardPage() {
  const session = getSession();
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

  const notifColor: Record<string, string> = {
    info: 'var(--spy-cyan)',
    warning: 'var(--spy-amber)',
    success: 'var(--spy-green)',
    danger: 'var(--spy-red)',
  };

  const notifIcon: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    success: '✅',
    danger: '🚨',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid rgba(0,255,65,0.15)', borderTop: '3px solid var(--spy-green)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading mission data…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
      {/* Agent Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(0,51,17,0.2), rgba(13,17,23,0.95))',
          border: '1px solid rgba(0,255,65,0.2)',
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <p style={{ color: 'var(--text-dim)', fontSize: 12, letterSpacing: 2, marginBottom: 4 }}>WELCOME BACK, AGENT</p>
          <h1 className="font-display" style={{ fontSize: 28, color: 'var(--text-primary)', fontWeight: 700, letterSpacing: 1 }}>
            {session?.name}
          </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="font-mono" style={{ fontSize: 24, color: 'var(--spy-green)', fontWeight: 700, letterSpacing: 4 }}>
            {session?.participantId}
          </p>
          {participant?.round1Score !== null && participant?.round1Score !== undefined && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              Round 1 Score: <strong style={{ color: 'var(--spy-green)' }}>{participant.round1Score}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Mission Control */}
      <h2 className="font-display" style={{ fontSize: 18, color: 'var(--spy-green)', letterSpacing: 3, marginBottom: 16 }}>
        MISSION CONTROL
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 36 }}>
        {/* Round 1 */}
        <div
          className="spy-card"
          style={{
            padding: 28,
            opacity: round1Status === 'LOCKED' ? 0.5 : 1,
            cursor: round1Status === 'ACTIVE' ? 'pointer' : 'default',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 32 }}>🧠</span>
            <span
              className="font-mono"
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 999,
                letterSpacing: 1,
                color: round1Status === 'ACTIVE' ? 'var(--spy-green)' : round1Status === 'COMPLETED' ? 'var(--spy-cyan)' : 'var(--text-dim)',
                background: round1Status === 'ACTIVE' ? 'rgba(0,255,65,0.1)' : round1Status === 'COMPLETED' ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${round1Status === 'ACTIVE' ? 'rgba(0,255,65,0.3)' : round1Status === 'COMPLETED' ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {round1Status}
            </span>
          </div>
          <h3 className="font-display" style={{ fontSize: 20, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
            ROUND 1: INTEL TEST
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Cybersecurity-themed MCQ challenge. Logical thinking, coding basics, and security concepts.
          </p>
          {round1Status === 'ACTIVE' && (
            <Link href="/dashboard/round1">
              <button className="btn-spy" style={{ width: '100%', padding: 12, fontSize: 14 }}>
                <span>🎯 Start Intel Test</span>
              </button>
            </Link>
          )}
          {round1Status === 'COMPLETED' && (
            <p className="font-mono" style={{ color: 'var(--spy-cyan)', fontSize: 14 }}>
              ✅ Score: {participant?.round1Score ?? 0} points
            </p>
          )}
          {round1Status === 'LOCKED' && (
            <p className="font-mono" style={{ color: 'var(--text-dim)', fontSize: 12 }}>🔒 Locked — awaiting activation</p>
          )}
        </div>

        {/* Round 2 */}
        <div
          className="spy-card"
          style={{
            padding: 28,
            opacity: round2Status === 'CLASSIFIED' || round2Status === 'LOCKED' ? 0.4 : 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 32 }}>💻</span>
            <span
              className="font-mono"
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 999,
                letterSpacing: 1,
                color: round2Status === 'ACTIVE' ? 'var(--spy-green)' : round2Status === 'CLASSIFIED' ? 'var(--spy-red)' : 'var(--text-dim)',
                background: round2Status === 'ACTIVE' ? 'rgba(0,255,65,0.1)' : round2Status === 'CLASSIFIED' ? 'rgba(255,0,60,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${round2Status === 'ACTIVE' ? 'rgba(0,255,65,0.3)' : round2Status === 'CLASSIFIED' ? 'rgba(255,0,60,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {round2Status}
            </span>
          </div>
          <h3 className="font-display" style={{ fontSize: 20, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
            ROUND 2: THE FINAL HACK
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Spy-themed coding challenges. Arrays, strings, OOP, and more in a live code editor.
          </p>
          {round2Status === 'ACTIVE' && (
            <Link href="/dashboard/round2">
              <button className="btn-spy" style={{ width: '100%', padding: 12, fontSize: 14 }}>
                <span>💻 Open Code Editor</span>
              </button>
            </Link>
          )}
          {round2Status === 'CLASSIFIED' && (
            <p className="font-mono" style={{ color: 'var(--spy-red)', fontSize: 12 }}>🔐 Classified — shortlisted agents only</p>
          )}
          {round2Status === 'LOCKED' && (
            <p className="font-mono" style={{ color: 'var(--text-dim)', fontSize: 12 }}>🔒 Locked — awaiting activation</p>
          )}
        </div>
      </div>

      {/* Notifications */}
      <h2 className="font-display" style={{ fontSize: 18, color: 'var(--spy-green)', letterSpacing: 3, marginBottom: 16 }}>
        INTEL FEED
      </h2>
      {notifications.length === 0 ? (
        <div className="spy-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📡</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No intel available yet. Stand by, Agent.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.map((n) => (
            <div
              key={n._id}
              className="spy-card"
              style={{
                padding: '16px 20px',
                borderLeft: `3px solid ${notifColor[n.type] || 'var(--border)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span>{notifIcon[n.type] || 'ℹ️'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{n.title}</span>
                <span className="font-mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>
                  {new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, paddingLeft: 28 }}>{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
