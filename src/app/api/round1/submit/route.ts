import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MCQQuestion from '@/models/MCQQuestion';
import Participant from '@/models/Participant';
import { getConfig } from '@/models/EventConfig';

export async function POST(req: NextRequest) {
  try {
    const { email, answers, warnings } = await req.json();
    // answers: [{ questionId: string, selectedOption: number }]

    if (!email || !answers) {
      return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 });
    }

    await connectToDatabase();

    const config = await getConfig();
    if (!config.round1Active) {
      return NextResponse.json({ error: 'Round 1 is not active.' }, { status: 403 });
    }

    const participant = await Participant.findOne({ email: email.toLowerCase() });
    if (!participant) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    if (participant.round1SubmittedAt) {
      return NextResponse.json({ error: 'Already submitted.' }, { status: 403 });
    }

    // Fetch all questions with correct answers
    const questions = await MCQQuestion.find().lean();
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q.correctAnswer]));

    let score = 0;
    let correct = 0;
    const total = questions.length;

    for (const ans of answers) {
      const correctAnswer = questionMap.get(ans.questionId);
      if (correctAnswer !== undefined && correctAnswer === ans.selectedOption) {
        const q = questions.find((qu) => qu._id.toString() === ans.questionId);
        score += q?.points || 1;
        correct++;
      }
    }

    // Update participant
    participant.round1Score = score;
    participant.round1SubmittedAt = new Date();
    participant.round1Warnings = warnings || 0;
    await participant.save();

    return NextResponse.json({
      success: true,
      score,
      correct,
      total,
      message: `Mission complete. Score: ${score}`,
    });
  } catch (err) {
    console.error('[round1/submit]', err);
    return NextResponse.json({ error: 'Submission failed.' }, { status: 500 });
  }
}
