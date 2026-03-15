'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface RegistrationData {
  participantId: string;
  name: string;
  email: string;
  amountPaid: number;
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

  // Confetti effect with spy-green colors
  useEffect(() => {
    if (!data) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = ['#00ff41', '#00cc33', '#00e5ff', '#ffffff', '#ffb300', '#003311'];
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <p style={{ fontSize: 60, marginBottom: 16 }}>🔍</p>
        <h1 className="font-display" style={{ fontSize: 32, color: 'var(--text-primary)', marginBottom: 12 }}>No Registration Found</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: 15 }}>
          This page shows your confirmation after registration. If you just registered, this may be a session issue.
        </p>
        <Link href="/">
          <button className="btn-spy"><span>← Back to Base</span></button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', position: 'relative', padding: '48px 16px' }}>
      {!confettiDone && (
        <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }} />
      )}

      {/* Background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,65,0.06), transparent)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.04), transparent)', filter: 'blur(60px)' }} />
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Success header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 80, marginBottom: 16, lineHeight: 1 }}>🕵️</div>
          <h1 className="font-display" style={{ fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: 3 }}>
            <span className="text-spy-gradient">MISSION</span> ACCEPTED
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>
            Enrollment recorded. Payment verification in progress.
          </p>
        </div>

        {/* Participant ID badge */}
        <div
          style={{
            background: 'linear-gradient(135deg, #003311, #001a0a)',
            border: '2px solid rgba(0,255,65,0.4)',
            borderRadius: 20,
            padding: '32px 40px',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          <p style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(0,255,65,0.5)', marginBottom: 8 }}>Agent ID</p>
          <p className="font-display" style={{ fontSize: 48, fontWeight: 900, color: 'var(--spy-green)', letterSpacing: 8, lineHeight: 1 }}>
            {data.participantId}
          </p>
          <p style={{ color: 'rgba(0,255,65,0.6)', marginTop: 8, fontSize: 14 }}>{data.name}</p>
        </div>

        {/* Details card */}
        <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--spy-green)', marginBottom: 12 }}>Agent Intel</h3>
            <div style={{ padding: '12px 16px', background: 'rgba(0,255,65,0.03)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, fontSize: 15 }}>
                {data.name}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.email}</p>
            </div>
          </div>

          <div className="spy-divider" style={{ marginBottom: 20 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Amount Paid</p>
              <p className="font-display" style={{ fontSize: 36, fontWeight: 900, color: 'var(--spy-amber)' }}>₹{data.amountPaid}</p>
            </div>
            <div style={{ background: 'rgba(255,179,0,0.1)', border: '1px solid rgba(255,179,0,0.3)', borderRadius: 999, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--spy-amber)', fontSize: 18 }}>⏳</span>
              <span style={{ color: 'var(--spy-amber)', fontWeight: 600, fontSize: 14 }}>Verification Pending</span>
            </div>
          </div>
        </div>

        {/* Save reminder */}
        <div
          style={{
            background: 'rgba(0,255,65,0.03)',
            border: '1px solid rgba(0,255,65,0.15)',
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 24, flexShrink: 0 }}>📸</span>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 2 }}>Save This Screenshot!</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
              Save your Agent ID <strong style={{ color: 'var(--spy-green)' }}>{data.participantId}</strong>. Once verified, you&apos;ll receive an email with a QR code for event entry.
            </p>
          </div>
        </div>

        {/* WhatsApp CTA */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            color: 'white',
            padding: '18px 32px',
            borderRadius: 12,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 18,
            marginBottom: 24,
            transition: 'transform 0.3s, box-shadow 0.3s',
          }}
        >
          <span style={{ fontSize: 24 }}>📱</span>
          Join Mission WhatsApp Group
        </a>

        <div style={{ textAlign: 'center' }}>
          <Link href="/">
            <button className="btn-gold" style={{ fontSize: 14 }}>← Back to Base</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
