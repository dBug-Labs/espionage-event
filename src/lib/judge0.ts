const DEFAULT_JUDGE0_API_URL = 'https://ce.judge0.com';
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

type Judge0Status = {
  description?: string;
};

type Judge0SubmissionResponse = {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  status?: Judge0Status | null;
  time?: string | null;
  memory?: number | null;
  error?: string;
};

export type Judge0ExecutionRequest = {
  sourceCode: string;
  languageId: number;
  stdin?: string;
  expectedOutput?: string;
  cpuTimeLimit?: number;
  memoryLimit?: number;
  timeoutMs?: number;
  apiUrl?: string;
  fetchImpl?: typeof fetch;
};

export type Judge0ExecutionResult = {
  stdout: string;
  stderr: string;
  compileOutput: string;
  message: string;
  status: string;
  time: string | null;
  memory: number | null;
};

export class Judge0ServiceError extends Error {
  code: 'BAD_REQUEST' | 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'API_ERROR';
  statusCode: number;

  constructor(
    message: string,
    code: Judge0ServiceError['code'],
    statusCode = 500
  ) {
    super(message);
    this.name = 'Judge0ServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function buildJudge0Url(apiUrl: string): string {
  return `${apiUrl.replace(/\/$/, '')}/submissions?wait=true&base64_encoded=false`;
}

function normalizeJudge0Response(payload: unknown): Judge0ExecutionResult {
  if (!payload || typeof payload !== 'object') {
    throw new Judge0ServiceError('Judge0 returned an invalid response payload.', 'INVALID_RESPONSE', 502);
  }

  const response = payload as Judge0SubmissionResponse;
  const status = response.status?.description;

  if (typeof status !== 'string' || status.length === 0) {
    throw new Judge0ServiceError('Judge0 response is missing execution status.', 'INVALID_RESPONSE', 502);
  }

  return {
    stdout: response.stdout ?? '',
    stderr: response.stderr ?? '',
    compileOutput: response.compile_output ?? '',
    message: response.message ?? '',
    status,
    time: response.time ?? null,
    memory: response.memory ?? null,
  };
}

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as Judge0SubmissionResponse;
    return payload.error || payload.message || `Judge0 request failed with status ${response.status}.`;
  } catch {
    return `Judge0 request failed with status ${response.status}.`;
  }
}

export async function executeJudge0Submission({
  sourceCode,
  languageId,
  stdin,
  expectedOutput,
  cpuTimeLimit,
  memoryLimit,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  apiUrl = process.env.JUDGE0_API_URL || DEFAULT_JUDGE0_API_URL,
  fetchImpl = fetch,
}: Judge0ExecutionRequest): Promise<Judge0ExecutionResult> {
  if (!sourceCode.trim()) {
    throw new Judge0ServiceError('Source code is required.', 'BAD_REQUEST', 400);
  }

  if (!Number.isInteger(languageId) || languageId <= 0) {
    throw new Judge0ServiceError('A valid Judge0 language id is required.', 'BAD_REQUEST', 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('Judge0 request timed out.'), timeoutMs);

  try {
    const response = await fetchImpl(buildJudge0Url(apiUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: languageId,
        stdin,
        expected_output: expectedOutput,
        cpu_time_limit: cpuTimeLimit,
        memory_limit: memoryLimit,
      }),
    });

    if (!response.ok) {
      throw new Judge0ServiceError(await parseErrorResponse(response), 'API_ERROR', 502);
    }

    return normalizeJudge0Response(await response.json());
  } catch (error) {
    if (error instanceof Judge0ServiceError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Judge0ServiceError('Judge0 request timed out.', 'TIMEOUT', 504);
    }

    throw new Judge0ServiceError('Unable to reach Judge0.', 'NETWORK_ERROR', 502);
  } finally {
    clearTimeout(timer);
  }
}
