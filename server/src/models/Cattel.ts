import mongoose, { Schema, Document } from 'mongoose';

export interface ICattle extends Document {
    farmerId: mongoose.Types.ObjectId; // Owner

    // Identity
    tagNumber: string;
    name: string;
    species: 'Cow' | 'Buffalo';
    breed: string;
    sex: 'Male' | 'Female' | 'Freemartin';
    dob: Date;
    ageMonths?: number;

    // Lineage & Source
    sireTag?: string;
    damTag?: string;
    source: 'Home Born' | 'Purchase';
    purchaseDetails?: {
        date?: Date;
        price?: number;
    };

    // Media & AI
    photos: {
        faceProfile: string;
        muzzle: string;
        leftProfile: string;
        rightProfile: string;
        backView: string;
        tailView: string;
    };
    aiMetadata: {
        isRegistered: boolean;
        confidenceScore?: number;
        lastScannedAt?: Date;
    };

    // Health Status
    currentStatus: 'Milking' | 'Dry' | 'Pregnant' | 'Heifer' | 'Calf';
    lastWeight?: number;
    isSick: boolean;
    healthStats?: {
        birthWeight?: number;
        motherWeightAtCalving?: number;
        growthStatus?: string;
        healthStatus?: string;
        bodyConditionScore?: number;
    };
}

const CattleSchema = new Schema<ICattle>({
    farmerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    tagNumber: { type: String, unique: true, required: true },
    name: { type: String },
    species: { type: String, enum: ['Cow', 'Buffalo'], required: true },
    breed: { type: String, required: true },
    sex: { type: String, enum: ['Male', 'Female', 'Freemartin'], required: true },
    dob: { type: Date, required: true },
    ageMonths: { type: Number },

    sireTag: { type: String, default: null },
    damTag: { type: String, default: null },
    source: { type: String, enum: ['Home Born', 'Purchase'] },
    purchaseDetails: {
        date: { type: Date },
        price: { type: Number }
    },

    photos: {
        faceProfile: { type: String, required: true },
        muzzle: { type: String, required: true },
        leftProfile: { type: String },
        rightProfile: { type: String },
        backView: { type: String },
        tailView: { type: String }
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
    isSick: { type: Boolean, default: false },
    healthStats: {
        birthWeight: Number,
        motherWeightAtCalving: Number,
        growthStatus: String,
        healthStatus: String,
        bodyConditionScore: Number
    }
}, { timestamps: true });

// Compound index for quick farmer searches
CattleSchema.index({ farmerId: 1, tagNumber: 1 });

export const Cattle = mongoose.model<ICattle>('Cattle', CattleSchema);