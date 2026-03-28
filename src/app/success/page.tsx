'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface RegistrationData {
  participantId: string;
  name: string;
  email: string;
  teamType: 'solo' | 'duo';
  partnerName?: string;
}

export default function SuccessPage() {
  const [data, setData] = useState<RegistrationData | null>(null);
  const [confettiDone, setConfettiDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const whatsappLink = process.env.NEXT_PUBLIC_WHATSAPP_LINK || '#';

  useEffect(() => {
    const raw = sessionStorage.getItem('espionage_registration');
    if (raw) {
      try {
        setData(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
  }, []);

  // Confetti effect
  useEffect(() => {
    if (!data) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = ['#ff5540', '#ff0000', '#ffb4aa', '#ffffff', '#ff8a00', '#cc0000'];
    const pieces: {
      x: number; y: number; w: number; h: number;
      color: string; vx: number; vy: number; rotation: number; spin: number;
    }[] = [];

    for (let i = 0; i < 150; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 300,
        w: Math.random() * 12 + 6,
        h: Math.random() * 6 + 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 4 + 2,
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 10,
      });
    }

    let frame = 0;
    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.y += p.vy;
        p.x += p.vx;
        p.rotation += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      frame++;
      if (frame < 180) animId = requestAnimationFrame(animate);
      else setConfettiDone(true);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, [data]);

  if (!data) {
    return (
      <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-hidden terminal-bg min-h-screen relative flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-6xl mb-4 text-secondary">error</span>
        <h1 className="font-headline text-3xl text-on-surface mb-3 uppercase tracking-widest font-bold">NO REGISTRATION FOUND</h1>
        <p className="text-on-surface-variant mb-8 text-sm">
          This page shows your confirmation after registration.
        </p>
        <Link href="/">
          <button className="px-8 py-3 bg-surface-container-high border border-outline-variant text-on-surface font-headline font-bold uppercase tracking-widest text-sm hover:border-primary transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            RETURN TO BASE
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-hidden terminal-bg relative min-h-screen flex items-center justify-center p-6">
      {!confettiDone && (
        <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />
      )}
      
      <div className="fixed inset-0 scanline opacity-10 pointer-events-none z-0"></div>

      <div className="relative z-10 w-full max-w-2xl mt-12 mb-12">
        <div className="bg-surface-container-low p-8 md:p-12 relative border border-outline-variant/30 shadow-[0_0_30px_rgba(255,85,64,0.05)]">
          <div className="absolute top-0 right-0 p-4 font-headline text-[10px] text-outline-variant uppercase tracking-widest">
            Ref: SUCCESS-PROTOCOL
          </div>
          
          <div className="mb-10 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-primary/10 border border-primary/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,85,64,0.2)]">
              <span className="material-symbols-outlined text-primary text-5xl">verified_user</span>
            </div>
            <h1 className="font-headline text-3xl md:text-5xl font-black uppercase tracking-tighter text-on-surface mb-2">
              MISSION <span className="text-primary">ACCEPTED</span>
            </h1>
            <p className="text-secondary font-headline text-[10px] md:text-xs tracking-widest uppercase">
              Registration recorded. Confirmation email sent!
            </p>
            <div className="h-px w-3/4 bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-8"></div>
          </div>

          <div className="border border-primary/20 bg-primary/5 p-8 text-center mb-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="font-headline text-[10px] tracking-[0.2em] uppercase text-primary mb-2 opacity-80">Assigned Team ID</p>
            <p className="font-headline text-4xl md:text-6xl font-black text-primary tracking-[0.2em] relative z-10 glow-red">
              {data.participantId}
            </p>
            <p className="text-on-surface font-headline tracking-widest uppercase mt-4 text-sm font-bold">{data.name}</p>
            {data.teamType === 'duo' && data.partnerName && (
              <p className="text-on-surface-variant font-headline tracking-widest uppercase mt-1 text-xs">& {data.partnerName}</p>
            )}
            <div className="mt-3 inline-block bg-primary/10 border border-primary/20 text-primary px-3 py-1 font-headline text-[10px] tracking-widest uppercase">
              {data.teamType === 'duo' ? 'DUO ENTRY' : 'SOLO ENTRY'}
            </div>
          </div>

          <div className="space-y-6 mb-10">
            <div className="border border-outline-variant/30 bg-surface-container-highest p-6 relative">
              <h3 className="font-headline text-[10px] uppercase tracking-[0.2em] text-secondary mb-4 absolute -top-2 left-4 bg-surface-container-highest px-2">
                What&apos;s Next
              </h3>
              <div className="space-y-4 mt-2">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">check_circle</span>
                  <span className="text-sm text-on-surface-variant">Confirmation email sent to your inbox</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary text-sm mt-0.5">schedule</span>
                  <span className="text-sm text-on-surface-variant">Await RSVP email before the event to confirm your spot</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary text-sm mt-0.5">qr_code</span>
                  <span className="text-sm text-on-surface-variant">After RSVP, you&apos;ll receive your attendance QR code + dashboard access</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low border border-outline-variant p-4 flex items-start gap-4 shadow-inner">
              <span className="material-symbols-outlined text-primary text-2xl mt-1 hidden sm:block">screenshot</span>
              <div>
                <p className="font-headline font-bold text-xs md:text-sm tracking-widest text-on-surface uppercase mb-1">Save This Intel</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Take a screenshot of your Team ID. Join the WhatsApp group for real-time updates!
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-4 bg-[#25D366] text-white font-headline font-black text-xs md:text-sm tracking-[0.2em] uppercase transition-all hover:bg-[#128C7E] active:scale-[0.98] shadow-[0_0_20px_rgba(37,211,102,0.2)] flex justify-center items-center gap-3"
            >
              <span className="material-symbols-outlined text-lg md:text-xl">forum</span>
              JOIN MISSION COMMS
            </a>
            
            <Link href="/" className="flex-1 py-4 bg-surface-container-higher border border-outline-variant text-on-surface font-headline font-bold text-xs md:text-sm tracking-[0.2em] uppercase transition-all hover:border-primary hover:text-primary active:scale-[0.98] flex justify-center items-center gap-2">
              <span className="material-symbols-outlined text-lg">home</span>
              RETURN TO BASE
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
