import mongoose from 'mongoose';
import fs from 'fs';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import axios from 'axios';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import { Location } from './src/models/Location';
import { User } from './src/models/User';
import { Cattle } from './src/models/Cattel';

dotenv.config();

const CSV_FILE_PATH = './location.csv';
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/* ==========================================
   HELPERS
   ========================================== */

const openFileExplorer = (promptText: string): string => {
    const platform = os.platform();
    let command = '';

    try {
        if (platform === 'win32') {
            command = `powershell -NoProfile -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.windows.forms') | Out-Null; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Title = '${promptText}'; $f.Filter = 'Image Files|*.jpg;*.jpeg;*.png'; $f.Multiselect = $false; $res = $f.ShowDialog(); if ($res -eq 'OK') { Write-Output $f.FileName }"`;
        } else if (platform === 'darwin') {
            command = `osascript -e 'POSIX path of (choose file with prompt "${promptText}" of type {"public.image"})'`;
        } else if (platform === 'linux') {
            command = `zenity --file-selection --title="${promptText}" --file-filter="*.jpg *.jpeg *.png"`;
        } else {
            throw new Error('Unsupported OS for native file explorer.');
        }

        const result = execSync(command, { encoding: 'utf8' }).trim();
        if (!result) throw new Error('Dialog closed without selection.');
        return result;
    } catch (error) {
        throw new Error('File selection cancelled or failed.');
    }
};

