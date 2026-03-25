'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FormData {
  name: string;
  email: string;
  collegeEmail: string;
  regNo: string;
  phone: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    collegeEmail: '',
    regNo: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'qr-payment' | 'submitting'>('form');
  const [transactionId, setTransactionId] = useState('');

  const AMOUNT = 70;

  function validateEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }
  function validatePhone(p: string) {
    return /^[6-9]\d{9}$/.test(p.replace(/\s/g, ''));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!validateEmail(form.email)) errs.email = 'Enter a valid email.';
    if (!validateEmail(form.collegeEmail)) errs.collegeEmail = 'Enter a valid college email.';
    if (!form.regNo.trim()) errs.regNo = 'Registration number is required.';
    if (!validatePhone(form.phone)) errs.phone = 'Enter a valid 10-digit mobile number.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setStep('qr-payment');
  }

  async function handleFinalSubmit() {
    if (!transactionId.trim()) {
      setErrors({ transactionId: 'Transaction ID is required.' });
      return;
    }
    setLoading(true);
    setStep('submitting');

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
          transactionId: transactionId.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to submit registration.');
        setLoading(false);
        setStep('qr-payment');
        return;
      }

      sessionStorage.setItem('espionage_registration', JSON.stringify({
        success: true,
        participantId: data.participantId,
        name: form.name,
        email: form.email,
        amountPaid: AMOUNT,
      }));
      router.push('/success');
    } catch (err) {
      console.error('Submission Error:', err);
      alert('Something went wrong. Please try again.');
      setLoading(false);
      setStep('qr-payment');
    }
  }

  if (step === 'submitting') {
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

  if (step === 'qr-payment') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6 terminal-bg relative">
        <div className="fixed inset-0 scanline opacity-20 pointer-events-none"></div>

        <div className="bg-surface-container-low p-8 relative max-w-lg w-full border border-outline-variant/30">
          <div className="absolute top-0 right-0 p-4 font-headline text-[10px] text-outline-variant uppercase tracking-widest">
            Ref: PAY-XJ992
          </div>
          <button
            onClick={() => setStep('form')}
            className="absolute top-4 left-4 font-headline text-[10px] text-primary uppercase tracking-widest hover:text-white transition-colors"
          >
            ← ABORT PAYMENT
          </button>

          <div className="mt-8 mb-8 text-center">
            <h2 className="font-headline text-2xl font-bold uppercase tracking-tight text-on-surface flex items-center justify-center gap-3">
              <span className="material-symbols-outlined text-primary">qr_code_scanner</span>
              Transmit_Funds
            </h2>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-2"></div>
          </div>

          <div className="flex justify-center mb-8">
            <div className="bg-white p-2 rounded block shadow-[0_0_30px_rgba(255,180,168,0.15)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/qr-code.png" alt="Payment QR Code" className="w-48 h-48" />
            </div>
          </div>

          <div className="text-center mb-8">
            <p className="text-primary font-headline text-xs font-bold uppercase tracking-widest mb-2">Amount Required</p>
            <p className="text-4xl font-headline font-black text-on-surface">₹{AMOUNT}.00</p>
          </div>

          <div className="space-y-6">
            <div className="group">
              <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Transaction ID / UTR *</label>
              <div className="relative">
                <input
                  className={`w-full bg-surface-container-highest border-none border-b-2 ${errors.transactionId ? 'border-error' : 'border-outline-variant focus:border-primary'} focus:ring-0 text-on-surface font-headline tracking-widest transition-all px-4 py-3 placeholder:text-outline-variant/40`}
                  placeholder="ENTER 12-DIGIT UTR"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
                {errors.transactionId && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.transactionId}</p>}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-sm">receipt_long</span>
                </div>
              </div>
            </div>

            <button
              className="w-full py-4 bg-primary text-on-primary font-headline font-black text-lg tracking-[0.2em] uppercase transition-all hover:bg-primary-container active:scale-[0.98] shadow-[0_0_20px_rgba(255,180,168,0.2)] disabled:opacity-50 flex justify-center items-center gap-2"
              onClick={handleFinalSubmit}
              disabled={loading}
            >
              {loading ? 'CONFIRMING...' : 'VERIFY_TRANSFER'}
              {!loading && <span className="material-symbols-outlined text-sm">check_circle</span>}
            </button>
            <p className="text-[10px] font-headline text-center text-on-surface-variant/40 uppercase tracking-widest">
              Funds transmission is final. Verification required by HQ.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden terminal-bg relative min-h-screen">
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
              Initializing protocol 7-Delta. You are applying for a covert intelligence role. Your digital footprint will be scrubbed upon successful deployment. Total mission stake: <span className="text-secondary font-bold">₹{AMOUNT}.00</span>.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-4 border-l-4 border-primary">
              <div className="font-headline text-[10px] text-primary mb-1 uppercase tracking-widest">Clearance</div>
              <div className="font-headline text-xl font-bold">LEVEL_01</div>
            </div>
            <div className="bg-surface-container-low p-4 border-l-4 border-secondary">
              <div className="font-headline text-[10px] text-secondary mb-1 uppercase tracking-widest">Assignment</div>
              <div className="font-headline text-xl font-bold">SOLO_OP</div>
            </div>
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

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group col-span-1 md:col-span-2">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Agent Alias (Full Name) *</label>
                <div className="relative">
                  <input
                    className={`w-full bg-surface-container-highest border-none border-b-2 ${errors.name ? 'border-error' : 'border-outline-variant focus:border-primary'} focus:ring-0 text-on-surface font-headline tracking-widest transition-all px-4 py-3 placeholder:text-outline-variant/40`}
                    placeholder="GHOST_PROTOCOL"
                    value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  />
                  {errors.name && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.name}</p>}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-sm">badge</span>
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Secure Contact (Personal Email) *</label>
                <input
                  className={`w-full bg-surface-container-highest border-none border-b-2 ${errors.email ? 'border-error' : 'border-outline-variant focus:border-primary'} focus:ring-0 text-on-surface font-headline tracking-widest transition-all px-4 py-3 placeholder:text-outline-variant/40`}
                  placeholder="AGENT@SECURE.NET"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                />
                {errors.email && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.email}</p>}
              </div>

              <div className="group">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Command Center (College Email) *</label>
                <input
                  className={`w-full bg-surface-container-highest border-none border-b-2 ${errors.collegeEmail ? 'border-error' : 'border-outline-variant focus:border-primary'} focus:ring-0 text-on-surface font-headline tracking-widest transition-all px-4 py-3 placeholder:text-outline-variant/40`}
                  placeholder="XX1234@SRMIST.EDU.IN"
                  type="email"
                  value={form.collegeEmail}
                  onChange={(e) => setForm(p => ({ ...p, collegeEmail: e.target.value }))}
                />
                {errors.collegeEmail && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.collegeEmail}</p>}
              </div>

              <div className="group">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Agent ID (Registration No.) *</label>
                <div className="relative">
                  <input
                    className={`w-full bg-surface-container-highest border-none border-b-2 ${errors.regNo ? 'border-error' : 'border-outline-variant focus:border-primary'} focus:ring-0 text-on-surface font-headline tracking-widest transition-all px-4 py-3 placeholder:text-outline-variant/40`}
                    placeholder="RA2XXXXXXXXX"
                    value={form.regNo}
                    onChange={(e) => setForm(p => ({ ...p, regNo: e.target.value.toUpperCase() }))}
                  />
                  {errors.regNo && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.regNo}</p>}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-sm">fingerprint</span>
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Comm Channel (Phone) *</label>
                <div className="relative">
                  <input
                    className={`w-full bg-surface-container-highest border-none border-b-2 ${errors.phone ? 'border-error' : 'border-outline-variant focus:border-primary'} focus:ring-0 text-on-surface font-headline tracking-widest transition-all px-4 py-3 placeholder:text-outline-variant/40`}
                    placeholder="9876543210"
                    type="tel"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                  />
                  {errors.phone && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.phone}</p>}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-sm">call</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-high p-6 border-t border-primary/20 mt-12">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <div className="font-headline text-[10px] uppercase tracking-[0.2em] text-primary mb-1">Contract Execution Fee</div>
                  <div className="text-3xl font-headline font-black text-on-surface">₹{AMOUNT}.00 <span className="text-sm font-normal text-outline-variant">INR</span></div>
                </div>
                <div className="text-right">
                  <div className="font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/40">Encryption Type</div>
                  <div className="font-headline text-xs font-medium">AES-256_BIT</div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-5 bg-primary text-on-primary font-headline font-black text-xl tracking-[0.2em] uppercase transition-all hover:bg-primary-container active:scale-[0.98] shadow-[0_0_20px_rgba(255,180,168,0.2)] flex items-center justify-center gap-4"
              >
                ENROLL_AGENT
                <span className="material-symbols-outlined">keyboard_double_arrow_right</span>
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
