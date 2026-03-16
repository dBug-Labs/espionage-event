import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MCQQuestion from '@/models/MCQQuestion';
import Participant from '@/models/Participant';
import { getConfig } from '@/models/EventConfig';

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'Auth required.' }, { status: 401 });

    await connectToDatabase();

    const config = await getConfig();
    if (!config.round1Active) {
      return NextResponse.json({ error: 'Round 1 is not active.' }, { status: 403 });
    }

    const participant = await Participant.findOne({ email: email.toLowerCase() });
    if (!participant) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    if (participant.round1SubmittedAt) {
      return NextResponse.json({ error: 'You have already submitted Round 1.' }, { status: 403 });
    }

    let questions;
    if (participant.round1QuestionIds && participant.round1QuestionIds.length > 0) {
      // Fetch assigned questions
      questions = await MCQQuestion.find(
        { _id: { $in: participant.round1QuestionIds } },
        '-correctAnswer'
      ).lean();
      
      // Sort them in the order they were stored to keep consistency
      const idMap = new Map(participant.round1QuestionIds.map((id, index) => [id.toString(), index]));
      questions.sort((a, b) => (idMap.get(a._id.toString()) ?? 0) - (idMap.get(b._id.toString()) ?? 0));
    } else {
      // Pick 30 random questions
      const allQuestions = await MCQQuestion.find({}, '_id').lean();
      if (allQuestions.length === 0) {
        return NextResponse.json({ questions: [] });
      }

      // Shuffle and pick 30
      const shuffled = allQuestions.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 30);
      const selectedIds = selected.map((q) => q._id.toString());

      // Save to participant
      participant.round1QuestionIds = selectedIds;
      await participant.save();

      // Fetch full question data
      questions = await MCQQuestion.find(
        { _id: { $in: selectedIds } },
        '-correctAnswer'
      ).lean();
      
      const idMap = new Map(selectedIds.map((id, index) => [id, index]));
      questions.sort((a, b) => (idMap.get(a._id.toString()) ?? 0) - (idMap.get(b._id.toString()) ?? 0));
    }

    return NextResponse.json({ questions });
  } catch (err) {
    console.error('[round1/questions]', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
