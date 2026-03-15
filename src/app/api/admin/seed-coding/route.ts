import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CodingQuestion from '@/models/CodingQuestion';

export async function POST(req: NextRequest) {
  try {
    const { password, questions } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Questions array is required.' }, { status: 400 });
    }

    await connectToDatabase();

    const withOrder = questions.map((q: Record<string, unknown>, i: number) => ({
      ...q,
      order: q.order ?? i,
    }));

    const result = await CodingQuestion.insertMany(withOrder);
    return NextResponse.json({ success: true, inserted: result.length });
  } catch (err) {
    console.error('[admin/seed-coding]', err);
    return NextResponse.json({ error: 'Failed to seed questions.' }, { status: 500 });
  }
}
