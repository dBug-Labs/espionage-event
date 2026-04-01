import assert from 'node:assert/strict';

import { Judge0ServiceError, executeJudge0Submission } from './judge0.ts';

async function testSuccessfulExecution() {
  const result = await executeJudge0Submission({
    sourceCode: 'print("hello")',
    languageId: 71,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          stdout: 'hello\n',
          stderr: null,
          compile_output: null,
          message: null,
          status: { description: 'Accepted' },
          time: '0.01',
          memory: 1234,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
  });

  assert.deepEqual(result, {
    stdout: 'hello\n',
    stderr: '',
    compileOutput: '',
    message: '',
    status: 'Accepted',
    time: '0.01',
    memory: 1234,
  });
}

async function testEmptySourceCode() {
  await assert.rejects(
    () =>
      executeJudge0Submission({
        sourceCode: '   ',
        languageId: 71,
      }),
    (error: unknown) => {
      assert.ok(error instanceof Judge0ServiceError);
      assert.equal(error.code, 'BAD_REQUEST');
      assert.equal(error.statusCode, 400);
      return true;
    }
  );
}

async function testApiFailureMapping() {
  await assert.rejects(
    () =>
      executeJudge0Submission({
        sourceCode: 'print("hello")',
        languageId: 71,
        fetchImpl: async () =>
          new Response(JSON.stringify({ error: 'invalid language_id' }), {
            status: 422,
            headers: { 'Content-Type': 'application/json' },
          }),
      }),
    (error: unknown) => {
      assert.ok(error instanceof Judge0ServiceError);
      assert.equal(error.code, 'API_ERROR');
      assert.equal(error.message, 'invalid language_id');
      return true;
    }
  );
}

async function run() {
  await testSuccessfulExecution();
  await testEmptySourceCode();
  await testApiFailureMapping();
  console.log('Judge0 tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
