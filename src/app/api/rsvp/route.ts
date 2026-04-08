import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';

const MAX_MEMBERS = 120;

function serializeParticipant(participant: {
  participantId: string;
  name: string;
  teamType: 'solo' | 'duo';
  partner?: { name?: string };
}) {
  return {
    participantId: participant.participantId,
    name: participant.name,
    teamType: participant.teamType,
    partnerName: participant.partner?.name,
  };
}

async function getParticipantByToken(token: string) {
  await connectToDatabase();
  return Participant.findOne({ rsvpToken: token });
}

async function getConfirmedCounts() {
  const confirmedParticipants = await Participant.find({ rsvpStatus: 'CONFIRMED' }, 'teamType').lean();
  const confirmedTeams = confirmedParticipants.length;
  const confirmedMembers = confirmedParticipants.reduce((sum, participant) => {
    return sum + (participant.teamType === 'duo' ? 2 : 1);
  }, 0);

  return { confirmedTeams, confirmedMembers };
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing RSVP token.' }, { status: 400 });
    }

    const participant = await getParticipantByToken(token);
    if (!participant) {
      return NextResponse.json({ error: 'Invalid or expired RSVP token.' }, { status: 404 });
    }

    if (participant.rsvpStatus === 'CONFIRMED') {
      return NextResponse.json({
        success: true,
        alreadyConfirmed: true,
        message: 'You have already confirmed your RSVP!',
        ...serializeParticipant(participant),
      });
    }

    // Check if cap is already reached for pending RSVP
    const { confirmedMembers } = await getConfirmedCounts();
    const newMembers = participant.teamType === 'duo' ? 2 : 1;

    if (confirmedMembers + newMembers > MAX_MEMBERS) {
      return NextResponse.json(
        {
          error: 'RSVP is full! The maximum number of members has been reached.',
          capReached: true,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      requiresConfirmation: true,
      message: 'Review your team details and confirm your RSVP to lock your slot.',
      ...serializeParticipant(participant),
    });
  } catch (err) {
    console.error('[rsvp][get]', err);
    return NextResponse.json({ error: 'Failed to load RSVP details.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Missing RSVP token.' }, { status: 400 });
    }

    const participant = await getParticipantByToken(token);
    if (!participant) {
      return NextResponse.json({ error: 'Invalid or expired RSVP token.' }, { status: 404 });
    }

    if (participant.rsvpStatus === 'CONFIRMED') {
      return NextResponse.json({
        success: true,
        alreadyConfirmed: true,
        message: 'You have already confirmed your RSVP!',
        ...serializeParticipant(participant),
      });
    }

    const { confirmedMembers } = await getConfirmedCounts();
    const newMembers = participant.teamType === 'duo' ? 2 : 1;

    if (confirmedMembers + newMembers > MAX_MEMBERS) {
      return NextResponse.json(
        {
          error: 'RSVP is full! The maximum number of members has been reached.',
          capReached: true,
        },
        { status: 403 }
      );
    }

    const confirmedParticipant = await Participant.findOneAndUpdate(
      { _id: participant._id, rsvpStatus: 'PENDING' },
      { $set: { rsvpStatus: 'CONFIRMED', rsvpAt: new Date() } },
      { new: true }
    );

    if (!confirmedParticipant) {
      const latestParticipant = await Participant.findById(participant._id);
      if (latestParticipant?.rsvpStatus === 'CONFIRMED') {
        return NextResponse.json({
          success: true,
          alreadyConfirmed: true,
          message: 'You have already confirmed your RSVP!',
          ...serializeParticipant(latestParticipant),
        });
      }

      return NextResponse.json({ error: 'RSVP could not be confirmed. Please try again.' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      message: 'Your RSVP has been confirmed! You will receive your attendance pass soon.',
      ...serializeParticipant(confirmedParticipant),
    });
  } catch (err) {
    console.error('[rsvp][post]', err);
    return NextResponse.json({ error: 'Failed to process RSVP.' }, { status: 500 });
  }
}
