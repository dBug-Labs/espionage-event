export const ROUND2_QUESTION_COUNT = 5;

export const ROUND2_LANGUAGE_IDS: Record<string, number> = {
  c: 50,
  cpp: 54,
  java: 62,
  python: 71,
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

export function getJudge0LanguageId(language: string): number | null {
  return ROUND2_LANGUAGE_IDS[language] ?? null;
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
