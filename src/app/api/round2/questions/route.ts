import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CodingQuestion from '@/models/CodingQuestion';
import Participant from '@/models/Participant';
import { getConfig } from '@/models/EventConfig';
import { pickRound2Questions } from '@/lib/round2';

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

    const allQuestions = await CodingQuestion.find({}, '-hiddenTestCases -wrappers').sort({ order: 1 }).lean();
    const questions = pickRound2Questions(
      allQuestions.map((question) => ({
        ...question,
        _id: question._id.toString(),
      })),
      email.toLowerCase()
    );

    return NextResponse.json({ questions });
  } catch (err) {
    console.error('[round2/questions]', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
