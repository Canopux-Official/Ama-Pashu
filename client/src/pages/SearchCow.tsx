import React, { useState } from 'react';
import {
    Container, Box, TextField, InputAdornment, IconButton, Typography,
    Tabs, Tab, Paper, Avatar, Chip, Button, Stack, CircularProgress
} from '@mui/material';
import {
    Search, QrCodeScanner, FilterList, ArrowForwardIos,
    CameraAlt, FlashOn
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// MOCK DATA: Results when searching
const MOCK_RESULTS = [
    { id: '101', tag: '1024-55', name: 'Gauri', breed: 'Gir', status: 'Milking', img: 'https://placehold.co/100' },
    { id: '102', tag: '1024-56', name: 'Nandini', breed: 'Jersey', status: 'Pregnant', img: 'https://placehold.co/100' },
    { id: '103', tag: '1024-57', name: 'Bholi', breed: 'Sahiwal', status: 'Sick', img: 'https://placehold.co/100' },
];

const SearchTab = () => {
    const navigate = useNavigate();

    return (
        <Box sx={{ mt: 2 }}>
            {/* Search Bar */}
            <Paper elevation={0} sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: 3 }}>
                <InputAdornment position="start" sx={{ pl: 1 }}><Search color="action" /></InputAdornment>
                <TextField
                    fullWidth placeholder="Search by Tag No or Name"
                    variant="standard"
                    InputProps={{ disableUnderline: true }}
                    sx={{ ml: 1, flex: 1 }}
                />
                <IconButton sx={{ p: '10px' }}><FilterList /></IconButton>
            </Paper>

            {/* Results List */}
            <Stack spacing={2} sx={{ mt: 3 }}>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                    RECENT SEARCHES / HERD LIST
                </Typography>

                {MOCK_RESULTS.map((cow) => (
                    <Paper
                        key={cow.id}
                        elevation={0}
                        onClick={() => navigate(`/cow/${cow.id}`)} // Go to Profile
                        sx={{
                            p: 2, borderRadius: 3, border: '1px solid #eee',
                            display: 'flex', alignItems: 'center', gap: 2,
                            cursor: 'pointer',
                            '&:active': { bgcolor: '#f5f5f5' }
                        }}
                    >
                        <Avatar src={cow.img} variant="rounded" sx={{ width: 56, height: 56 }} />

                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                                {cow.name} <Typography component="span" variant="caption" color="text.secondary">#{cow.tag}</Typography>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {cow.breed} • Age: 4y
                            </Typography>
                        </Box>

                        <Chip
                            label={cow.status}
                            size="small"
                            color={cow.status === 'Sick' ? 'error' : cow.status === 'Pregnant' ? 'warning' : 'success'}
                            sx={{ fontWeight: 600, height: 24 }}
                        />
                        <ArrowForwardIos fontSize="small" sx={{ color: '#ccc', fontSize: 14 }} />
                    </Paper>
                ))}
            </Stack>
        </Box>
    );
};

const ScanTab = () => {
    const navigate = useNavigate();
    const [scanning, setScanning] = useState(false);

    const handleScan = () => {
        setScanning(true);
        // Simulate AI delay
        setTimeout(() => {
            setScanning(false);
            navigate('/cow/101'); // Found match!
        }, 2000);
    };

    return (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Point camera at the cow's muzzle (nose) for instant identification.
            </Typography>

            {/* Camera Viewfinder Mockup */}
            <Box sx={{
                position: 'relative', width: '100%', height: 350,
                bgcolor: '#000', borderRadius: 4, overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {/* Scanning Animation Line */}
                {scanning && (
                    <Box sx={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '4px', bgcolor: '#00ff00',
                        boxShadow: '0 0 10px #00ff00',
                        animation: 'scan 2s infinite linear',
                        '@keyframes scan': { '0%': { top: '0%' }, '100%': { top: '100%' } }
                    }} />
                )}

                <img
                    src="https://placehold.co/400x600/333/999?text=Camera+Preview"
                    alt="Camera"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                />

                {/* Viewfinder Overlay */}
                <Box sx={{ position: 'absolute', border: '2px solid rgba(255,255,255,0.5)', width: '70%', height: '40%', borderRadius: 2 }} />
                <Typography variant="caption" sx={{ position: 'absolute', bottom: 20, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', px: 1, borderRadius: 1 }}>
                    Align Muzzle Here
                </Typography>
            </Box>

            {/* Scan Trigger */}
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 4, alignItems: 'center' }}>
                <IconButton sx={{ border: '1px solid #eee' }}><FlashOn /></IconButton>

                <Box sx={{ position: 'relative' }}>
                    {scanning && <CircularProgress size={84} sx={{ position: 'absolute', top: -6, left: -6, color: 'secondary.main' }} />}
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleScan}
                        sx={{
                            width: 72, height: 72, borderRadius: '50%',
                            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)'
                        }}
                    >
                        <CameraAlt fontSize="large" />
                    </Button>
                </Box>

                <IconButton sx={{ border: '1px solid #eee' }}><QrCodeScanner /></IconButton>
            </Box>
        </Box>
    );
};

const SearchCow: React.FC = () => {
    const [tabValue, setTabValue] = useState(0); // 0 = Search, 1 = AI Scan

    return (
        <Container maxWidth="sm" sx={{ pt: 2, pb: 10 }}>
            {/* Header */}
            <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
                Find Cattle
            </Typography>

            {/* Tabs */}
            <Paper elevation={0} sx={{ borderBottom: '1px solid #eee' }}>
                <Tabs
                    value={tabValue}
                    onChange={(_e, v) => setTabValue(v)}
                    variant="fullWidth"
                    indicatorColor="primary"
                    textColor="primary"
                >
                    <Tab icon={<Search />} iconPosition="start" label="Search ID" sx={{ fontWeight: 600 }} />
                    <Tab icon={<CameraAlt />} iconPosition="start" label="AI Scan" sx={{ fontWeight: 600 }} />
                </Tabs>
            </Paper>

            {/* Content */}
            {tabValue === 0 ? <SearchTab /> : <ScanTab />}

        </Container>
    );
};

export default SearchCow;