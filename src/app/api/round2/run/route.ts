import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CodingQuestion from '@/models/CodingQuestion';
import { Judge0ServiceError, executeJudge0Submission } from '@/lib/judge0';
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

    const langId = getJudge0LanguageId(language);
    if (!langId) return NextResponse.json({ error: 'Unsupported language.' }, { status: 400 });

    const result = await executeJudge0Submission({
      sourceCode: buildSubmissionSource(question.toObject(), language, code),
      languageId: langId,
      stdin: question.sampleInput,
      expectedOutput: question.sampleOutput,
      cpuTimeLimit: question.timeLimit,
      memoryLimit: question.memoryLimit,
    });

    return NextResponse.json({
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: result.compileOutput,
      status: result.status,
      time: result.time,
      memory: result.memory,
    });
  } catch (err) {
    if (err instanceof Judge0ServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }

    console.error('[round2/run]', err);
    return NextResponse.json({ error: 'Execution failed.' }, { status: 500 });
  }
}
