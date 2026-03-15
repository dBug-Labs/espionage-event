import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MCQQuestion from '@/models/MCQQuestion';
import Participant from '@/models/Participant';
import { getConfig } from '@/models/EventConfig';

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'Auth required.' }, { status: 401 });

    await connectToDatabase();

    const config = await getConfig();
    if (!config.round1Active) {
      return NextResponse.json({ error: 'Round 1 is not active.' }, { status: 403 });
    }

    const participant = await Participant.findOne({ email: email.toLowerCase() });
    if (!participant) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    if (participant.round1SubmittedAt) {
      return NextResponse.json({ error: 'You have already submitted Round 1.' }, { status: 403 });
    }

    // Return questions WITHOUT correctAnswer
    const questions = await MCQQuestion.find({}, '-correctAnswer').sort({ order: 1 }).lean();

    return NextResponse.json({ questions });
  } catch (err) {
    console.error('[round1/questions]', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
