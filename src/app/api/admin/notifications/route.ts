import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import NotificationModel from '@/models/Notification';

export async function GET() {
  try {
    await connectToDatabase();
    const notifications = await NotificationModel.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ notifications });
  } catch (err) {
    console.error('[admin/notifications]', err);
    return NextResponse.json({ notifications: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { password, title, message, type } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message required.' }, { status: 400 });
    }

    await connectToDatabase();
    const notification = await NotificationModel.create({
      title,
      message,
      type: type || 'info',
      isActive: true,
    });

    return NextResponse.json({ success: true, notification });
  } catch (err) {
    console.error('[admin/notifications]', err);
    return NextResponse.json({ error: 'Failed to create notification.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { password, id } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();
    await NotificationModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/notifications]', err);
    return NextResponse.json({ error: 'Failed to delete.' }, { status: 500 });
  }
}
