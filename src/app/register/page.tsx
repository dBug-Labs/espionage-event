'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface MemberData {
  name: string;
  email: string;
  collegeEmail: string;
  regNo: string;
  phone: string;
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

    if (teamType === 'duo') {
      if (!partner.name.trim()) errs.partnerName = 'Partner name is required.';
      if (!validateEmail(partner.email)) errs.partnerEmail = 'Enter a valid partner email.';
      if (!validateEmail(partner.collegeEmail)) errs.partnerCollegeEmail = 'Enter a valid partner college email.';
      if (!partner.regNo.trim()) errs.partnerRegNo = 'Partner registration number is required.';
      if (!validatePhone(partner.phone)) errs.partnerPhone = 'Enter a valid partner phone number.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
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
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to submit registration.');
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
                  <input className={inputClass('email')} placeholder="AGENT@SECURE.NET" type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                  {errors.email && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.email}</p>}
                </div>
                <div className="group">
                  <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Command Center (College Email) *</label>
                  <input className={inputClass('collegeEmail')} placeholder="XX1234@SRMIST.EDU.IN" type="email" value={form.collegeEmail} onChange={(e) => setForm(p => ({ ...p, collegeEmail: e.target.value }))} />
                  {errors.collegeEmail && <p className="text-error mt-2 font-headline text-[10px] tracking-widest">{errors.collegeEmail}</p>}
                </div>
                <div className="group">
                  <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Agent ID (Registration No.) *</label>
                  <div className="relative">
                    <input className={inputClass('regNo')} placeholder="RA2XXXXXXXXX" value={form.regNo} onChange={(e) => setForm(p => ({ ...p, regNo: e.target.value.toUpperCase() }))} />
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
                    <input className={inputClass('partnerRegNo')} placeholder="RA2XXXXXXXXX" value={partner.regNo} onChange={(e) => setPartner(p => ({ ...p, regNo: e.target.value.toUpperCase() }))} />
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

            <div className="bg-surface-container-high p-6 border-t border-primary/20 mt-12">
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
