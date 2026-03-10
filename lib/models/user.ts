import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  isDemo: boolean;
  name: string;
  email: string;
  password?: string;
  salt?: string;
  profileURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    isDemo: { type: Boolean, default: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional if using OAuth in the future
    salt: { type: String },
    profileURL: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
