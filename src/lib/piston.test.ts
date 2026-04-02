import assert from 'node:assert/strict';
import { executePistonSubmission, getPistonRuntimes, PistonServiceError } from './piston.ts';

process.env.PISTON_API_KEY = 'test-key';

async function testExecuteSuccess() {
  let requestedUrl = '';
  let requestInit: RequestInit | undefined;

  const result = await executePistonSubmission({
    sourceCode: 'print("hello")',
    language: 'python',
    version: '3.11.0',
    stdin: '',
    expectedOutput: 'hello\n',
    cpuTimeLimit: 2,
    memoryLimit: 128,
    fetchImpl: async (input, init) => {
      requestedUrl = String(input);
      requestInit = init;
      return new Response(
        JSON.stringify({
          language: 'python',
          version: '3.11.0',
          run: {
            stdout: 'hello\n',
            stderr: '',
            output: 'hello\n',
            code: 0,
            signal: null,
            message: null,
            status: null,
            wall_time: 24,
            memory: 1024,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    },
  });

  assert.equal(requestedUrl, 'https://emkc.org/api/v2/piston/execute');
  assert.equal((requestInit?.headers as Record<string, string>).Authorization, 'test-key');
  const body = JSON.parse(String(requestInit?.body));
  assert.equal(body.language, 'python');
  assert.equal(body.version, '3.11.0');
  assert.equal(body.files[0].content, 'print("hello")');
  assert.equal(body.run_timeout, 2000);
  assert.equal(body.run_memory_limit, 134217728);
  assert.deepEqual(result, {
    stdout: 'hello\n',
    stderr: '',
    compileOutput: '',
    message: '',
    status: 'Accepted',
    time: '24',
    memory: 1024,
  });
}

async function testWrongAnswer() {
  const result = await executePistonSubmission({
    sourceCode: 'print("hi")',
    language: 'python',
    version: '3.11.0',
    expectedOutput: 'hello\n',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          run: {
            stdout: 'hi\n',
            stderr: '',
            output: 'hi\n',
            code: 0,
            signal: null,
            message: null,
            status: null,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ),
  });

  assert.equal(result.status, 'Wrong Answer');
}

async function testCompileError() {
  const result = await executePistonSubmission({
    sourceCode: 'broken code',
    language: 'java',
    version: '21.0.0',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          compile: {
            stdout: '',
            stderr: 'Main.java:1: error',
            output: 'Main.java:1: error',
            code: 1,
            signal: null,
            message: 'Compilation failed',
            status: 'RE',
          },
          run: {
            stdout: '',
            stderr: '',
            output: '',
            code: 0,
            signal: null,
            message: null,
            status: null,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ),
  });

  assert.equal(result.status, 'Compilation Error');
  assert.equal(result.compileOutput, 'Main.java:1: error');
}

async function testApiFailure() {
  await assert.rejects(
    () =>
      executePistonSubmission({
        sourceCode: 'print("hello")',
        language: 'python',
        version: '3.11.0',
        fetchImpl: async () =>
          new Response(JSON.stringify({ message: 'unknown runtime' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }),
      }),
    (error: unknown) => {
      assert.ok(error instanceof PistonServiceError);
      assert.equal(error.message, 'unknown runtime');
      assert.equal(error.statusCode, 502);
      return true;
    }
  );
}

async function testRuntimes() {
  let requestedUrl = '';
  const runtimes = await getPistonRuntimes(async (input) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify([
        { language: 'python', version: '3.11.0', aliases: ['py', 'python3'] },
        { language: 'c++', version: '17.0.0', aliases: ['cpp'] },
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  });

  assert.equal(requestedUrl, 'https://emkc.org/api/v2/piston/runtimes');
  assert.equal(runtimes.length, 2);
  assert.equal(runtimes[0]?.language, 'python');
}

async function main() {
  await testExecuteSuccess();
  await testWrongAnswer();
  await testCompileError();
  await testApiFailure();
  await testRuntimes();
  console.log('Piston tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
