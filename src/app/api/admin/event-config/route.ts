import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { getConfig } from '@/models/EventConfig';
import EventConfig from '@/models/EventConfig';

export async function GET() {
  try {
    await connectToDatabase();
    const config = await getConfig();
    return NextResponse.json({ config });
  } catch (err) {
    console.error('[admin/event-config]', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { password, round1Active, round2Active, registrationOpen } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();
    const config = await getConfig();

    if (typeof round1Active === 'boolean') config.round1Active = round1Active;
    if (typeof round2Active === 'boolean') config.round2Active = round2Active;
    if (typeof registrationOpen === 'boolean') config.registrationOpen = registrationOpen;

    await config.save();
    return NextResponse.json({ success: true, config });
  } catch (err) {
    console.error('[admin/event-config]', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
