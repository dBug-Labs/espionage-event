'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function OCRegistrationPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    regNo: '',
    role: 'Volunteer',
    password: 'dbug123',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const roles = ['Core', 'Tech', 'Design', 'Logistics', 'Content', 'PR & Marketing', 'Volunteer'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.regNo || !form.role) {
      setMessage('All fields are required.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/admin/organizers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus('success');
        setMessage('OC Registration Successful. Welcome to the shadow division.');
        setForm(prev => ({ ...prev, name: '', email: '', regNo: '', role: 'Volunteer' })); // keep password so they can register multiple
      } else {
        setStatus('error');
        setMessage(data.error || 'Registration failed. Check clearance code.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Check connection details.');
    }
  };

  const inputClass = "w-full bg-surface-container-highest border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 text-on-surface font-headline tracking-widest transition-all px-4 py-3 placeholder:text-outline-variant/40";

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden terminal-bg relative min-h-screen">
      <div className="fixed inset-0 scanline opacity-10 z-0 pointer-events-none"></div>

      <nav className="flex justify-between items-center w-full px-6 py-4 fixed top-0 z-50 bg-[#0e0e0e] border-b border-outline-variant/30">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logog.png" alt="dBug Labs" className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <div className="text-xl font-black text-primary tracking-tighter font-headline leading-none glow-red">ESPIONAGE</div>
            <div className="text-[10px] text-secondary font-headline uppercase tracking-widest leading-none mt-1">by dBug Labs</div>
          </div>
        </Link>
        <div className="hidden md:flex gap-8 items-center">
          <Link href="/admin" className="font-headline uppercase tracking-widest text-sm text-secondary hover:text-primary transition-colors">ADMIN_TERMINAL</Link>
        </div>
      </nav>

      <main className="pt-24 pb-32 min-h-screen px-4 md:px-6 flex items-center justify-center">
        <div className="w-full max-w-2xl bg-surface-container-low p-6 md:p-10 relative z-10 border border-outline-variant/30 shadow-[0_0_40px_rgba(255,85,64,0.05)]">
          
          <div className="absolute top-0 right-0 p-4 font-headline text-[10px] text-outline-variant uppercase tracking-widest">
            Ref: OC-ONBOARD
          </div>

          <div className="mb-10 text-center">
            <span className="material-symbols-outlined text-primary text-5xl mb-4">admin_panel_settings</span>
            <h2 className="font-headline text-2xl md:text-3xl font-black uppercase tracking-tight text-on-surface">
              <span className="text-primary glow-red">ORGANIZER</span>_REGISTRATION
            </h2>
            <div className="h-px w-1/2 mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-4 mb-4"></div>
            <p className="text-secondary font-headline text-xs tracking-widest uppercase">Classified onboarding protocol</p>
          </div>

          {status === 'success' && (
            <div className="mb-8 border px-4 py-4 border-green-500/30 bg-green-500/10 text-center animate-fade-in">
              <div className="font-headline text-xs uppercase tracking-[0.2em] text-green-500 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                {message}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="mb-8 border px-4 py-4 border-error/40 bg-error/10 text-center animate-fade-in">
              <div className="font-headline text-xs uppercase tracking-[0.2em] text-error flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">error</span>
                {message}
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Name */}
              <div className="group col-span-1 md:col-span-2">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Agent Alias (Full Name) *</label>
                <div className="relative">
                  <input 
                    className={inputClass} 
                    placeholder="E.g. John Doe" 
                    value={form.name} 
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} 
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-sm">badge</span>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="group">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Secure Contact (Email) *</label>
                <input
                  className={inputClass}
                  placeholder="AGENT@SECURE.NET"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>

              {/* Reg No */}
              <div className="group">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Agent ID (Reg No) *</label>
                <input 
                  className={inputClass} 
                  placeholder="RA2XXXXXXXXXXX" 
                  value={form.regNo} 
                  onChange={(e) => setForm(p => ({ ...p, regNo: e.target.value.toUpperCase() }))} 
                />
              </div>

              {/* Role */}
              <div className="group col-span-1 md:col-span-2">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-2 block">Protocol Role (Department) *</label>
                <div className="relative">
                  <select 
                    className={`${inputClass} appearance-none bg-surface-container-highest cursor-pointer`}
                    value={form.role}
                    onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}
                  >
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                  </div>
                </div>
              </div>
              
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-4 bg-primary text-on-primary font-headline font-black text-lg tracking-[0.2em] uppercase transition-all hover:bg-primary-container active:scale-[0.98] shadow-[0_0_20px_rgba(255,85,64,0.2)] flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    PROCESSING...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">how_to_reg</span>
                    LOG_ATTENDANCE
                  </>
                )}
              </button>
            </div>
            
          </form>
        </div>
      </main>
    </div>
  );
}
