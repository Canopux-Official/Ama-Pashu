import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation extends Document {
    state: string; // <-- Added state here
    district: string;
    block: string;
    village: string;
}

const LocationSchema: Schema = new Schema({
    state: { type: String, required: true, index: true },
    district: { type: String, required: true, index: true },
    block: { type: String, required: true, index: true },
    village: { type: String, required: true }
});

// <-- Added state to the beginning of the compound index
LocationSchema.index({ state: 1, district: 1, block: 1 });

export const Location = mongoose.model<ILocation>('Location', LocationSchema);