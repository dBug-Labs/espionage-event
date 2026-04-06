'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface RSVPResult {
  success?: boolean;
  alreadyConfirmed?: boolean;
  requiresConfirmation?: boolean;
  message?: string;
  error?: string;
  capReached?: boolean;
  participantId?: string;
  name?: string;
  teamType?: string;
  partnerName?: string;
}

function RSVPContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<RSVPResult | null>(null);

  useEffect(() => {
    if (!token) {
      setResult({ error: 'No RSVP token provided.' });
      setLoading(false);
      return;
    }

    const tokenValue = token;

    async function loadRSVPPreview() {
      try {
        const res = await fetch(`/api/rsvp?token=${encodeURIComponent(tokenValue)}`);
        const data = await res.json();
        setResult(data);
      } catch {
        setResult({ error: 'Network error. Please try again.' });
      } finally {
        setLoading(false);
      }
    }

    loadRSVPPreview();
  }, [token]);

  async function handleConfirm() {
    if (!token) return;

    setConfirming(true);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: 'Network error. Please try again.' });
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center flex-col gap-6 terminal-bg">
        <div className="fixed inset-0 scanline opacity-20 pointer-events-none"></div>
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="font-headline text-2xl text-primary font-bold tracking-widest uppercase">
          LOADING RSVP...
        </p>
        <p className="text-on-surface-variant text-sm font-label tracking-widest uppercase">Verifying your access token.</p>
      </div>
    );
  }

  if (result?.success && result.requiresConfirmation) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6 terminal-bg relative">
        <div className="fixed inset-0 scanline opacity-10 pointer-events-none z-0"></div>
        <div className="relative z-10 w-full max-w-lg">
          <div className="bg-surface-container-low p-8 md:p-12 border border-outline-variant/30 shadow-[0_0_30px_rgba(255,85,64,0.05)] text-center">
            <div className="w-20 h-20 bg-primary/10 border border-primary/30 flex items-center justify-center mb-6 mx-auto shadow-[0_0_20px_rgba(255,85,64,0.2)]">
              <span className="material-symbols-outlined text-primary text-5xl">mark_email_read</span>
            </div>

            <h1 className="font-headline text-3xl md:text-4xl font-black uppercase tracking-tighter text-on-surface mb-2">
              CONFIRM <span className="text-primary">RSVP</span>
            </h1>

            <p className="text-secondary font-headline text-[10px] md:text-xs tracking-widest uppercase mb-8">
              {result.message}
            </p>

            {result.participantId && (
              <div className="border border-primary/20 bg-primary/5 p-6 mb-8">
                <p className="font-headline text-[10px] tracking-[0.2em] uppercase text-primary mb-2 opacity-80">Team ID</p>
                <p className="font-headline text-3xl md:text-4xl font-black text-primary tracking-[0.2em] glow-red">
                  {result.participantId}
                </p>
                {result.name && (
                  <p className="text-on-surface font-headline tracking-widest uppercase mt-3 text-sm font-bold">{result.name}</p>
                )}
                {result.teamType === 'duo' && result.partnerName && (
                  <p className="text-on-surface-variant font-headline tracking-widest uppercase mt-1 text-xs">&amp; {result.partnerName}</p>
                )}
              </div>
            )}

            <div className="bg-surface-container-highest border border-outline-variant/30 p-4 mb-6 text-left">
              <p className="font-headline text-[10px] tracking-widest uppercase text-primary mb-2">Before you continue</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                This action locks your team into the RSVP queue. Seats are limited, so confirm only if your team is attending.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full px-8 py-3 bg-primary text-on-primary font-headline font-black uppercase tracking-widest text-sm hover:bg-primary-container transition-all disabled:cursor-not-allowed disabled:opacity-60"
              >
                {confirming ? 'CONFIRMING...' : 'CONFIRM MY RSVP'}
              </button>

              <Link href="/">
                <button className="px-8 py-3 bg-surface-container-high border border-outline-variant text-on-surface font-headline font-bold uppercase tracking-widest text-sm hover:border-primary transition-all flex items-center gap-2 mx-auto">
                  <span className="material-symbols-outlined text-sm">home</span>
                  RETURN TO BASE
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6 terminal-bg relative">
        <div className="fixed inset-0 scanline opacity-10 pointer-events-none z-0"></div>
        <div className="relative z-10 w-full max-w-lg">
          <div className="bg-surface-container-low p-8 md:p-12 border border-outline-variant/30 shadow-[0_0_30px_rgba(255,85,64,0.05)] text-center">
            <div className="w-20 h-20 bg-primary/10 border border-primary/30 flex items-center justify-center mb-6 mx-auto shadow-[0_0_20px_rgba(255,85,64,0.2)]">
              <span className="material-symbols-outlined text-primary text-5xl">check_circle</span>
            </div>

            <h1 className="font-headline text-3xl md:text-4xl font-black uppercase tracking-tighter text-on-surface mb-2">
              RSVP <span className="text-primary">{result.alreadyConfirmed ? 'ALREADY CONFIRMED' : 'CONFIRMED'}</span>
            </h1>

            <p className="text-secondary font-headline text-[10px] md:text-xs tracking-widest uppercase mb-8">
              {result.message}
            </p>

            {result.participantId && (
              <div className="border border-primary/20 bg-primary/5 p-6 mb-8">
                <p className="font-headline text-[10px] tracking-[0.2em] uppercase text-primary mb-2 opacity-80">Team ID</p>
                <p className="font-headline text-3xl md:text-4xl font-black text-primary tracking-[0.2em] glow-red">
                  {result.participantId}
                </p>
                {result.name && (
                  <p className="text-on-surface font-headline tracking-widest uppercase mt-3 text-sm font-bold">{result.name}</p>
                )}
                {result.teamType === 'duo' && result.partnerName && (
                  <p className="text-on-surface-variant font-headline tracking-widest uppercase mt-1 text-xs">&amp; {result.partnerName}</p>
                )}
              </div>
            )}

            <div className="bg-surface-container-highest border border-outline-variant/30 p-4 mb-6 text-left">
              <p className="font-headline text-[10px] tracking-widest uppercase text-primary mb-2">What happens next</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                You will receive an email with your attendance QR code, venue details, and dashboard login shortly.
              </p>
            </div>

            <Link href="/">
              <button className="px-8 py-3 bg-surface-container-high border border-outline-variant text-on-surface font-headline font-bold uppercase tracking-widest text-sm hover:border-primary transition-all flex items-center gap-2 mx-auto">
                <span className="material-symbols-outlined text-sm">home</span>
                RETURN TO BASE
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 terminal-bg relative">
      <div className="fixed inset-0 scanline opacity-10 pointer-events-none z-0"></div>
      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-surface-container-low p-8 md:p-12 border border-outline-variant/30 shadow-[0_0_30px_rgba(255,85,64,0.05)] text-center">
          <div className="w-20 h-20 bg-error/10 border border-error/30 flex items-center justify-center mb-6 mx-auto">
            <span className="material-symbols-outlined text-error text-5xl">
              {result?.capReached ? 'group_off' : 'error'}
            </span>
          </div>

          <h1 className="font-headline text-3xl font-black uppercase tracking-tighter text-on-surface mb-4">
            {result?.capReached ? (
              <>RSVP <span className="text-error">CLOSED</span></>
            ) : (
              <>RSVP <span className="text-error">FAILED</span></>
            )}
          </h1>

          <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
            {result?.error || 'Something went wrong. Please try again.'}
          </p>

          <Link href="/">
            <button className="px-8 py-3 bg-surface-container-high border border-outline-variant text-on-surface font-headline font-bold uppercase tracking-widest text-sm hover:border-primary transition-all flex items-center gap-2 mx-auto">
              <span className="material-symbols-outlined text-sm">home</span>
              RETURN TO BASE
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RSVPPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center flex-col gap-6 terminal-bg">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="font-headline text-2xl text-primary font-bold tracking-widest uppercase">Loading...</p>
        </div>
      }
    >
      <RSVPContent />
    </Suspense>
  );
}
