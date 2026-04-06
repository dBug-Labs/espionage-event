import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMCQQuestion extends Document {
  questionText: string;
  options: string[];
  correctAnswer: number; // index into options (0-3)
  category: 'cyber' | 'logic' | 'coding';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  order: number;
}

const MCQQuestionSchema = new Schema<IMCQQuestion>(
  {
    questionText: { type: String, required: true },
    options: { type: [String], required: true, validate: [(v: string[]) => v.length === 4, 'Must have exactly 4 options'] },
    correctAnswer: { type: Number, required: true, min: 0, max: 3 },
    category: { type: String, enum: ['cyber', 'logic', 'coding'], required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    points: { type: Number, default: 1 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const MCQQuestion: Model<IMCQQuestion> =
  mongoose.models.MCQQuestion || mongoose.model<IMCQQuestion>('MCQQuestion', MCQQuestionSchema);

export default MCQQuestion;
