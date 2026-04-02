const DEFAULT_PISTON_API_URL = 'https://emkc.org/api/v2/piston';
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
const RUNTIMES_CACHE_TTL_MS = 5 * 60 * 1000;

type PistonStage = {
  stdout?: string | null;
  stderr?: string | null;
  output?: string | null;
  code?: number | null;
  signal?: string | null;
  message?: string | null;
  status?: string | null;
  cpu_time?: number | null;
  wall_time?: number | null;
  memory?: number | null;
};

type PistonExecutionResponse = {
  language?: string;
  version?: string;
  compile?: PistonStage | null;
  run?: PistonStage | null;
  message?: string;
};

export type PistonRuntime = {
  language: string;
  version: string;
  aliases?: string[];
};

export type PistonExecutionRequest = {
  sourceCode: string;
  language: string;
  version: string;
  stdin?: string;
  expectedOutput?: string;
  cpuTimeLimit?: number;
  memoryLimit?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export type PistonExecutionResult = {
  stdout: string;
  stderr: string;
  compileOutput: string;
  message: string;
  status: string;
  time: string | null;
  memory: number | null;
};

export class PistonServiceError extends Error {
  code:
    | 'BAD_REQUEST'
    | 'NETWORK_ERROR'
    | 'TIMEOUT'
    | 'INVALID_RESPONSE'
    | 'API_ERROR'
    | 'CONFIG_ERROR';
  statusCode: number;

  constructor(
    message: string,
    code: PistonServiceError['code'],
    statusCode = 500
  ) {
    super(message);
    this.name = 'PistonServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

let cachedRuntimes: { expiresAt: number; data: PistonRuntime[] } | null = null;
let runtimeRequest: Promise<PistonRuntime[]> | null = null;

function getPistonApiUrl(): string {
  return (process.env.PISTON_API_URL || DEFAULT_PISTON_API_URL).replace(/\/$/, '');
}

function getPistonApiKey(): string {
  const apiKey = process.env.PISTON_API_KEY;
  if (!apiKey) {
    throw new PistonServiceError('Piston API key is not configured.', 'CONFIG_ERROR', 500);
  }
  return apiKey;
}

function buildHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: getPistonApiKey(),
  };
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

function normalizeExpectedOutput(value: string): string {
  return normalizeNewlines(value).trimEnd();
}

function isStageSuccessful(stage: PistonStage | null | undefined): boolean {
  if (!stage) return true;
  return !stage.status && !stage.signal && (stage.code ?? 0) === 0;
}

function mapStageStatus(stage: PistonStage | null | undefined, fallback: string): string {
  if (!stage) return fallback;

  switch (stage.status) {
    case 'TO':
      return 'Time Limit Exceeded';
    case 'OL':
    case 'EL':
      return 'Output Limit Exceeded';
    case 'SG':
      return 'Runtime Error';
    case 'RE':
      return 'Runtime Error';
    case 'XX':
      return 'Internal Error';
    default:
      break;
  }

  if (stage.signal) return 'Runtime Error';
  if ((stage.code ?? 0) !== 0) return fallback;
  return fallback;
}

function summarizeCompileOutput(stage: PistonStage | null | undefined): string {
  if (!stage) return '';
  return [stage.output, stage.stderr, stage.stdout].find(
    (value): value is string => typeof value === 'string' && value.length > 0
  ) ?? '';
}

function normalizePistonResponse(
  payload: unknown,
  expectedOutput?: string
): PistonExecutionResult {
  if (!payload || typeof payload !== 'object') {
    throw new PistonServiceError('Piston returned an invalid response payload.', 'INVALID_RESPONSE', 502);
  }

  const response = payload as PistonExecutionResponse;
  const runStage = response.run;
  if (!runStage || typeof runStage !== 'object') {
    throw new PistonServiceError('Piston response is missing run output.', 'INVALID_RESPONSE', 502);
  }

  const stdout = runStage.stdout ?? '';
  const stderr = runStage.stderr ?? '';
  const compileOutput = summarizeCompileOutput(response.compile);
  const message = response.compile?.message ?? runStage.message ?? response.message ?? '';

  let status = 'Accepted';
  if (!isStageSuccessful(response.compile)) {
    status = 'Compilation Error';
  } else if (!isStageSuccessful(runStage)) {
    status = mapStageStatus(runStage, 'Runtime Error');
  } else if (typeof expectedOutput === 'string') {
    status =
      normalizeExpectedOutput(stdout) === normalizeExpectedOutput(expectedOutput)
        ? 'Accepted'
        : 'Wrong Answer';
  }

  return {
    stdout,
    stderr,
    compileOutput,
    message,
    status,
    time:
      typeof runStage.wall_time === 'number'
        ? String(runStage.wall_time)
        : runStage.wall_time != null
          ? String(runStage.wall_time)
          : null,
    memory: typeof runStage.memory === 'number' ? runStage.memory : null,
  };
}

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string; error?: string };
    return payload.message || payload.error || `Piston request failed with status ${response.status}.`;
  } catch {
    return `Piston request failed with status ${response.status}.`;
  }
}

