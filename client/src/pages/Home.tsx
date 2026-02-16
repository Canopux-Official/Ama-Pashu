// src/pages/Home.tsx
import React from 'react';
import { Container, Box, Typography, Stack, Paper, Avatar, IconButton } from '@mui/material';
import { Pets, PregnantWoman, ChevronRight, NotificationsNone } from '@mui/icons-material';
import StatCard from '../components/dashboard/StatCard';
import ActionGrid from '../components/dashboard/ActionGrid';
import { CURRENT_USER } from '../data/mockUsers';

const stats = [
    { label: 'Total Herd', value: 45, icon: Pets, color: '#10B981' },
    { label: 'Pregnant', value: 12, icon: PregnantWoman, color: '#F59E0B' },
];

const Home: React.FC = () => {
    return (
        <Container maxWidth="sm" sx={{ px: 2, pb: 10, pt: 2 }}>
            <Stack spacing={4}>

                {/* 1. APP-LIKE HEADER */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="text.primary">
                            Hi, {CURRENT_USER.name.split(' ')[0]}
                        </Typography>
                    </Box>
                    <IconButton sx={{ bgcolor: 'white', border: '1px solid #eee' }}>
                        <NotificationsNone />
                    </IconButton>
                </Box>

                {/* 2. STATS ROW */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {stats.map((stat) => (
                        <StatCard key={stat.label} {...stat} />
                    ))}
                </Box>

                {/* 3. ACTIONS */}
                <ActionGrid />

                {/* 4. RECENT ACTIVITY (Card Style) */}
                <Box>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, px: 1 }}>
                        Recent Activity
                    </Typography>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2
                        }}
                    >
                        <Avatar variant="rounded" sx={{ bgcolor: '#E0F2F1', color: '#00695C' }}>
                            <Pets fontSize="small" />
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle2" fontWeight={700}>
                                New Calf Registered
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Tag #309 • Yesterday
                            </Typography>
                        </Box>
                        <ChevronRight color="action" />
                    </Paper>
                </Box>

            </Stack>
        </Container>
    );
};

export default Home;