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
  starterTemplates: { language: string; code: string }[];
  wrappers?: { language: string; code: string }[];
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
        expectedOutput: { type: String, default: '' },
      },
    ],
    difficulty: { type: String, enum: ['easy', 'medium'], default: 'easy' },
    points: { type: Number, default: 10 },
    timeLimit: { type: Number, default: 2 },
    memoryLimit: { type: Number, default: 262144 },
    order: { type: Number, default: 0 },
    starterTemplates: [
      {
        language: { type: String, required: true },
        code: { type: String, required: true },
      },
    ],
    wrappers: [
      {
        language: { type: String, required: true },
        code: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.CodingQuestion;
}

const CodingQuestion: Model<ICodingQuestion> =
  mongoose.models.CodingQuestion || mongoose.model<ICodingQuestion>('CodingQuestion', CodingQuestionSchema);

export default CodingQuestion;
