import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';

export async function POST(req: NextRequest) {
  try {
    const { teamId } = await req.json();

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required.' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Find participant by participantId with confirmed RSVP
    const participant = await Participant.findOne({ participantId: teamId, rsvpStatus: 'CONFIRMED' });
    
    if (!participant) {
      return NextResponse.json({ error: 'Team not found or RSVP not confirmed.' }, { status: 404 });
    }

    // Check if already present
    if (participant.attendance?.present) {
      return NextResponse.json({ 
        error: `${participant.name} (${participant.participantId}) is already checked in.`,
        alreadyCheckedIn: true 
      }, { status: 400 });
    }

    // Mark as present
    participant.attendance = {
      present: true,
      checkedAt: new Date()
    };
    
    await participant.save();

    return NextResponse.json({
      success: true,
      teamId: participant.participantId,
      teamName: participant.name,
      leaderName: participant.name,
      membersCount: participant.teamType === 'duo' ? 2 : 1,
    });

  } catch (err) {
    console.error('[attendance]', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
