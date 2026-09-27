import mongoose, { Schema, Document, Model } from 'mongoose';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface IRegistrationRequest extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  passwordText?: string;     // The plain password entered so admin can inspect
  passwordHash: string;      // Bcrypt hash ready to instantiate the User
  status: RequestStatus;
  ipAddress: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    isp?: string;
    timezone?: string;
  };
  deviceInfo?: {
    deviceType?: string;      // 'Mac / MacBook', 'Windows PC', 'Linux PC', 'Mobile', etc.
    os?: string;              // 'macOS', 'Windows 11', 'Linux', etc.
    browser?: string;         // 'Chrome', 'Safari', 'Firefox', etc.
    browserVersion?: string;
    platform?: string;        // 'MacIntel', 'Win32', etc.
    screenResolution?: string;// '1920x1080'
    language?: string;        // 'en-US'
    cpuCores?: string;
    deviceMemory?: string;
    userAgent?: string;
  };
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: Date;
}

const RegistrationRequestSchema = new Schema<IRegistrationRequest>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    passwordText: {
      type: String,
      default: '',
    },
    passwordHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    ipAddress: {
      type: String,
      default: 'Unknown',
    },
    location: {
      city: { type: String, default: '' },
      region: { type: String, default: '' },
      country: { type: String, default: '' },
      countryCode: { type: String, default: '' },
      isp: { type: String, default: '' },
      timezone: { type: String, default: '' },
    },
    deviceInfo: {
      deviceType: { type: String, default: 'Desktop / Laptop' },
      os: { type: String, default: 'Unknown OS' },
      browser: { type: String, default: 'Unknown Browser' },
      browserVersion: { type: String, default: '' },
      platform: { type: String, default: '' },
      screenResolution: { type: String, default: '' },
      language: { type: String, default: '' },
      cpuCores: { type: String, default: '' },
      deviceMemory: { type: String, default: '' },
      userAgent: { type: String, default: '' },
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: String,
    },
    rejectionReason: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

const RegistrationRequest: Model<IRegistrationRequest> =
  mongoose.models.RegistrationRequest ||
  mongoose.model<IRegistrationRequest>('RegistrationRequest', RegistrationRequestSchema);

export default RegistrationRequest;
