import { callOpenRouter } from './openrouter';

export interface Round2AIScore {
  scorePercent: number;
  rationale: string;
  strengths: string[];
  issues: string[];
}

function clampScore(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Failed to parse OpenRouter evaluation JSON.');
  }
}

export async function evaluateRound2Submission(params: {
  participantId: string;
  participantName: string;
  questionTitle: string;
  questionDescription: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  language: string;
  code: string;
  testcaseScorePercent: number;
  verdict: string;
}): Promise<Round2AIScore> {
  if (params.testcaseScorePercent >= 100 || params.verdict === 'Accepted') {
    return {
      scorePercent: 100,
      rationale: 'All visible and hidden test cases passed, so the solution receives full logical credit.',
      strengths: ['Correct on all judged test cases.'],
      issues: [],
    };
  }

  const prompt = `
You are evaluating a competitive programming submission for logical correctness.
Return strict JSON only with this shape:
{"scorePercent": number, "rationale": string, "strengths": string[], "issues": string[]}

Rules:
- scorePercent must be an integer from 0 to 100.
- Judge the implementation quality and how close the logic is to a correct solution.
- Use the testcaseScorePercent only as supporting signal, not as the final score by itself.
- If the approach is fundamentally correct but incomplete or buggy, score accordingly.
- Keep rationale to 2-4 sentences.
- strengths and issues should each contain short bullet-style strings.

Participant: ${params.participantName} (${params.participantId})
Question: ${params.questionTitle}
Language: ${params.language}
Judged verdict: ${params.verdict}
Testcase score percent: ${params.testcaseScorePercent}

Problem statement:
${params.questionDescription}

Input format:
${params.inputFormat}

Output format:
${params.outputFormat}

Constraints:
${params.constraints}

Sample input:
${params.sampleInput}

Sample output:
${params.sampleOutput}

Submission code:
\`\`\`${params.language}
${params.code}
\`\`\`
`;

  const response = await callOpenRouter(prompt);
  const parsed = extractJson(response) as Record<string, unknown>;

  return {
    scorePercent: clampScore(parsed.scorePercent),
    rationale: typeof parsed.rationale === 'string' ? parsed.rationale.trim() : 'No rationale provided.',
    strengths: normalizeStringArray(parsed.strengths),
    issues: normalizeStringArray(parsed.issues),
  };
}

export function computeWeightedRound2Percentage(items: { finalScorePercent: number; weight: number }[]): number | null {
  if (items.length === 0) return null;

  const totalWeight = items.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  if (totalWeight === 0) return null;

  const weighted = items.reduce((sum, item) => sum + item.finalScorePercent * Math.max(1, item.weight), 0);
  return Math.round((weighted / totalWeight) * 100) / 100;
}
