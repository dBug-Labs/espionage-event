import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';

export async function DELETE(req: NextRequest) {
  try {
    const { password, participantId } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!participantId) {
      return NextResponse.json({ error: 'Participant ID required' }, { status: 400 });
    }

    await connectToDatabase();

    const result = await Participant.deleteOne({ participantId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Participant deleted successfully' });
  } catch (err: any) {
    console.error('[delete-participant]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
