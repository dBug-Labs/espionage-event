import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CodingQuestion from '@/models/CodingQuestion';
import { buildSubmissionSource, getJudge0LanguageId, pickRound2Questions } from '@/lib/round2';

// Run against sample test cases only - no scoring
export async function POST(req: NextRequest) {
  try {
    const { email, code, language, questionId } = await req.json();
    if (!code || !language || !questionId || !email) {
      return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });
    }

    await connectToDatabase();

    const question = await CodingQuestion.findById(questionId);
    if (!question) return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    const visibleQuestions = await CodingQuestion.find({}, '_id order').sort({ order: 1 }).lean();
    const assignedIds = new Set(
      pickRound2Questions(
        visibleQuestions.map((item) => ({ _id: item._id.toString(), order: item.order })),
        email.toLowerCase()
      ).map((item) => item._id)
    );
    if (!assignedIds.has(questionId)) {
      return NextResponse.json({ error: 'Question not assigned to this login.' }, { status: 403 });
    }

    const judge0Url = process.env.JUDGE0_API_URL;
    if (!judge0Url) {
      return NextResponse.json({ error: 'Compiler not configured.' }, { status: 503 });
    }

    const langId = getJudge0LanguageId(language);
    if (!langId) return NextResponse.json({ error: 'Unsupported language.' }, { status: 400 });

    const submission = await fetch(`${judge0Url}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: buildSubmissionSource(question.toObject(), language, code),
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
