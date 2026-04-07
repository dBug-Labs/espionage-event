'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getQuestionLanguageIds, getStarterCode, isShortcutBlocked } from '@/lib/round2';
import { enterSecureFullscreen, exitSecureFullscreen, reenterSecureFullscreen, unlockSecureTestKeys } from '@/lib/testSecurity';

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

interface LanguageOption {
  id: string;
  label: string;
  monaco: string;
}

interface TestResult {
  testCase: number;
  status: string;
  passed: boolean;
}

interface RunOutput {
  stdout: string;
  stderr: string;
  compile_output: string;
  status: string;
}

const MAX_WARNINGS = 3;
const MAX_KEY_VIOLATIONS = 6;

export default function Round2Page() {
  const router = useRouter();
  const session = getSession();
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [supportedLanguages, setSupportedLanguages] = useState<LanguageOption[]>([]);
  const [activeQ, setActiveQ] = useState(0);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [submitResult, setSubmitResult] = useState<{ verdict: string; passed: number; total: number; results: TestResult[] } | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState(0);
  const [keyViolations, setKeyViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  const [keyWarningMessage, setKeyWarningMessage] = useState('');
  const [started, setStarted] = useState(false);
  const [disqualified, setDisqualified] = useState(false);
  const [startError, setStartError] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [allowFullscreenExit, setAllowFullscreenExit] = useState(false);
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);
  const [showFinalSubmitConfirm, setShowFinalSubmitConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 minutes
  const warningsRef = useRef(0);
  const keyViolationsRef = useRef(0);
  const codeRef = useRef<Record<string, Record<string, string>>>({});
  const allowFullscreenExitRef = useRef(false);
  const warningTimeoutRef = useRef<number | null>(null);
  const keyWarningTimeoutRef = useRef<number | null>(null);

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
        setSupportedLanguages(data.supportedLanguages || []);
        if (data.questions?.length) {
          const firstQuestion = data.questions[0];
          const availableLanguages = (data.supportedLanguages || []).filter((item: LanguageOption) =>
            getQuestionLanguageIds(firstQuestion).includes(item.id as 'c' | 'cpp' | 'java' | 'python')
          );
          const defaultLanguage = availableLanguages[0]?.id || language;
          setLanguage(defaultLanguage);
          setCode(getStarterCode(firstQuestion, defaultLanguage));
        }
      } catch {
        setError('Network error.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session?.email]);

  async function leaveSecureEnvironment(path: string) {
    allowFullscreenExitRef.current = true;
    setAllowFullscreenExit(true);
    await exitSecureFullscreen();
    router.push(path);
  }

  const triggerWarning = useCallback((message: string) => {
    const nextWarnings = warningsRef.current + 1;
    warningsRef.current = nextWarnings;
    setWarnings(nextWarnings);
    setWarningMessage(`WARNING ${nextWarnings}/${MAX_WARNINGS}: ${message}`);
    setShowWarning(true);

    if (warningTimeoutRef.current) {
      window.clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }

    if (!message.toLowerCase().includes('fullscreen exited')) {
      warningTimeoutRef.current = window.setTimeout(() => {
        setShowWarning(false);
        warningTimeoutRef.current = null;
      }, 3000);
    }

    if (nextWarnings >= MAX_WARNINGS) {
      setDisqualified(true);
    }
  }, []);

  const triggerKeyViolation = useCallback((key: string) => {
    const newCount = keyViolationsRef.current + 1;
    keyViolationsRef.current = newCount;
    setKeyViolations(newCount);
    setKeyWarningMessage(`KEY VIOLATION ${newCount}/${MAX_KEY_VIOLATIONS}: Blocked key "${key.toUpperCase()}" detected!`);
    setShowKeyWarning(true);

    if (keyWarningTimeoutRef.current) {
      window.clearTimeout(keyWarningTimeoutRef.current);
      keyWarningTimeoutRef.current = null;
    }

    keyWarningTimeoutRef.current = window.setTimeout(() => {
      setShowKeyWarning(false);
      keyWarningTimeoutRef.current = null;
    }, 2500);

    if (newCount >= MAX_KEY_VIOLATIONS) {
      setDisqualified(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        window.clearTimeout(warningTimeoutRef.current);
      }
      if (keyWarningTimeoutRef.current) {
        window.clearTimeout(keyWarningTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!started || allowFullscreenExit) return;

    const handleVisibility = () => {
      if (document.hidden && !disqualified) triggerWarning('Tab switch detected.');
    };
    const handleFsChange = () => {
      if (!document.fullscreenElement && !allowFullscreenExitRef.current) {
        if (!disqualified) {
          triggerWarning('Fullscreen exited.');
        }
      }
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (isShortcutBlocked(event)) {
        event.preventDefault();
        event.stopPropagation();
        triggerKeyViolation(event.key);
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
  }, [allowFullscreenExit, disqualified, started, triggerWarning, triggerKeyViolation]);

  useEffect(() => {
    if (!started || allowFullscreenExit) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [allowFullscreenExit, started]);

  useEffect(() => {
    if (!allowFullscreenExit) return;
    unlockSecureTestKeys();
  }, [allowFullscreenExit]);

  const handleFinalSubmit = useCallback(async () => {
    if (isFinalSubmitted) return;
    setIsFinalSubmitted(true);
    setShowFinalSubmitConfirm(false);
    try {
      const res = await fetch('/api/round2/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.email })
      });
      if (res.ok) {
        setAllowFullscreenExit(true);
        allowFullscreenExitRef.current = true;
      }
    } catch {
      // silent fail if already submitted
    }
  }, [isFinalSubmitted, session?.email]);

  useEffect(() => {
    if (!started || isFinalSubmitted || disqualified) return;
    const timerId = window.setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [started, isFinalSubmitted, disqualified]);

  useEffect(() => {
    if (timeLeft === 0 && !isFinalSubmitted && !disqualified) {
      handleFinalSubmit();
    }
  }, [timeLeft, isFinalSubmitted, disqualified, handleFinalSubmit]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  async function handleStart() {
    const entered = await enterSecureFullscreen();
    if (!entered) {
      setStartError('Fullscreen permission was blocked. Allow fullscreen access to start Round 2.');
      return;
    }

    setStartError('');
    setStarted(true);
  }

  function getAvailableLanguages(question: CodingQuestion): LanguageOption[] {
    const questionLanguages = new Set(getQuestionLanguageIds(question));
    return supportedLanguages.filter((item) => questionLanguages.has(item.id as 'c' | 'cpp' | 'java' | 'python'));
  }

  function switchQuestion(nextIndex: number) {
    const currentQuestion = questions[activeQ];
    if (currentQuestion) {
      codeRef.current[currentQuestion._id] ??= {};
      codeRef.current[currentQuestion._id][language] = code;
    }

    const nextQuestion = questions[nextIndex];
    const availableLanguages = getAvailableLanguages(nextQuestion);
    const nextLanguage = availableLanguages.some((item) => item.id === language)
      ? language
      : (availableLanguages[0]?.id ?? language);
    const saved = codeRef.current[nextQuestion._id]?.[nextLanguage];
    setLanguage(nextLanguage);
    setCode(saved || getStarterCode(nextQuestion, nextLanguage));
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

  function handleEditorMount(editorInstance: {
    onKeyDown: (callback: (event: {
      ctrlKey: boolean;
      metaKey: boolean;
      altKey: boolean;
      keyCode: number;
      preventDefault: () => void;
      stopPropagation: () => void;
    }) => void) => void;
    addCommand: (keybinding: number, handler: () => void) => void;
  }, monaco: {
    KeyMod: { CtrlCmd: number; Shift: number; Alt: number };
    KeyCode: Record<string, number>;
  }) {
    const blockedKeybindings = [
      monaco.KeyCode.F1,
      monaco.KeyCode.F2,
      monaco.KeyCode.F3,
      monaco.KeyCode.F7,
      monaco.KeyCode.F8,
      monaco.KeyCode.F12,
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH,
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG,
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP,
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD,
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL,
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
      monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
    ];

    editorInstance.onKeyDown((event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.keyCode === monaco.KeyCode.F1 || event.keyCode === monaco.KeyCode.F12) {
        event.preventDefault();
        event.stopPropagation();
      }
    });

    blockedKeybindings.forEach((binding) => {
      editorInstance.addCommand(binding, () => {});
    });
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
      if (!res.ok) {
        setOutput({
          stdout: '',
          stderr: data.error || 'Execution failed.',
          compile_output: '',
          status: 'Error',
        });
        return;
      }
      setOutput(data as RunOutput);
    } catch {
      setOutput({ stdout: '', stderr: 'Execution request failed.', compile_output: '', status: 'Error' });
    } finally {
      setRunning(false);
    }
  }

  function handleSubmit() {
    setShowSubmitConfirm(true);
  }

  async function confirmSubmit() {
    const question = questions[activeQ];
    if (!question) return;

    setShowSubmitConfirm(false);

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

  async function handleReenterFullscreen() {
    await reenterSecureFullscreen();
    if (document.fullscreenElement) {
      setShowWarning(false);
    }
  }

  const wrapperClass = 'bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-hidden terminal-bg relative min-h-screen';
  const question = questions[activeQ];
  const availableLanguages = question ? getAvailableLanguages(question) : [];
  const currentLanguage = availableLanguages.find((item) => item.id === language);
  const languageSummary = supportedLanguages.map((item) => item.label.replace(/\s*\(.+\)/, '')).join(', ');

  if (loading) {
    return (
      <div className={wrapperClass + ' flex items-center justify-center p-6'}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-6 shadow-[0_0_15px_rgba(255,85,64,0.3)]" />
          <p className="font-headline text-primary tracking-[0.2em] uppercase text-xs animate-pulse">Initializing Terminal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={wrapperClass + ' flex items-center justify-center p-6 text-center'}>
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

  if (!started) {
    return (
      <div className={wrapperClass + ' flex items-center justify-center p-6'}>
        <div className="fixed inset-0 scanline opacity-10 pointer-events-none z-0"></div>
        <div className="relative z-10 w-full max-w-2xl bg-surface-container-low p-8 md:p-12 border border-outline-variant/30 shadow-[0_0_30px_rgba(255,85,64,0.05)] text-center">
          <div className="absolute top-0 right-0 p-4 font-headline text-[10px] text-outline-variant uppercase tracking-widest">
            Ref: R2-COMPILE
          </div>

          <span className="material-symbols-outlined text-primary text-5xl mb-6">terminal</span>
          <h1 className="font-headline text-3xl md:text-5xl font-black uppercase tracking-tighter text-on-surface mb-2">
            ROUND 2: <span className="text-primary glow-red">FINAL HACK</span>
          </h1>
          <p className="text-secondary font-headline text-xs tracking-[0.2em] uppercase mb-8">
            {questions.length} assigned missions • Languages: {languageSummary || 'Loading'}
          </p>

          <div className="bg-surface-container-highest border border-error/30 p-6 mb-10 text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-error"></div>
            <h3 className="font-headline text-xs text-error font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">gavel</span>
              STRICT ENGAGEMENT PROTOCOL
            </h3>
            <ul className="text-on-surface-variant text-sm font-body space-y-3 pl-2">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">lock</span>
                <span>Fullscreen mode is <strong className="text-on-surface font-bold">mandatory</strong>. Exiting triggers an immediate warning.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">block</span>
                <span>No tab switching, no copy-paste, no right-click, no keyboard shortcuts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-error mt-0.5">warning</span>
                <span>You get <strong className="text-error font-bold">3 warnings max</strong> for fullscreen/tab violations before your mission is permanently locked.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-orange-500 mt-0.5">keyboard</span>
                <span>Windows, Alt, and function keys are <strong className="text-orange-500 font-bold">blocked</strong>. <strong className="text-orange-500 font-bold">6 key violations</strong> = mission locked.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">visibility_off</span>
                <span>OOP missions expose only classes/functions. The main harness stays hidden.</span>
              </li>
            </ul>
          </div>

          {startError && (
            <div className="mb-6 border border-error/30 bg-error/10 px-4 py-3 text-error font-headline text-[10px] tracking-widest uppercase">
              {startError}
            </div>
          )}

          <button className="w-full py-5 bg-primary text-on-primary font-headline font-black text-lg tracking-[0.2em] uppercase transition-all hover:bg-primary-container active:scale-[0.98] shadow-[0_0_20px_rgba(255,85,64,0.3)] flex justify-center items-center gap-3 animate-pulse" onClick={handleStart}>
            <span className="material-symbols-outlined">fullscreen</span>
            ENTER TERMINAL
          </button>
        </div>
      </div>
    );
  }

  if (disqualified) {
    return (
      <div className={wrapperClass + ' flex items-center justify-center p-6 text-center'}>
        <div className="fixed inset-0 scanline opacity-10 pointer-events-none z-0"></div>
        <div className="relative z-10 w-full max-w-2xl bg-[#0a0000] p-10 border border-error/50 shadow-[0_0_50px_rgba(255,0,0,0.2)]">
          <span className="material-symbols-outlined text-error text-7xl mb-6">lock</span>
          <h1 className="font-headline text-4xl md:text-5xl font-black uppercase tracking-tighter text-error mb-4 glow-red">
            MISSION BLOCKED
          </h1>
          <p className="text-on-surface font-mono text-sm leading-relaxed mb-4">
            SECURITY BREACH DETECTED. THE WARNING LIMIT WAS EXCEEDED AFTER LEAVING THE SECURE FULLSCREEN ENVIRONMENT OR ATTEMPTING BLOCKED OPERATIONS.
          </p>
          <div className="flex gap-4 justify-center mb-8">
            {warnings > 0 && (
              <span className="text-error font-mono text-xs border border-error/30 bg-error/10 px-3 py-1">
                {warnings} FULLSCREEN WARNINGS
              </span>
            )}
            {keyViolations > 0 && (
              <span className="text-orange-500 font-mono text-xs border border-orange-500/30 bg-orange-500/10 px-3 py-1">
                {keyViolations} KEY VIOLATIONS
              </span>
            )}
          </div>
          <button className="px-8 py-4 border border-outline-variant text-on-surface font-headline font-bold text-xs tracking-widest uppercase hover:text-error hover:border-error transition-all mx-auto flex items-center gap-2" onClick={() => leaveSecureEnvironment('/dashboard')}>
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            RETURN TO BASE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface text-on-surface font-body overflow-hidden terminal-bg relative selection:bg-primary-container selection:text-on-primary-container">
      {showWarning && (
        <div className="fixed inset-0 bg-error/90 z-[9999] flex items-center justify-center animate-[pulse_0.5s_ease-in-out_infinite] backdrop-blur-sm">
          <div className="bg-[#111] border-2 border-error p-10 max-w-xl w-full text-center shadow-[0_0_100px_rgba(255,0,0,0.5)]">
            <span className="material-symbols-outlined text-error text-7xl mb-6">warning</span>
            <h2 className="font-headline text-3xl font-black text-error uppercase tracking-widest mb-4">SECURITY ALERT</h2>
            <p className="text-on-surface font-mono text-lg">{warningMessage}</p>
            {!document.fullscreenElement && !allowFullscreenExit && (
              <button
                onClick={handleReenterFullscreen}
                className="mt-6 px-6 py-3 bg-primary text-on-primary font-headline font-black text-xs tracking-widest uppercase"
              >
                RE-ENTER FULLSCREEN
              </button>
            )}
          </div>
        </div>
      )}

      {/* Key violation warning banner */}
      {showKeyWarning && !showWarning && (
        <div className="fixed top-0 left-0 right-0 z-[9998] flex justify-center p-4 animate-[slideDown_0.3s_ease-out]">
          <div className="bg-[#1a1200] border-2 border-orange-500 px-8 py-4 max-w-xl w-full text-center shadow-[0_0_40px_rgba(255,165,0,0.3)]">
            <div className="flex items-center justify-center gap-3">
              <span className="material-symbols-outlined text-orange-500 text-2xl">keyboard</span>
              <p className="text-orange-400 font-mono text-sm font-bold">{keyWarningMessage}</p>
            </div>
          </div>
        </div>
      )}

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md border border-primary/30 bg-surface-container-low p-6 text-center shadow-[0_0_30px_rgba(255,85,64,0.15)]">
            <h2 className="font-headline text-xl font-black uppercase tracking-widest text-primary mb-3">Judge Submission</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              Submit this solution against all hidden test cases for the current mission?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmSubmit}
                className="w-full px-6 py-3 bg-primary text-on-primary font-headline font-black text-xs tracking-widest uppercase"
              >
                SUBMIT SOLUTION
              </button>
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="w-full px-6 py-3 border border-outline-variant/40 text-on-surface font-headline font-bold text-xs tracking-widest uppercase"
              >
                KEEP EDITING
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalSubmitConfirm && (
        <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md border border-error/50 bg-[#0a0000] p-6 text-center shadow-[0_0_50px_rgba(255,0,0,0.15)]">
            <span className="material-symbols-outlined text-error text-5xl mb-4">flag</span>
            <h2 className="font-headline text-xl font-black uppercase tracking-widest text-error mb-3 glow-red">Confirm Final Submission</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              Are you absolutely sure? This will end Round 2 and lock all your submissions. This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleFinalSubmit()}
                className="w-full px-6 py-3 bg-error text-on-error font-headline font-black text-xs tracking-widest uppercase hover:bg-error/90 active:scale-[0.98] shadow-[0_0_15px_rgba(255,0,0,0.3)] transition-all"
              >
                YES, END ROUND 2
              </button>
              <button
                onClick={() => setShowFinalSubmitConfirm(false)}
                className="w-full px-6 py-3 border border-outline-variant/40 text-on-surface font-headline font-bold text-xs tracking-widest uppercase hover:bg-surface-container-highest transition-all"
              >
                NO, KEEP HACKING
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-64 bg-surface-container-low border-r border-outline-variant/30 flex flex-col shrink-0 relative z-10 shadow-xl">
        <div className="p-4 border-b border-outline-variant/30 bg-[#0e0e0e] flex items-center justify-between">
          <p className="font-headline text-[10px] tracking-widest text-primary font-bold uppercase flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">memory</span>
            MISSIONS
          </p>
          <span className="font-mono text-[10px] bg-primary/10 text-primary px-2 py-0.5 border border-primary/20">{questions.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {questions.map((item, index) => {
            const isAc = verdicts[item._id] === 'Accepted';
            const hasVerdict = !!verdicts[item._id];
            return (
              <button
                key={item._id}
                onClick={() => switchQuestion(index)}
                className={`w-full text-left p-3 rounded-none border transition-all flex justify-between items-center ${index === activeQ ? 'bg-primary/5 border-primary shadow-[0_0_10px_rgba(255,85,64,0.15)] text-primary' : 'bg-surface-container-highest border-transparent hover:border-outline-variant/50 text-on-surface-variant hover:text-on-surface'}`}
              >
                <span className="font-headline text-[11px] font-bold tracking-wider uppercase truncate pr-2">
                  {index + 1}. {item.title}
                </span>
                {hasVerdict && (
                  <span className={`font-mono text-[9px] px-1 py-0.5 ${isAc ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                    {isAc ? 'AC' : 'WA'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-outline-variant/30 bg-[#0e0e0e] space-y-4">
          <div className="bg-primary/5 border border-primary/20 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between font-headline text-[10px] tracking-widest uppercase">
              <span className="text-secondary flex items-center gap-1"><span className="material-symbols-outlined text-sm">timer</span> TIME REMAINING</span>
              <span className={`font-bold ${timeLeft < 300 ? 'text-error animate-pulse' : 'text-primary'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="w-full h-1 bg-surface-container-highest mt-1 hidden">
               {/* visual timer bar could go here */}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between font-headline text-[10px] tracking-widest uppercase">
              <span className="text-secondary">Fullscreen Warnings</span>
              <span className={`font-bold ${warnings > 0 ? 'text-error' : 'text-primary'}`}>
                {warnings}/{MAX_WARNINGS}
              </span>
            </div>
            <div className="w-full h-1 bg-surface-container-highest mt-1">
              <div className="h-full bg-error transition-all" style={{ width: `${(warnings / MAX_WARNINGS) * 100}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between font-headline text-[10px] tracking-widest uppercase">
              <span className="text-secondary">Key Violations</span>
              <span className={`font-bold ${keyViolations > 0 ? 'text-orange-500' : 'text-primary'}`}>
                {keyViolations}/{MAX_KEY_VIOLATIONS}
              </span>
            </div>
            <div className="w-full h-1 bg-surface-container-highest mt-1">
              <div className="h-full bg-orange-500 transition-all" style={{ width: `${(keyViolations / MAX_KEY_VIOLATIONS) * 100}%` }}></div>
            </div>
          </div>
          {isFinalSubmitted ? (
            <button
              onClick={() => leaveSecureEnvironment('/dashboard')}
              className="w-full py-3 bg-surface-container-highest border border-outline-variant/30 text-on-surface font-headline font-bold text-[10px] tracking-widest uppercase hover:text-primary transition-all flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              RETURN TO DASHBOARD
            </button>
          ) : (
            <button
              onClick={() => setShowFinalSubmitConfirm(true)}
              className="w-full py-3 bg-error/10 border border-error/50 text-error font-headline font-bold text-[10px] tracking-widest uppercase hover:bg-error hover:text-on-error shadow-[0_0_15px_rgba(255,0,0,0.15)] transition-all flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined text-[14px]">flag</span>
              FINAL SUBMIT
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative z-10 bg-[#0e0e0e]">
        {question && (
          <div className="h-[35%] overflow-y-auto border-b border-outline-variant/30 bg-surface-container-highest p-6 custom-scrollbar relative">
            <div className="absolute top-0 right-0 p-2 font-headline text-[8px] text-outline-variant uppercase tracking-widest">
              ID: {question._id}
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <h2 className="font-headline text-2xl font-black uppercase text-primary tracking-wider glow-red">
                {question.title}
              </h2>
              <span className="font-mono text-[10px] border border-primary/30 bg-primary/5 text-primary px-2 py-0.5">
                {question.points} PTS
              </span>
              <span className={`font-mono text-[10px] border px-2 py-0.5 ${question.difficulty.toLowerCase() === 'hard' ? 'border-error/30 bg-error/5 text-error' : question.difficulty.toLowerCase() === 'medium' ? 'border-orange-500/30 bg-orange-500/5 text-orange-500' : 'border-green-500/30 bg-green-500/5 text-green-500'}`}>
                {question.difficulty.toUpperCase()}
              </span>
            </div>

            <div className="prose prose-invert prose-sm max-w-none mb-8">
              <p className="text-on-surface-variant font-body leading-relaxed whitespace-pre-wrap">{question.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-headline text-[10px] uppercase tracking-widest text-secondary mb-2 border-b border-outline-variant/20 pb-1">Input Format</h4>
                <p className="font-mono text-xs text-on-surface-variant bg-black/40 p-3 border border-outline-variant/20 whitespace-pre-wrap">{question.inputFormat}</p>
              </div>
              <div>
                <h4 className="font-headline text-[10px] uppercase tracking-widest text-secondary mb-2 border-b border-outline-variant/20 pb-1">Output Format</h4>
                <p className="font-mono text-xs text-on-surface-variant bg-black/40 p-3 border border-outline-variant/20 whitespace-pre-wrap">{question.outputFormat}</p>
              </div>
              <div className="md:col-span-2">
                <h4 className="font-headline text-[10px] uppercase tracking-widest text-secondary mb-2 border-b border-outline-variant/20 pb-1">Constraints</h4>
                <p className="font-mono text-xs text-primary bg-primary/5 p-3 border border-primary/20 whitespace-pre-wrap">{question.constraints}</p>
              </div>
            </div>
          </div>
        )}

        <div className="h-14 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between px-4 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-[16px]">code</span>
            <select
              value={language}
              onChange={(e) => switchLanguage(e.target.value)}
              className="bg-[#0e0e0e] border border-outline-variant/50 text-on-surface text-xs font-mono uppercase tracking-widest p-1.5 outline-none hover:border-primary/50 focus:border-primary transition-colors"
            >
              {availableLanguages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={running || submitting || isFinalSubmitted}
              className={`px-6 py-1.5 font-headline text-[10px] font-bold tracking-widest uppercase border transition-all flex items-center gap-2 ${(running || submitting || isFinalSubmitted) ? 'bg-surface-container-highest border-outline-variant/30 text-secondary cursor-not-allowed' : 'bg-surface-container-highest border-outline-variant/50 text-on-surface hover:text-primary hover:border-primary'}`}
            >
              {running ? (
                <><span className="material-symbols-outlined text-[14px] animate-spin">refresh</span> EXECUTING...</>
              ) : (
                <><span className="material-symbols-outlined text-[14px]">play_arrow</span> RUN CODE</>
              )}
            </button>
            <button
              onClick={handleSubmit}
              disabled={running || submitting || isFinalSubmitted}
              className={`px-6 py-1.5 font-headline text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${(running || submitting || isFinalSubmitted) ? 'bg-primary/20 text-primary/50 cursor-not-allowed border border-primary/10' : 'bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] shadow-[0_0_15px_rgba(255,85,64,0.3)]'}`}
            >
              {submitting ? (
                <><span className="material-symbols-outlined text-[14px] animate-spin">sync</span> JUDGING...</>
              ) : (
                <><span className="material-symbols-outlined text-[14px]">cloud_upload</span> SUBMIT MISSION</>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          <div className="absolute top-2 right-2 z-10 opactiy-50 pointer-events-none">
            <span className="font-headline text-[8px] tracking-[0.3em] uppercase text-secondary/40">SECURE TERMINAL ACTIVE</span>
          </div>
          <Editor
            height="100%"
            language={currentLanguage?.monaco || 'python'}
            value={code}
            onChange={(value) => setCode(value || '')}
            onMount={handleEditorMount}
            theme="vs-dark"
            loading={<div className="font-mono text-xs text-secondary animate-pulse p-4">CONNECTING TO COMPILER...</div>}
            options={{
              readOnly: isFinalSubmitted,
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              contextmenu: false,
              minimap: { enabled: false },
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              renderLineHighlight: 'all',
              quickSuggestions: false,
              suggestOnTriggerCharacters: false,
              acceptSuggestionOnEnter: 'off',
              tabCompletion: 'off',
              parameterHints: { enabled: false },
              codeLens: false,
              formatOnPaste: false,
              formatOnType: false,
              links: false,
              inlineSuggest: { enabled: false },
            }}
          />
        </div>
      </div>

      <div className="w-80 bg-surface-container-low border-l border-outline-variant/30 flex flex-col shrink-0 relative z-10 shadow-[-10px_0_20px_rgba(0,0,0,0.5)]">
        <div className="p-4 border-b border-outline-variant/30 bg-[#0e0e0e] flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-sm">terminal</span>
          <p className="font-headline text-[10px] tracking-widest text-primary font-bold uppercase">
            EXECUTION STDOUT
          </p>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-4 font-mono text-xs custom-scrollbar">
          {!output && !submitResult && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 mt-10">
              <span className="material-symbols-outlined text-4xl mb-2">code</span>
              <p className="font-headline text-[10px] tracking-widest uppercase">Waiting for telemetry</p>
            </div>
          )}

          {output && (
            <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-outline-variant/20">
                <span className={`w-2 h-2 rounded-full ${output.status === 'Accepted' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-error shadow-[0_0_8px_#ff0000]'}`}></span>
                <span className={`font-bold tracking-widest uppercase text-[10px] ${output.status === 'Accepted' ? 'text-green-500' : 'text-error'}`}>
                  STATUS: {output.status}
                </span>
              </div>

              {output.compile_output && (
                <div>
                  <p className="text-[#6b7280] text-[9px] uppercase tracking-wider mb-1">Compiler Output</p>
                  <pre className="text-error whitespace-pre-wrap bg-error/5 border border-error/20 p-2 text-[11px] leading-relaxed">{output.compile_output}</pre>
                </div>
              )}
              {output.stdout && (
                <div>
                  <p className="text-[#6b7280] text-[9px] uppercase tracking-wider mb-1">Standard Output</p>
                  <pre className="text-[#e5e7eb] whitespace-pre-wrap bg-[#111] border border-outline-variant/20 p-2 text-[11px] leading-relaxed">{output.stdout}</pre>
                </div>
              )}
              {output.stderr && (
                <div>
                  <p className="text-[#6b7280] text-[9px] uppercase tracking-wider mb-1">Standard Error</p>
                  <pre className="text-orange-500 whitespace-pre-wrap bg-orange-500/5 border border-orange-500/20 p-2 text-[11px] leading-relaxed">{output.stderr}</pre>
                </div>
              )}
            </div>
          )}

          {submitResult && (
            <div className="animate-[fadeIn_0.2s_ease-out]">
              <div className={`p-4 border mb-4 text-center ${submitResult.verdict === 'Accepted' ? 'bg-green-500/10 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-error/10 border-error/30 shadow-[0_0_15px_rgba(255,0,0,0.1)]'}`}>
                <p className={`font-headline text-lg font-black uppercase tracking-[0.2em] mb-1 ${submitResult.verdict === 'Accepted' ? 'text-green-500' : 'text-error'}`}>
                  {submitResult.verdict}
                </p>
                <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
                  {submitResult.passed}/{submitResult.total} SIGNATURES VERIFIED
                </p>
              </div>

              <div className="space-y-1">
                {submitResult.results?.map((result) => (
                  <div key={result.testCase} className="flex justify-between items-center bg-[#111] border border-outline-variant/10 p-2">
                    <span className="text-[#848383] text-[10px]">TEST RIG #{result.testCase < 10 ? '0' + result.testCase : result.testCase}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 border ${result.passed ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-error/10 text-error border-error/20'}`}>
                      {result.passed ? 'PASS' : result.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
