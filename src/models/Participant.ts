import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPartner {
  name: string;
  email: string;
  collegeEmail: string;
  regNo: string;
  phone: string;
}

export interface IParticipant extends Document {
  participantId: string;
  name: string;
  email: string;
  collegeEmail: string;
  regNo: string;
  phone: string;
  teamType: 'solo' | 'duo';
  partner?: IPartner;
  rsvpToken: string;
  rsvpStatus: 'PENDING' | 'CONFIRMED' | 'DECLINED';
  rsvpAt: Date | null;
  attendance: {
    present: boolean;
    checkedAt: Date | null;
  };
  round1Score: number | null;
  round1SubmittedAt: Date | null;
  round1Warnings: number;
  round1QuestionIds: string[];
  isShortlisted: boolean;
  round2Score: number | null;
  round2QuestionIds: string[];
  round2Warnings: number;
  round2Submissions: {
    questionId: string;
    code: string;
    language: string;
    verdict: string;
    submittedAt: Date;
  }[];
  createdAt: Date;
}

const PartnerSchema = new Schema<IPartner>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  collegeEmail: { type: String, required: true },
  regNo: { type: String, required: true },
  phone: { type: String, required: true },
});

const ParticipantSchema = new Schema<IParticipant>(
  {
    participantId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    collegeEmail: { type: String, required: true },
    regNo: { type: String, required: true },
    phone: { type: String, required: true },
    teamType: { type: String, enum: ['solo', 'duo'], default: 'solo' },
    partner: { type: PartnerSchema, default: undefined },
    rsvpToken: { type: String, default: '' },
    rsvpStatus: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'DECLINED'],
      default: 'PENDING',
    },
    rsvpAt: { type: Date, default: null },
    attendance: {
      present: { type: Boolean, default: false },
      checkedAt: { type: Date, default: null },
    },
    round1Score: { type: Number, default: null },
    round1SubmittedAt: { type: Date, default: null },
    round1Warnings: { type: Number, default: 0 },
    round1QuestionIds: [{ type: String }],
    isShortlisted: { type: Boolean, default: false },
    round2Score: { type: Number, default: null },
    round2QuestionIds: [{ type: String }],
    round2Warnings: { type: Number, default: 0 },
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
