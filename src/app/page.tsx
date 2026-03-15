'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const NAV_LINKS = [
  { label: 'Experience', href: '#experience' },
  { label: 'Spotlight', href: '#spotlight' },
  { label: 'Rules', href: '#rules' },
  { label: 'Timeline', href: '#timeline' },
];

const EVENT_START = new Date('2026-03-25T09:00:00+05:30').getTime();

const SPOTLIGHT_ZONES = [
  {
    icon: '⭐',
    zone: 'Rising Star Zone',
    subtitle: 'Early Pattern Winners',
    patterns: ['First Five', 'Corners', 'Unlucky'],
    rewards: ['Stickers', 'Phone Stands', 'Small Desk Utilities', 'Light Stationery'],
    powerCards: [
      { name: 'Scene Change', desc: 'Swap the current question with the next unlocked one.' },
      { name: 'Insight Spark', desc: 'Get a small hint for one case-study question.' },
    ],
    color: 'from-yellow-900/40 to-yellow-800/10',
    border: 'border-yellow-600/30',
    accent: '#FFD700',
  },
  {
    icon: '🌟',
    zone: 'Celebrity Lane',
    subtitle: 'Line Pattern Winners',
    patterns: ['Top Line', 'Middle Line', 'Bottom Line'],
    rewards: ['Bottles', 'Mugs', 'LED Desk Décor', 'Medium Stationery Kits'],
    powerCards: [
      { name: 'Oracle Access', desc: 'Use ChatGPT for 1–2 minutes.' },
      { name: 'Tech Whisper', desc: 'Ask one clarification question to the tech team.' },
      { name: 'Clean Slate Pass', desc: 'Skip one question without penalty.' },
    ],
    color: 'from-amber-900/40 to-amber-800/10',
    border: 'border-amber-500/30',
    accent: '#f59e0b',
  },
  {
    icon: '🏆',
    zone: 'Hall of Fame Deck',
    subtitle: 'Full House Winners',
    patterns: ['Full House Winner 1', 'Full House Winner 2', 'Full House Winner 3'],
    rewards: ['💰 Cash Prize', 'Red Carpet Walk', 'Trophy'],
    powerCards: [],
    color: 'from-red-900/40 to-red-800/10',
    border: 'border-red-500/40',
    accent: '#ef4444',
  },
];

const RULES = [
  { num: '01', title: 'Team Formation', desc: 'Form a team of 2–3 participants. Entry fee: ₹50 per participant.' },
  { num: '02', title: 'Ticket & Portal', desc: 'Each team gets a hard-copy tambola ticket + a unique portal access code.' },
  { num: '03', title: 'Number Draws', desc: 'Tokens are drawn every 2–2.5 minutes. Each number unlocks a case-study question on the portal.' },
  { num: '04', title: 'Solve & Claim', desc: 'Solve the questions linked to your ticket numbers. A claim is only valid if all linked questions are answered correctly.' },
  { num: '05', title: 'Valid Patterns', desc: 'First Five • Corners • Unlucky • Top Line • Middle Line • Bottom Line • Full House (3 winners).' },
  { num: '06', title: 'Red Carpet Dress Code', desc: 'Red carpet attire is mandatory. Come dressed to impress — you\'re a star.' },
];

