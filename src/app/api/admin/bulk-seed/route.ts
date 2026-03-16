import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MCQQuestion from '@/models/MCQQuestion';
import CodingQuestion from '@/models/CodingQuestion';

export async function POST(req: NextRequest) {
  try {
    const { password, type, questions } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    if (type === 'mcq') {
      await MCQQuestion.deleteMany({});
      await MCQQuestion.insertMany(questions);
    } else if (type === 'coding') {
      await CodingQuestion.deleteMany({});
      await CodingQuestion.insertMany(questions);
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Seeded successfully' });
  } catch (err: any) {
    console.error('[bulk-seed]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
