import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';

type AttendanceStage = 'round1' | 'round2';

function normalizeStage(value: string | null): AttendanceStage {
  return value === 'round2' ? 'round2' : 'round1';
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stage = normalizeStage(new URL(req.url).searchParams.get('stage'));

    await connectToDatabase();

    const totalQuery = stage === 'round2' ? { isShortlisted: true } : { rsvpStatus: 'CONFIRMED' };
    const checkedInQuery =
      stage === 'round2'
        ? { isShortlisted: true, 'attendanceRound2.present': true }
        : {
            rsvpStatus: 'CONFIRMED',
            $or: [
              { 'attendanceRound1.present': true },
              { 'attendance.present': true },
            ],
          };

    const [totalEligible, checkedIn] = await Promise.all([
      Participant.countDocuments(totalQuery),
      Participant.countDocuments(checkedInQuery),
    ]);

    return NextResponse.json({ stage, totalEligible, checkedIn });
  } catch (err) {
    console.error('[attendance stats]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
