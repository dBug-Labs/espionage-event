import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = `Bearer ${process.env.ADMIN_PASSWORD}`;
  return auth === expected;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await connectToDatabase();
    const participants = await Participant.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ participants });
  } catch (err) {
    console.error('[admin/teams]', err);
    return NextResponse.json({ error: 'Failed to fetch participants.' }, { status: 500 });
  }
}
