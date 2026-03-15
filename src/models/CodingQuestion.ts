import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICodingQuestion extends Document {
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  hiddenTestCases: { input: string; expectedOutput: string }[];
  difficulty: 'easy' | 'medium';
  points: number;
  timeLimit: number; // in seconds
  memoryLimit: number; // in KB
  order: number;
}

const CodingQuestionSchema = new Schema<ICodingQuestion>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    inputFormat: { type: String, required: true },
    outputFormat: { type: String, required: true },
    constraints: { type: String, default: '' },
    sampleInput: { type: String, required: true },
    sampleOutput: { type: String, required: true },
    hiddenTestCases: [
      {
        input: { type: String, required: true },
        expectedOutput: { type: String, required: true },
      },
    ],
    difficulty: { type: String, enum: ['easy', 'medium'], default: 'easy' },
    points: { type: Number, default: 10 },
    timeLimit: { type: Number, default: 2 },
    memoryLimit: { type: Number, default: 262144 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const CodingQuestion: Model<ICodingQuestion> =
  mongoose.models.CodingQuestion || mongoose.model<ICodingQuestion>('CodingQuestion', CodingQuestionSchema);

export default CodingQuestion;
