import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { getConfig } from '@/models/EventConfig';

export async function GET() {
  try {
    await connectToDatabase();
    const config = await getConfig();
    return NextResponse.json({
      config: {
        round1Active: config.round1Active,
        round2Active: config.round2Active,
      },
    });
  } catch (err) {
    console.error('[dashboard/config]', err);
    return NextResponse.json({ config: { round1Active: false, round2Active: false } });
  }
}
