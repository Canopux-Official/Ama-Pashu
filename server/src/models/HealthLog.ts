import mongoose, { Schema, Document } from 'mongoose';

export interface IHealthLog extends Document {
    cattleId: mongoose.Types.ObjectId;
    farmerId: mongoose.Types.ObjectId; // Redundant but good for query speed
    type: 'Weight' | 'Vaccination' | 'Insemination' | 'Treatment';
    date: Date;

    // Dynamic payload based on type
    data: {
        weight?: number;         // If type = Weight
        vaccineName?: string;    // If type = Vaccination
        batchNumber?: string;
        notes?: string;
        doctorName?: string;
    };

    nextDueDate?: Date; // Reminder for next vaccine/checkup
}

const HealthLogSchema = new Schema<IHealthLog>({
    cattleId: { type: Schema.Types.ObjectId, ref: 'Cattle', required: true, index: true },
    farmerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['Weight', 'Vaccination', 'Insemination', 'Treatment'],
        required: true
    },
    date: { type: Date, default: Date.now },

    data: {
        weight: Number,
        vaccineName: String,
        batchNumber: String,
        notes: String,
        doctorName: String
    },

    nextDueDate: Date
}, { timestamps: true });

export const HealthLog = mongoose.model<IHealthLog>('HealthLog', HealthLogSchema);