const TIMELINE = [
  { time: '9:00 AM', title: 'Student Reporting', desc: 'Registration desk • Ticket distribution • Portal login • Red Carpet photo entry' },
  { time: '10:00 AM', title: 'Opening Ceremony', desc: 'Welcome speech • Rules explanation • Portal demo • Spotlight Lane intro (15 min)' },
  { time: '10:15 AM', title: 'Game Begins 🎯', desc: 'Token drawn every 2–2.5 min • Questions unlock instantly • Claims verified continuously' },
  { time: '1:15 PM', title: 'Break', desc: 'Refreshments • Red Carpet photos (30 min)' },
  { time: '1:45 PM', title: 'Stage Performance', desc: 'Cultural performance • Entertainment • Photography & announcements (30 min)' },
  { time: '2:15 PM', title: 'Game Resumes', desc: 'Final token draws • Line and Full House patterns • Verification continues' },
  { time: 'Closing', title: 'Closing Ceremony', desc: 'Full House winners • Red Carpet walk • Organising Team Ramp Walk • Final photos' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = EVENT_START - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }

      setTimeLeft({
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Particle effect
  useEffect(() => {
    const canvas = document.getElementById('particles') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${p.opacity})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div style={{ background: 'var(--bg-dark)', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      {/* Navbar */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '16px clamp(20px, 4vw, 48px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: scrolled ? 'rgba(10,10,10,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,215,0,0.1)' : 'none',
          transition: 'all 0.4s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sqac-logo.png" alt="SQAC" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                color: 'var(--text-muted)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: 1,
                transition: 'color 0.3s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              {l.label}
            </a>
          ))}
          <Link href="/register">
            <button className="btn-red" style={{ padding: '10px 24px', fontSize: 14 }}>
              <span>Register Now</span>
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        ref={heroRef}
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden', // Ensures background elements don't cause scroll
          padding: '140px 20px 80px', // Adjusted to 20px for mobile safe area
        }}
      >
        {/* Red Carpet Background Image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/red-carpet.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 80%', // Focus on the carpet
            opacity: 0.85,
            pointerEvents: 'none',
          }}
        />
        {/* Dark vignette overlay for text readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.9) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Background particles */}
        <canvas
          id="particles"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        />
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '-10%', // Move off-screen slightly but prevent overall page overflow
            width: 'clamp(300px, 50vw, 400px)',
            height: 'clamp(300px, 50vw, 400px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,0,0,0.15), transparent)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            right: '-10%',
            width: 'clamp(250px, 40vw, 350px)',
            height: 'clamp(250px, 40vw, 350px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,215,0,0.08), transparent)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        {/* Red carpet strip decoration */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, transparent, #8B0000, #FFD700, #8B0000, transparent)',
          }}
        />

        <div style={{ textAlign: 'center', width: '100%', maxWidth: 1000, position: 'relative', zIndex: 1 }}>
          {/* Badge with Logo */}
          <div
            className="animate-fadeInUp text-gold-gradient"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 16,
              fontSize: 'clamp(14px, 2vw, 18px)',
              fontWeight: 600,
              letterSpacing: 2,
              fontFamily: 'Playfair Display, serif',
              textTransform: 'uppercase',
            }}
          >
            <span>🎬</span>
            <span>SQAC PRESENTS</span>
          </div>

          {/* Main title */}
          <h1
            className="font-display animate-fadeInUp"
            style={{
              fontSize: 'clamp(52px, 8vw, 110px)',
              fontWeight: 900,
              lineHeight: 1.0,
              marginBottom: 16,
              animationDelay: '0.1s',
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <span className="text-gold-gradient">HOUSIE</span>
            <br />
            <span style={{ color: 'var(--text-primary)' }}>OF FAME</span>
          </h1>

          <div className="rc-divider animate-fadeInUp" style={{ width: 200, marginBottom: 24, animationDelay: '0.2s' }} />

          <p
            className="animate-fadeInUp"
            style={{
              fontSize: 'clamp(16px, 2.5vw, 22px)',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              fontFamily: 'Playfair Display',
              marginBottom: 40,
              animationDelay: '0.3s',
            }}
          >
            Where every number tells a story!
          </p>

          {/* Countdown Timer */}
          <div
            className="animate-fadeInUp"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'clamp(12px, 3vw, 24px)',
              marginBottom: 48,
              animationDelay: '0.45s',
            }}
          >
            {[
              { label: 'Days', value: timeLeft.d },
              { label: 'Hours', value: timeLeft.h },
              { label: 'Mins', value: timeLeft.m },
              { label: 'Secs', value: timeLeft.s },
            ].map((unit, i) => (
              <div key={unit.label} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    background: 'linear-gradient(145deg, rgba(80,0,0,0.4), rgba(20,5,5,0.8))',
                    border: '1px solid rgba(255,215,0,0.2)',
                    borderRadius: 12,
                    width: 'clamp(60px, 12vw, 80px)',
                    height: 'clamp(65px, 13vw, 85px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                  }}
                >
                  <span className="font-display" style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {unit.value.toString().padStart(2, '0')}
                  </span>
                </div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--gold)' }}>
                  {unit.label}
                </span>
              </div>
            ))}
          </div>

          {/* Event info pills */}
          <div
            className="animate-fadeInUp"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 'clamp(12px, 3vw, 24px)',
              marginBottom: 56,
              animationDelay: '0.3s',
              fontFamily: 'Playfair Display, serif',
            }}
          >
            {/* Left Block */}
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="text-gold-gradient" style={{ fontSize: 'clamp(12px, 2vw, 16px)', letterSpacing: 1.5, fontWeight: 600 }}>WED. 09:00 AM</span>
              <span className="text-gold-gradient" style={{ fontSize: 'clamp(12px, 2vw, 16px)', letterSpacing: 1.5, fontWeight: 600, opacity: 0.9 }}>TP-2 | 702</span>
            </div>

            {/* Center Date Block */}
            <div
              style={{
                borderLeft: '1px solid rgba(255,215,0,0.4)',
                borderRight: '1px solid rgba(255,215,0,0.4)',
                padding: '0 clamp(12px, 3vw, 24px)',
              }}
            >
              <span className="text-gold-gradient" style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700, letterSpacing: 2 }}>
                25/03
              </span>
            </div>

            {/* Right Block */}
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="text-gold-gradient" style={{ fontSize: 'clamp(12px, 2vw, 16px)', letterSpacing: 1.5, fontWeight: 600 }}>₹ 50 PER PERSON</span>
              <span className="text-gold-gradient" style={{ fontSize: 'clamp(12px, 2vw, 16px)', letterSpacing: 1.5, fontWeight: 600, opacity: 0.9 }}>2-3 MEMBERS</span>
            </div>
          </div>

          {/* CTA */}
          <div
            className="animate-fadeInUp animate-float"
            style={{ display: 'inline-block', animationDelay: '0.5s' }}
          >
            <Link href="/register">
              <button
                className="btn-red animate-glow"
                style={{ padding: '18px 56px', fontSize: 18, borderRadius: 12, letterSpacing: 1 }}
              >
                <span>🎟️ Register Your Team</span>
              </button>
            </Link>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 16 }}>
            Limited spots available • Dress to impress
          </p>
        </div>
      </section>

      <section id="experience" style={{ padding: '80px 20px', position: 'relative', background: 'linear-gradient(180deg, var(--bg-dark) 0%, #1a0505 100%)' }}>
        {/* Glow orb */}
        <div style={{ position: 'absolute', top: '20%', right: '-10%', width: 'clamp(300px, 50vw, 500px)', height: 'clamp(300px, 50vw, 500px)', background: 'radial-gradient(circle, rgba(139,0,0,0.15), transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: 'var(--gold)', fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>The Experience</p>
            <h2 className="font-display" style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, color: 'var(--text-primary)' }}>
              Not Your Average <span className="text-gold-gradient">Housie</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { icon: '🧠', title: 'Case-Study Questions', desc: 'Every number drawn unlocks a medium-level practical case-study question. It\'s housie meets real-world problem solving.' },
              { icon: '🎬', title: 'Red Carpet Glamour', desc: 'Paparazzi-style entry, stage performances, ramp walk for winners — this isn\'t just a quiz, it\'s an event.' },
              { icon: '⚡', title: 'Power Cards', desc: 'Use special power cards to gain advantages — get hints, skip questions, or even access ChatGPT for 2 minutes.' },
              { icon: '🏆', title: 'Spotlight Lane', desc: 'Three prize zones — Rising Star, Celebrity Lane, and the Hall of Fame Deck with cash prizes.' },
            ].map((item) => (
              <div
                key={item.title}
                className="glass-card"
                style={{ padding: 32, transition: 'transform 0.3s, border-color 0.3s', background: 'linear-gradient(145deg, rgba(30,10,10,0.95), rgba(15,5,5,0.95))', border: '1px solid rgba(255,215,0,0.1)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.borderColor = 'rgba(255,215,0,0.4)';
                  e.currentTarget.style.boxShadow = '0 10px 40px -10px rgba(139,0,0,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255,215,0,0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 16 }}>{item.icon}</div>
                <h3 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 12 }}>{item.title}</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: 15 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="spotlight" style={{ padding: '80px 20px', position: 'relative', background: 'linear-gradient(180deg, #1a0505 0%, #240000 50%, #1a0505 100%)' }}>
        {/* Glow orb */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '80%', background: 'radial-gradient(ellipse, rgba(255,215,0,0.05), transparent 60%)', filter: 'blur(100px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: 'var(--gold)', fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>Prizes & Rewards</p>
            <h2 className="font-display" style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, color: 'var(--text-primary)' }}>
              The <span className="text-gold-gradient">Spotlight Lane</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 16, fontSize: 16 }}>Three zones. Three levels of glory.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}>
            {SPOTLIGHT_ZONES.map((zone) => (
              <div
                key={zone.zone}
                style={{
                  background: `linear-gradient(135deg, ${zone.zone === 'Rising Star Zone'
                    ? 'rgba(120,100,0,0.2), rgba(10,10,10,0.8)'
                    : zone.zone === 'Celebrity Lane'
                      ? 'rgba(80,0,120,0.2), rgba(10,10,10,0.8)'
                      : 'rgba(120,0,0,0.25), rgba(10,10,10,0.8)'
                    })`,
                  border: `1px solid ${zone.accent}30`,
                  borderRadius: 20,
                  padding: 32,
                  transition: 'transform 0.3s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-6px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>{zone.icon}</div>
                <h3 className="font-display" style={{ fontSize: 24, fontWeight: 700, color: zone.accent, marginBottom: 4 }}>{zone.zone}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, letterSpacing: 1, marginBottom: 20 }}>{zone.subtitle}</p>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: zone.accent, marginBottom: 8 }}>Patterns</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {zone.patterns.map((p) => (
                      <span
                        key={p}
                        style={{
                          background: `${zone.accent}18`,
                          border: `1px solid ${zone.accent}40`,
                          borderRadius: 999,
                          padding: '4px 12px',
                          fontSize: 12,
                          color: zone.accent,
                          fontWeight: 500,
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: zone.accent, marginBottom: 8 }}>Rewards</p>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {zone.rewards.map((r) => (
                      <li key={r} style={{ fontSize: 14, color: 'var(--text-primary)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: zone.accent }}>✦</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {zone.powerCards.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: zone.accent, marginBottom: 8 }}>Power Cards</p>
                    {zone.powerCards.map((pc) => (
                      <div key={pc.name} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>⚡ {pc.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pc.desc}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="rules" style={{ padding: '80px 20px', position: 'relative', background: 'linear-gradient(180deg, #1a0505 0%, var(--bg-dark) 100%)' }}>
        {/* Glow orb */}
        <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: 'clamp(300px, 50vw, 400px)', height: 'clamp(300px, 50vw, 400px)', background: 'radial-gradient(circle, rgba(139,0,0,0.12), transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: 'var(--gold)', fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>How It Works</p>
            <h2 className="font-display" style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, color: 'var(--text-primary)' }}>
              Game <span className="text-gold-gradient">Rules</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            {RULES.map((rule) => (
              <div
                key={rule.num}
                className="glass-card"
                style={{
                  padding: '24px 28px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 24,
                  transition: 'all 0.3s',
                  background: 'linear-gradient(90deg, rgba(30,5,5,0.8), rgba(20,20,20,0.8))',
                  border: '1px solid rgba(139,0,0,0.3)',
                  borderLeft: '4px solid var(--red-dark)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,215,0,0.4)';
                  e.currentTarget.style.borderLeftColor = 'var(--gold)';
                  e.currentTarget.style.transform = 'translateX(6px)';
                  e.currentTarget.style.background = 'linear-gradient(90deg, rgba(40,10,10,0.9), rgba(20,20,20,0.9))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(139,0,0,0.3)';
                  e.currentTarget.style.borderLeftColor = 'var(--red-dark)';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.background = 'linear-gradient(90deg, rgba(30,5,5,0.8), rgba(20,20,20,0.8))';
                }}
              >
                <span
                  className="font-display"
                  style={{ fontSize: 36, fontWeight: 900, color: 'rgba(255,215,0,0.2)', lineHeight: 1, minWidth: 48 }}
                >
                  {rule.num}
                </span>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{rule.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="timeline" style={{ padding: '80px 20px', position: 'relative', background: 'linear-gradient(180deg, var(--bg-dark) 0%, #1a0505 100%)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: 'var(--gold)', fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>Schedule</p>
            <h2 className="font-display" style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, color: 'var(--text-primary)' }}>
              Event <span className="text-gold-gradient">Timeline</span>
            </h2>
          </div>
          <div style={{ position: 'relative' }}>
            {/* Vertical line */}
            <div
              style={{
                position: 'absolute',
                left: 72,
                top: 0,
                bottom: 0,
                width: 2,
                background: 'linear-gradient(180deg, var(--gold), #8B0000, transparent)',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {TIMELINE.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 56, textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                      {item.time}
                    </span>
                  </div>
                  {/* Dot */}
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: i === 2 ? 'var(--gold)' : 'var(--red-dark)',
                      border: '2px solid var(--gold)',
                      marginTop: 2,
                      flexShrink: 0,
                      boxShadow: i === 2 ? '0 0 12px rgba(255,215,0,0.5)' : 'none',
                    }}
                  />
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {item.title}
                    </h4>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '100px 20px', textAlign: 'center', position: 'relative', background: 'radial-gradient(circle at center, #300000 0%, #100000 60%, var(--bg-dark) 100%)', borderTop: '1px solid rgba(255,215,0,0.1)' }}>
        {/* Decorative carpet strips */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: 'linear-gradient(180deg, transparent, var(--gold), #8B0000, transparent)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, background: 'linear-gradient(180deg, transparent, var(--gold), #8B0000, transparent)' }} />
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 className="font-display" style={{ fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 900, marginBottom: 20 }}>
            Your Number <span className="text-gold-gradient">Awaits</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 18, marginBottom: 40, lineHeight: 1.7 }}>
            Step onto the red carpet. Solve the questions. Claim your glory.
            <br />The spotlight is ready — are you?
          </p>
          <Link href="/register">
            <button
              className="btn-red animate-glow"
              style={{ padding: '20px 64px', fontSize: 20, borderRadius: 12, letterSpacing: 1 }}
            >
              <span>🎟️ Register Now — ₹50/member</span>
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255,215,0,0.1)',
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <p className="font-display" style={{ fontSize: 20, color: 'var(--gold)', marginBottom: 8, letterSpacing: 2 }}>
          HOUSIE OF FAME
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Organized by <strong style={{ color: 'var(--text-primary)' }}>SQAC</strong> • © 2026 Housie of Fame
          <br /><span style={{ opacity: 0.5, marginTop: 4, display: 'block' }}>All rights reserved for superstars.</span>
        </p>
      </footer>
    </div>
  );
}
