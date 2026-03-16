'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getStarterCode, isShortcutBlocked } from '@/lib/round2';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface CodingQuestion {
  _id: string;
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  points: number;
  difficulty: string;
  starterTemplates?: { language: string; code: string }[];
}

interface TestResult {
  testCase: number;
  status: string;
  passed: boolean;
}

const MAX_WARNINGS = 3;

export default function Round2Page() {
  const router = useRouter();
  const session = getSession();
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [activeQ, setActiveQ] = useState(0);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [output, setOutput] = useState<{ stdout: string; stderr: string; compile_output: string; status: string } | null>(null);
  const [submitResult, setSubmitResult] = useState<{ verdict: string; passed: number; total: number; results: TestResult[] } | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [started, setStarted] = useState(false);
  const [disqualified, setDisqualified] = useState(false);
  const warningsRef = useRef(0);
  const codeRef = useRef<Record<string, Record<string, string>>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/round2/questions?email=${encodeURIComponent(session?.email || '')}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load.');
          return;
        }
        setQuestions(data.questions || []);
        if (data.questions?.length) {
          setCode(getStarterCode(data.questions[0], language));
        }
      } catch {
        setError('Network error.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session?.email]);

  const triggerWarning = useCallback((message: string) => {
    const nextWarnings = warningsRef.current + 1;
    warningsRef.current = nextWarnings;
    setWarnings(nextWarnings);
    setWarningMessage(`WARNING ${nextWarnings}/${MAX_WARNINGS}: ${message}`);
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 3000);
    if (nextWarnings >= MAX_WARNINGS) {
      setDisqualified(true);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    if (!started || disqualified) return;

    const handleVisibility = () => {
      if (document.hidden) triggerWarning('Tab switch detected.');
    };
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        triggerWarning('Fullscreen exited.');
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (isShortcutBlocked(event)) {
        event.preventDefault();
        event.stopPropagation();
        triggerWarning(`Blocked shortcut: ${event.key}`);
      }
    };
    const prevent = (event: Event) => event.preventDefault();

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('paste', prevent);
    document.addEventListener('keydown', handleKeydown, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('paste', prevent);
      document.removeEventListener('keydown', handleKeydown, true);
    };
  }, [started, disqualified, triggerWarning]);

  async function handleStart() {
    try {
      await document.documentElement.requestFullscreen();
      setStarted(true);
    } catch {
      alert('Fullscreen is required.');
    }
  }

  function switchQuestion(nextIndex: number) {
    const currentQuestion = questions[activeQ];
    if (currentQuestion) {
      codeRef.current[currentQuestion._id] ??= {};
      codeRef.current[currentQuestion._id][language] = code;
    }

    const nextQuestion = questions[nextIndex];
    const saved = codeRef.current[nextQuestion._id]?.[language];
    setCode(saved || getStarterCode(nextQuestion, language));
    setActiveQ(nextIndex);
    setOutput(null);
    setSubmitResult(null);
  }

  function switchLanguage(nextLanguage: string) {
    const currentQuestion = questions[activeQ];
    if (!currentQuestion) return;

    codeRef.current[currentQuestion._id] ??= {};
    codeRef.current[currentQuestion._id][language] = code;

    const saved = codeRef.current[currentQuestion._id]?.[nextLanguage];
    setLanguage(nextLanguage);
    setCode(saved || getStarterCode(currentQuestion, nextLanguage));
  }

  async function handleRun() {
    const question = questions[activeQ];
    if (!question) return;

    setRunning(true);
    setOutput(null);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/round2/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.email, code, language, questionId: question._id }),
      });
      const data = await res.json();
      setOutput(data);
    } catch {
      setOutput({ stdout: '', stderr: 'Execution request failed.', compile_output: '', status: 'Error' });
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    const question = questions[activeQ];
    if (!question) return;
    if (!confirm('Submit this solution? It will be judged on all hidden cases.')) return;

    setSubmitting(true);
    setOutput(null);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/round2/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.email, code, language, questionId: question._id }),
      });
      const data = await res.json();
      setSubmitResult(data);
      if (data.verdict) {
        setVerdicts((prev) => ({ ...prev, [question._id]: data.verdict }));
      }
    } catch {
      setSubmitResult({ verdict: 'Error', passed: 0, total: 0, results: [] });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Initializing code environment...</div>;
  }

  if (error) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--spy-red)', fontSize: 16, marginBottom: 20 }}>{error}</p>
        <button className="btn-spy" onClick={() => router.push('/dashboard')} style={{ padding: '12px 24px' }}>
          <span>Back to Dashboard</span>
        </button>
      </div>
    );
  }

  if (!started) {
    return (
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <h1 className="font-display" style={{ fontSize: 28, color: 'var(--spy-green)', marginBottom: 12, letterSpacing: 3 }}>
          ROUND 2: FINAL HACK
        </h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 28 }}>
          {questions.length} assigned missions. Languages: C, C++, Java, Python.
        </p>
        <div className="spy-card" style={{ padding: 24, marginBottom: 28, textAlign: 'left' }}>
          <ul style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 2, listStyle: 'none', padding: 0 }}>
            <li>Fullscreen is mandatory and will be restored automatically.</li>
            <li>Blocked shortcuts, tab switches, copy/paste, and right click all raise warnings.</li>
            <li>Three warnings lock the mission.</li>
            <li>OOP missions expose only classes/functions. The main harness stays hidden.</li>
          </ul>
        </div>
        <button className="btn-spy" style={{ padding: '16px 40px', fontSize: 18 }} onClick={handleStart}>
          <span>Enter Fullscreen</span>
        </button>
      </div>
    );
  }

  if (disqualified) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <h1 className="font-display" style={{ fontSize: 28, color: 'var(--spy-red)', marginBottom: 16, letterSpacing: 2 }}>
          MISSION LOCKED
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          The warning limit was reached after leaving fullscreen or using blocked shortcuts.
        </p>
        <button className="btn-spy" onClick={() => router.push('/dashboard')} style={{ padding: '12px 24px' }}>
          <span>Return to Dashboard</span>
        </button>
      </div>
    );
  }

  const question = questions[activeQ];
  const monacoLang: Record<string, string> = { c: 'c', cpp: 'cpp', java: 'java', python: 'python' };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 57px)', overflow: 'hidden' }}>
      {showWarning && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '14px 24px', background: 'rgba(255,0,60,0.92)', color: '#fff', textAlign: 'center', fontSize: 15, fontWeight: 700, zIndex: 9999 }}>
          {warningMessage}
        </div>
      )}

      <div style={{ width: 240, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '16px 14px' }}>
          <p className="font-display" style={{ fontSize: 11, letterSpacing: 2, color: 'var(--spy-green)', marginBottom: 12 }}>ASSIGNED MISSIONS</p>
          {questions.map((item, index) => (
            <button
              key={item._id}
              onClick={() => switchQuestion(index)}
              style={{
                width: '100%',
                padding: '10px 12px',
                marginBottom: 6,
                background: index === activeQ ? 'rgba(0,255,65,0.08)' : 'transparent',
                border: `1px solid ${index === activeQ ? 'rgba(0,255,65,0.3)' : 'transparent'}`,
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, color: index === activeQ ? 'var(--spy-green)' : 'var(--text-muted)' }}>
                {index + 1}. {item.title}
              </span>
              {verdicts[item._id] && (
                <span style={{ fontSize: 10, color: verdicts[item._id] === 'Accepted' ? 'var(--spy-green)' : 'var(--spy-red)' }}>
                  {verdicts[item._id] === 'Accepted' ? 'PASS' : 'FAIL'}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
          <p className="font-mono" style={{ fontSize: 11, color: warnings > 0 ? 'var(--spy-red)' : 'var(--text-dim)' }}>
            Warnings: {warnings}/{MAX_WARNINGS}
          </p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {question && (
          <div style={{ height: '36%', overflowY: 'auto', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <h2 className="font-display" style={{ fontSize: 18, color: 'var(--spy-green)', letterSpacing: 1 }}>
                {question.title}
              </h2>
              <span className="font-mono" style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(0,229,255,0.1)', color: 'var(--spy-cyan)' }}>
                {question.points} pts
              </span>
              <span className="font-mono" style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,179,0,0.1)', color: 'var(--spy-amber)' }}>
                {question.difficulty}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{question.description}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Input</p>
            <p className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', marginBottom: 8 }}>{question.inputFormat}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Output</p>
            <p className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', marginBottom: 8 }}>{question.outputFormat}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Constraints</p>
            <p className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{question.constraints}</p>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <select value={language} onChange={(e) => switchLanguage(e.target.value)} className="form-input" style={{ width: 160, padding: '6px 10px', fontSize: 12 }}>
            <option value="c">C</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="python">Python</option>
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleRun} disabled={running || submitting} style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', color: 'var(--spy-cyan)', padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {running ? 'Running...' : 'Run'}
            </button>
            <button onClick={handleSubmit} disabled={running || submitting} className="btn-spy" style={{ padding: '6px 16px', fontSize: 12 }}>
              <span>{submitting ? 'Judging...' : 'Submit'}</span>
            </button>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <Editor
            height="100%"
            language={monacoLang[language] || 'python'}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              minimap: { enabled: false },
              padding: { top: 12 },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
          />
        </div>
      </div>

      <div style={{ width: 320, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <p className="font-display" style={{ fontSize: 12, letterSpacing: 2, color: 'var(--spy-green)' }}>OUTPUT</p>
        </div>
        <div style={{ padding: '12px 16px' }}>
          {!output && !submitResult && <p style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>Run or submit code to see results.</p>}

          {output && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: output.status === 'Accepted' ? 'var(--spy-green)' : 'var(--spy-red)', marginBottom: 8 }}>
                {output.status}
              </p>
              {output.compile_output && <pre className="font-mono" style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: '0 0 12px', color: 'var(--spy-red)' }}>{output.compile_output}</pre>}
              {output.stdout && <pre className="font-mono" style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: '0 0 12px', color: 'var(--spy-green)' }}>{output.stdout}</pre>}
              {output.stderr && <pre className="font-mono" style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: 0, color: 'var(--spy-amber)' }}>{output.stderr}</pre>}
            </div>
          )}

          {submitResult && (
            <div>
              <p className="font-display" style={{ fontSize: 16, color: submitResult.verdict === 'Accepted' ? 'var(--spy-green)' : 'var(--spy-red)', letterSpacing: 2, marginBottom: 8 }}>
                {submitResult.verdict}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
                {submitResult.passed}/{submitResult.total} test cases passed
              </p>
              {submitResult.results?.map((result) => (
                <div key={result.testCase} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Test #{result.testCase}</span>
                  <span className="font-mono" style={{ fontSize: 11, color: result.passed ? 'var(--spy-green)' : 'var(--spy-red)' }}>
                    {result.passed ? 'PASS' : result.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
