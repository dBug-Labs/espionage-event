import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CodingQuestion from '@/models/CodingQuestion';

// Run against sample test cases only — no scoring
export async function POST(req: NextRequest) {
  try {
    const { code, language, questionId } = await req.json();
    if (!code || !language || !questionId) {
      return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });
    }

    await connectToDatabase();

    const question = await CodingQuestion.findById(questionId);
    if (!question) return NextResponse.json({ error: 'Question not found.' }, { status: 404 });

    const judge0Url = process.env.JUDGE0_API_URL;
    if (!judge0Url) {
      return NextResponse.json({ error: 'Compiler not configured.' }, { status: 503 });
    }

    // Language IDs for Judge0
    const langMap: Record<string, number> = {
      python: 71,
      cpp: 54,
      java: 62,
      javascript: 63,
    };

    const langId = langMap[language];
    if (!langId) return NextResponse.json({ error: 'Unsupported language.' }, { status: 400 });

    // Run against sample test case
    const submission = await fetch(`${judge0Url}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: code,
        language_id: langId,
        stdin: question.sampleInput,
        expected_output: question.sampleOutput,
        time_limit: question.timeLimit,
        memory_limit: question.memoryLimit,
      }),
    });

    const result = await submission.json();

    return NextResponse.json({
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      compile_output: result.compile_output || '',
      status: result.status?.description || 'Unknown',
      time: result.time,
      memory: result.memory,
    });
  } catch (err) {
    console.error('[round2/run]', err);
    return NextResponse.json({ error: 'Execution failed.' }, { status: 500 });
  }
}
