'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { isShortcutBlocked } from '@/lib/round2';

interface Question {
  _id: string;
  questionText: string;
  options: string[];
  category: string;
  points: number;
}

const MAX_WARNINGS = 3;

export default function Round1Page() {
  const router = useRouter();
  const session = getSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(null);
  const [warnings, setWarnings] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [started, setStarted] = useState(false);
  const warningsRef = useRef(0);

  // Fetch questions
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch(`/api/round1/questions?email=${encodeURIComponent(session?.email || '')}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load questions.');
          return;
        }
        setQuestions(data.questions || []);
      } catch {
        setError('Network error. Please refresh.');
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, [session?.email]);

  // Auto-submit function
  const autoSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitted(true);
    try {
      const answerArray = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      }));
      const res = await fetch('/api/round1/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.email,
          answers: answerArray,
          warnings: warningsRef.current,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ score: data.score, correct: data.correct, total: data.total });
      }
    } catch {
      // silent fail — already submitted
    }
    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [submitted, answers, session?.email]);

  // Trigger warning
  const triggerWarning = useCallback((message: string) => {
    const newCount = warningsRef.current + 1;
    warningsRef.current = newCount;
    setWarnings(newCount);
    setWarningMessage(`⚠️ WARNING ${newCount}/${MAX_WARNINGS}: ${message}`);
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 3000);

    if (newCount >= MAX_WARNINGS) {
      autoSubmit();
    }
  }, [autoSubmit]);

  // Anti-cheat: visibility change (tab switch)
  useEffect(() => {
    if (!started || submitted) return;
    const handleVisibility = () => {
      if (document.hidden) {
        triggerWarning('Tab switch detected! Do not leave this page.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [started, submitted, triggerWarning]);

  // Anti-cheat: fullscreen change
  useEffect(() => {
    if (!started || submitted) return;
    const handleFsChange = () => {
      const inFs = !!document.fullscreenElement;
      setIsFullscreen(inFs);
      if (!inFs && started && !submitted) {
        triggerWarning('Fullscreen exited! Return to fullscreen immediately.');
        // Re-request fullscreen
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [started, submitted, triggerWarning]);

  // Anti-cheat: block copy/paste/right-click/shortcuts
  useEffect(() => {
    if (!started || submitted) return;
    const prevent = (e: Event) => e.preventDefault();
    const handleKeydown = (e: KeyboardEvent) => {
      if (isShortcutBlocked(e)) {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning('Shortcut keys are disabled during the test!');
      }
    };
    document.addEventListener('copy', prevent);
    document.addEventListener('paste', prevent);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('keydown', handleKeydown, true);
    return () => {
      document.removeEventListener('copy', prevent);
      document.removeEventListener('paste', prevent);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('keydown', handleKeydown, true);
    };
  }, [started, submitted, triggerWarning]);

  // Enter fullscreen and start
  async function handleStart() {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setStarted(true);
    } catch {
      alert('Fullscreen is required to start the test. Please allow fullscreen access.');
    }
  }

  // Manual submit
  async function handleSubmit() {
    if (!confirm('Are you sure you want to submit? This cannot be undone.')) return;
    await autoSubmit();
  }

  // Common wrapper class
  const wrapperClass = "bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-hidden terminal-bg relative min-h-screen";

  // ── Result screen ──
  if (submitted && result) {
    return (
      <div className={wrapperClass + " flex items-center justify-center p-6"}>
        <div className="fixed inset-0 scanline opacity-10 pointer-events-none z-0"></div>
        <div className="relative z-10 w-full max-w-2xl bg-surface-container-low p-8 md:p-12 border border-primary/30 shadow-[0_0_30px_rgba(255,85,64,0.05)] text-center">
          <span className="material-symbols-outlined text-primary text-6xl mb-6">flag</span>
          <h1 className="font-headline text-3xl md:text-5xl font-black uppercase tracking-tighter text-on-surface mb-2">
            INTEL TEST <span className="text-primary glow-red">COMPLETE</span>
          </h1>
          <div className="h-px w-3/4 mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-6 mb-10"></div>
          
          <div className="border border-primary/20 bg-primary/5 p-8 text-center mb-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="font-headline text-[10px] tracking-[0.2em] uppercase text-primary mb-2 opacity-80">Final Score Assessment</p>
            <p className="font-headline text-6xl md:text-8xl font-black text-primary tracking-[0.1em] relative z-10 glow-red">
              {result.score}
            </p>
            <p className="text-on-surface font-headline tracking-widest uppercase mt-6 text-sm">
              {result.correct} / {result.total} Correct Signatures
            </p>
          </div>

          {warnings > 0 && (
            <div className="bg-error/10 border border-error/30 text-error p-4 mb-8 font-headline text-xs tracking-widest uppercase flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              {warnings} Security Warning{warnings > 1 ? 's' : ''} Received
            </div>
          )}

          <button className="px-8 py-4 bg-surface-container-higher border border-outline-variant text-on-surface font-headline font-bold text-sm tracking-[0.2em] uppercase transition-all hover:border-primary hover:text-primary active:scale-[0.98] flex justify-center items-center gap-2 mx-auto" onClick={() => router.push('/dashboard')}>
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            RETURN TO DASHBOARD
          </button>
        </div>
      </div>
    );
  }

  // ── Loading / Error ──
  if (loading) {
    return (
      <div className={wrapperClass + " flex items-center justify-center"}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-6 shadow-[0_0_15px_rgba(255,85,64,0.3)]" />
          <p className="font-headline text-primary tracking-[0.2em] uppercase text-xs animate-pulse">Decrypting Questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={wrapperClass + " flex items-center justify-center p-6 text-center"}>
        <div className="bg-surface-container-low p-8 border border-error/30 max-w-md w-full">
          <span className="material-symbols-outlined text-error text-5xl mb-4">block</span>
          <p className="font-headline text-error text-sm tracking-widest uppercase mb-6">{error}</p>
          <button className="px-8 py-3 bg-error/10 text-error border border-error/50 font-headline text-sm tracking-widest uppercase hover:bg-error hover:text-on-error transition-all" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Pre-start screen ──
  if (!started) {
    return (
      <div className={wrapperClass + " flex items-center justify-center p-6"}>
        <div className="fixed inset-0 scanline opacity-10 pointer-events-none z-0"></div>
        <div className="relative z-10 w-full max-w-2xl bg-surface-container-low p-8 md:p-12 border border-outline-variant/30 shadow-[0_0_30px_rgba(255,85,64,0.05)] text-center">
          <div className="absolute top-0 right-0 p-4 font-headline text-[10px] text-outline-variant uppercase tracking-widest">
            Ref: R1-PROTOCOL
          </div>
          
          <span className="material-symbols-outlined text-primary text-5xl mb-6">psychology</span>
          <h1 className="font-headline text-3xl md:text-5xl font-black uppercase tracking-tighter text-on-surface mb-2">
            ROUND 1: BUG BREACH
          </h1>
          <p className="text-secondary font-headline text-xs tracking-[0.2em] uppercase mb-8">
            {questions.length} questions • One-time submission • No going back
          </p>
          
          <div className="bg-surface-container-highest border border-error/30 p-6 mb-10 text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-error"></div>
            <h3 className="font-headline text-xs text-error font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">gavel</span>
              RULES OF ENGAGEMENT
            </h3>
            <ul className="text-on-surface-variant text-sm font-body space-y-3 pl-2">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">lock</span>
                <span>Fullscreen mode is <strong className="text-on-surface font-bold">mandatory</strong>. Exiting triggers a warning.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">block</span>
                <span>No tab switching, no copy-paste, no right-click, no keyboard shortcuts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-error mt-0.5">warning</span>
                <span>You get <strong className="text-error font-bold">3 warnings max</strong> before automatic submission.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">done_all</span>
                <span>One-time submission only. Select carefully.</span>
              </li>
            </ul>
          </div>

          <button className="w-full py-5 bg-primary text-on-primary font-headline font-black text-lg tracking-[0.2em] uppercase transition-all hover:bg-primary-container active:scale-[0.98] shadow-[0_0_20px_rgba(255,85,64,0.3)] flex justify-center items-center gap-3 animate-pulse" onClick={handleStart}>
            <span className="material-symbols-outlined">fullscreen</span>
            ENTER FULLSCREEN & START
          </button>
        </div>
      </div>
    );
  }

  // ── MCQ Interface ──
  const q = questions[currentQ];
  const progress = Object.keys(answers).length;

  return (
    <div className={wrapperClass + " pt-8 pb-32 px-4 md:px-8 select-none"}>
      {/* Warning overlay */}
      {showWarning && (
        <div className="fixed inset-0 bg-error/90 z-[9999] flex items-center justify-center animate-[pulse_0.5s_ease-in-out_infinite] backdrop-blur-sm">
          <div className="bg-[#111] border-2 border-error p-10 max-w-xl w-full text-center shadow-[0_0_100px_rgba(255,0,0,0.5)]">
            <span className="material-symbols-outlined text-error text-7xl mb-6">warning</span>
            <h2 className="font-headline text-3xl font-black text-error uppercase tracking-widest mb-4">SECURITY ALERT</h2>
            <p className="text-on-surface font-mono text-lg">{warningMessage}</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-surface-container-low border border-outline-variant/30 p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 font-headline text-[10px] tracking-widest uppercase hidden md:block">
              LIVE OPERATION
            </div>
            <span className="font-headline text-on-surface text-sm uppercase tracking-widest font-bold">
              Q {currentQ + 1} / {questions.length}
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-sm">warning</span>
              <span className="font-headline text-[10px] tracking-widest uppercase text-error">
                Warnings: {warnings}/{MAX_WARNINGS}
              </span>
            </div>
            <div className="h-4 w-px bg-outline-variant/30 hidden md:block"></div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
              <span className="font-headline text-[10px] tracking-widest uppercase text-primary">
                Progress: {progress}/{questions.length}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-surface-container-highest mb-10 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_10px_rgba(255,85,64,0.5)]" 
            style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        {q && (
          <div className="bg-surface-container-high border border-outline-variant/50 p-6 md:p-10 mb-8 relative">
            <div className="absolute top-0 right-0 py-1 px-3 bg-surface-container-highest border-b border-l border-outline-variant/50 flex items-center gap-4">
              <span className="font-headline text-[10px] uppercase tracking-widest text-secondary">{q.category}</span>
              <span className="font-headline text-[10px] uppercase tracking-widest text-primary font-bold">{q.points} PT{q.points > 1 ? 'S' : ''}</span>
            </div>

            <h2 className="text-lg md:text-xl font-body text-on-surface leading-loose mb-10 mt-4">
              {q.questionText}
            </h2>

            <div className="space-y-4">
              {q.options.map((opt, i) => {
                const selected = answers[q._id] === i;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q._id]: i }))}
                    className={`w-full flex items-center gap-4 p-4 md:p-5 text-left border transition-all ${selected ? 'bg-primary/5 border-primary shadow-[0_0_15px_rgba(255,85,64,0.1)]' : 'bg-surface-container-low border-outline-variant/30 hover:border-outline-variant hover:bg-surface-container-highest'}`}
                  >
                    <span 
                      className={`w-8 h-8 flex items-center justify-center font-headline text-xs tracking-widest shrink-0 transition-colors ${selected ? 'bg-primary text-on-primary font-bold shadow-[0_0_10px_rgba(255,85,64,0.3)]' : 'bg-surface-container-highest border border-outline-variant text-secondary'}`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className={`font-body text-sm md:text-base leading-relaxed ${selected ? 'text-primary' : 'text-on-surface'}`}>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center bg-[#0e0e0e] border border-outline-variant/20 p-4">
          <button
            onClick={() => setCurrentQ((c) => Math.max(0, c - 1))}
            disabled={currentQ === 0}
            className={`px-6 py-3 font-headline text-xs tracking-widest uppercase border border-outline-variant transition-all flex items-center gap-2 ${currentQ === 0 ? 'opacity-30 cursor-not-allowed text-secondary' : 'text-on-surface hover:bg-surface-container-highest hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
            PREVIOUS
          </button>

          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ((c) => Math.min(questions.length - 1, c + 1))}
              className="px-8 py-3 bg-surface-container-highest border-l-2 border-primary text-primary font-headline font-bold text-xs tracking-widest uppercase hover:bg-primary/10 transition-all flex items-center gap-2"
            >
              NEXT
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-error text-on-error font-headline font-black text-xs tracking-widest uppercase hover:bg-error/90 shadow-[0_0_15px_rgba(255,0,0,0.3)] transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              SUBMIT ALL
            </button>
          )}
        </div>

        {/* Navigator dots */}
        <div className="mt-12 flex flex-wrap gap-2 justify-center">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-8 h-8 flex flex-col items-center justify-center font-headline text-[10px] tracking-widest transition-all ${i === currentQ ? 'bg-transparent border border-primary text-primary shadow-[0_0_10px_rgba(255,85,64,0.2)]' : answers[questions[i]._id] !== undefined ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-surface-container-low border border-outline-variant/30 text-secondary hover:bg-surface-container-highest'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
