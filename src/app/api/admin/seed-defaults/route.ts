import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MCQQuestion from '@/models/MCQQuestion';
import CodingQuestion from '@/models/CodingQuestion';
import { ROUND1_MCQ_BANK, ROUND2_CODING_BANK } from '@/lib/questionBank';

function toLanguageEntries(record?: Record<string, string>) {
  return Object.entries(record ?? {}).map(([language, code]) => ({ language, code }));
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();

    await MCQQuestion.deleteMany({});
    await CodingQuestion.deleteMany({});

    await MCQQuestion.insertMany(ROUND1_MCQ_BANK);
    await CodingQuestion.insertMany(
      ROUND2_CODING_BANK.map((question) => ({
        ...question,
        starterTemplates: toLanguageEntries(question.starterCode),
        wrappers: toLanguageEntries(question.wrappers),
      }))
    );

    return NextResponse.json({
      success: true,
      mcqInserted: ROUND1_MCQ_BANK.length,
      codingInserted: ROUND2_CODING_BANK.length,
    });
  } catch (error) {
    console.error('[admin/seed-defaults]', error);
    return NextResponse.json({ error: 'Failed to seed default question banks.' }, { status: 500 });
  }
}