const saveImageToUploads = (filePath: string): string => {
    try {
        const fileData = fs.readFileSync(filePath);
        const extension = path.extname(filePath) || '.jpg';
        const fileName = `${uuidv4()}${extension}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, fileName), fileData);
        return fileName;
    } catch (err) {
        console.error(`❌ Error processing file at ${filePath}.`);
        throw err;
    }
};

const randomSpecies = () => Math.random() > 0.5 ? 'Cow' : 'Buffalo';
const randomSex = () => {
    const r = Math.random();
    if (r < 0.45) return 'Female';
    if (r < 0.90) return 'Male';
    return 'Freemartin';
};
const randomStatus = () => {
    const statuses = ['Milking', 'Dry', 'Pregnant', 'Heifer', 'Calf'];
    return statuses[Math.floor(Math.random() * statuses.length)];
};
const randomSource = () => Math.random() > 0.5 ? 'Home Born' : 'Purchase';

/* ==========================================
   MAIN SEED FUNCTION
   ========================================== */

async function seedDatabase() {
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
        console.error('❌ Error: MONGO_URI is not defined in your .env file.');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB.');

        /* ------------------------------------------
           1. FULL CLEANUP
           ------------------------------------------ */
        console.log('🧹 Clearing all existing data (Locations, Users, Cattle)...');
        await Promise.all([
            Location.deleteMany({}),
            User.deleteMany({}),
            Cattle.deleteMany({})
        ]);
        console.log('🗑️  Database cleared.');

        /* ------------------------------------------
           2. LOCATION SEEDING (FROM CSV)
           ------------------------------------------ */
        const locations: any[] = [];

        await new Promise<void>((resolve, reject) => {
            if (!fs.existsSync(CSV_FILE_PATH)) {
                console.warn(`⚠️ Warning: ${CSV_FILE_PATH} not found. Skipping location seeding.`);
                return resolve();
            }
            fs.createReadStream(CSV_FILE_PATH)
                .pipe(csv({
                    mapHeaders: ({ header }) => header.trim().replace(/^[\uFEFF\xEF\xBB\xBF]+/, '')
                }))
                .on('data', (row) => {
                    const state = row['State Name'] || row['State'] || row['state'];
                    const district = row['District Name'] || row['District'] || row['district'];
                    const block = row['Block Name'] || row['Block'] || row['block'];
                    const village = row['Village Name'] || row['Village'] || row['village'];

                    if (state && district && block && village) {
                        locations.push({
                            state: state.trim(),
                            district: district.trim(),
                            block: block.trim(),
                            village: village.trim()
                        });
                    }
                })
                .on('end', async () => {
                    console.log(`📊 Parsed ${locations.length} villages. Starting batch insert...`);
                    const BATCH_SIZE = 1000;
                    for (let i = 0; i < locations.length; i += BATCH_SIZE) {
                        const batch = locations.slice(i, i + BATCH_SIZE);
                        await Location.insertMany(batch);
                    }
                    console.log('✅ Location seeding completed!');
                    resolve();
                })
                .on('error', reject);
        });

        /* ------------------------------------------
           3. CREATE FRESH USER
           ------------------------------------------ */
        const farmer = new User({
            name: 'Archit Mishra',
            role: 'farmer',
            contact: { phone: '1234567890' },
            location: {
                state: 'Odisha',
                district: 'Koraput',
                block: 'Semiliguda',
                village: 'Sunabera',
                pincode: '763002'
            }
        });
        await farmer.save();
        console.log(`✅ Created fresh user: ${farmer.name}`);

        /* ------------------------------------------
           4. SEED 12 CATTLE
           ------------------------------------------ */
        console.log('\n🐄 Starting Cattle Registration (12 total)...');

        for (let i = 1; i <= 12; i++) {
            console.log(`\n[${i}/12] Select images for Cattle...`);

            let muzzleFilename = '';
            let faceFilename = '';

            try {
                const muzzlePath = openFileExplorer(`Select MUZZLE Image for Cow ${i}`);
                muzzleFilename = saveImageToUploads(muzzlePath);

                const facePath = openFileExplorer(`Select FACE Image for Cow ${i}`);
                faceFilename = saveImageToUploads(facePath);
            } catch (e: any) {
                console.log(`⚠️ Selection failed: ${e.message}. Skipping this cow.`);
                continue;
            }

            const tagNo = `TAG-${Math.floor(100000 + Math.random() * 900000)}`;
            const species = randomSpecies();
            const source = randomSource();

            const newCow = new Cattle({
                farmerId: farmer._id,
                tagNumber: tagNo,
                name: `Cattle-${i}`,
                species: species,
                breed: 'Crossbreed',
                sex: randomSex(),
                dob: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
                ageMonths: Math.floor(Math.random() * 60) + 1,
                source: source,
                purchaseDetails: source === 'Purchase' ? {
                    date: new Date(),
                    price: Math.floor(Math.random() * 50000) + 10000
                } : undefined,
                location: {
                    lat: 20.2961 + (Math.random() - 0.5) * 0.1,
                    lng: 85.8245 + (Math.random() - 0.5) * 0.1
                },
                photos: {
                    faceProfile: faceFilename,
                    muzzle: muzzleFilename,
                    selfie: faceFilename, // Using face as placeholder for selfie
                    leftProfile: faceFilename,
                    rightProfile: faceFilename,
                    backView: faceFilename,
                    tailView: faceFilename
                },
                aiMetadata: {
                    isRegistered: false,
                    status: 'PENDING'
                },
                currentStatus: randomStatus(),
                lastWeight: Math.floor(Math.random() * 400) + 100,
                healthStats: {
                    growthStatus: 'Normal',
                    healthStatus: 'Healthy',
                    bodyConditionScore: Math.floor(Math.random() * 5) + 1
                }
            });

            const savedCow = await newCow.save();

            // Link Cattle to User
            await User.findByIdAndUpdate(farmer._id, {
                $push: { cows: savedCow._id }
            });

            // DL API Call (Local Queue Trigger)
            try {
                const dlApiUrl = process.env.DL_MODEL_SERVER_LINK || 'http://localhost:8000';
                await axios.post(`${dlApiUrl}/local-queue-trigger`, {
                    type: 'register',
                    cow_id: savedCow._id.toString(),
                    farmer_id: farmer._id.toString(),
                    face_image_oci: faceFilename,
                    muzzle_image_oci: muzzleFilename
                });
                console.log(`✅ DL API registration job triggered for ${tagNo}`);
            } catch (dlError: any) {
                console.error(`⚠️ DL API Error for ${tagNo}:`, dlError.response?.data || dlError.message);
            }

            console.log(`✅ Registered cow ${i} with Tag: ${tagNo}`);
        }

        console.log('\n🎉 Database seeding completed successfully!');
        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Critical Error:', error);
        process.exit(1);
    }
}

seedDatabase();