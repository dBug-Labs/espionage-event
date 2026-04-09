'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage() {
  const loginPaused =
    process.env.NEXT_PUBLIC_LOGIN_PAUSED === 'true' ||
    process.env.NEXT_PUBLIC_LOGIN_PAUSED === '1' ||
    process.env.NEXT_PUBLIC_OTP_ROUTES_PAUSED === 'true' ||
    process.env.NEXT_PUBLIC_OTP_ROUTES_PAUSED === '1';
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSendOTP() {
    if (loginPaused) {
      setError('Login access is temporarily paused.');
      return;
    }

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
    if (loginPaused) {
      setError('Login access is temporarily paused.');
      return;
    }

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
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-hidden terminal-bg relative min-h-screen flex items-center justify-center">
      <div className="fixed inset-0 scanline opacity-10 pointer-events-none z-0"></div>

      <nav className="flex justify-between items-center w-full px-6 py-4 fixed top-0 z-50 bg-[#0e0e0e] border-b border-white/10 shadow-[0_0_15px_rgba(255,0,0,0.1)]">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logog.png" alt="dBug Labs" className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <div className="text-xl font-black text-red-600 dark:text-red-500 tracking-tighter font-headline leading-none">ESPIONAGE</div>
            <div className="text-[10px] text-gray-400 font-headline uppercase tracking-widest leading-none mt-1">by dBug Labs</div>
          </div>
        </Link>
        <div className="hidden md:flex gap-8 items-center">
          <Link href="/register" className="font-headline uppercase tracking-widest text-sm text-zinc-500 hover:text-red-400 transition-colors">ENROLLMENT</Link>
          <a className="font-headline uppercase tracking-widest text-sm text-red-500 font-bold border-b-2 border-red-500 pb-1" href="/login">LOGIN_AGENT</a>
        </div>
      </nav>

      <div className="relative z-10 w-full max-w-lg px-6 mt-16">
        <div className="bg-surface-container-low p-8 relative border border-outline-variant/30 shadow-[0_0_30px_rgba(255,85,64,0.05)]">
          <div className="absolute top-0 right-0 p-4 font-headline text-[10px] text-outline-variant uppercase tracking-widest">
            Ref: AUTH-PROTOCOL
          </div>

          <div className="mb-10 text-center flex flex-col items-center">
            <span className="material-symbols-outlined text-primary text-5xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>policy</span>
            <h2 className="font-headline text-3xl font-black uppercase tracking-tighter text-on-surface">
              AGENT_AUTH
            </h2>
            <div className="h-px w-3/4 bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-4"></div>
          </div>

          <div className="space-y-6">
            {loginPaused && (
              <div className="border border-error/40 bg-error/10 px-4 py-4 text-center">
                <p className="font-headline text-[10px] tracking-[0.2em] uppercase text-error">Login Paused</p>
                <p className="mt-2 text-sm text-on-surface-variant">This route is temporarily disabled on deployment.</p>
              </div>
            )}

            {step === 'email' ? (
              <>
                <p className="font-headline text-xs text-secondary text-center uppercase tracking-[0.2em] mb-4">
                  Identify Yourself
                </p>
                <div className="group">
                  <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Secure Contact (Email) *</label>
                  <div className="relative">
                    <input
                      type="email"
                      className={`w-full bg-surface-container-highest border-none border-b-2 ${error ? 'border-error' : 'border-outline-variant focus:border-primary'} focus:ring-0 text-on-surface font-headline tracking-widest transition-all px-4 py-4 placeholder:text-outline-variant/40 text-center`}
                      placeholder="AGENT@SECURE.NET"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-sm">mail</span>
                    </div>
                  </div>
                  {error && <p className="text-error mt-2 text-center font-headline text-[10px] tracking-widest uppercase">{error}</p>}
                </div>

                <button
                  className="w-full py-4 mt-6 bg-primary text-on-primary font-headline font-black text-lg tracking-[0.2em] uppercase transition-all hover:bg-primary-container active:scale-[0.98] shadow-[0_0_20px_rgba(255,180,168,0.2)] disabled:opacity-50 flex justify-center items-center gap-2"
                  onClick={handleSendOTP}
                  disabled={loading || loginPaused}
                >
                  {loading ? 'TRANSMITTING...' : 'SEND_ACCESS_CODE'}
                  {!loading && <span className="material-symbols-outlined text-lg">radar</span>}
                </button>
              </>
            ) : (
              <>
                <p className="font-headline text-[10px] text-secondary text-center uppercase tracking-[0.2em]">
                  Access Code Dispatched To
                </p>
                <p className="font-headline text-sm text-primary text-center font-bold tracking-widest mb-6 border border-primary/20 bg-primary/5 py-2">
                  {email}
                </p>

                {success && <p className="text-primary text-center font-headline text-[10px] tracking-widest uppercase mb-4 animate-pulse">{success}</p>}

                <div className="group mb-2">
                  <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block text-center">Enter 6-Digit Direct Verification Code *</label>
                  <input
                    type="text"
                    className={`w-full bg-surface-container-highest border-none border-b-2 ${error ? 'border-error' : 'border-outline-variant focus:border-primary'} focus:ring-0 text-on-surface font-headline font-bold text-3xl tracking-[0.5em] transition-all px-4 py-4 placeholder:text-outline-variant/20 text-center`}
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                  />
                  {error && <p className="text-error mt-2 text-center font-headline text-[10px] tracking-widest uppercase">{error}</p>}
                </div>

                <button
                  className="w-full py-4 mt-8 bg-primary text-on-primary font-headline font-black text-lg tracking-[0.2em] uppercase transition-all hover:bg-primary-container active:scale-[0.98] shadow-[0_0_20px_rgba(255,180,168,0.2)] disabled:opacity-50 flex justify-center items-center gap-2"
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length < 6 || loginPaused}
                >
                  {loading ? 'VERIFYING...' : 'AUTHENTICATE'}
                  {!loading && <span className="material-symbols-outlined text-lg">lock_open</span>}
                </button>

                <div className="text-center mt-6 pt-4 border-t border-outline-variant/20">
                  <button
                    onClick={() => { setStep('email'); setError(''); setOtp(''); setSuccess(''); }}
                    className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors hover:underline"
                  >
                    ← RE-ENTER SECURE CONTACT
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <footer className="fixed bottom-0 w-full flex justify-between items-center px-8 py-2 z-50 bg-[#0e0e0e] border-t border-orange-500/20 mt-auto">
        <div className="font-headline text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          © 2026 CLASSIFIED DIRECTIVE // EYES ONLY
        </div>
        <div className="flex gap-6 items-center">
          <a className="font-headline text-[10px] uppercase tracking-[0.2em] text-zinc-600 hover:text-orange-400 transition-all opacity-80 hover:opacity-100" href="#">SYSTEM_LOGS</a>
          <a className="font-headline text-[10px] uppercase tracking-[0.2em] text-zinc-600 hover:text-orange-400 transition-all opacity-80 hover:opacity-100" href="#">MANUAL</a>
        </div>
      </footer>
    </div>
  );
}
