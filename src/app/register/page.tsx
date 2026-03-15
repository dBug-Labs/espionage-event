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

  const AMOUNT = 60;

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

  async function handleSubmit() {
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

  const inp = (field: string) => ({
    width: '100%' as const,
    background: 'rgba(13,17,23,0.8)',
    border: `1px solid ${errors[field] ? 'var(--spy-red)' : 'var(--border)'}`,
    borderRadius: 8,
    padding: '11px 14px',
    color: 'var(--text-primary)',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    transition: 'all 0.3s ease',
  });

  const lbl = {
    fontSize: 12,
    fontWeight: 500 as const,
    color: 'var(--text-muted)',
    marginBottom: 5,
    display: 'block' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  };

  const errStyle = { color: 'var(--spy-red)', fontSize: 11, marginTop: 3 };

  function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = 'var(--spy-green)';
    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,255,65,0.08)';
  }
  function focusOut(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>, field: string) {
    e.currentTarget.style.borderColor = errors[field] ? 'var(--spy-red)' : 'rgba(0,255,65,0.12)';
    e.currentTarget.style.boxShadow = 'none';
  }

  // Submitting overlay
  if (step === 'submitting') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
        <div style={{ width: 60, height: 60, border: '4px solid rgba(0,255,65,0.15)', borderTop: '4px solid var(--spy-green)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p className="font-display" style={{ fontSize: 22, color: 'var(--spy-green)' }}>
          Processing Enrollment…
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Do not close this tab, Agent.</p>
      </div>
    );
  }

  // QR Payment Step
  if (step === 'qr-payment') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="glass-card" style={{ maxWidth: 450, width: '100%', padding: '40px 30px', textAlign: 'center', position: 'relative' }}>
          <button onClick={() => setStep('form')} style={{ position: 'absolute', top: 20, left: 20, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>← Back</button>

          <h2 className="font-display" style={{ fontSize: 24, color: 'var(--spy-green)', marginBottom: 10, letterSpacing: 2 }}>SCAN & PAY</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 30 }}>Complete payment to confirm your enrollment.</p>

          <div style={{ background: '#fff', padding: 10, borderRadius: 12, display: 'inline-block', marginBottom: 30, boxShadow: '0 0 30px rgba(0,255,65,0.15)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/qr-code.jpeg" alt="Payment QR Code" style={{ width: 220, height: 220, display: 'block' }} />
          </div>

          <div style={{ textAlign: 'left', marginBottom: 30 }}>
            <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 15, textAlign: 'center' }}>
              Total Amount: <span style={{ color: 'var(--spy-green)', fontSize: 20, fontFamily: "'JetBrains Mono', monospace" }}>₹{AMOUNT}</span>
            </p>

            <label style={lbl}>Transaction ID / UTR *</label>
            <input
              style={inp('transactionId')}
              placeholder="Enter 12-digit UTR number"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              onFocus={focusIn}
              onBlur={(e) => focusOut(e, 'transactionId')}
            />
            {errors.transactionId && <p style={errStyle}>{errors.transactionId}</p>}
          </div>

          <button
            className="btn-spy"
            style={{ width: '100%', padding: '15px' }}
            onClick={handleFinalSubmit}
            disabled={loading}
          >
            <span>{loading ? 'Submitting…' : '✅ Confirm Enrollment'}</span>
          </button>

          <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 15 }}>
            Your registration will be verified by the admin. You&apos;ll receive a confirmation email once approved.
          </p>
        </div>
      </div>
    );
  }

  // Registration Form
  return (
    <div style={{ minHeight: '100vh', width: '100%', background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 40%, #0a0f0a 100%)', position: 'relative', overflowX: 'hidden' }}>
      {/* Background decorations */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,65,0.04), transparent 70%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.03), transparent 70%)', filter: 'blur(80px)' }} />
        {/* Side accent lines */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, background: 'linear-gradient(180deg, transparent, rgba(0,255,65,0.2) 20%, rgba(0,255,65,0.2) 80%, transparent)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 2, background: 'linear-gradient(180deg, transparent, rgba(0,255,65,0.2) 20%, rgba(0,255,65,0.2) 80%, transparent)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '32px 16px 60px' }}>
        {/* Header */}
        <div style={{ maxWidth: 520, margin: '0 auto 36px', textAlign: 'center' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13, marginBottom: 28 }}>
            ← Back to Mission Briefing
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,255,65,0.3))' }} />
            <span style={{ background: 'linear-gradient(135deg, #003311, #001a0a)', border: '1px solid rgba(0,255,65,0.3)', borderRadius: 999, padding: '6px 20px', fontSize: 11, fontWeight: 600, color: 'var(--spy-green)', letterSpacing: 2.5, textTransform: 'uppercase' as const }}>
              🕵️ Agent Enrollment
            </span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(0,255,65,0.3), transparent)' }} />
          </div>

          <h1 className="font-display" style={{ fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: 2 }}>
            <span className="text-spy-gradient">RECRUIT</span> REGISTRATION
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Espionage &nbsp;•&nbsp; DBUG
          </p>
        </div>

        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Agent Details */}
          <div
            className="spy-card"
            style={{ padding: 26, position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, var(--spy-green), rgba(0,255,65,0.2))' }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--spy-green)', marginBottom: 20, letterSpacing: 0.5, paddingLeft: 8 }}>
              🕵️ Agent Details
            </h2>
            <div style={{ paddingLeft: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Full Name *</label>
                <input
                  style={inp('name')}
                  placeholder="Agent Name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  onFocus={focusIn}
                  onBlur={(e) => focusOut(e, 'name')}
                />
                {errors.name && <p style={errStyle}>{errors.name}</p>}
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Personal Email *</label>
                <input
                  style={inp('email')}
                  placeholder="agent@gmail.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  onFocus={focusIn}
                  onBlur={(e) => focusOut(e, 'email')}
                />
                {errors.email && <p style={errStyle}>{errors.email}</p>}
              </div>

              <div>
                <label style={lbl}>College Email *</label>
                <input
                  style={inp('collegeEmail')}
                  placeholder="ab1234@srmist.edu.in"
                  type="email"
                  value={form.collegeEmail}
                  onChange={(e) => setForm((p) => ({ ...p, collegeEmail: e.target.value }))}
                  onFocus={focusIn}
                  onBlur={(e) => focusOut(e, 'collegeEmail')}
                />
                {errors.collegeEmail && <p style={errStyle}>{errors.collegeEmail}</p>}
              </div>

              <div>
                <label style={lbl}>Registration No. *</label>
                <input
                  style={inp('regNo')}
                  placeholder="RA2XXXXXXXXX"
                  value={form.regNo}
                  onChange={(e) => setForm((p) => ({ ...p, regNo: e.target.value }))}
                  onFocus={focusIn}
                  onBlur={(e) => focusOut(e, 'regNo')}
                />
                {errors.regNo && <p style={errStyle}>{errors.regNo}</p>}
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Mobile Number *</label>
                <input
                  style={inp('phone')}
                  placeholder="9876543210"
                  value={form.phone}
                  maxLength={10}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                  onFocus={focusIn}
                  onBlur={(e) => focusOut(e, 'phone')}
                />
                {errors.phone && <p style={errStyle}>{errors.phone}</p>}
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(0,51,17,0.3) 0%, rgba(13,17,23,0.95) 100%)',
              border: '1px solid rgba(0,255,65,0.3)',
              borderRadius: 16,
              padding: 32,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 20px 50px -15px rgba(0,255,65,0.1)',
            }}
          >
            <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'radial-gradient(circle at top right, rgba(0,255,65,0.06), transparent)', borderRadius: '0 16px 0 0' }} />

            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--spy-green)', marginBottom: 18, letterSpacing: 1 }}>
              💳 Enrollment Fee
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 6 }}>
                  Individual Registration
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--spy-green)' }}>✓</span> Secure QR Payment
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, letterSpacing: 1 }}>TOTAL</p>
                <p className="font-display" style={{ fontSize: 44, fontWeight: 900, color: 'var(--spy-green)', lineHeight: 1 }}>
                  ₹{AMOUNT}
                </p>
              </div>
            </div>

            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,255,65,0.3), transparent)', marginBottom: 20 }} />

            <button
              className="btn-spy"
              style={{ width: '100%', padding: '15px', fontSize: 17, borderRadius: 10, letterSpacing: 0.5 }}
              onClick={handleSubmit}
              disabled={loading}
              id="proceed-to-payment-btn"
            >
              <span>{loading ? 'Processing…' : `🔐 Proceed to Payment — ₹${AMOUNT}`}</span>
            </button>
            <p style={{ color: 'var(--text-dim)', fontSize: 11, textAlign: 'center', marginTop: 10 }}>
              By proceeding, you agree to the event rules. All registrations are final.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
