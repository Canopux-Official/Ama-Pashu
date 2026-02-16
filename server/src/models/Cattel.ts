import mongoose, { Schema, Document } from 'mongoose';

export interface ICattle extends Document {
    farmerId: mongoose.Types.ObjectId; // Owner

    // -- Identity Section --
    tagNumber: string;       // "Animal No" / Pashu Aadhar
    name: string;            // "Given Name"
    species: 'Cow' | 'Buffalo';
    breed: string;           // Dropdown (e.g., "Gir", "Jersey")
    sex: 'Male' | 'Female' | 'Freemartin';
    dob: Date;

    // -- Lineage (Pedigree) --
    sireTag: string; // Father's Tag
    damTag: string;  // Mother's Tag
    source: 'Home Born' | 'Purchased';

    // -- AI & Media Section --
    photos: {
        muzzle: string;       // CRITICAL: The biometric ID
        leftProfile: string;
        rightProfile: string;
        backView: string;
    };
    aiMetadata: {
        isRegistered: boolean; // True if AI endpoint returned success
        confidenceScore?: number;
        lastScannedAt?: Date;
    };

    // -- Current Status (Quick View) --
    currentStatus: 'Milking' | 'Dry' | 'Pregnant' | 'Heifer' | 'Calf';
    lastWeight: number;    // In kg
    isSick: boolean;
}

const CattleSchema = new Schema<ICattle>({
    farmerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    tagNumber: { type: String, unique: true, required: true },
    name: { type: String },
    species: { type: String, enum: ['Cow', 'Buffalo'], required: true },
    breed: { type: String, required: true },
    sex: { type: String, enum: ['Male', 'Female', 'Freemartin'], required: true },
    dob: { type: Date, required: true },

    sireTag: { type: String, default: null },
    damTag: { type: String, default: null },
    source: { type: String, enum: ['Home Born', 'Purchased'] },

    photos: {
        muzzle: { type: String, required: true }, // The most important URL
        leftProfile: String,
        rightProfile: String,
        backView: String
    },

    aiMetadata: {
        isRegistered: { type: Boolean, default: false },
        confidenceScore: Number,
        lastScannedAt: Date
    },

    currentStatus: {
        type: String,
        enum: ['Milking', 'Dry', 'Pregnant', 'Heifer', 'Calf'],
        default: 'Calf'
    },
    lastWeight: Number,
    isSick: { type: Boolean, default: false }
}, { timestamps: true });

// Compound Index: Helps farmers search their OWN cows quickly
CattleSchema.index({ farmerId: 1, tagNumber: 1 });

export const Cattle = mongoose.model<ICattle>('Cattle', CattleSchema);