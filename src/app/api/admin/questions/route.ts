import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MCQQuestion from '@/models/MCQQuestion';
import CodingQuestion from '@/models/CodingQuestion';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const type = req.nextUrl.searchParams.get('type'); // 'mcq' or 'coding'

    await connectToDatabase();

    if (type === 'mcq') {
      const questions = await MCQQuestion.find({}).sort({ order: 1 }).lean();
      return NextResponse.json({ questions });
    } else if (type === 'coding') {
      const questions = await CodingQuestion.find({}).sort({ order: 1 }).lean();
      return NextResponse.json({ questions });
    } else {
      return NextResponse.json({ error: 'Invalid type.' }, { status: 400 });
    }
  } catch (err) {
    console.error('[admin/questions] GET', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { password, id, type } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();

    if (type === 'mcq') {
      await MCQQuestion.findByIdAndDelete(id);
    } else if (type === 'coding') {
      await CodingQuestion.findByIdAndDelete(id);
    } else {
      return NextResponse.json({ error: 'Invalid type.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/questions] DELETE', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
