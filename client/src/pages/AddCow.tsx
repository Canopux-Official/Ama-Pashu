import React, { useState } from 'react';
import {
    Container, Paper, Typography, Box, Stepper, Step, StepLabel,
    Button, TextField, MenuItem, Stack, IconButton, Divider, InputAdornment
} from '@mui/material';
import {
    CameraAlt, ArrowBack, ArrowForward, CheckCircle,
    QrCodeScanner, Edit
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// STEPS MAPPED TO YOUR WORKFLOW
const steps = ['Basic Info', 'Lineage & Origin', 'Visual ID', 'Health & Stats', 'Review'];

interface CowFormData {
    tagNo: string;
    name: string;
    species: string;
    breed: string;
    sex: string;
    dob: string;
    ageMonths: string;
    source: string;
    purchaseDate: string;
    purchasePrice: string;
    sireTag: string;
    damTag: string;
    birthWeight: string;
    motherWeightAtCalving: string;
    bodyConditionScore: string;
    currentWeight: string;
    growthStatus: string;
    healthStatus: string;
    productionStatus: string;
}

interface StepProps {
    formData: CowFormData;
    handleChange: (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface StepReviewProps {
    formData: CowFormData;
    setActiveStep: (step: number) => void;
}

// --- STEP 1: BASIC INFORMATION ---
const StepBasic: React.FC<StepProps> = ({ formData, handleChange }) => (
    <Stack spacing={3}>
        <Typography variant="subtitle2" color="primary" fontWeight="bold">IDENTIFICATION</Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
                fullWidth required label="Tag No (Animal No)"
                placeholder="Scan Ear Tag"
                value={formData.tagNo} onChange={handleChange('tagNo')}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton color="primary"><QrCodeScanner /></IconButton>
                        </InputAdornment>
                    )
                }}
            />
        </Box>

        <TextField fullWidth label="Given Name" value={formData.name} onChange={handleChange('name')} />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField select fullWidth label="Species" value={formData.species} onChange={handleChange('species')}>
                <MenuItem value="Cow">Cow</MenuItem>
                <MenuItem value="Buffalo">Buffalo</MenuItem>
            </TextField>
            <TextField select fullWidth label="Sex" value={formData.sex} onChange={handleChange('sex')}>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Freemartin">Freemartin</MenuItem>
            </TextField>
        </Box>

        <TextField select fullWidth label="Breed" value={formData.breed} onChange={handleChange('breed')}>
            <MenuItem value="Gir">Gir</MenuItem>
            <MenuItem value="Sahiwal">Sahiwal</MenuItem>
            <MenuItem value="Jersey">Jersey</MenuItem>
            <MenuItem value="HF">Holstein Friesian</MenuItem>
            <MenuItem value="Desi">Non-Descript (Desi)</MenuItem>
        </TextField>

        <Typography variant="subtitle2" color="primary" fontWeight="bold" sx={{ mt: 1 }}>AGE DETAILS</Typography>

        <TextField
            fullWidth type="date" label="Date of Birth"
            InputLabelProps={{ shrink: true }}
            value={formData.dob} onChange={handleChange('dob')}
        />

        <TextField
            fullWidth disabled label="Approx Age (Months)"
            value={formData.ageMonths}
            helperText="Auto-calculated from DOB"
        />
    </Stack>
);

// --- STEP 2: LINEAGE & ORIGIN ---
const StepOrigin: React.FC<StepProps> = ({ formData, handleChange }) => (
    <Stack spacing={3}>
        <Typography variant="subtitle2" color="primary" fontWeight="bold">ORIGIN SOURCE</Typography>

        <TextField select fullWidth label="Purchase / Home Born" value={formData.source} onChange={handleChange('source')}>
            <MenuItem value="Home Born">Home Born</MenuItem>
            <MenuItem value="Purchase">Purchased</MenuItem>
        </TextField>

        {formData.source === 'Purchase' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField type="date" label="Purchase Date" InputLabelProps={{ shrink: true }} />
                <TextField type="number" label="Price (₹)" />
            </Box>
        )}

        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle2" color="primary" fontWeight="bold">PARENTAGE (LIFETIME DETAILS)</Typography>

        <TextField fullWidth label="Sire No (Father Pasu Aadhar)" value={formData.sireTag} onChange={handleChange('sireTag')} />
        <TextField fullWidth label="Dam No (Mother Pasu Aadhar)" value={formData.damTag} onChange={handleChange('damTag')} />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField type="number" label="Birth Weight (kg)" value={formData.birthWeight} onChange={handleChange('birthWeight')} />
            <TextField type="number" label="Mother Wt after Calving" value={formData.motherWeightAtCalving} onChange={handleChange('motherWeightAtCalving')} />
        </Box>
    </Stack>
);

