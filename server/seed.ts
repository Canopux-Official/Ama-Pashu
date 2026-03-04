import mongoose from 'mongoose';
import fs from 'fs';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import axios from 'axios';
import os from 'os';
import { execSync } from 'child_process';
import { Location } from './src/models/Location';
import { User } from './src/models/User';
import { Cattle } from './src/models/Cattel';

dotenv.config();

const CSV_FILE_PATH = './location.csv';

// Helper to open OS native file explorer
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

        if (!result) {
            throw new Error('Dialog closed without selection.');
        }

        return result;
    } catch (error) {
        throw new Error('File selection cancelled or failed.');
    }
};

// Helper to convert local image file to base64
const convertToBase64 = (filePath: string): string => {
    try {
        const fileData = fs.readFileSync(filePath);
        return `data:image/jpeg;base64,${fileData.toString('base64')}`;
    } catch (err) {
        console.error(`❌ Error reading file at ${filePath}.`);
        throw err;
    }
};

// Random data generators for cattle
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

async function seedDatabase() {
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
        console.error('❌ Error: MONGO_URI is not defined in your .env file.');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB.');

        /* ==========================================
           1. LOCATION SEEDING
           ========================================== */
        await Location.deleteMany({});
        console.log('🗑️ Cleared existing location data.');

        const locations: any[] = [];
        let rowCount = 0;

        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(CSV_FILE_PATH)
                .pipe(csv({
                    mapHeaders: ({ header }) => header.trim().replace(/^[\uFEFF\xEF\xBB\xBF]+/, '')
                }))
                .on('data', (row) => {
                    if (rowCount === 0) {
                        console.log('🔍 First row headers detected as:', Object.keys(row));
                    }
                    rowCount++;

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
                    console.log(`📊 Parsed ${locations.length} villages out of ${rowCount} rows.`);

                    if (locations.length === 0) {
                        console.log('⚠️ No valid rows found. Please check the header log above.');
                        await mongoose.disconnect();
                        process.exit(1);
                    }

                    console.log('Starting batch insert for locations...');
                    const BATCH_SIZE = 1000;
                    for (let i = 0; i < locations.length; i += BATCH_SIZE) {
                        const batch = locations.slice(i, i + BATCH_SIZE);
                        await Location.insertMany(batch);
                        console.log(`⏳ Inserted batch ${i} to ${i + batch.length}`);
                    }
                    console.log('✅ Location seeding completed!');
                    resolve();
                })
                .on('error', (error) => {
                    console.error('❌ Error reading the CSV file:', error);
                    reject(error);
                });
        });

        /* ==========================================
           2. SEED SPECIFIC USER
           ========================================== */
        const farmerPhone = '1234567890';
        let farmer = await User.findOne({ 'contact.phone': farmerPhone });

        if (!farmer) {
            farmer = new User({
                name: 'Archit Mishra',
                role: 'farmer',
                contact: { phone: farmerPhone },
                location: {
                    state: 'Odisha',
                    district: 'Koraput',
                    block: 'Semiliguda',
                    village: 'Sunabera',
                    pincode: '763002'
                }
            });
            await farmer.save();
            console.log(`✅ Created user: ${farmer.name}`);
        } else {
            console.log(`ℹ️ User ${farmer.name} already exists. Using existing ID.`);
        }

        /* ==========================================
           3. SEED 12 COWS & REPLICATE ENDPOINT LOGIC
           ========================================== */
        console.log('\n🐄 Starting Cow Registration Process (12 Cows total)...');

        for (let i = 1; i <= 12; i++) {
            console.log(`\n-----------------------------------`);
            console.log(`🐮 Registering Cow ${i} of 12`);
            console.log(`-----------------------------------`);

            let muzzleImageBase64 = '';
            let faceImageBase64 = '';

            // Prompt for images using File Explorer
            while (true) {
                try {
                    console.log('📂 Opening file explorer for MUZZLE image...');
                    const muzzlePath = openFileExplorer(`Select MUZZLE Image for Cow ${i}`);
                    muzzleImageBase64 = convertToBase64(muzzlePath);
                    console.log(`✅ Selected Muzzle: ${muzzlePath}`);

                    console.log('📂 Opening file explorer for FACE image...');
                    const facePath = openFileExplorer(`Select FACE Image for Cow ${i}`);
                    faceImageBase64 = convertToBase64(facePath);
                    console.log(`✅ Selected Face: ${facePath}`);

                    break;
                } catch (e: any) {
                    console.log(`⚠️ ${e.message} Let's try selecting the images again.`);
                }
            }

            // Generate Random Cow Data
            const tagNo = `TAG-${Math.floor(100000 + Math.random() * 900000)}`;
            const species = randomSpecies();
            const sex = randomSex();
            const source = randomSource();
            const productionStatus = randomStatus();

            // --- ENDPOINT REPLICATION LOGIC ---
            if (!tagNo || !species || !sex || !faceImageBase64 || !muzzleImageBase64) {
                console.error('❌ Missing required fields. Skipping this cow.');
                continue;
            }

            const existingCow = await Cattle.findOne({ tagNumber: tagNo });
            if (existingCow) {
                console.error(`❌ Cow with tag ${tagNo} already exists. Skipping.`);
                continue;
            }

            const newCow = new Cattle({
                farmerId: farmer._id,
                tagNumber: tagNo,
                name: `Cattle-${i}`,
                species: species,
                breed: 'Crossbreed',
                sex: sex,
                dob: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
                ageMonths: Math.floor(Math.random() * 60) + 1,
                source: source,
                purchaseDetails: source === 'Purchase' ? {
                    date: new Date(),
                    price: Math.floor(Math.random() * 50000) + 10000
                } : undefined,
                photos: {
                    faceProfile: faceImageBase64,
                    muzzle: muzzleImageBase64,
                    leftProfile: faceImageBase64,
                    rightProfile: faceImageBase64,
                    backView: faceImageBase64,
                    tailView: faceImageBase64
                },
                currentStatus: productionStatus,
                lastWeight: Math.floor(Math.random() * 400) + 100,
                healthStats: {
                    growthStatus: 'Normal',
                    healthStatus: 'Healthy',
                    bodyConditionScore: Math.floor(Math.random() * 5) + 1
                }
            });

            // 1. Save Cow
            const savedCow = await newCow.save();

            // 2. Bind Cow to Farmer Document
            await User.findByIdAndUpdate(farmer._id, {
                $push: { cows: savedCow._id }
            });

            // 3. Call DL API for vector embeddings
            try {
                const dlApiUrl = process.env.DL_MODEL_SERVER_LINK || 'http://localhost:8000';
                await axios.post(`${dlApiUrl}/register`, {
                    cow_id: savedCow._id.toString(),
                    farmer_id: farmer._id.toString(),
                    face_image: faceImageBase64,
                    muzzle_image: muzzleImageBase64
                });
                console.log(`✅ DL API call successful for ${tagNo}`);
            } catch (dlError: any) {
                console.error(`⚠️ Error calling DL API for embeddings on ${tagNo}:`, dlError.message);
            }

            console.log(`✅ Successfully registered cow ${i}/12 with Tag: ${tagNo}`);
        }

        console.log('\n🎉 Database seeding completed successfully!');
        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Database connection/seeding error:', error);
        process.exit(1);
    }
}

seedDatabase();