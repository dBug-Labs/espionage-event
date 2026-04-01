import { NextRequest, NextResponse } from 'next/server';
import { Judge0ServiceError, executeJudge0Submission } from '@/lib/judge0';

export async function POST(req: NextRequest) {
  try {
    const { source_code, language_id } = await req.json();

    const result = await executeJudge0Submission({
      sourceCode: source_code,
      languageId: language_id,
    });

    return NextResponse.json({
      output: result.stdout,
      status: result.status,
      error: result.stderr || result.compileOutput || result.message || '',
    });
  } catch (error) {
    if (error instanceof Judge0ServiceError) {
      return NextResponse.json(
        {
          output: '',
          status: 'Error',
          error: error.message,
        },
        { status: error.statusCode }
      );
    }

    console.error('[run-code]', error);
    return NextResponse.json(
      {
        output: '',
        status: 'Error',
        error: 'Code execution failed.',
      },
      { status: 500 }
    );
  }
}
