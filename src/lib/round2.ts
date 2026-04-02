import type { PistonRuntime } from './piston';

export const ROUND2_QUESTION_COUNT = 5;

export const ROUND2_LANGUAGE_CONFIG = {
  c: {
    id: 'c',
    label: 'C (GCC)',
    monaco: 'c',
    pistonNames: ['c'],
  },
  cpp: {
    id: 'cpp',
    label: 'C++ (G++)',
    monaco: 'cpp',
    pistonNames: ['c++', 'cpp'],
  },
  java: {
    id: 'java',
    label: 'Java (JDK)',
    monaco: 'java',
    pistonNames: ['java'],
  },
  python: {
    id: 'python',
    label: 'Python 3',
    monaco: 'python',
    pistonNames: ['python', 'python3', 'py'],
  },
} as const;

export type Round2LanguageId = keyof typeof ROUND2_LANGUAGE_CONFIG;
export type Round2LanguageOption = (typeof ROUND2_LANGUAGE_CONFIG)[Round2LanguageId];
export type ResolvedPistonRuntime = {
  language: Round2LanguageId;
  pistonLanguage: string;
  version: string;
};

const USER_CODE_PLACEHOLDER = '__USER_CODE__';

type LanguageEntry = { language: string; code: string };

function getLanguageCode(
  source: Partial<Record<string, string>> | LanguageEntry[] | undefined,
  language: string
): string | undefined {
  if (!source) return undefined;
  if (Array.isArray(source)) {
    return source.find((entry) => entry.language === language)?.code;
  }
  return source[language];
}

function matchesRuntime(runtime: PistonRuntime, language: Round2LanguageOption): boolean {
  const names = new Set([
    runtime.language.toLowerCase(),
    ...(runtime.aliases ?? []).map((alias) => alias.toLowerCase()),
  ]);

  return language.pistonNames.some((name) => names.has(name));
}

export function getSupportedRound2Languages(runtimes: PistonRuntime[]): Round2LanguageOption[] {
  return (Object.values(ROUND2_LANGUAGE_CONFIG) as Round2LanguageOption[]).filter((language) =>
    runtimes.some((runtime) => matchesRuntime(runtime, language))
  );
}

export function resolvePistonRuntime(
  runtimes: PistonRuntime[],
  language: string
): ResolvedPistonRuntime | null {
  const config = ROUND2_LANGUAGE_CONFIG[language as Round2LanguageId];
  if (!config) return null;

  const runtime = runtimes.find((entry) => matchesRuntime(entry, config));
  if (!runtime) return null;

  return {
    language: config.id,
    pistonLanguage: runtime.language,
    version: runtime.version,
  };
}

export function buildSubmissionSource(
  question: { wrappers?: Partial<Record<string, string>> | LanguageEntry[] },
  language: string,
  userCode: string
): string {
  const wrapper = getLanguageCode(question.wrappers, language);
  if (!wrapper) return userCode;
  return wrapper.replace(USER_CODE_PLACEHOLDER, userCode);
}

export function getStarterCode(
  question: {
    starterCode?: Partial<Record<string, string>>;
    starterTemplates?: LanguageEntry[];
  },
  language: string
): string {
  return getLanguageCode(question.starterCode ?? question.starterTemplates, language) ?? '';
}

export function getQuestionLanguageIds(question: {
  starterCode?: Partial<Record<string, string>>;
  starterTemplates?: LanguageEntry[];
}): Round2LanguageId[] {
  const candidates = Object.keys(ROUND2_LANGUAGE_CONFIG) as Round2LanguageId[];
  return candidates.filter((language) => Boolean(getStarterCode(question, language)));
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededScore(seed: string, key: string): number {
  return hashString(`${seed}::${key}`);
}

export function pickRound2Questions<T extends { _id: string; order: number }>(
  questions: T[],
  seed: string,
  count = ROUND2_QUESTION_COUNT
): T[] {
  return [...questions]
    .sort((a, b) => seededScore(seed, a._id) - seededScore(seed, b._id))
    .slice(0, count)
    .sort((a, b) => a.order - b.order);
}

export function isShortcutBlocked(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  const ctrlOrMeta = event.ctrlKey || event.metaKey;

  if (key === 'f11' || key === 'f12') return true;
  if (event.altKey && key === 'tab') return true;
  if (!ctrlOrMeta) return false;

  return ['r', 'w', 't', 'n', 's', 'p', 'u', 'i', 'j', 'c', 'k', 'l'].includes(key);
}
