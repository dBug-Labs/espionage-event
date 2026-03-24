'use client';

import Link from 'next/link';
import Image from 'next/image';

import { useState, useEffect } from 'react';

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['mission', 'operations', 'intelligence', 'rules'];
      let current = '';
      for (const s of sections) {
        const el = document.getElementById(s);
        if (el && window.scrollY >= el.offsetTop - 150) {
          current = s;
        }
      }
      setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <div className="fixed inset-0 scanlines z-50 pointer-events-none opacity-20"></div>
      
      <nav className="bg-[#131313] border-b border-white/10 flex justify-between items-center w-full px-6 py-4 sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logog.png" alt="dBug Labs" width={32} height={32} className="object-contain" />
          <div className="flex flex-col">
            <div className="text-2xl font-black text-red-600 tracking-tighter uppercase font-headline leading-none">ESPIONAGE</div>
            <div className="text-[10px] text-gray-400 font-headline uppercase tracking-widest leading-none mt-1">by dBug Labs</div>
          </div>
        </Link>
        <div className="hidden md:flex gap-8 items-center font-headline uppercase tracking-widest text-sm">
          <a className={activeSection === 'mission' ? "text-red-500 border-b-2 border-red-600 pb-1" : "text-gray-400 hover:text-red-400 transition-colors"} href="#mission">Mission Briefing</a>
          <a className={activeSection === 'operations' ? "text-red-500 border-b-2 border-red-600 pb-1" : "text-gray-400 hover:text-red-400 transition-colors"} href="#operations">Operations</a>
          <a className={activeSection === 'intelligence' ? "text-red-500 border-b-2 border-red-600 pb-1" : "text-gray-400 hover:text-red-400 transition-colors"} href="#intelligence">Intelligence Flow</a>
          <a className={activeSection === 'rules' ? "text-red-500 border-b-2 border-red-600 pb-1" : "text-gray-400 hover:text-red-400 transition-colors"} href="#rules">Rules</a>
        </div>
        <Link href="/register">
          <button className="bg-primary text-on-primary px-6 py-2 font-headline uppercase font-bold tracking-widest hover:brightness-125 transition-all active:scale-95 glow-red">
            Join Mission
          </button>
        </Link>
      </nav>

      <main className="tactical-grid">
        <section className="relative min-h-[921px] flex flex-col items-center justify-center text-center px-4 overflow-hidden border-b border-outline-variant/20">
          <div className="absolute inset-0 z-0">
            <img 
              className="w-full h-full object-cover opacity-30 grayscale contrast-125" 
              alt="Background" 
              src="/images/landing-bg.jpg" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-surface/80"></div>
          </div>
          
          <div className="relative z-10 max-w-5xl">
            <div className="inline-block border border-secondary text-secondary px-4 py-1 mb-6 font-label uppercase tracking-[0.3em] text-xs">
              Terminal Access: Authorized
            </div>
            <h1 className="text-7xl md:text-9xl font-headline font-black text-primary tracking-tighter mb-4 filter drop-shadow-[0_0_20px_rgba(255,85,64,0.4)]">
              ESPIONAGE
            </h1>
            <p className="text-xl md:text-3xl font-headline font-light text-on-surface uppercase tracking-[0.5em] mb-12">
              <i>DECRYPT. DEPLOY. DOMINATE.</i>
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link href="/register" className="px-10 py-4 bg-primary text-on-primary font-headline font-bold uppercase tracking-widest text-lg glow-red hover:bg-primary-container transition-all">
                Join the Mission
              </Link>
              <Link href="/login" className="px-10 py-4 border border-outline-variant text-on-surface font-headline font-bold uppercase tracking-widest text-lg backdrop-blur-sm bg-white/5">
                LOGIN
              </Link>
            </div>
          </div>
          
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="font-label text-[10px] uppercase tracking-widest text-secondary">Decrypting Data</span>
            <div className="w-px h-12 bg-gradient-to-b from-secondary to-transparent"></div>
          </div>
        </section>

        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto" id="mission">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative p-8 bg-surface-container-lowest border border-outline-variant/20">
              <div className="bracket-tl"></div><div className="bracket-br"></div>
              <h2 className="font-headline text-4xl font-bold text-primary uppercase tracking-tighter mb-8">Mission Briefing</h2>
              <div className="space-y-6 text-on-surface-variant font-body leading-relaxed text-lg">
                <p>Welcome, Agent. You are entering a theatre of digital warfare where code is the only currency and logic is your primary weapon.</p>
                <p><span className="text-secondary font-bold uppercase">The Objective:</span> Espionage is a high-stakes technical competition designed to push your programming prowess to the brink.</p>
                <p>Navigate through a series of encrypted challenges involving advanced debugging, complex algorithms, and rapid-fire problem solving. Every keystroke is monitored.</p>
                <div className="p-4 bg-surface-container-high border-l-4 border-secondary">
                  <span className="text-secondary font-headline font-bold block mb-1">REAL-TIME SURVEILLANCE:</span>
                  Agents will earn points on a <span className="text-on-surface">Live Leaderboard</span>. Speed and precision are non-negotiable.
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-high p-6 flex flex-col gap-4 border border-outline-variant/10">
                <span className="material-symbols-outlined text-primary text-4xl">terminal</span>
                <h3 className="font-headline font-bold uppercase text-sm tracking-widest">Logic &amp; Code</h3>
              </div>
              <div className="bg-surface-container-high p-6 flex flex-col gap-4 border border-outline-variant/10">
                <span className="material-symbols-outlined text-secondary text-4xl">bug_report</span>
                <h3 className="font-headline font-bold uppercase text-sm tracking-widest">Debug Protocol</h3>
              </div>
              <div className="bg-surface-container-high p-6 flex flex-col gap-4 border border-outline-variant/10">
                <span className="material-symbols-outlined text-primary text-4xl">vpn_key</span>
                <h3 className="font-headline font-bold uppercase text-sm tracking-widest">Decryption</h3>
              </div>
              <div className="bg-surface-container-high p-6 flex flex-col gap-4 border border-outline-variant/10">
                <span className="material-symbols-outlined text-secondary text-4xl">leaderboard</span>
                <h3 className="font-headline font-bold uppercase text-sm tracking-widest">Live Intel</h3>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-surface-container-lowest border-y border-outline-variant/20 relative overflow-hidden" id="operations">
          <div className="absolute right-0 top-0 opacity-5 font-black text-[20rem] font-headline select-none pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <h2 className="font-headline text-5xl font-black text-on-surface uppercase tracking-tighter mb-16 text-center">Operations Schedule</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-outline-variant/20">
              <div className="bg-surface p-8 group hover:bg-surface-container-high transition-all">
                <div className="text-secondary font-headline font-bold text-2xl mb-4">09:00 AM</div>
                <h4 className="font-headline font-bold text-lg text-primary uppercase mb-2">Mission Briefing</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">Opening Ceremony &amp; Student Check-In. Authentication of all agents required.</p>
              </div>
              <div className="bg-surface p-8 group hover:bg-surface-container-high transition-all">
                <div className="text-secondary font-headline font-bold text-2xl mb-4">11:00 AM</div>
                <h4 className="font-headline font-bold text-lg text-primary uppercase mb-2">Round 1 – Bug Breach</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">MCQ Assessment. 45 Minutes of high-intensity debugging logic.</p>
              </div>
              <div className="bg-surface p-8 group hover:bg-surface-container-high transition-all">
                <div className="text-secondary font-headline font-bold text-2xl mb-4">12:00 PM</div>
                <h4 className="font-headline font-bold text-lg text-primary uppercase mb-2">Bonus – Code Charades</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">A physical-technical hybrid game for extra clearance points.</p>
              </div>
              <div className="bg-surface p-8 group hover:bg-surface-container-high transition-all">
                <div className="text-secondary font-headline font-bold text-2xl mb-4">01:00 PM</div>
                <h4 className="font-headline font-bold text-lg text-primary uppercase mb-2">Intelligence Intermission</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">Lunch Break. Reviewing preliminary leaderboard standings.</p>
              </div>
              <div className="bg-surface p-8 group hover:bg-surface-container-high transition-all">
                <div className="text-secondary font-headline font-bold text-2xl mb-4">02:00 PM</div>
                <h4 className="font-headline font-bold text-lg text-primary uppercase mb-2">Round 2 – Operation Blackout</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">The Core Challenge. 90 minutes of intensive Code Decryption.</p>
              </div>
              <div className="bg-surface p-8 group hover:bg-surface-container-high transition-all">
                <div className="text-secondary font-headline font-bold text-2xl mb-4">03:30 PM</div>
                <h4 className="font-headline font-bold text-lg text-primary uppercase mb-2">Bonus – Decode the Message</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">Final opportunity for signal encryption points.</p>
              </div>
              <div className="bg-surface p-8 lg:col-span-2 flex items-center justify-between border-t border-outline-variant/20 md:border-t-0">
                <div>
                  <div className="text-secondary font-headline font-bold text-2xl mb-4">CLOSING</div>
                  <h4 className="font-headline font-bold text-3xl text-primary uppercase mb-2">Celebration Gala</h4>
                  <p className="text-on-surface-variant">Prize Distribution and closing ceremony.</p>
                </div>
                <span className="material-symbols-outlined text-secondary text-6xl hidden sm:block">celebration</span>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto" id="intelligence">
          <h2 className="font-headline text-4xl font-bold text-on-surface uppercase tracking-[0.2em] mb-12 flex items-center gap-4">
            <span className="w-12 h-px bg-primary"></span> Intel Channels
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-surface-container-low border border-outline-variant/20 p-8 relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 font-headline text-outline-variant/20 text-6xl font-black">01</div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-primary">security</span>
                  <span className="text-primary font-headline font-bold tracking-widest text-sm uppercase">Priority Level: Medium</span>
                </div>
                <h3 className="text-3xl font-headline font-bold text-on-surface mb-6 uppercase">Round 1: Bug Breach</h3>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-sm mt-1">arrow_forward</span>
                    <span className="text-on-surface-variant">30 Multiple Choice Intelligence Questions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-sm mt-1">arrow_forward</span>
                    <span className="text-on-surface-variant">Core programming basics &amp; syntax patterns</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-sm mt-1">arrow_forward</span>
                    <span className="text-on-surface-variant">Advanced logical reasoning &amp; sequence analysis</span>
                  </li>
                </ul>
                <div className="pt-6 border-t border-outline-variant/10 text-xs font-label uppercase tracking-widest text-secondary">
                  Duration: 45 Minutes // Format: Terminal MCQ
                </div>
              </div>
            </div>
            <div className="bg-surface-container-low border border-outline-variant/20 p-8 relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 font-headline text-outline-variant/20 text-6xl font-black">02</div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-red-600" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                  <span className="text-red-600 font-headline font-bold tracking-widest text-sm uppercase">Priority Level: Critical</span>
                </div>
                <h3 className="text-3xl font-headline font-bold text-on-surface mb-6 uppercase">Round 2: Operation Blackout</h3>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-sm mt-1">arrow_forward</span>
                    <span className="text-on-surface-variant">5 Complex Coding Intelligence Problems</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-sm mt-1">arrow_forward</span>
                    <span className="text-on-surface-variant">Data structures, algorithms &amp; tactical efficiency</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-sm mt-1">arrow_forward</span>
                    <span className="text-on-surface-variant">Scenario-based spy-themed technical challenges</span>
                  </li>
                </ul>
                <div className="pt-6 border-t border-outline-variant/10 text-xs font-label uppercase tracking-widest text-red-600">
                  Duration: 90 Minutes // Format: Full Access IDE
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 md:px-12 max-w-4xl mx-auto" id="rules">
          <div className="bg-surface-container border-2 border-outline-variant/20 p-12 relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-8 py-2 bg-red-600 text-on-primary font-headline font-black uppercase tracking-[0.4em] shadow-xl">
              CLASSIFIED
            </div>
            <h2 className="font-headline text-3xl font-bold text-center mb-12 uppercase tracking-widest text-on-surface">Engagement Protocols</h2>
            <div className="space-y-8">
              <div className="flex gap-6">
                <span className="text-secondary font-headline font-bold text-xl">01</span>
                <div>
                  <h4 className="font-headline font-bold uppercase text-primary mb-2">Platform Exclusive</h4>
                  <p className="text-on-surface-variant text-sm">All operations must be executed strictly on the official ESPIONAGE intelligence platform.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <span className="text-secondary font-headline font-bold text-xl">02</span>
                <div>
                  <h4 className="font-headline font-bold uppercase text-primary mb-2">No Signal Leakage</h4>
                  <p className="text-on-surface-variant text-sm">Any form of malpractice, including external aid or unauthorized communication, results in immediate extraction (disqualification).</p>
                </div>
              </div>
              <div className="flex gap-6">
                <span className="text-secondary font-headline font-bold text-xl">03</span>
                <div>
                  <h4 className="font-headline font-bold uppercase text-primary mb-2">Temporal Constraints</h4>
                  <p className="text-on-surface-variant text-sm">Submissions are timer-based. The terminal automatically locks upon expiration of the allocated briefing time.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-surface">
          <div className="max-w-7xl mx-auto border-t border-outline-variant/20 pt-16 grid md:grid-cols-2 gap-12 text-center">
            <div>
              <span className="text-secondary font-label uppercase tracking-widest text-xs block mb-2">High Command</span>
              <h3 className="font-headline text-2xl font-bold text-on-surface uppercase">Dr. Arun A</h3>
            </div>
            <div>
              <span className="text-secondary font-label uppercase tracking-widest text-xs block mb-2">Operations Lead</span>
              <h3 className="font-headline text-2xl font-bold text-on-surface uppercase">Gauri Kishor</h3>
            </div>
            <div>
              <span className="text-secondary font-label uppercase tracking-widest text-xs block mb-2">Co-Operations Lead</span>
              <h3 className="font-headline text-2xl font-bold text-on-surface uppercase">Drishti Yadav</h3>
            </div>
            <div>
              <span className="text-secondary font-label uppercase tracking-widest text-xs block mb-2">TECH OPS LEAD</span>
              <h3 className="font-headline text-2xl font-bold text-on-surface uppercase">Shaurya Ojha</h3>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full px-8 py-12 flex flex-col items-center gap-6 border-t border-white/5 bg-[#0e0e0e]">
        <div className="text-lg font-bold text-red-600 font-headline uppercase tracking-tighter">ESPIONAGE</div>
        
        <div className="font-body text-[10px] uppercase tracking-[0.2em] text-gray-500 text-center">
          © 2026 CLASSIFIED DIRECTIVE // SRM UNIVERSITY // NWC ASSOCIATION // DBUG LABS
        </div>
      </footer>
    </>
  );
}
