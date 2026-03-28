import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';

const MAX_TEAMS = 50;
const MAX_MEMBERS = 100;

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing RSVP token.' }, { status: 400 });
    }

    await connectToDatabase();

    // Find participant by token
    const participant = await Participant.findOne({ rsvpToken: token });
    if (!participant) {
      return NextResponse.json({ error: 'Invalid or expired RSVP token.' }, { status: 404 });
    }

    // Already confirmed
    if (participant.rsvpStatus === 'CONFIRMED') {
      return NextResponse.json({
        success: true,
        alreadyConfirmed: true,
        message: 'You have already confirmed your RSVP!',
        participantId: participant.participantId,
        name: participant.name,
      });
    }

    // Check caps
    const confirmedTeams = await Participant.countDocuments({ rsvpStatus: 'CONFIRMED' });
    
    // Count total members (solo = 1, duo = 2)
    const confirmedParticipants = await Participant.find({ rsvpStatus: 'CONFIRMED' }).lean();
    const confirmedMembers = confirmedParticipants.reduce((sum, p) => {
      return sum + (p.teamType === 'duo' ? 2 : 1);
    }, 0);

    // Calculate what this team would add
    const newMembers = participant.teamType === 'duo' ? 2 : 1;

    if (confirmedTeams >= MAX_TEAMS) {
      return NextResponse.json({
        error: 'RSVP is full! The maximum number of teams has been reached.',
        capReached: true,
      }, { status: 403 });
    }

    if (confirmedMembers + newMembers > MAX_MEMBERS) {
      return NextResponse.json({
        error: 'RSVP is full! The maximum number of members has been reached.',
        capReached: true,
      }, { status: 403 });
    }

    // Confirm RSVP
    participant.rsvpStatus = 'CONFIRMED';
    participant.rsvpAt = new Date();
    await participant.save();

    return NextResponse.json({
      success: true,
      message: 'Your RSVP has been confirmed! You will receive your attendance pass soon.',
      participantId: participant.participantId,
      name: participant.name,
      teamType: participant.teamType,
      partnerName: participant.partner?.name,
    });
  } catch (err) {
    console.error('[rsvp]', err);
    return NextResponse.json({ error: 'Failed to process RSVP.' }, { status: 500 });
  }
}
