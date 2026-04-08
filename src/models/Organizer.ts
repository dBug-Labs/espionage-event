import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrganizer extends Document {
  name: string;
  email: string;
  regNo: string;
  role: string;
  deptName: string;
  present: boolean;
  checkedAt: Date | null;
}

const OrganizerSchema = new Schema<IOrganizer>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    regNo: { type: String, required: true },
    role: { type: String, required: true },
    deptName: { type: String, required: true },
    present: { type: Boolean, default: false },
    checkedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Organizer: Model<IOrganizer> =
  mongoose.models.Organizer || mongoose.model<IOrganizer>('Organizer', OrganizerSchema);

export default Organizer;