// --- STEP 3: VISUAL ID (CAMERA) ---
const PhotoBox = ({ label, required = false }: { label: string, required?: boolean }) => (
    <Paper
        elevation={0}
        sx={{
            bgcolor: '#F3F4F6', border: '2px dashed #CBD5E1', borderRadius: 3,
            p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: required ? 160 : 110, cursor: 'pointer', position: 'relative'
        }}
    >
        <CameraAlt color={required ? 'primary' : 'action'} sx={{ fontSize: 32, mb: 1 }} />
        <Typography variant="caption" fontWeight={600} align="center">{label}</Typography>
        {required && (
            <Box sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'secondary.main', color: 'white', fontSize: 10, px: 1, borderBottomLeftRadius: 8 }}>
                AI REQUIRED
            </Box>
        )}
    </Paper>
);

const StepVisual: React.FC = () => (
    <Stack spacing={3}>
        <Typography variant="body2" color="text.secondary">
            Capture clear photos for the AI Model to identify this cow later.
        </Typography>

        <Typography variant="subtitle2" fontWeight="bold">1. PRIMARY IDENTIFIER</Typography>
        <PhotoBox label="Muzzle (Nose Print)" required />

        <Typography variant="subtitle2" fontWeight="bold">2. BODY ANGLES</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <PhotoBox label="Left Profile" />
            <PhotoBox label="Right Profile" />
            <PhotoBox label="Back View" />
            <PhotoBox label="Tail / Udders" />
        </Box>

        {/* 3D Camera Option from your image */}
        <Button variant="outlined" startIcon={<CameraAlt />}>
            Launch 3D Scanner (Optional)
        </Button>
    </Stack>
);

// --- STEP 4: HEALTH & STATS ---
const StepStats: React.FC<StepProps> = ({ formData, handleChange }) => (
    <Stack spacing={3}>
        <Typography variant="subtitle2" color="primary" fontWeight="bold">BODY WEIGHT RECORDING</Typography>

        <TextField type="number" fullWidth label="Current Body Weight (kg)" value={formData.currentWeight} onChange={handleChange('currentWeight')} />

        <TextField select fullWidth label="Growth Status" value={formData.growthStatus} onChange={handleChange('growthStatus')}>
            <MenuItem value="Optimum">Optimum Growth (&gt;400g/day)</MenuItem>
            <MenuItem value="Poor">Poor Growth (&lt;400g/day)</MenuItem>
        </TextField>

        <Typography variant="subtitle2" color="primary" fontWeight="bold" sx={{ mt: 1 }}>CURRENT STATUS</Typography>

        <TextField select fullWidth label="Reproduction Status" value={formData.productionStatus} onChange={handleChange('productionStatus')}>
            <MenuItem value="Milking">In Milk</MenuItem>
            <MenuItem value="Dry">Dry</MenuItem>
            <MenuItem value="Pregnant">Pregnant</MenuItem>
            <MenuItem value="Heifer">Heifer (Not yet calved)</MenuItem>
        </TextField>

        <TextField select fullWidth label="Calf Body Condition" value={formData.healthStatus} onChange={handleChange('healthStatus')}>
            <MenuItem value="Healthy">Healthy</MenuItem>
            <MenuItem value="Underweight">Underweight</MenuItem>
        </TextField>

        <TextField type="number" label="Body Condition Score (1-5)" value={formData.bodyConditionScore} onChange={handleChange('bodyConditionScore')} />
    </Stack>
);

