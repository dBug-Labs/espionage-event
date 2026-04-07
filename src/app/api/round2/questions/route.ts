import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CodingQuestion from '@/models/CodingQuestion';
import Participant from '@/models/Participant';
import { getConfig } from '@/models/EventConfig';
import { getSupportedRound2Languages, pickRound2Questions, ROUND2_QUESTION_COUNT, sortQuestionsByAssignedIds } from '@/lib/round2';
import { getPistonRuntimes, PistonServiceError } from '@/lib/piston';

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'Auth required.' }, { status: 401 });

    await connectToDatabase();

    const config = await getConfig();
    if (!config.round2Active) {
      return NextResponse.json({ error: 'Round 2 is not active.' }, { status: 403 });
    }

    const participant = await Participant.findOne({ email: email.toLowerCase() });
    if (!participant) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    if (!participant.isShortlisted) {
      return NextResponse.json({ error: 'You are not shortlisted for Round 2.' }, { status: 403 });
    }

    if (!participant.attendanceRound2?.present) {
      return NextResponse.json(
        { error: 'Attendance not marked for Round 2. Please check in with an admin first.' },
        { status: 403 }
      );
    }

    const allQuestions = await CodingQuestion.find({}, '-hiddenTestCases -wrappers').sort({ order: 1 }).lean();
    const normalizedQuestions = allQuestions.map((question) => ({
      ...question,
      _id: question._id.toString(),
    }));

    const existingIds = participant.round2QuestionIds ?? [];
    const existingQuestions = normalizedQuestions.filter((question) => existingIds.includes(question._id));

    let questions;
    if (existingIds.length === ROUND2_QUESTION_COUNT && existingQuestions.length === existingIds.length) {
      questions = sortQuestionsByAssignedIds(existingQuestions, existingIds);
    } else {
      questions = pickRound2Questions(normalizedQuestions, email.toLowerCase());
      participant.round2QuestionIds = questions.map((question) => question._id);
      await participant.save();
    }

    const runtimes = await getPistonRuntimes();
    const supportedLanguages = getSupportedRound2Languages(runtimes);

    return NextResponse.json({ questions, supportedLanguages });
  } catch (err) {
    if (err instanceof PistonServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }

    console.error('[round2/questions]', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
