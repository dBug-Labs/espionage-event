import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NotificationModel from '@/models/Notification';

export async function GET() {
  try {
    await connectToDatabase();
    const notifications = await NotificationModel.find({ isActive: true }).sort({ createdAt: -1 }).limit(20).lean();
    return NextResponse.json({ notifications });
  } catch (err) {
    console.error('[dashboard/notifications]', err);
    return NextResponse.json({ notifications: [] });
  }
}
