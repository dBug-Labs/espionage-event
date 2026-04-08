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

function sanitizeDept(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getAttendanceRecord(participant: InstanceType<typeof Participant>, stage: AttendanceStage) {
  participant.attendanceRound1 ??= {
    present: Boolean(participant.attendance?.present),
    checkedAt: participant.attendance?.checkedAt ?? null,
    leaderPresent: false,
    partnerPresent: false,
    leaderDept: '',
    partnerDept: '',
  };
  participant.attendanceRound2 ??= {
    present: false,
    checkedAt: null,
    leaderPresent: false,
    partnerPresent: false,
    leaderDept: '',
    partnerDept: '',
  };

  return stage === 'round2' ? participant.attendanceRound2 : participant.attendanceRound1;
}

function buildTeamInfo(participant: InstanceType<typeof Participant>) {
  return {
    teamId: participant.participantId,
    teamName: participant.name,
    leaderName: participant.name,
    partnerName: participant.partner?.name ?? null,
    membersCount: participant.teamType === 'duo' ? 2 : 1,
    teamType: participant.teamType,
  };
}

async function loadEligibleParticipant(teamId: string, stage: AttendanceStage) {
  await connectToDatabase();

  const participant = await Participant.findOne({ participantId: teamId });
  if (!participant) {
    return { error: NextResponse.json({ error: 'Team not found.' }, { status: 404 }) };
  }

  if (stage === 'round1' && participant.rsvpStatus !== 'CONFIRMED') {
    return { error: NextResponse.json({ error: 'Round 1 attendance is only allowed for RSVP-confirmed teams.' }, { status: 403 }) };
  }

  if (stage === 'round2' && !participant.isShortlisted) {
    return { error: NextResponse.json({ error: 'Round 2 attendance is only allowed for shortlisted teams.' }, { status: 403 }) };
  }

  return { participant };
}

export async function GET(req: NextRequest) {
  try {
    const stage = normalizeStage(req.nextUrl.searchParams.get('stage'));
    const teamId = normalizeTeamId(req.nextUrl.searchParams.get('teamId') || '');

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required.' }, { status: 400 });
    }

    if (!teamId.startsWith('ESP-')) {
      return NextResponse.json({ error: 'Invalid team ID. Expected an ESP code.' }, { status: 400 });
    }

    const lookup = await loadEligibleParticipant(teamId, stage);
    if (lookup.error) return lookup.error;

    const participant = lookup.participant!;
    const attendanceRecord = getAttendanceRecord(participant, stage);

    if (attendanceRecord?.present) {
      return NextResponse.json(
        {
          error: `${participant.name} (${participant.participantId}) is already checked in for ${stage === 'round1' ? 'Round 1' : 'Round 2'}.`,
          alreadyCheckedIn: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      stage,
      ...buildTeamInfo(participant),
    });
  } catch (err) {
    console.error('[attendance] GET', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
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

    const lookup = await loadEligibleParticipant(teamId, stage);
    if (lookup.error) return lookup.error;

    const participant = lookup.participant!;
    const attendanceRecord = getAttendanceRecord(participant, stage);

    if (attendanceRecord?.present) {
      return NextResponse.json(
        {
          error: `${participant.name} (${participant.participantId}) is already checked in for ${stage === 'round1' ? 'Round 1' : 'Round 2'}.`,
          alreadyCheckedIn: true,
        },
        { status: 400 }
      );
    }

    const leaderPresent = Boolean(body.leaderPresent);
    const partnerPresent = participant.teamType === 'duo' ? Boolean(body.partnerPresent) : false;
    const leaderDept = sanitizeDept(body.leaderDept);
    const partnerDept = participant.teamType === 'duo' ? sanitizeDept(body.partnerDept) : '';

    if (!leaderPresent && !partnerPresent) {
      return NextResponse.json({ error: 'Select at least one present member.' }, { status: 400 });
    }

    if (leaderPresent && !leaderDept) {
      return NextResponse.json({ error: 'Leader department is required.' }, { status: 400 });
    }

    if (partnerPresent && !partnerDept) {
      return NextResponse.json({ error: 'Partner department is required.' }, { status: 400 });
    }

    const checkedAt = new Date();
    const updatedRecord = {
      present: true,
      checkedAt,
      leaderPresent,
      partnerPresent,
      leaderDept: leaderPresent ? leaderDept : '',
      partnerDept: partnerPresent ? partnerDept : '',
    };

    if (stage === 'round2') {
      participant.attendanceRound2 = updatedRecord;
    } else {
      participant.attendanceRound1 = updatedRecord;
      participant.attendance = {
        present: true,
        checkedAt,
      };
    }

    await participant.save();

    return NextResponse.json({
      success: true,
      stage,
      ...buildTeamInfo(participant),
      attendance: updatedRecord,
    });
  } catch (err) {
    console.error('[attendance] POST', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
