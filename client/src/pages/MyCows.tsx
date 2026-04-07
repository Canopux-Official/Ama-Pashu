import React, { useState } from 'react';
import {
    Container, Box, TextField, InputAdornment, IconButton, Typography,
    Paper, Avatar, Chip, Stack, Button
} from '@mui/material';
import {
    Search, FilterList, ArrowForwardIos, Add
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { getMyCattleAPI } from '../apis/apis';
import { getImageUrl } from '../utils/imageUtils';

interface CowListSummary {
    _id: string;
    name: string;
    tagNumber: string;
    breed: string;
    currentStatus: string;
    ageMonths?: number;
    photos?: { faceProfile?: string, muzzle?: string };
    isDispute?: boolean;
}

const MyCows: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: cowsResponse, isLoading, refetch } = useQuery({
        queryKey: ['cows'],
        queryFn: getMyCattleAPI,
    });

    const handleRefresh = async () => {
        await refetch();
    };

    const cows: CowListSummary[] = cowsResponse?.data || [];
    
    // Only show successful registrations that are not disputed
    const nonDisputedCows = cows.filter((cow) => !cow.isDispute);

    const filteredCows = nonDisputedCows.filter(cow =>
        cow.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cow.tagNumber?.includes(searchTerm)
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
        <PullToRefresh onRefresh={handleRefresh} pullingContent=""
            maxPullDownDistance={100} resistance={2} backgroundColor="#F4F7F4">
            <Container maxWidth="sm" sx={{ pt: 2, pb: 12, minHeight: 'calc(100vh - 80px)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h5" fontWeight={800} color="primary.main">
                            My Herd
                        </Typography>
                        <Chip label={`Total: ${cows.length}`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 'bold' }} />
                    </Box>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Add fontSize="small" />}
                        onClick={() => navigate('/add-cow')}
                        sx={{
                            borderRadius: 6,
                            fontWeight: 600,
                            px: 1.5,
                            py: 0.5,
                            textTransform: 'none',
                            borderWidth: 1.5,
                            fontSize: '0.8rem',
                            '&:hover': { borderWidth: 1.5 }
                        }}
                    >
                        Register New
                    </Button>
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
                    {isLoading ? <Typography align="center" mt={4}>Loading cattle...</Typography> : filteredCows.map((cow) => (
                        <Paper
                            key={cow._id}
                            elevation={0}
                            onClick={() => navigate(`/profile/${cow._id}`)}
                            sx={{
                                p: 2, borderRadius: 3, border: '1px solid #eee',
                                display: 'flex', alignItems: 'center', gap: 2,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:active': { bgcolor: '#f5f5f5', transform: 'scale(0.98)' }
                            }}
                        >
                            <Avatar src={getImageUrl(cow.photos?.faceProfile) || getImageUrl(cow.photos?.muzzle) || 'https://placehold.co/100'} variant="rounded" sx={{ width: 64, height: 64, borderRadius: 3 }} />

                            <Box sx={{ flexGrow: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {cow.name}
                                    </Typography>
                                    <Chip
                                        label={cow.currentStatus}
                                        size="small"
                                        color={getStatusColor(cow.currentStatus) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                    />
                                </Box>

                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="caption" sx={{ bgcolor: 'grey.100', px: 0.8, py: 0.2, borderRadius: 1 }}>
                                        #{cow.tagNumber}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {cow.breed} • {cow.ageMonths ? `${cow.ageMonths}m` : 'Age unknown'}
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

            </Container>
        </PullToRefresh>
    );
};

export default MyCows;
