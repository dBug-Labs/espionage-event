'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

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
}

interface TestResult {
  testCase: number;
  status: string;
  passed: boolean;
}

const MAX_WARNINGS = 3;

const LANG_DEFAULTS: Record<string, string> = {
  python: '# Agent, write your solution here\nimport sys\n\ndef solve():\n    pass\n\nsolve()\n',
  cpp: '// Agent, write your solution here\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  java: '// Agent, write your solution here\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}\n',
};

export default function Round2Page() {
  const router = useRouter();
  const session = getSession();
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [activeQ, setActiveQ] = useState(0);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(LANG_DEFAULTS.python);
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
  const warningsRef = useRef(0);
  const codeRef = useRef<Record<string, Record<string, string>>>({});

  // Fetch questions
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/round2/questions?email=${encodeURIComponent(session?.email || '')}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed to load.'); return; }
        setQuestions(data.questions || []);
      } catch { setError('Network error.'); }
      finally { setLoading(false); }
    }
    load();
  }, [session?.email]);

  // Anti-cheat
  const triggerWarning = useCallback((message: string) => {
    const newCount = warningsRef.current + 1;
    warningsRef.current = newCount;
    setWarnings(newCount);
    setWarningMessage(`⚠️ WARNING ${newCount}/${MAX_WARNINGS}: ${message}`);
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 3000);
  }, []);

  useEffect(() => {
    if (!started) return;
    const handleVisibility = () => {
      if (document.hidden) triggerWarning('Tab switch detected!');
    };
    const handleFsChange = () => {
      if (!document.fullscreenElement && started) {
        triggerWarning('Fullscreen exited!');
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('contextmenu', prevent);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('contextmenu', prevent);
    };
  }, [started, triggerWarning]);

  async function handleStart() {
    try {
      await document.documentElement.requestFullscreen();
      setStarted(true);
    } catch {
      alert('Fullscreen is required.');
    }
  }

  function switchQuestion(idx: number) {
    // Save current code
    const q = questions[activeQ];
    if (q) {
      if (!codeRef.current[q._id]) codeRef.current[q._id] = {};
      codeRef.current[q._id][language] = code;
    }
    // Load saved code or default
    const newQ = questions[idx];
    const saved = codeRef.current[newQ._id]?.[language];
    setCode(saved || LANG_DEFAULTS[language] || '');
    setActiveQ(idx);
    setOutput(null);
    setSubmitResult(null);
  }

  function switchLanguage(lang: string) {
    const q = questions[activeQ];
    if (q) {
      if (!codeRef.current[q._id]) codeRef.current[q._id] = {};
      codeRef.current[q._id][language] = code;
    }
    const saved = codeRef.current[q._id]?.[lang];
    setCode(saved || LANG_DEFAULTS[lang] || '');
    setLanguage(lang);
  }

  async function handleRun() {
    const q = questions[activeQ];
    if (!q) return;
    setRunning(true);
    setOutput(null);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/round2/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, questionId: q._id }),
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
    const q = questions[activeQ];
    if (!q) return;
    if (!confirm('Submit this solution? It will be scored against all test cases.')) return;
    setSubmitting(true);
    setOutput(null);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/round2/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.email, code, language, questionId: q._id }),
      });
      const data = await res.json();
      setSubmitResult(data);
      if (data.verdict) {
        setVerdicts((prev) => ({ ...prev, [q._id]: data.verdict }));
      }
    } catch {
      setSubmitResult({ verdict: 'Error', passed: 0, total: 0, results: [] });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid rgba(0,255,65,0.15)', borderTop: '3px solid var(--spy-green)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'var(--text-muted)' }}>Initializing code environment…</p>
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

  if (!started) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>💻</div>
        <h1 className="font-display" style={{ fontSize: 28, color: 'var(--spy-green)', marginBottom: 12, letterSpacing: 3 }}>
          ROUND 2: THE FINAL HACK
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 32, lineHeight: 1.7 }}>
          {questions.length} coding challenges • Python, C++, Java
        </p>
        <div className="spy-card" style={{ padding: 24, marginBottom: 28, textAlign: 'left' }}>
          <h3 style={{ color: 'var(--spy-amber)', fontSize: 14, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>⚠️ MISSION RULES</h3>
          <ul style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 2, listStyle: 'none', padding: 0 }}>
            <li>🔒 Fullscreen mode is <strong style={{ color: 'var(--text-primary)' }}>mandatory</strong></li>
            <li>▶️ <strong style={{ color: 'var(--spy-cyan)' }}>Run</strong> — test with sample input (no scoring)</li>
            <li>🚀 <strong style={{ color: 'var(--spy-green)' }}>Submit</strong> — scored against hidden test cases</li>
            <li>⚠️ Anti-cheat: 3 warnings, then you are disqualified</li>
          </ul>
        </div>
        <button className="btn-spy animate-pulse-green" style={{ padding: '16px 48px', fontSize: 18 }} onClick={handleStart}>
          <span>💻 Enter Code Environment</span>
        </button>
      </div>
    );
  }

  const q = questions[activeQ];
  const monacoLang: Record<string, string> = { python: 'python', cpp: 'cpp', java: 'java' };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 57px)', overflow: 'hidden' }}>
      {/* Warning */}
      {showWarning && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '14px 24px', background: 'rgba(255,0,60,0.9)', color: '#fff', textAlign: 'center', fontSize: 15, fontWeight: 700, zIndex: 9999 }}>
          {warningMessage}
        </div>
      )}

      {/* Left sidebar — question list */}
      <div style={{ width: 220, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '16px 14px' }}>
          <p className="font-display" style={{ fontSize: 11, letterSpacing: 2, color: 'var(--spy-green)', marginBottom: 12 }}>MISSIONS</p>
          {questions.map((quest, i) => (
            <button
              key={quest._id}
              onClick={() => switchQuestion(i)}
              style={{
                width: '100%',
                padding: '10px 12px',
                marginBottom: 6,
                background: i === activeQ ? 'rgba(0,255,65,0.08)' : 'transparent',
                border: `1px solid ${i === activeQ ? 'rgba(0,255,65,0.3)' : 'transparent'}`,
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, color: i === activeQ ? 'var(--spy-green)' : 'var(--text-muted)', fontWeight: i === activeQ ? 600 : 400 }}>
                {i + 1}. {quest.title.length > 16 ? quest.title.slice(0, 16) + '…' : quest.title}
              </span>
              {verdicts[quest._id] && (
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700, color: verdicts[quest._id] === 'Accepted' ? '#00ff41' : '#ff003c', background: verdicts[quest._id] === 'Accepted' ? 'rgba(0,255,65,0.15)' : 'rgba(255,0,60,0.15)' }}>
                  {verdicts[quest._id] === 'Accepted' ? '✓' : '✗'}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Warnings */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
          <p className="font-mono" style={{ fontSize: 11, color: warnings > 0 ? 'var(--spy-red)' : 'var(--text-dim)' }}>
            ⚠️ Warnings: {warnings}/{MAX_WARNINGS}
          </p>
        </div>
      </div>

      {/* Middle — Problem + Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Problem description */}
        {q && (
          <div style={{ height: '35%', overflowY: 'auto', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <h2 className="font-display" style={{ fontSize: 16, color: 'var(--spy-green)', letterSpacing: 1 }}>
                {q.title}
              </h2>
              <span className="font-mono" style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(0,229,255,0.1)', color: 'var(--spy-cyan)', border: '1px solid rgba(0,229,255,0.2)' }}>
                {q.points} pts
              </span>
              <span className="font-mono" style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,179,0,0.1)', color: 'var(--spy-amber)' }}>
                {q.difficulty}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{q.description}</p>

            {q.inputFormat && (
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Input:</p>
                <p className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{q.inputFormat}</p>
              </div>
            )}
            {q.outputFormat && (
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Output:</p>
                <p className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{q.outputFormat}</p>
              </div>
            )}
            {q.constraints && (
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Constraints:</p>
                <p className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{q.constraints}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--spy-green)', marginBottom: 6 }}>Sample Input</p>
                <pre className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', margin: 0 }}>{q.sampleInput}</pre>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--spy-green)', marginBottom: 6 }}>Sample Output</p>
                <pre className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', margin: 0 }}>{q.sampleOutput}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Editor toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <select
            value={language}
            onChange={(e) => switchLanguage(e.target.value)}
            className="form-input"
            style={{ width: 140, padding: '6px 10px', fontSize: 12 }}
          >
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleRun}
              disabled={running || submitting}
              style={{
                background: 'rgba(0,229,255,0.1)',
                border: '1px solid rgba(0,229,255,0.3)',
                color: 'var(--spy-cyan)',
                padding: '6px 16px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: running ? 'not-allowed' : 'pointer',
              }}
            >
              {running ? '⏳ Running…' : '▶️ Run'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={running || submitting}
              className="btn-spy"
              style={{ padding: '6px 16px', fontSize: 12 }}
            >
              <span>{submitting ? '⏳ Judging…' : '🚀 Submit'}</span>
            </button>
          </div>
        </div>

        {/* Code editor */}
        <div style={{ flex: 1 }}>
          <Editor
            height="100%"
            language={monacoLang[language] || 'python'}
            value={code}
            onChange={(val) => setCode(val || '')}
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

      {/* Right panel — Output */}
      <div style={{ width: 300, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <p className="font-display" style={{ fontSize: 12, letterSpacing: 2, color: 'var(--spy-green)' }}>OUTPUT</p>
        </div>
        <div style={{ padding: '12px 16px' }}>
          {!output && !submitResult && (
            <p style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
              Run or submit your code to see results here.
            </p>
          )}

          {output && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700, color: output.status === 'Accepted' ? '#00ff41' : '#ff003c', background: output.status === 'Accepted' ? 'rgba(0,255,65,0.15)' : 'rgba(255,0,60,0.15)' }}>
                  {output.status}
                </span>
              </div>
              {output.compile_output && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--spy-red)', marginBottom: 4 }}>Compile Error:</p>
                  <pre className="font-mono" style={{ fontSize: 11, color: 'var(--spy-red)', whiteSpace: 'pre-wrap', background: 'rgba(255,0,60,0.05)', padding: 8, borderRadius: 6, margin: 0 }}>{output.compile_output}</pre>
                </div>
              )}
              {output.stdout && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Output:</p>
                  <pre className="font-mono" style={{ fontSize: 11, color: 'var(--spy-green)', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 6, margin: 0 }}>{output.stdout}</pre>
                </div>
              )}
              {output.stderr && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--spy-amber)', marginBottom: 4 }}>Stderr:</p>
                  <pre className="font-mono" style={{ fontSize: 11, color: 'var(--spy-amber)', whiteSpace: 'pre-wrap', background: 'rgba(255,179,0,0.05)', padding: 8, borderRadius: 6, margin: 0 }}>{output.stderr}</pre>
                </div>
              )}
            </div>
          )}

          {submitResult && (
            <div>
              <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 40, marginBottom: 4 }}>{submitResult.verdict === 'Accepted' ? '✅' : '❌'}</p>
                <p className="font-display" style={{ fontSize: 16, color: submitResult.verdict === 'Accepted' ? 'var(--spy-green)' : 'var(--spy-red)', letterSpacing: 2 }}>
                  {submitResult.verdict}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                  {submitResult.passed}/{submitResult.total} test cases passed
                </p>
              </div>
              {submitResult.results?.map((r) => (
                <div key={r.testCase} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Test #{r.testCase}</span>
                  <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: r.passed ? 'var(--spy-green)' : 'var(--spy-red)' }}>
                    {r.passed ? 'PASS ✓' : `FAIL — ${r.status}`}
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
