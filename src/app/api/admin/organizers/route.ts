import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Organizer from '@/models/Organizer';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();
    const organizers = await Organizer.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ organizers });
  } catch (err) {
    console.error('[admin/organizers] GET', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { password, name, email, regNo, role } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();
    const newOrganizer = await Organizer.create({
      name,
      email,
      regNo,
      role,
    });

    return NextResponse.json({ success: true, organizer: newOrganizer });
  } catch (err) {
    console.error('[admin/organizers] POST', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { password, id, present } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();
    const checkedAt = present ? new Date() : null;
    const updatedOrganizer = await Organizer.findByIdAndUpdate(
      id,
      { present, checkedAt },
      { new: true }
    );

    if (!updatedOrganizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, organizer: updatedOrganizer });
  } catch (err) {
    console.error('[admin/organizers] PATCH', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { password, id } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();
    const deletedOrganizer = await Organizer.findByIdAndDelete(id);

    if (!deletedOrganizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/organizers] DELETE', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
