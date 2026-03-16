import { Request, Response } from 'express';
import { Cattle } from '../models/Cattel';
import { User } from '../models/User';
import axios from 'axios';

// Define the authenticated request type
interface AuthRequest extends Request {
    user?: { id: string; role: string; name: string };
    body: any;
    params: any;
}

// POST /api/cattle -> Register a new cow for a farmer
export const registerCow = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        if (!authReq.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const farmerId = authReq.user.id;
        const {
            tagNo, name, species, breed, sex, dob, ageMonths,
            source, purchaseDate, purchasePrice, sireTag, damTag,
            birthWeight, motherWeightAtCalving, bodyConditionScore,
            currentWeight, growthStatus, healthStatus, productionStatus,
            faceImage, muzzleImage, leftImage, rightImage, backImage, tailImage, selfieImage
        } = authReq.body;

        // Basic validation
        if (!tagNo || !species || !breed || !sex || !faceImage || !muzzleImage || !selfieImage) {
            return res.status(400).json({ success: false, message: 'Missing required fields. Face and Muzzle photos are strictly required for AI identification.' });
        }

        // Check duplicate tags
        const existingCow = await Cattle.findOne({ tagNumber: tagNo });
        if (existingCow) {
            return res.status(400).json({ success: false, message: 'Cow with this tag number already exists' });
        }

        const newCow = new Cattle({
            farmerId,
            tagNumber: tagNo,
            name,
            species,
            breed,
            sex,
            dob,
            ageMonths: ageMonths ? Number(ageMonths) : undefined,
            sireTag,
            damTag,
            source,
            purchaseDetails: source === 'Purchase' ? {
                date: purchaseDate,
                price: purchasePrice ? Number(purchasePrice) : undefined
            } : undefined,
            photos: {
                faceProfile: faceImage,
                muzzle: muzzleImage,
                leftProfile: leftImage,
                rightProfile: rightImage,
                backView: backImage,
                tailView: tailImage,
                selfie: selfieImage
            },
            currentStatus: productionStatus,
            lastWeight: currentWeight ? Number(currentWeight) : undefined,
            healthStats: {
                birthWeight: birthWeight ? Number(birthWeight) : undefined,
                motherWeightAtCalving: motherWeightAtCalving ? Number(motherWeightAtCalving) : undefined,
                growthStatus,
                healthStatus,
                bodyConditionScore: bodyConditionScore ? Number(bodyConditionScore) : undefined
            }
        });

        const savedCow = await newCow.save();

        // Bind Cow to Farmer Document
        await User.findByIdAndUpdate(farmerId, {
            $push: { cows: savedCow._id }
        });

        // Call DL API for vector embeddings
        try {
            const dlApiUrl = process.env.DL_MODEL_SERVER_LINK || 'http://localhost:8000';
            const dlResponse = await axios.post(`${dlApiUrl}/register`, {
                cow_id: savedCow._id.toString(),
                farmer_id: farmerId,
                face_image: faceImage,
                muzzle_image: muzzleImage
            });

            const { status, matched_cow_id } = dlResponse.data;

            if (status === 'DUPLICATE') {
                // If it's a double registration by the same farmer
                await Cattle.findByIdAndDelete(savedCow._id);
                await User.findByIdAndUpdate(farmerId, { $pull: { cows: savedCow._id } });
                return res.status(400).json({ 
                    success: false, 
                    message: 'Double Registration Detected: This cow is already registered in your herd.' 
                });
            }

            if (status === 'DISPUTE') {
                // Highly similar cow found in database registered by someone else
                savedCow.isDispute = true;
                await savedCow.save();

                // Also mark the matched cow as disputed
                if (matched_cow_id) {
                    await Cattle.findByIdAndUpdate(matched_cow_id, { isDispute: true });
                }

                return res.status(201).json({
                    success: true,
                    message: 'Dispute alert: This cow is already registered by another farmer. Registration saved but marked as disputed.',
                    data: savedCow
                });
            }

        } catch (dlError: any) {
            console.error('Error calling DL API for embeddings:', dlError?.response?.data || dlError.message);

            // Clean up: delete the cow and remove from user if DL API fails
            await Cattle.findByIdAndDelete(savedCow._id);
            await User.findByIdAndUpdate(farmerId, {
                $pull: { cows: savedCow._id }
            });

            const errorDetail = dlError?.response?.data?.detail || dlError?.response?.data?.message || 'AI Service could not process images. Please ensure muzzle and face are clearly visible.';
            return res.status(400).json({ success: false, message: errorDetail });
        }

        res.status(201).json({
            success: true,
            message: 'Cow registered successfully',
            data: savedCow
        });

    } catch (error: any) {
        console.error('Error registering cow:', error);
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// GET /api/cattle -> Get all cows for the logged-in farmer
export const getMyCattle = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        if (!authReq.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const cattle = await Cattle.find({ farmerId: authReq.user.id }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: cattle.length,
            data: cattle
        });

    } catch (error: any) {
        console.error('Error fetching cattle:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// GET /api/cattle/:id -> Get a single cow by ID
export const getCowProfile = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        if (!authReq.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const cow = await Cattle.findOne({ _id: authReq.params.id, farmerId: authReq.user.id });

        if (!cow) {
            return res.status(404).json({ success: false, message: 'Cow not found or unauthorized' });
        }

        res.status(200).json({
            success: true,
            data: cow
        });

    } catch (error: any) {
        console.error('Error fetching cow details:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// POST /api/cattle/search -> Search a cow via DL API
export const searchCow = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        if (!authReq.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { faceImage, muzzleImage } = authReq.body;

        if (!faceImage || !muzzleImage) {
            return res.status(400).json({ success: false, message: 'Both Face and Muzzle images are required for AI verification.' });
        }

        try {
            const dlApiUrl = process.env.DL_MODEL_SERVER_LINK || 'http://localhost:8000';
            const dlResponse = await axios.post(`${dlApiUrl}/search`, {
                user_id: authReq.user.id,
                role: authReq.user.role || 'farmer',
                face_image: faceImage,
                muzzle_image: muzzleImage
            });

            // If success, we'll get cow_id from DL API
            const { cow_id, distance } = dlResponse.data;

            // Optional: verify the cow exists and belongs to the farmer
            const cow = await Cattle.findOne({ _id: cow_id, farmerId: authReq.user.id });
            if (!cow) {
                return res.status(404).json({ success: false, message: 'Cow identified but does not belong to you or does not exist.' });
            }

            res.status(200).json({
                success: true,
                data: {
                    cowId: cow_id,
                    cow: cow,
                    confidence: 1 - distance // Rough conversion of distance to confidence for UI
                }
            });

        } catch (dlError: any) {
            console.error('Error calling DL API search:', dlError?.response?.data || dlError.message);
            const errorDetail = dlError?.response?.data?.detail || 'AI Service unavailable or could not process images.';
            return res.status(404).json({ success: false, message: errorDetail });
        }

    } catch (error: any) {
        console.error('Error in search proxy:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
