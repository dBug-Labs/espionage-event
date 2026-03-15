import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IParticipant extends Document {
  participantId: string;
  name: string;
  email: string;
  collegeEmail: string;
  regNo: string;
  phone: string;
  amountPaid: number;
  paymentId: string;
  paymentStatus: 'PAID' | 'FAILED' | 'REFUNDED' | 'PENDING';
  attendance: {
    present: boolean;
    checkedAt: Date | null;
  };
  round1Score: number | null;
  round1SubmittedAt: Date | null;
  round1Warnings: number;
  isShortlisted: boolean;
  round2Score: number | null;
  round2Submissions: {
    questionId: string;
    code: string;
    language: string;
    verdict: string;
    submittedAt: Date;
  }[];
  createdAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    participantId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    collegeEmail: { type: String, required: true },
    regNo: { type: String, required: true },
    phone: { type: String, required: true },
    amountPaid: { type: Number, required: true, default: 60 },
    paymentId: { type: String, required: true },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'FAILED', 'REFUNDED', 'PENDING'],
      default: 'PENDING',
    },
    attendance: {
      present: { type: Boolean, default: false },
      checkedAt: { type: Date, default: null },
    },
    round1Score: { type: Number, default: null },
    round1SubmittedAt: { type: Date, default: null },
    round1Warnings: { type: Number, default: 0 },
    isShortlisted: { type: Boolean, default: false },
    round2Score: { type: Number, default: null },
    round2Submissions: [
      {
        questionId: { type: String },
        code: { type: String },
        language: { type: String },
        verdict: { type: String },
        submittedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

ParticipantSchema.index({ email: 1 }, { unique: true });

const Participant: Model<IParticipant> =
  mongoose.models.Participant || mongoose.model<IParticipant>('Participant', ParticipantSchema);

export default Participant;
