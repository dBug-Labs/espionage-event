'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSendOTP() {
    if (!email.trim()) {
      setError('Enter your registered email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send OTP.');
        return;
      }
      setSuccess('OTP sent to your email. Check your inbox.');
      setStep('otp');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!otp.trim()) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed.');
        return;
      }
      setSession(data.session);
      router.push('/dashboard');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f0a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background effects */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,65,0.06), transparent)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.04), transparent)', filter: 'blur(80px)' }} />
      </div>

      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 40,
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo area */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🕵️</div>
          <h1
            className="font-display"
            style={{ fontSize: 28, fontWeight: 700, color: 'var(--spy-green)', marginBottom: 6, letterSpacing: 4 }}
          >
            ESPIONAGE
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, letterSpacing: 2 }}>
            AGENT AUTHENTICATION
          </p>
        </div>

        {/* Divider */}
        <div className="spy-divider" style={{ width: 120, marginBottom: 28 }} />

        {step === 'email' ? (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              Enter your registered email to receive an access code.
            </p>
            <input
              type="email"
              placeholder="agent@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
              className="form-input"
              style={{ marginBottom: 12, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}
            />
            {error && <p style={{ color: 'var(--spy-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button
              className="btn-spy"
              style={{ width: '100%', padding: 14, marginTop: 8 }}
              onClick={handleSendOTP}
              disabled={loading}
            >
              <span>{loading ? 'Transmitting...' : '📡 Send Access Code'}</span>
            </button>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>
              Access code sent to
            </p>
            <p className="font-mono" style={{ color: 'var(--spy-green)', fontSize: 13, marginBottom: 20 }}>
              {email}
            </p>
            {success && <p style={{ color: 'var(--spy-green)', fontSize: 12, marginBottom: 12, opacity: 0.7 }}>{success}</p>}
            <input
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
              className="form-input"
              maxLength={6}
              style={{
                marginBottom: 12,
                textAlign: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 28,
                letterSpacing: 12,
                padding: '16px 20px',
              }}
            />
            {error && <p style={{ color: 'var(--spy-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button
              className="btn-spy"
              style={{ width: '100%', padding: 14, marginTop: 8 }}
              onClick={handleVerifyOTP}
              disabled={loading}
            >
              <span>{loading ? 'Verifying...' : '🔓 Authenticate'}</span>
            </button>
            <button
              onClick={() => { setStep('email'); setError(''); setOtp(''); setSuccess(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, marginTop: 16, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Use a different email
            </button>
          </>
        )}

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <Link href="/" style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: 13 }}>
            ← Back to Mission Briefing
          </Link>
        </div>
      </div>
    </div>
  );
}
