import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Team from '@/models/Team';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const [totalPaid, checkedIn] = await Promise.all([
      Team.countDocuments({ paymentStatus: 'PAID' }),
      Team.countDocuments({ paymentStatus: 'PAID', 'attendance.present': true })
    ]);

    return NextResponse.json({ totalPaid, checkedIn });

  } catch (err) {
    console.error('[attendance stats]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