// --- STEP 5: REVIEW ---
const StepReview: React.FC<StepReviewProps> = ({ formData, setActiveStep }) => (
    <Stack spacing={2}>
        <Paper elevation={0} sx={{ bgcolor: '#F9FAFB', p: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">IDENTITY</Typography>
                <IconButton size="small" onClick={() => setActiveStep(0)}><Edit fontSize="small" /></IconButton>
            </Box>
            <Typography variant="body1" fontWeight="bold">{formData.tagNo || 'No Tag'}</Typography>
            <Typography variant="body2">{formData.breed} {formData.species} • {formData.sex}</Typography>
        </Paper>

        <Paper elevation={0} sx={{ bgcolor: '#F9FAFB', p: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">STATS</Typography>
                <IconButton size="small" onClick={() => setActiveStep(3)}><Edit fontSize="small" /></IconButton>
            </Box>
            <Typography variant="body2">Weight: {formData.currentWeight} kg</Typography>
            <Typography variant="body2">Status: {formData.productionStatus}</Typography>
        </Paper>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
                By clicking submit, this data and the muzzle photos will be uploaded to the Gau-Netra AI Server.
            </Typography>
        </Box>
    </Stack>
);

const AddCow: React.FC = () => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);

    // --- FULL FORM STATE (Matches your Image & Schema) ---
    const [formData, setFormData] = useState<CowFormData>({
        // Basic
        tagNo: '',
        name: '',
        species: 'Cow',
        breed: '',
        sex: 'Female',
        dob: '', // YYYY-MM-DD
        ageMonths: '', // Auto-calculated

        // Origin (Purchase/Home Born)
        source: 'Home Born',
        purchaseDate: '',
        purchasePrice: '',

        // Lineage
        sireTag: '', // Father
        damTag: '',  // Mother

        // Physical Metrics from your Image
        birthWeight: '',
        motherWeightAtCalving: '',
        bodyConditionScore: '',

        // Current Status
        currentWeight: '',
        growthStatus: 'Optimum', // Poor/Optimum
        healthStatus: 'Healthy', // Healthy/Underweight
        productionStatus: 'Milking', // Milking/Dry/Pregnant/Heifer
    });

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            // Auto-Calculate Age when DOB changes
            if (field === 'dob') {
                if (value) {
                    const birth = new Date(value);
                    const now = new Date();
                    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
                    updated.ageMonths = isNaN(months) ? '' : months.toString();
                } else {
                    updated.ageMonths = '';
                }
            }
            return updated;
        });
    };

    const handleNext = () => setActiveStep((prev) => prev + 1);
    const handleBack = () => setActiveStep((prev) => prev - 1);

    return (
        <Container maxWidth="sm" sx={{ py: 2, pb: 15 }}>

            {/* 1. Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={() => navigate('/')} sx={{ mr: 1, border: '1px solid #E5E7EB' }}>
                    <ArrowBack />
                </IconButton>
                <Typography variant="h6" fontWeight={800}>
                    New Registration
                </Typography>
            </Box>

            {/* 2. Stepper */}
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {/* 3. Form Content */}
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #E5E7EB', borderRadius: 3, minHeight: 400 }}>
                {activeStep === 0 && <StepBasic formData={formData} handleChange={handleChange} />}
                {activeStep === 1 && <StepOrigin formData={formData} handleChange={handleChange} />}
                {activeStep === 2 && <StepVisual />}
                {activeStep === 3 && <StepStats formData={formData} handleChange={handleChange} />}
                {activeStep === 4 && <StepReview formData={formData} setActiveStep={setActiveStep} />}
            </Paper>

            {/* 4. FIXED FLOATING ACTION BAR (High Z-Index to stay on top) */}
            <Paper
                elevation={12}
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 2,
                    bgcolor: 'white',
                    zIndex: 1300, // HIGHER than App Layout (1200)
                    borderTop: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                    sx={{ color: 'text.secondary', fontWeight: 600 }}
                >
                    Back
                </Button>

                {/* Progress Indicator Text */}
                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                    Step {activeStep + 1} of {steps.length}
                </Typography>

                <Button
                    variant="contained"
                    onClick={activeStep === steps.length - 1 ? () => alert("Saved!") : handleNext}
                    endIcon={activeStep === steps.length - 1 ? <CheckCircle /> : <ArrowForward />}
                    sx={{
                        px: 4, borderRadius: 4,
                        boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)'
                    }}
                >
                    {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
                </Button>
            </Paper>

        </Container>
    );
};

export default AddCow;