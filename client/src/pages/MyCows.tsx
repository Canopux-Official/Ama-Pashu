import React, { useState } from 'react';
import {
    Container, Box, TextField, InputAdornment, IconButton, Typography,
    Paper, Avatar, Chip, Stack, Fab
} from '@mui/material';
import {
    Search, FilterList, ArrowForwardIos, Add
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// MOCK DATA: Registered Cattle
const MY_COWS = [
    { id: '101', tag: '1024-55', name: 'Gauri', breed: 'Gir', status: 'Milking', img: 'https://placehold.co/100', age: '4y', milk: '12L' },
    { id: '102', tag: '1024-56', name: 'Nandini', breed: 'Jersey', status: 'Pregnant', img: 'https://placehold.co/100', age: '3.5y', milk: '0L' },
    { id: '103', tag: '1024-57', name: 'Bholi', breed: 'Sahiwal', status: 'Sick', img: 'https://placehold.co/100', age: '5y', milk: '8L' },
    { id: '104', tag: '1024-58', name: 'Radha', breed: 'Red Sindhi', status: 'Dry', img: 'https://placehold.co/100', age: '6y', milk: '0L' },
    { id: '105', tag: '1024-59', name: 'Shyama', breed: 'Tharparkar', status: 'Milking', img: 'https://placehold.co/100', age: '4.2y', milk: '10L' },
    { id: '106', tag: '1024-60', name: 'Tulsi', breed: 'Gir', status: 'Pregnant', img: 'https://placehold.co/100', age: '3y', milk: '5L' },
    { id: '107', tag: '1024-61', name: 'Kamdhenu', breed: 'Kankrej', status: 'Milking', img: 'https://placehold.co/100', age: '5.5y', milk: '14L' },
    { id: '108', tag: '1024-62', name: 'Laxmi', breed: 'Jersey', status: 'Dry', img: 'https://placehold.co/100', age: '7y', milk: '0L' },
    { id: '109', tag: '1024-63', name: 'Ganga', breed: 'Sahiwal', status: 'Milking', img: 'https://placehold.co/100', age: '4.5y', milk: '11L' },
    { id: '110', tag: '1024-64', name: 'Yamuna', breed: 'Red Sindhi', status: 'Heifer', img: 'https://placehold.co/100', age: '1.5y', milk: '0L' },
    { id: '111', tag: '1024-65', name: 'Saraswati', breed: 'Gir', status: 'Milking', img: 'https://placehold.co/100', age: '6.2y', milk: '9L' },
    { id: '112', tag: '1024-66', name: 'Kaveri', breed: 'Tharparkar', status: 'Pregnant', img: 'https://placehold.co/100', age: '3.8y', milk: '4L' },
    { id: '113', tag: '1024-67', name: 'Godavari', breed: 'Kankrej', status: 'Sick', img: 'https://placehold.co/100', age: '5.1y', milk: '7L' },
    { id: '114', tag: '1024-68', name: 'Narmada', breed: 'Jersey', status: 'Milking', img: 'https://placehold.co/100', age: '4y', milk: '13L' },
    { id: '115', tag: '1024-69', name: 'Krishna', breed: 'Sahiwal', status: 'Dry', img: 'https://placehold.co/100', age: '6.5y', milk: '0L' },
];

const MyCows: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCows = MY_COWS.filter(cow =>
        cow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cow.tag.includes(searchTerm)
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Sick': return 'error';
            case 'Pregnant': return 'warning';
            case 'Heifer': return 'info';
            case 'Dry': return 'default';
            default: return 'success';
        }
    };

    return (
        <Container maxWidth="sm" sx={{ pt: 2, pb: 12 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" fontWeight={800} color="primary.main">
                    My Herd
                </Typography>
                <Chip label={`${MY_COWS.length} Animals`} size="small" color="primary" variant="outlined" />
            </Stack>

            {/* Search Bar */}
            <Paper elevation={0} sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: 3, mb: 3 }}>
                <InputAdornment position="start" sx={{ pl: 1 }}><Search color="action" /></InputAdornment>
                <TextField
                    fullWidth
                    placeholder="Search Name or Tag ID"
                    variant="standard"
                    InputProps={{ disableUnderline: true }}
                    sx={{ ml: 1, flex: 1 }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <IconButton sx={{ p: '10px' }}><FilterList /></IconButton>
            </Paper>

            {/* Cow List */}
            <Stack spacing={2}>
                {filteredCows.map((cow) => (
                    <Paper
                        key={cow.id}
                        elevation={0}
                        onClick={() => navigate(`/cow/${cow.id}`)}
                        sx={{
                            p: 2, borderRadius: 3, border: '1px solid #eee',
                            display: 'flex', alignItems: 'center', gap: 2,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:active': { bgcolor: '#f5f5f5', transform: 'scale(0.98)' }
                        }}
                    >
                        <Avatar src={cow.img} variant="rounded" sx={{ width: 64, height: 64, borderRadius: 3 }} />

                        <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    {cow.name}
                                </Typography>
                                <Chip
                                    label={cow.status}
                                    size="small"
                                    color={getStatusColor(cow.status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                            </Box>

                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="caption" sx={{ bgcolor: 'grey.100', px: 0.8, py: 0.2, borderRadius: 1 }}>
                                    #{cow.tag}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {cow.breed} • {cow.age}
                                </Typography>
                            </Stack>
                        </Box>

                        <ArrowForwardIos fontSize="small" sx={{ color: '#ccc', fontSize: 14 }} />
                    </Paper>
                ))}

                {filteredCows.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4, opacity: 0.6 }}>
                        <Typography variant="body1">No cattle found.</Typography>
                    </Box>
                )}
            </Stack>

            {/* Floating Add Button */}
            <Fab
                color="secondary"
                aria-label="add"
                sx={{ position: 'fixed', bottom: 90, right: 24, boxShadow: '0 4px 12px rgba(245, 158, 11, 0.5)' }}
                onClick={() => navigate('/add-cow')}
            >
                <Add />
            </Fab>
        </Container>
    );
};

export default MyCows;
