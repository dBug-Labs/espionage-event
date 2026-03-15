import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEventConfig extends Document {
  registrationOpen: boolean;
  round1Active: boolean;
  round2Active: boolean;
}

const EventConfigSchema = new Schema<IEventConfig>(
  {
    registrationOpen: { type: Boolean, default: true },
    round1Active: { type: Boolean, default: false },
    round2Active: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Always use a single document
async function getConfig(): Promise<IEventConfig> {
  const EventConfig: Model<IEventConfig> =
    mongoose.models.EventConfig || mongoose.model<IEventConfig>('EventConfig', EventConfigSchema);
  let config = await EventConfig.findOne();
  if (!config) {
    config = await EventConfig.create({});
  }
  return config;
}

const EventConfig: Model<IEventConfig> =
  mongoose.models.EventConfig || mongoose.model<IEventConfig>('EventConfig', EventConfigSchema);

export { getConfig };
export default EventConfig;
