import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'Email required.' }, { status: 400 });
    }

    await connectToDatabase();
    const participant = await Participant.findOne(
      { email: email.toLowerCase() },
      'participantId name round1Score round1SubmittedAt isShortlisted round2Score attendanceRound1 attendanceRound2'
    ).lean();

    if (!participant) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    return NextResponse.json({ participant });
  } catch (err) {
    console.error('[dashboard/me]', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
