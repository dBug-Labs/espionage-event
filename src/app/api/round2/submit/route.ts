import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import { getConfig } from '@/models/EventConfig';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Invalid submission request.' }, { status: 400 });
    }

    await connectToDatabase();

    const config = await getConfig();
    if (!config.round2Active) {
      return NextResponse.json({ error: 'Round 2 is not active.' }, { status: 403 });
    }

    const participant = await Participant.findOne({ email: email.toLowerCase() });
    if (!participant) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    
    if (participant.round2SubmittedAt) {
      return NextResponse.json({ error: 'Already submitted.' }, { status: 403 });
    }

    // Mark the round as submitted
    participant.round2SubmittedAt = new Date();
    await participant.save();

    return NextResponse.json({
      success: true,
      message: 'Round 2 Final Submission captured successfully.',
    });
  } catch (err) {
    console.error('[round2/submit]', err);
    return NextResponse.json({ error: 'Final submission failed.' }, { status: 500 });
  }
}
