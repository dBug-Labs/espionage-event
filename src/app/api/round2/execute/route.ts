import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CodingQuestion from '@/models/CodingQuestion';
import Participant from '@/models/Participant';
import { getConfig } from '@/models/EventConfig';
import { buildSubmissionSource, getJudge0LanguageId, pickRound2Questions } from '@/lib/round2';

// Submit against hidden test cases — scoring
export async function POST(req: NextRequest) {
  try {
    const { email, code, language, questionId } = await req.json();
    if (!email || !code || !language || !questionId) {
      return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });
    }

    await connectToDatabase();

    const config = await getConfig();
    if (!config.round2Active) return NextResponse.json({ error: 'Round 2 not active.' }, { status: 403 });

    const participant = await Participant.findOne({ email: email.toLowerCase() });
    if (!participant) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    if (!participant.isShortlisted) return NextResponse.json({ error: 'Not shortlisted.' }, { status: 403 });

    const question = await CodingQuestion.findById(questionId);
    if (!question) return NextResponse.json({ error: 'Question not found.' }, { status: 404 });

    const judge0Url = process.env.JUDGE0_API_URL;
    if (!judge0Url) return NextResponse.json({ error: 'Compiler not configured.' }, { status: 503 });

    const visibleQuestions = await CodingQuestion.find({}, '_id order points').sort({ order: 1 }).lean();
    const assignedQuestions = pickRound2Questions(
      visibleQuestions.map((item) => ({
        _id: item._id.toString(),
        order: item.order,
        points: item.points,
      })),
      email.toLowerCase()
    );
    const assignedIds = new Set(assignedQuestions.map((item) => item._id));
    if (!assignedIds.has(questionId)) {
      return NextResponse.json({ error: 'Question not assigned to this login.' }, { status: 403 });
    }

    const langId = getJudge0LanguageId(language);
    if (!langId) return NextResponse.json({ error: 'Unsupported language.' }, { status: 400 });

    // Run against all hidden test cases
    const allTestCases = [
      { input: question.sampleInput, expectedOutput: question.sampleOutput },
      ...question.hiddenTestCases,
    ];

    let passed = 0;
    const total = allTestCases.length;
    let verdict = 'Accepted';
    const results: { testCase: number; status: string; passed: boolean }[] = [];

    for (let i = 0; i < allTestCases.length; i++) {
      const tc = allTestCases[i];
      try {
        const submission = await fetch(`${judge0Url}/submissions?base64_encoded=false&wait=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_code: buildSubmissionSource(question.toObject(), language, code),
            language_id: langId,
            stdin: tc.input,
            expected_output: tc.expectedOutput,
            time_limit: question.timeLimit,
            memory_limit: question.memoryLimit,
          }),
        });

        const result = await submission.json();
        const statusDesc = result.status?.description || 'Unknown';
        const isPassed = statusDesc === 'Accepted';

        if (isPassed) passed++;
        else if (verdict === 'Accepted') verdict = statusDesc;

        results.push({ testCase: i + 1, status: statusDesc, passed: isPassed });
      } catch {
        results.push({ testCase: i + 1, status: 'Runtime Error', passed: false });
        if (verdict === 'Accepted') verdict = 'Runtime Error';
      }
    }

    // Calculate score for this question
    const scoreForQuestion = passed === total ? question.points : 0;

    // Store submission
    participant.round2Submissions.push({
      questionId,
      code,
      language,
      verdict: passed === total ? 'Accepted' : verdict,
      submittedAt: new Date(),
    });

    // Update total round2 score
    // Recalculate from all accepted submissions
    const acceptedQuestionIds = new Set(
      participant.round2Submissions
        .filter((s: { verdict: string }) => s.verdict === 'Accepted')
        .map((s: { questionId: string }) => s.questionId)
    );
    // If this submission is accepted, add it
    if (passed === total) acceptedQuestionIds.add(questionId);

    // Fetch all coding questions to sum points
    const pointsById = new Map(assignedQuestions.map((q) => [q._id, q.points]));
    let totalScore = 0;
    for (const acceptedId of acceptedQuestionIds) {
      totalScore += pointsById.get(acceptedId) ?? 0;
    }
    participant.round2Score = totalScore;
    await participant.save();

    return NextResponse.json({
      verdict: passed === total ? 'Accepted' : verdict,
      passed,
      total,
      scoreForQuestion,
      totalScore,
      results,
    });
  } catch (err) {
    console.error('[round2/execute]', err);
    return NextResponse.json({ error: 'Submission failed.' }, { status: 500 });
  }
}
