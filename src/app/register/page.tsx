'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';

interface MemberData {
  name: string;
  email: string;
  collegeEmail: string;
  regNo: string;
  phone: string;
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

// Extend window for Turnstile
declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: any) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
    };
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [teamType, setTeamType] = useState<'solo' | 'duo'>('solo');
  const [form, setForm] = useState<MemberData>({
    name: '',
    email: '',
    collegeEmail: '',
    regNo: '',
    phone: '',
  });
  const [partner, setPartner] = useState<MemberData>({
    name: '',
    email: '',
    collegeEmail: '',
    regNo: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // ─── Security State ───
  const [honeypot, setHoneypot] = useState(''); // Hidden field — bots fill this
  const [formLoadedAt] = useState(() => Date.now()); // Timing check
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileWidgetId = useRef<string>('');

  // ─── OTP State ───
  const [otpStep, setOtpStep] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'verified'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [verificationToken, setVerificationToken] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Cleanup countdown on unmount ───
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ─── Countdown timer for OTP resend ───
  const startCountdown = useCallback((seconds: number) => {
    setOtpCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ─── Validation ───
  function validateEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }
  function validatePhone(p: string) {
    return /^[6-9]\d{9}$/.test(p.replace(/\s/g, ''));
  }
  function validateRegNo(r: string) {
    return /^RA\d{13}$/i.test(r);
  }
  function validateCollegeEmail(e: string) {
    return validateEmail(e) && e.toLowerCase().endsWith('@srmist.edu.in');
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Name is required (min 2 chars).';
    if (!validateEmail(form.email)) errs.email = 'Enter a valid email.';
    if (!validateCollegeEmail(form.collegeEmail)) errs.collegeEmail = 'Must be a valid @srmist.edu.in email.';
    if (!form.regNo.trim()) errs.regNo = 'Registration number is required.';
    // Removed strict regex from client side so students won't get stuck if they typed slightly off
    // The server will still strictly validate RA2XXXXXXXXXXX
    if (!validatePhone(form.phone)) errs.phone = 'Enter a valid 10-digit mobile number.';

    if (teamType === 'duo') {
      if (!partner.name.trim() || partner.name.trim().length < 2) errs.partnerName = 'Partner name is required.';
      if (!validateEmail(partner.email)) errs.partnerEmail = 'Enter a valid partner email.';
      if (!validateCollegeEmail(partner.collegeEmail)) errs.partnerCollegeEmail = 'Must be a valid @srmist.edu.in email.';
      if (!partner.regNo.trim()) errs.partnerRegNo = 'Partner registration number is required.';
      if (!validatePhone(partner.phone)) errs.partnerPhone = 'Enter a valid partner phone number.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Send OTP ───
  async function handleSendOTP() {
    if (!validateEmail(form.email)) {
      setOtpError('Enter a valid email address first.');
      return;
    }
    
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setOtpError('Please complete the Cloudflare security check below.');
      return;
    }

    setOtpStep('sending');
    setOtpError('');

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, captchaToken }),
      });
      const data = await res.json();

      // IMPORTANT: Reset Turnstile widget so we get a fresh token for registration submit later
      if (window.turnstile && turnstileWidgetId.current) {
        window.turnstile.reset(turnstileWidgetId.current);
        setCaptchaToken('');
      }

      if (!res.ok) {
        setOtpError(data.error || 'Failed to send OTP.');
        setOtpStep('idle');
        return;
      }

      setOtpStep('sent');
      startCountdown(60);
    } catch {
      setOtpError('Network error. Please try again.');
      setOtpStep('idle');
    }
  }

  // ─── Verify OTP ───
  async function handleVerifyOTP() {
    if (otpCode.length !== 6) {
      setOtpError('Enter the 6-digit code sent to your email.');
      return;
    }
    setOtpStep('verifying');
    setOtpError('');

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp: otpCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || 'Verification failed.');
        setOtpStep('sent');
        return;
      }

      setVerificationToken(data.verificationToken);
      setOtpStep('verified');
      if (countdownRef.current) clearInterval(countdownRef.current);
    } catch {
      setOtpError('Network error. Please try again.');
      setOtpStep('sent');
    }
  }

  // ─── Submit Registration ───
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (otpStep !== 'verified') {
      setOtpError('Please verify your email with OTP before registering.');
      return;
    }

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      alert('Please complete the Cloudflare security check again for final submission.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/register-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant: {
            name: form.name,
            email: form.email,
            collegeEmail: form.collegeEmail,
            regNo: form.regNo,
            phone: form.phone,
          },
          teamType,
          partner: teamType === 'duo' ? {
            name: partner.name,
            email: partner.email,
            collegeEmail: partner.collegeEmail,
            regNo: partner.regNo,
            phone: partner.phone,
          } : undefined,
          captchaToken,
          verificationToken,
          honeypot,
          formLoadedAt,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to submit registration.');
        
        // Reset turnstile in case of failure so they can try again
        if (window.turnstile && turnstileWidgetId.current) {
          window.turnstile.reset(turnstileWidgetId.current);
          setCaptchaToken('');
        }

        setLoading(false);
        return;
      }

      sessionStorage.setItem('espionage_registration', JSON.stringify({
        success: true,
        participantId: data.participantId,
        name: form.name,
        email: form.email,
        teamType,
        partnerName: teamType === 'duo' ? partner.name : undefined,
      }));
      router.push('/success');
    } catch (err) {
      console.error('Submission Error:', err);
      alert('Something went wrong. Please try again.');
      
      // Reset turnstile
      if (window.turnstile && turnstileWidgetId.current) {
        window.turnstile.reset(turnstileWidgetId.current);
        setCaptchaToken('');
      }

      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center flex-col gap-6 terminal-bg">
        <div className="fixed inset-0 scanline opacity-20 pointer-events-none"></div>
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="font-headline text-2xl text-primary font-bold tracking-widest uppercase">
          Encrypting Data...
        </p>
        <p className="text-on-surface-variant text-sm font-label tracking-widest uppercase">Do not close this terminal, Agent.</p>
      </div>
    );
  }

  const inputClass = (field: string) =>
    `w-full bg-surface-container-highest border-none border-b-2 ${errors[field] ? 'border-error' : 'border-outline-variant focus:border-primary'} focus:ring-0 text-on-surface font-headline tracking-widest transition-all px-4 py-3 placeholder:text-outline-variant/40`;

  // Provide a global function for the Turnstile script onLoad callback
  if (typeof window !== 'undefined' && !(window as any).onloadTurnstileCallback) {
    (window as any).onloadTurnstileCallback = () => {
      if (window.turnstile && TURNSTILE_SITE_KEY) {
        const widgetId = window.turnstile.render('#turnstile-container', {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          callback: (token: string) => {
            setCaptchaToken(token);
            setCaptchaReady(true);
          },
          'expired-callback': () => {
            setCaptchaToken('');
            setCaptchaReady(false);
          },
          'error-callback': () => {
             setCaptchaToken('');
             setCaptchaReady(false);
          }
        });
        turnstileWidgetId.current = widgetId;
      }
    };
  }

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden terminal-bg relative min-h-screen">
      {/* Cloudflare Turnstile Script */}
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit"
          strategy="afterInteractive"
        />
      )}

      <div className="fixed inset-0 scanline opacity-[0.03] z-[60] pointer-events-none"></div>

      <nav className="flex justify-between items-center w-full px-6 py-4 fixed top-0 z-50 bg-[#0e0e0e] border-b border-white/10 shadow-[0_0_15px_rgba(255,0,0,0.1)]">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logog.png" alt="dBug Labs" className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <div className="text-xl font-black text-red-600 dark:text-red-500 tracking-tighter font-headline leading-none">ESPIONAGE</div>
            <div className="text-[10px] text-gray-400 font-headline uppercase tracking-widest leading-none mt-1">by dBug Labs</div>
          </div>
        </Link>
        <div className="hidden md:flex gap-8 items-center">
          <Link href="/login" className="font-headline uppercase tracking-widest text-sm text-zinc-500 hover:text-red-400 transition-colors">LOGIN_AGENT</Link>
          <a className="font-headline uppercase tracking-widest text-sm text-red-500 font-bold border-b-2 border-red-500 pb-1" href="#">ENROLLMENT</a>
        </div>
      </nav>

      <main className="pt-24 pb-32 min-h-screen px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5 space-y-8 order-2 lg:order-1">
          <div className="relative group">
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-secondary-fixed"></div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-secondary-fixed"></div>
            <div className="bg-surface-container-lowest p-1 aspect-square overflow-hidden border border-outline-variant/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="w-full h-full object-cover grayscale brightness-50 contrast-125 group-hover:grayscale-0 transition-all duration-700"
                alt="Cyber board"
                src="/images/enrollment-bg.jpg"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary animate-pulse"></div>
              <span className="font-headline text-[10px] uppercase tracking-[0.3em] text-primary">System Online: Cryptographic Protocol Active</span>
            </div>
            <h1 className="font-headline text-5xl font-black text-on-surface leading-[0.9] tracking-tighter uppercase">ESPIONAGE<br /><span className="text-primary-container">RECRUITMENT</span></h1>
            <p className="text-on-surface-variant/80 text-sm leading-relaxed max-w-md">
              Initializing protocol 7-Delta. You are applying for a covert intelligence role. Registration is <span className="text-primary font-bold">FREE</span> — Solo or Duo entry.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-4 border-l-4 border-primary">
              <div className="font-headline text-[10px] text-primary mb-1 uppercase tracking-widest">Clearance</div>
              <div className="font-headline text-xl font-bold">LEVEL_01</div>
            </div>
            <div className="bg-surface-container-low p-4 border-l-4 border-secondary">
              <div className="font-headline text-[10px] text-secondary mb-1 uppercase tracking-widest">Assignment</div>
              <div className="font-headline text-xl font-bold">{teamType === 'duo' ? 'DUO_OP' : 'SOLO_OP'}</div>
            </div>
          </div>

          {/* Security Badge */}
          <div className="bg-surface-container-low p-4 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-green-500 text-sm">verified_user</span>
              <span className="font-headline text-[10px] uppercase tracking-[0.2em] text-green-500">Protected Registration</span>
            </div>
            <p className="text-on-surface-variant/60 text-[11px] font-headline tracking-wide">
              This form is protected by Cloudflare Turnstile, OTP verification, and connection rate limiting.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 bg-surface-container-low p-8 relative order-1 lg:order-2">
          <div className="absolute top-0 right-0 p-4 font-headline text-[10px] text-outline-variant uppercase tracking-widest">
            Ref: XJ-992/Enroll
          </div>
          <div className="mb-10">
            <h2 className="font-headline text-2xl font-bold uppercase tracking-tight text-on-surface flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">fingerprint</span>
              Identity_Verification
            </h2>
            <div className="h-px w-full bg-gradient-to-r from-primary/50 to-transparent mt-2"></div>
          </div>

          {/* Team Type Toggle */}
          <div className="flex gap-4 mb-8">
            <button
              type="button"
              onClick={() => setTeamType('solo')}
              className={`flex-1 py-3 font-headline font-bold text-sm tracking-[0.2em] uppercase transition-all border ${teamType === 'solo' ? 'bg-primary/10 text-primary border-primary shadow-[0_0_15px_rgba(255,85,64,0.2)]' : 'bg-surface-container-highest border-outline-variant/30 text-on-surface-variant hover:border-primary/50'}`}
            >
              <span className="material-symbols-outlined text-sm align-middle mr-2">person</span>
              SOLO
            </button>
            <button
              type="button"
              onClick={() => setTeamType('duo')}
              className={`flex-1 py-3 font-headline font-bold text-sm tracking-[0.2em] uppercase transition-all border ${teamType === 'duo' ? 'bg-primary/10 text-primary border-primary shadow-[0_0_15px_rgba(255,85,64,0.2)]' : 'bg-surface-container-highest border-outline-variant/30 text-on-surface-variant hover:border-primary/50'}`}
            >
              <span className="material-symbols-outlined text-sm align-middle mr-2">group</span>
              DUO
            </button>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* ─── HONEYPOT (invisible to users, bots fill it) ─── */}
            <div className="absolute" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true" tabIndex={-1}>
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                autoComplete="off"
                tabIndex={-1}
              />
            </div>

            {/* Leader Section */}
            <div>
              <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">military_tech</span>
                {teamType === 'duo' ? 'TEAM LEADER' : 'AGENT DETAILS'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group col-span-1 md:col-span-2">
                  <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Agent Alias (Full Name) *</label>
                  <div className="relative">
                    <input className={inputClass('name')} placeholder="GHOST_PROTOCOL" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
                    {errors.name && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.name}</p>}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-sm">badge</span>
                    </div>
                  </div>
                </div>
                <div className="group">
                  <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Secure Contact (Personal Email) *</label>
                  <input
                    className={inputClass('email')}
                    placeholder="AGENT@SECURE.NET"
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      setForm(p => ({ ...p, email: e.target.value }));
                      // Reset OTP if email changes
                      if (otpStep === 'verified' || otpStep === 'sent') {
                        setOtpStep('idle');
                        setVerificationToken('');
                        setOtpCode('');
                      }
                    }}
                  />
                  {errors.email && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.email}</p>}

                  {/* ─── OTP Section ─── */}
                  <div className="mt-3">
                    {otpStep === 'idle' && (
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={!validateEmail(form.email)}
                        className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary font-headline text-[11px] tracking-[0.15em] uppercase hover:bg-primary/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">mail_lock</span>
                        SEND_VERIFICATION_OTP
                      </button>
                    )}
                    {otpStep === 'sending' && (
                      <div className="flex items-center gap-2 text-primary font-headline text-[11px] tracking-widest">
                        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        SENDING OTP...
                      </div>
                    )}
                    {(otpStep === 'sent' || otpStep === 'verifying') && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Enter 6-digit OTP"
                            maxLength={6}
                            className="flex-1 bg-surface-container-highest border border-primary/30 text-on-surface font-headline tracking-[0.3em] text-center px-4 py-2 text-lg placeholder:text-outline-variant/30 placeholder:tracking-widest placeholder:text-sm focus:ring-0 focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOTP}
                            disabled={otpCode.length !== 6 || otpStep === 'verifying'}
                            className="px-4 py-2 bg-primary text-on-primary font-headline text-[11px] tracking-[0.15em] uppercase hover:bg-primary/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {otpStep === 'verifying' ? '...' : 'VERIFY'}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-on-surface-variant/50 font-headline text-[10px] tracking-widest">
                            Check your inbox & spam folder
                          </span>
                          {otpCountdown > 0 ? (
                            <span className="text-on-surface-variant/40 font-headline text-[10px] tracking-widest">
                              Resend in {otpCountdown}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendOTP}
                              className="text-primary font-headline text-[10px] tracking-widest hover:underline"
                            >
                              RESEND_OTP
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {otpStep === 'verified' && (
                      <div className="flex items-center gap-2 text-green-500 font-headline text-[11px] tracking-widest">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        EMAIL VERIFIED
                      </div>
                    )}
                    {otpError && (
                      <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{otpError}</p>
                    )}
                  </div>
                </div>
                <div className="group">
                  <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Command Center (College Email) *</label>
                  <input className={inputClass('collegeEmail')} placeholder="XX1234@SRMIST.EDU.IN" type="email" value={form.collegeEmail} onChange={(e) => setForm(p => ({ ...p, collegeEmail: e.target.value }))} />
                  {errors.collegeEmail && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.collegeEmail}</p>}
                </div>
                <div className="group">
                  <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Agent ID (Registration No.) *</label>
                  <div className="relative">
                    <input className={inputClass('regNo')} placeholder="RA2XXXXXXXXXXX" value={form.regNo} onChange={(e) => setForm(p => ({ ...p, regNo: e.target.value.toUpperCase() }))} />
                    {errors.regNo && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.regNo}</p>}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-sm">fingerprint</span>
                    </div>
                  </div>
                </div>
                <div className="group">
                  <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Comm Channel (Phone) *</label>
                  <div className="relative">
                    <input className={inputClass('phone')} placeholder="9876543210" type="tel" maxLength={10} value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} />
                    {errors.phone && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.phone}</p>}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-sm">call</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Partner Section (Duo only) */}
            {teamType === 'duo' && (
              <div className="border-t border-primary/20 pt-8">
                <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">group_add</span>
                  PARTNER DETAILS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group col-span-1 md:col-span-2">
                    <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Partner Alias (Full Name) *</label>
                    <input className={inputClass('partnerName')} placeholder="SHADOW_AGENT" value={partner.name} onChange={(e) => setPartner(p => ({ ...p, name: e.target.value }))} />
                    {errors.partnerName && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.partnerName}</p>}
                  </div>
                  <div className="group">
                    <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Partner Email *</label>
                    <input className={inputClass('partnerEmail')} placeholder="PARTNER@SECURE.NET" type="email" value={partner.email} onChange={(e) => setPartner(p => ({ ...p, email: e.target.value }))} />
                    {errors.partnerEmail && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.partnerEmail}</p>}
                  </div>
                  <div className="group">
                    <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Partner College Email *</label>
                    <input className={inputClass('partnerCollegeEmail')} placeholder="XX5678@SRMIST.EDU.IN" type="email" value={partner.collegeEmail} onChange={(e) => setPartner(p => ({ ...p, collegeEmail: e.target.value }))} />
                    {errors.partnerCollegeEmail && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.partnerCollegeEmail}</p>}
                  </div>
                  <div className="group">
                    <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Partner Reg No. *</label>
                    <input className={inputClass('partnerRegNo')} placeholder="RA2XXXXXXXXXXX" value={partner.regNo} onChange={(e) => setPartner(p => ({ ...p, regNo: e.target.value.toUpperCase() }))} />
                    {errors.partnerRegNo && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.partnerRegNo}</p>}
                  </div>
                  <div className="group">
                    <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Partner Phone *</label>
                    <input className={inputClass('partnerPhone')} placeholder="9876543210" type="tel" maxLength={10} value={partner.phone} onChange={(e) => setPartner(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} />
                    {errors.partnerPhone && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.partnerPhone}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Cloudflare Turnstile Container */}
            {TURNSTILE_SITE_KEY && (
              <div className="flex justify-center my-6">
                 <div id="turnstile-container"></div>
              </div>
            )}

            <div className="bg-surface-container-high p-6 border-t border-primary/20 mt-4">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <div className="font-headline text-[10px] uppercase tracking-[0.2em] text-primary mb-1">Entry Fee</div>
                  <div className="text-3xl font-headline font-black text-primary">FREE <span className="text-sm font-normal text-outline-variant">OF COST</span></div>
                </div>
                <div className="text-right">
                  <div className="font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/40">Entry Type</div>
                  <div className="font-headline text-xs font-medium">{teamType === 'duo' ? 'DUO_ENTRY' : 'SOLO_ENTRY'}</div>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className={`flex items-center gap-1.5 font-headline text-[10px] tracking-widest ${otpStep === 'verified' ? 'text-green-500' : 'text-on-surface-variant/30'}`}>
                  <span className="material-symbols-outlined text-xs">{otpStep === 'verified' ? 'check_circle' : 'radio_button_unchecked'}</span>
                  EMAIL_VERIFIED
                </div>
                <div className={`flex items-center gap-1.5 font-headline text-[10px] tracking-widest ${captchaReady ? 'text-green-500' : 'text-on-surface-variant/30'}`}>
                  <span className="material-symbols-outlined text-xs">{captchaReady ? 'check_circle' : 'radio_button_unchecked'}</span>
                  SECURITY_CHECK
                </div>
              </div>

              <button
                type="submit"
                disabled={otpStep !== 'verified'}
                className="w-full py-5 bg-primary text-on-primary font-headline font-black text-xl tracking-[0.2em] uppercase transition-all hover:bg-primary-container active:scale-[0.98] shadow-[0_0_20px_rgba(255,180,168,0.2)] flex items-center justify-center gap-4 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-primary"
              >
                {otpStep !== 'verified' ? (
                  <>
                    <span className="material-symbols-outlined">lock</span>
                    VERIFY_EMAIL_FIRST
                  </>
                ) : (
                  <>
                    ENROLL_AGENT
                    <span className="material-symbols-outlined">keyboard_double_arrow_right</span>
                  </>
                )}
              </button>
              <p className="text-[10px] font-headline text-center mt-4 text-on-surface-variant/40 uppercase tracking-widest">
                By enrolling, you agree to the conditions of the clandestine service directive.
              </p>
            </div>
          </form>
        </div>
      </main>

      <footer className="fixed bottom-0 w-full flex justify-between items-center px-8 py-2 z-50 bg-[#0e0e0e] border-t border-orange-500/20">
        <div className="font-headline text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          © 2026 CLASSIFIED DIRECTIVE // EYES ONLY
        </div>
        <div className="flex gap-6 items-center">
          <a className="font-headline text-[10px] uppercase tracking-[0.2em] text-zinc-600 hover:text-orange-400 transition-all opacity-80 hover:opacity-100" href="#">SYSTEM_LOGS</a>
          <a className="font-headline text-[10px] uppercase tracking-[0.2em] text-zinc-600 hover:text-orange-400 transition-all opacity-80 hover:opacity-100" href="#">MANUAL</a>
          <a className="font-headline text-[10px] uppercase tracking-[0.2em] text-orange-500 underline opacity-80 hover:opacity-100" href="#">TERMINATE_SESSION</a>
        </div>
      </footer>
    </div>
  );
}
