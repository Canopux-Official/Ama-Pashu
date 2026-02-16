import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    role: 'farmer' | 'collector' | 'admin';
    contact: {
        phone: string;      // Primary login for Farmer
        email?: string;     // Optional for Farmer, Required for Collector
    };
    auth: {
        password?: string;  // Only for Collectors/Admins
        otpSession?: string; // For Farmers
    };
    // Official details (from your form)
    location: {
        state: string;
        district: string;
        village: string;
        pincode: string;
    };
    organization?: string; // For Data Collectors (e.g., "OCAC")
    aadharHash?: string;   // Store hashed Aadhar for privacy
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    name: { type: String, required: true },
    role: {
        type: String,
        enum: ['farmer', 'collector', 'admin'],
        default: 'farmer'
    },
    contact: {
        phone: { type: String, required: true, unique: true, index: true },
        email: { type: String }
    },
    auth: {
        password: { type: String, select: false }, // Hide by default
        otpSession: { type: String, select: false }
    },
    location: {
        state: { type: String, default: 'Odisha' },
        district: { type: String },
        village: { type: String },
        pincode: { type: String }
    },
    organization: String,
    aadharHash: String, // Never store raw Aadhar
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);