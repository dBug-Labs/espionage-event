import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const [totalConfirmed, checkedIn] = await Promise.all([
      Participant.countDocuments({ rsvpStatus: 'CONFIRMED' }),
      Participant.countDocuments({ rsvpStatus: 'CONFIRMED', 'attendance.present': true })
    ]);

    return NextResponse.json({ totalPaid: totalConfirmed, checkedIn });

  } catch (err) {
    console.error('[attendance stats]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
