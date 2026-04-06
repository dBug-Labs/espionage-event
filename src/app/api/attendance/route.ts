import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';

type AttendanceStage = 'round1' | 'round2';

function normalizeStage(value: unknown): AttendanceStage {
  return value === 'round2' ? 'round2' : 'round1';
}

function normalizeTeamId(value: string): string {
  return value.trim().toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const stage = normalizeStage(body.stage);
    const teamId = typeof body.teamId === 'string' ? normalizeTeamId(body.teamId) : '';

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required.' }, { status: 400 });
    }

    if (!teamId.startsWith('ESP-')) {
      return NextResponse.json({ error: 'Invalid team ID. Expected an ESP code.' }, { status: 400 });
    }

    await connectToDatabase();

    const participant = await Participant.findOne({ participantId: teamId });
    if (!participant) {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }

    if (stage === 'round1' && participant.rsvpStatus !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Round 1 attendance is only allowed for RSVP-confirmed teams.' }, { status: 403 });
    }

    if (stage === 'round2' && !participant.isShortlisted) {
      return NextResponse.json({ error: 'Round 2 attendance is only allowed for shortlisted teams.' }, { status: 403 });
    }

    participant.attendanceRound1 ??= {
      present: Boolean(participant.attendance?.present),
      checkedAt: participant.attendance?.checkedAt ?? null,
    };
    participant.attendanceRound2 ??= {
      present: false,
      checkedAt: null,
    };

    const attendanceRecord =
      stage === 'round2'
        ? participant.attendanceRound2
        : participant.attendanceRound1;

    if (attendanceRecord?.present) {
      return NextResponse.json(
        {
          error: `${participant.name} (${participant.participantId}) is already checked in for ${stage === 'round1' ? 'Round 1' : 'Round 2'}.`,
          alreadyCheckedIn: true,
        },
        { status: 400 }
      );
    }

    const checkedAt = new Date();

    if (stage === 'round2') {
      participant.attendanceRound2 = {
        present: true,
        checkedAt,
      };
    } else {
      participant.attendanceRound1 = {
        present: true,
        checkedAt,
      };
      // Backward compatibility for older admin/export flows that still read attendance.
      participant.attendance = {
        present: true,
        checkedAt,
      };
    }

    await participant.save();

    return NextResponse.json({
      success: true,
      stage,
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
