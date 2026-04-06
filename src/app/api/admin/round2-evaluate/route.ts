import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Participant from '@/models/Participant';
import CodingQuestion from '@/models/CodingQuestion';
import { computeWeightedRound2Percentage, evaluateRound2Submission } from '@/lib/round2Evaluation';

export async function POST(req: NextRequest) {
  try {
    const { password, participantId } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();

    const filter = participantId ? { participantId } : { isShortlisted: true };
    const participants = await Participant.find(filter);
    if (participants.length === 0) {
      return NextResponse.json({ success: true, evaluated: 0, message: 'No matching participants found.' });
    }

    const questionIds = Array.from(
      new Set(
        participants.flatMap((participant) => participant.round2QuestionIds ?? [])
      )
    );
    const questions = await CodingQuestion.find({ _id: { $in: questionIds } }).lean();
    const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));

    let evaluatedParticipants = 0;
    let evaluatedQuestions = 0;

    for (const participant of participants) {
      const evaluations = [];

      for (const questionId of participant.round2QuestionIds ?? []) {
        const question = questionMap.get(questionId);
        if (!question) {
          continue;
        }

        const finalSubmission = participant.round2FinalSubmissions.find(
          (submission: { questionId: string }) => submission.questionId === questionId
        );

        if (!finalSubmission) {
          evaluations.push({
            questionId,
            questionTitle: question.title,
            language: 'N/A',
            verdict: 'Not Submitted',
            testcaseScorePercent: 0,
            aiScorePercent: 0,
            finalScorePercent: 0,
            rationale: 'No final submission was found for this question.',
            strengths: [],
            issues: ['No submitted code available for evaluation.'],
            evaluatedAt: new Date(),
          });
          evaluatedQuestions++;
          continue;
        }

        const evaluation = await evaluateRound2Submission({
          participantId: participant.participantId,
          participantName: participant.name,
          questionTitle: question.title,
          questionDescription: question.description,
          inputFormat: question.inputFormat,
          outputFormat: question.outputFormat,
          constraints: question.constraints,
          sampleInput: question.sampleInput,
          sampleOutput: question.sampleOutput,
          language: finalSubmission.language,
          code: finalSubmission.code,
          testcaseScorePercent: finalSubmission.testcaseScorePercent,
          verdict: finalSubmission.verdict,
        });

        evaluations.push({
          questionId,
          questionTitle: question.title,
          language: finalSubmission.language,
          verdict: finalSubmission.verdict,
          testcaseScorePercent: finalSubmission.testcaseScorePercent,
          aiScorePercent: evaluation.scorePercent,
          finalScorePercent: finalSubmission.verdict === 'Accepted' ? 100 : evaluation.scorePercent,
          rationale: evaluation.rationale,
          strengths: evaluation.strengths,
          issues: evaluation.issues,
          evaluatedAt: new Date(),
        });
        evaluatedQuestions++;
      }

      participant.round2Evaluations = evaluations;
      participant.round2AiScore = computeWeightedRound2Percentage(
        evaluations.map((item) => ({
          finalScorePercent: item.aiScorePercent,
          weight: questionMap.get(item.questionId)?.points ?? 1,
        }))
      );
      participant.round2FinalScore = computeWeightedRound2Percentage(
        evaluations.map((item) => ({
          finalScorePercent: item.finalScorePercent,
          weight: questionMap.get(item.questionId)?.points ?? 1,
        }))
      );
      await participant.save();
      evaluatedParticipants++;
    }

    return NextResponse.json({
      success: true,
      evaluated: evaluatedParticipants,
      questionsEvaluated: evaluatedQuestions,
      message: `AI evaluation completed for ${evaluatedParticipants} participant(s).`,
    });
  } catch (error) {
    console.error('[admin/round2-evaluate]', error);
    return NextResponse.json({ error: 'Failed to evaluate Round 2 submissions.' }, { status: 500 });
  }
}
