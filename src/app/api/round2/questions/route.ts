import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CodingQuestion from '@/models/CodingQuestion';
import Participant from '@/models/Participant';
import { getConfig } from '@/models/EventConfig';

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

    // Return questions WITHOUT hiddenTestCases
    const questions = await CodingQuestion.find(
      {},
      '-hiddenTestCases'
    ).sort({ order: 1 }).lean();

    return NextResponse.json({ questions });
  } catch (err) {
    console.error('[round2/questions]', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
