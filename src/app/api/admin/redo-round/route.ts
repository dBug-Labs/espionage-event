import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';

export async function POST(req: NextRequest) {
  try {
    const { password, participantId, round } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!participantId || !['round1', 'round2'].includes(round)) {
      return NextResponse.json({ error: 'Participant ID and valid round are required.' }, { status: 400 });
    }

    await connectToDatabase();

    const participant = await Participant.findOne({ participantId });
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });
    }

    if (round === 'round1') {
      participant.round1Score = null;
      participant.round1SubmittedAt = null;
      participant.round1Warnings = 0;
      participant.round1KeyViolations = 0;
    } else {
      participant.round2Score = null;
      participant.round2Warnings = 0;
      participant.round2KeyViolations = 0;
      participant.round2Submissions = [];
      participant.round2SubmittedAt = null;
      participant.round2FinalSubmissions = [];
      participant.round2Evaluations = [];
      participant.round2AiScore = null;
      participant.round2FinalScore = null;
    }

    await participant.save();

    return NextResponse.json({
      success: true,
      message: `${participantId} can now redo ${round === 'round1' ? 'Round 1' : 'Round 2'}.`,
    });
  } catch (err) {
    console.error('[admin/redo-round]', err);
    return NextResponse.json({ error: 'Failed to reset round.' }, { status: 500 });
  }
}
