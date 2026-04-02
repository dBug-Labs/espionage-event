import { NextRequest, NextResponse } from 'next/server';
import { PistonServiceError, executePistonSubmission } from '@/lib/piston';

export async function POST(req: NextRequest) {
  try {
    const { source_code, language, version } = await req.json();

    const result = await executePistonSubmission({
      sourceCode: source_code,
      language,
      version,
    });

    return NextResponse.json({
      output: result.stdout,
      status: result.status,
      error: result.stderr || result.compileOutput || result.message || '',
    });
  } catch (error) {
    if (error instanceof PistonServiceError) {
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
