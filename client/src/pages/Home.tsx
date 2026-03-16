import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Stack, Alert, AlertTitle, Collapse } from '@mui/material';
import PetsIcon from '@mui/icons-material/Pets';
import FavoriteIcon from '@mui/icons-material/Favorite';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { getMyCattleAPI } from '../apis/apis';
import { Preferences } from '@capacitor/preferences';

// Importing your existing dashboard components
import StatCard from '../components/dashboard/StatCard';
import ActionGrid from '../components/dashboard/ActionGrid';

interface CowSummary {
    _id: string;
    name: string;
    breed: string;
    currentStatus: string;
    isSick: boolean;
    isDispute?: boolean;
}


const Home: React.FC = () => {
    const navigate = useNavigate();

    const [farmerName, setFarmerName] = useState<string>('');

    const { data: cowsResponse, isLoading, refetch, isError } = useQuery({
        queryKey: ['cows'],
        queryFn: getMyCattleAPI,
        retry: 1,
    });

    const handleRefresh = async () => {
        await refetch();
    };

    const cows = cowsResponse?.data || [];
    const isOffline = cowsResponse?.isOffline || false;

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Load user name
                const { value: userDataStr } = await Preferences.get({ key: 'user_data' });
                if (userDataStr) {
                    try {
                        const userData = JSON.parse(userDataStr);
                        if (userData?.name) setFarmerName(userData.name);
                    } catch (e) {
                        console.error("Failed to parse user data", e);
                    }
                }
            } catch (err) {
                console.error("Failed to load user data", err);
            }
        };
        fetchUserData();
    }, []);

    if (isLoading) return null; // Avoid flash of zero-state while fetching

    return (
        <PullToRefresh onRefresh={handleRefresh} pullingContent=""
            maxPullDownDistance={100} resistance={2} backgroundColor="#F4F7F4">
            <Box sx={{ p: 2, minHeight: 'calc(100vh - 80px)' }}>
                {/* 0. Offline Alert */}
                <Collapse in={isOffline || isError}>
                    <Alert 
                        severity="warning" 
                        icon={<WifiOffIcon />}
                        sx={{ mb: 2, borderRadius: '12px' }}
                    >
                        <AlertTitle sx={{ fontWeight: 'bold' }}>Offline Mode</AlertTitle>
                        Showing last fetched information. You can still register cattle; they will be synced later.
                    </Alert>
                </Collapse>

                {/* 1. Greeting Section */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        Welcome{farmerName ? `, ${farmerName}` : ''} !
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Here is your herd overview.
                    </Typography>
                </Box>

                {/* 2. Statistics Overview */}
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <StatCard label="Total Cattle" value={cows.length} icon={PetsIcon} color="text.primary" />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <StatCard label="Pregnant" value={cows.filter((c: CowSummary) => c.currentStatus === 'Pregnant').length} icon={FavoriteIcon} color="warning.main" />
                    </Box>
                </Stack>

                <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                    <Box sx={{ flex: 1 }}>
                        <StatCard 
                            label="Disputed" 
                            value={cows.filter((c: CowSummary) => c.isDispute).length} 
                            icon={PetsIcon} 
                            color="error.main" 
                        />
                    </Box>
                    <Box sx={{ flex: 1 }} />
                </Stack>

                {/* 3. Quick Actions */}
                <ActionGrid />

                {/* 4. Dynamic Herd List (Zero-State vs Populated) */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                        Your Herd
                    </Typography>

                    {cows.length === 0 ? (
                        /* ZERO-STATE UI: Shown when there are no cows */
                        <Box sx={{
                            textAlign: 'center',
                            py: 6,
                            px: 2,
                            bgcolor: 'background.paper',
                            borderRadius: '12px',
                            boxShadow: '0px 4px 12px rgba(0,0,0,0.05)',
                            border: '1px dashed',
                            borderColor: 'grey.300'
                        }}>
                            <PetsIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 'bold', mb: 1 }}>
                                Welcome!
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, px: 2 }}>
                                You have 0 registered cows. Tap the '+' button to add your first animal.
                            </Typography>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => navigate('/add-cow')}
                                sx={{ borderRadius: '12px', px: 4, py: 1.5, fontWeight: 'bold' }}
                            >
                                + Register Cattle
                            </Button>
                        </Box>
                    ) : (
                        /* POPULATED STATE UI: Shown when cows exist */
                        <Box>
                            {cows.slice(0, 2).map((cow: CowSummary, index: number) => (
                                <Box
                                    key={index}
                                    sx={{
                                        p: 2,
                                        mb: 2,
                                        bgcolor: 'background.paper',
                                        borderRadius: '12px',
                                        boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => navigate(`/profile/${cow._id}`)}
                                >
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{cow.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">{cow.breed} • {cow.currentStatus}</Typography>
                                </Box>
                            ))}

                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => navigate('/my-cows')}
                                sx={{ mt: 2, borderRadius: '12px' }}
                            >
                                View All Cattle
                            </Button>
                        </Box>
                    )}
                </Box>
            </Box>
        </PullToRefresh>
    );
};

export default Home;