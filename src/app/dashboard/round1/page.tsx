'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';

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

  // Anti-cheat: block copy/paste/right-click
  useEffect(() => {
    if (!started || submitted) return;
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('copy', prevent);
    document.addEventListener('paste', prevent);
    document.addEventListener('contextmenu', prevent);
    return () => {
      document.removeEventListener('copy', prevent);
      document.removeEventListener('paste', prevent);
      document.removeEventListener('contextmenu', prevent);
    };
  }, [started, submitted]);

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

  // ── Result screen ──
  if (submitted && result) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎯</div>
        <h1 className="font-display" style={{ fontSize: 32, color: 'var(--spy-green)', marginBottom: 12, letterSpacing: 3 }}>
          INTEL TEST COMPLETE
        </h1>
        <div
          style={{
            background: 'rgba(0,255,65,0.05)',
            border: '2px solid rgba(0,255,65,0.3)',
            borderRadius: 16,
            padding: 32,
            marginBottom: 24,
          }}
        >
          <p className="font-display" style={{ fontSize: 56, color: 'var(--spy-green)', fontWeight: 900 }}>
            {result.score}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
            {result.correct} / {result.total} correct
          </p>
          {warnings > 0 && (
            <p style={{ color: 'var(--spy-amber)', fontSize: 12, marginTop: 8 }}>
              ⚠️ {warnings} warning{warnings > 1 ? 's' : ''} received
            </p>
          )}
        </div>
        <button className="btn-spy" onClick={() => router.push('/dashboard')} style={{ padding: '12px 32px' }}>
          <span>← Return to Dashboard</span>
        </button>
      </div>
    );
  }

  // ── Loading / Error ──
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid rgba(0,255,65,0.15)', borderTop: '3px solid var(--spy-green)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'var(--text-muted)' }}>Decrypting questions…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>🚫</p>
        <p style={{ color: 'var(--spy-red)', fontSize: 16, marginBottom: 20 }}>{error}</p>
        <button className="btn-spy" onClick={() => router.push('/dashboard')} style={{ padding: '12px 24px' }}>
          <span>← Back to Dashboard</span>
        </button>
      </div>
    );
  }

  // ── Pre-start screen ──
  if (!started) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🧠</div>
        <h1 className="font-display" style={{ fontSize: 28, color: 'var(--spy-green)', marginBottom: 12, letterSpacing: 3 }}>
          ROUND 1: INTEL TEST
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 32, lineHeight: 1.7 }}>
          {questions.length} questions • One-time submission • No going back
        </p>

        <div className="spy-card" style={{ padding: 24, marginBottom: 28, textAlign: 'left' }}>
          <h3 style={{ color: 'var(--spy-amber)', fontSize: 14, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>⚠️ RULES OF ENGAGEMENT</h3>
          <ul style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 2, listStyle: 'none', padding: 0 }}>
            <li>🔒 Fullscreen mode is <strong style={{ color: 'var(--text-primary)' }}>mandatory</strong></li>
            <li>🚫 No tab switching, no copy-paste, no right-click</li>
            <li>⚠️ You get <strong style={{ color: 'var(--spy-amber)' }}>3 warnings max</strong> — then auto-submit</li>
            <li>📝 One-time submission — choose wisely</li>
          </ul>
        </div>

        <button className="btn-spy animate-pulse-green" style={{ padding: '16px 48px', fontSize: 18 }} onClick={handleStart}>
          <span>🎯 Enter Fullscreen & Start</span>
        </button>
      </div>
    );
  }

  // ── MCQ Interface ──
  const q = questions[currentQ];
  const progress = Object.keys(answers).length;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px', userSelect: 'none' }}>
      {/* Warning overlay */}
      {showWarning && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            padding: '16px 24px',
            background: 'rgba(255,0,60,0.9)',
            color: '#fff',
            textAlign: 'center',
            fontSize: 16,
            fontWeight: 700,
            zIndex: 9999,
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          {warningMessage}
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span className="font-display" style={{ color: 'var(--spy-green)', fontSize: 14, letterSpacing: 2 }}>INTEL TEST</span>
          <span style={{ color: 'var(--text-dim)', fontSize: 13, marginLeft: 12 }}>
            Q {currentQ + 1} / {questions.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="font-mono" style={{ fontSize: 12, color: warnings > 0 ? 'var(--spy-red)' : 'var(--text-dim)' }}>
            ⚠️ {warnings}/{MAX_WARNINGS}
          </span>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--spy-green)' }}>
            ✅ {progress}/{questions.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', height: 4, background: 'rgba(0,255,65,0.1)', borderRadius: 2, marginBottom: 28 }}>
        <div style={{ width: `${((currentQ + 1) / questions.length) * 100}%`, height: '100%', background: 'var(--spy-green)', borderRadius: 2, transition: 'width 0.3s' }} />
      </div>

      {/* Question card */}
      {q && (
        <div className="spy-card" style={{ padding: 32, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--spy-cyan)', background: 'rgba(0,229,255,0.1)', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(0,229,255,0.2)' }}>
              {q.category.toUpperCase()}
            </span>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--spy-green)' }}>
              {q.points} pt{q.points > 1 ? 's' : ''}
            </span>
          </div>

          <h2 style={{ fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 24, fontWeight: 500 }}>
            {q.questionText}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {q.options.map((opt, i) => {
              const selected = answers[q._id] === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q._id]: i }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 18px',
                    background: selected ? 'rgba(0,255,65,0.08)' : 'rgba(13,17,23,0.6)',
                    border: `1px solid ${selected ? 'rgba(0,255,65,0.4)' : 'var(--border)'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    color: selected ? 'var(--spy-green)' : 'var(--text-primary)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 14,
                  }}
                >
                  <span
                    className="font-mono"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      background: selected ? 'var(--spy-green)' : 'rgba(255,255,255,0.05)',
                      color: selected ? '#000' : 'var(--text-muted)',
                      border: `1px solid ${selected ? 'var(--spy-green)' : 'rgba(255,255,255,0.1)'}`,
                      flexShrink: 0,
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button
          onClick={() => setCurrentQ((c) => Math.max(0, c - 1))}
          disabled={currentQ === 0}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            color: currentQ === 0 ? 'var(--text-dim)' : 'var(--text-primary)',
            padding: '10px 20px',
            borderRadius: 8,
            cursor: currentQ === 0 ? 'not-allowed' : 'pointer',
            fontSize: 14,
          }}
        >
          ← Previous
        </button>

        {currentQ < questions.length - 1 ? (
          <button
            onClick={() => setCurrentQ((c) => Math.min(questions.length - 1, c + 1))}
            className="btn-spy"
            style={{ padding: '10px 24px', fontSize: 14 }}
          >
            <span>Next →</span>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="btn-classified"
            style={{ padding: '10px 24px', fontSize: 14 }}
          >
            <span>🚀 Submit All Answers</span>
          </button>
        )}
      </div>

      {/* Question navigator dots */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 24, justifyContent: 'center' }}>
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentQ(i)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: i === currentQ ? '2px solid var(--spy-green)' : '1px solid var(--border)',
              background: answers[questions[i]._id] !== undefined ? 'rgba(0,255,65,0.15)' : 'transparent',
              color: i === currentQ ? 'var(--spy-green)' : answers[questions[i]._id] !== undefined ? 'var(--spy-green)' : 'var(--text-dim)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