export async function getPistonRuntimes(fetchImpl: typeof fetch = fetch): Promise<PistonRuntime[]> {
  if (cachedRuntimes && cachedRuntimes.expiresAt > Date.now()) {
    return cachedRuntimes.data;
  }

  if (runtimeRequest) {
    return runtimeRequest;
  }

  runtimeRequest = (async () => {
    const response = await fetchImpl(`${getPistonApiUrl()}/runtimes`, {
      method: 'GET',
      headers: {
        Authorization: getPistonApiKey(),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new PistonServiceError(await parseErrorResponse(response), 'API_ERROR', 502);
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      throw new PistonServiceError('Piston runtimes response is invalid.', 'INVALID_RESPONSE', 502);
    }

    const runtimes = payload.filter(
      (item): item is PistonRuntime =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as PistonRuntime).language === 'string' &&
        typeof (item as PistonRuntime).version === 'string'
    );

    cachedRuntimes = {
      expiresAt: Date.now() + RUNTIMES_CACHE_TTL_MS,
      data: runtimes,
    };

    return runtimes;
  })();

  try {
    return await runtimeRequest;
  } catch (error) {
    if (error instanceof PistonServiceError) {
      throw error;
    }
    throw new PistonServiceError('Unable to fetch Piston runtimes.', 'NETWORK_ERROR', 502);
  } finally {
    runtimeRequest = null;
  }
}

export async function executePistonSubmission({
  sourceCode,
  language,
  version,
  stdin,
  expectedOutput,
  cpuTimeLimit,
  memoryLimit,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  fetchImpl = fetch,
}: PistonExecutionRequest): Promise<PistonExecutionResult> {
  if (!sourceCode.trim()) {
    throw new PistonServiceError('Source code is required.', 'BAD_REQUEST', 400);
  }

  if (!language.trim() || !version.trim()) {
    throw new PistonServiceError('A valid Piston runtime is required.', 'BAD_REQUEST', 400);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('Piston request timed out.'), timeoutMs);

  try {
    const response = await fetchImpl(`${getPistonApiUrl()}/execute`, {
      method: 'POST',
      headers: buildHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        language,
        version,
        files: [{ content: sourceCode }],
        stdin: stdin ?? '',
        compile_timeout: cpuTimeLimit ? Math.max(cpuTimeLimit * 1000, 1000) : undefined,
        run_timeout: cpuTimeLimit ? Math.max(cpuTimeLimit * 1000, 1000) : undefined,
        compile_cpu_time: cpuTimeLimit ? Math.max(cpuTimeLimit * 1000, 1000) : undefined,
        run_cpu_time: cpuTimeLimit ? Math.max(cpuTimeLimit * 1000, 1000) : undefined,
        compile_memory_limit: memoryLimit ? memoryLimit * 1024 * 1024 : undefined,
        run_memory_limit: memoryLimit ? memoryLimit * 1024 * 1024 : undefined,
      }),
    });

    if (!response.ok) {
      throw new PistonServiceError(await parseErrorResponse(response), 'API_ERROR', 502);
    }

    return normalizePistonResponse(await response.json(), expectedOutput);
  } catch (error) {
    if (error instanceof PistonServiceError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new PistonServiceError('Piston request timed out.', 'TIMEOUT', 504);
    }

    throw new PistonServiceError('Unable to reach Piston.', 'NETWORK_ERROR', 502);
  } finally {
    clearTimeout(timer);
  }
}
