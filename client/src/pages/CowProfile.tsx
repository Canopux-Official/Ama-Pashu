import React, { useState } from 'react';
import {
    Container, Box, Typography, Paper, Chip, Stack, IconButton,
    List, ListItem, ListItemAvatar, Avatar, ListItemText, Fab, Tabs, Tab, Divider
} from '@mui/material';
import {
    ArrowBack, Edit, WaterDrop,
    PhotoLibrary, Info, QrCodeScanner, Cake, Scale,
    Female, Male, Store, Person, Home, Badge, LocalOffer,
    MonitorWeight
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// FULL FORM DATA MOCK (Pashu Aadhar 2026 Compatible)
const COW_DATA = {
    // General / Owner
    ownerName: 'Rajesh Kumar',
    orgName: 'Gau Seva Kendra',
    ownerAadhar: '4589-1234-5678',
    address: 'Plot 4B, Pipili',
    village: 'Pipili',
    district: 'Puri',
    state: 'Odisha',

    // Animal Basics
    tag: '1024-55',
    lot: 'Lot-2026-A01',
    name: 'Gauri',
    species: 'Cattle',
    breed: 'Gir',
    sex: 'Female',
    dob: '12 Jan 2022',
    age: '4 Years 1 Month', // Auto-calculated
    source: 'Purchase',

    // Purchase Details (if applicable)
    purchaseDate: '15 Feb 2023',
    price: '₹45,000',

    // Lifetime / Lineage
    sire: 'Sire-2021-99', // Pasu Aadhar
    dam: 'Dam-2019-45',   // Pasu Aadhar
    birthWeight: '22 kg',
    motherWeightAtCalving: '350 kg',
    calfStatus: 'Healthy', // Healthy/Underweight

    // Current Status (Detailed)
    // Options: Calf/Heifer/Heifer Pregnant/Dry Pregnant/Dry Non Pregnant/In Milk/Open
    status: 'In Milk',

    // Growth & Stats
    currentWeight: '380 kg',
    milkYield: '12 L/day',
    calves: 2,
    growth: 'Optimum (>400g/day)', // <400g or >400g
    bcs: '3.5'
};

const CowProfile: React.FC = () => {
    const navigate = useNavigate();
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Container maxWidth="sm" sx={{ p: 0, pb: 10 }}>
            {/* 1. HERO IMAGE HEADER */}
            <Box sx={{ position: 'relative', height: 240, bgcolor: '#eee' }}>
                <IconButton
                    onClick={() => navigate(-1)}
                    sx={{ position: 'absolute', top: 16, left: 16, bgcolor: 'white', '&:hover': { bgcolor: 'white' }, zIndex: 20 }}
                >
                    <ArrowBack />
                </IconButton>
                <img
                    src="https://placehold.co/600x400"
                    alt="Cow"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <Box sx={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    p: 3, pt: 8, color: 'white'
                }}>
                    <Typography variant="h4" fontWeight={800}>{COW_DATA.name}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Tag #{COW_DATA.tag} • {COW_DATA.breed}</Typography>
                </Box>
            </Box>

            {/* 2. MAIN CONTENT CONTAINER */}
            <Container sx={{ mt: -3, position: 'relative', zIndex: 10 }}>
                <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
                    {/* TABS HEADER */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}>
                        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth" indicatorColor="primary">
                            <Tab icon={<PhotoLibrary />} iconPosition="start" label="Gallery" />
                            <Tab icon={<Info />} iconPosition="start" label="Data" />
                        </Tabs>
                    </Box>

                    {/* TAB PANEL 1: GALLERY */}
                    {tabValue === 0 && (
                        <Box sx={{ p: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                                REQUIRED REGISTRATION PHOTOS
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                                {['Muzzle (Nose)', 'Left Profile', 'Right Profile', 'Back View', 'Tail / Udders'].map((label, index) => (
                                    <Box key={index}>
                                        <Paper elevation={0} sx={{
                                            height: 120, bgcolor: '#f5f5f5', borderRadius: 2, overflow: 'hidden', position: 'relative',
                                            border: '1px solid #eee'
                                        }}>
                                            <img
                                                src={`https://placehold.co/300x200?text=${label.split(' ')[0]}`}
                                                alt={label}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                            <Typography variant="caption" sx={{
                                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                                bgcolor: 'rgba(0,0,0,0.6)', color: 'white', p: 0.5, textAlign: 'center'
                                            }}>
                                                {label}
                                            </Typography>
                                        </Paper>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* TAB PANEL 2: METADATA DETAILS */}
                    {tabValue === 1 && (
                        <Box sx={{ p: 2 }}>
                            {/* STATUS BADGES */}
                            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                                <Chip label={COW_DATA.status} color="success" size="small" icon={<WaterDrop />} />
                                <Chip label={COW_DATA.growth} variant="outlined" size="small" color="info" />
                            </Stack>

                            {/* SECTION 1: GENERAL / OWNER */}
                            <Typography variant="overline" color="text.secondary" fontWeight="bold">GENERAL & OWNER</Typography>
                            <List dense disablePadding sx={{ mb: 3, bgcolor: '#f9fafb', borderRadius: 2, p: 1 }}>
                                <ListItem disableGutters>
                                    <ListItemAvatar><Avatar sx={{ width: 28, height: 28 }}><Person sx={{ fontSize: 18 }} /></Avatar></ListItemAvatar>
                                    <ListItemText primary="Owner Name" secondary={COW_DATA.ownerName} />
                                </ListItem>
                                <ListItem disableGutters>
                                    <ListItemAvatar><Avatar sx={{ width: 28, height: 28 }}><Badge sx={{ fontSize: 18 }} /></Avatar></ListItemAvatar>
                                    <ListItemText primary="Owner Aadhar" secondary={COW_DATA.ownerAadhar} />
                                </ListItem>
                                <ListItem disableGutters>
                                    <ListItemAvatar><Avatar sx={{ width: 28, height: 28 }}><Home sx={{ fontSize: 18 }} /></Avatar></ListItemAvatar>
                                    <ListItemText primary="Location" secondary={`${COW_DATA.village}, ${COW_DATA.district}, ${COW_DATA.state}`} />
                                </ListItem>
                            </List>

                            <Divider sx={{ mb: 2 }} />

                            {/* SECTION 2: ANIMAL DETAILS */}
                            <Typography variant="overline" color="text.secondary" fontWeight="bold">ANIMAL DETAILS</Typography>
                            <List dense>
                                <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemAvatar><Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}><QrCodeScanner /></Avatar></ListItemAvatar>
                                    <ListItemText primary="Identity" secondary={`Tag: ${COW_DATA.tag} | Lot: ${COW_DATA.lot}`} />
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>{COW_DATA.sex === 'Female' ? <Female /> : <Male />}</Avatar>
                                    </ListItemAvatar>
                                    <ListItemText primary="Species / Sex" secondary={`${COW_DATA.species} / ${COW_DATA.sex}`} />
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemAvatar><Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}><LocalOffer /></Avatar></ListItemAvatar>
                                    <ListItemText primary="Breed" secondary={COW_DATA.breed} />
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemAvatar><Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main' }}><Cake /></Avatar></ListItemAvatar>
                                    <ListItemText primary="Age & DOB" secondary={`${COW_DATA.age} (${COW_DATA.dob})`} />
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemAvatar><Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}><Store /></Avatar></ListItemAvatar>
                                    <ListItemText primary="Source" secondary={COW_DATA.source} />
                                </ListItem>
                            </List>

                            <Divider sx={{ mb: 2 }} />

                            {/* SECTION 3: LIFETIME & STATS */}
                            <Typography variant="overline" color="text.secondary" fontWeight="bold">LIFETIME & BODY STATS</Typography>
                            <List dense>
                                <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemAvatar><Avatar sx={{ bgcolor: 'error.light', color: 'error.main' }}><SchemaIcon /></Avatar></ListItemAvatar>
                                    <ListItemText primary="Lineage (Sire / Dam)" secondary={`${COW_DATA.sire} / ${COW_DATA.dam}`} />
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemAvatar><Avatar sx={{ bgcolor: 'grey.300', color: 'grey.800' }}><Scale /></Avatar></ListItemAvatar>
                                    <ListItemText
                                        primary="Birth Metrics"
                                        secondary={`Birth Wt: ${COW_DATA.birthWeight} | Mother's Wt: ${COW_DATA.motherWeightAtCalving}`}
                                    />
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemAvatar><Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}><MonitorWeight /></Avatar></ListItemAvatar>
                                    <ListItemText primary="Current Stats" secondary={`Weight: ${COW_DATA.currentWeight} | BCS: ${COW_DATA.bcs}`} />
                                </ListItem>
                            </List>

                        </Box>
                    )}
                </Paper>
            </Container>

            {/* Floating Edit Button */}
            <Fab color="secondary" sx={{ position: 'fixed', bottom: 90, right: 16 }}>
                <Edit />
            </Fab>

        </Container>
    );
};

// Helper for Missing Icon
const SchemaIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px"><path d="M0 0h24v24H0z" fill="none" /><path d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z" /></svg>
);

export default CowProfile;