// src/components/dashboard/ActionGrid.tsx
import React from 'react';
import { Paper, Typography, Box, Avatar } from '@mui/material';
import { AddCircleOutline, Search, LocalPhone } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
// Updated icons for a cleaner look
const actions = [
    { label: 'Register New Cattle', icon: AddCircleOutline, color: '#10B981', bg: '#D1FAE5' }, // Emerald Green
    { label: 'Search Cattle', icon: Search, color: '#F59E0B', bg: '#FEF3C7' },       // Amber
    { label: 'Call Vet', icon: LocalPhone, color: '#EF4444', bg: '#FEE2E2' },           // Red
];

const ActionGrid: React.FC = () => {
    const navigate = useNavigate(); // Hook for navigation
    return (
        <Box sx={{ mt: 4, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, px: 1 }}>
                Quick Actions
            </Typography>

            <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 2
            }}>
                {actions.map((action) => (
                    <Paper
                        key={action.label}
                        onClick={() => {
                            if (action.label === 'Register New Cattle') navigate('/add-cow');
                            if (action.label === 'Search Cattle') navigate('/search');
                            if (action.label === 'Call Vet') alert('Calling Vet Helpline...');
                        }}
                        elevation={0}
                        sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            bgcolor: 'background.paper',
                            borderRadius: '12px',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                            border: '1px solid',
                            borderColor: 'grey.100',
                            transition: 'all 0.2s ease',
                            '&:active': { transform: 'scale(0.95)', bgcolor: 'grey.50' },
                        }}
                    >
                        {/* The "App Icon" Bubble */}
                        <Avatar
                            sx={{
                                width: 56,
                                height: 56,
                                bgcolor: action.bg,
                                color: action.color,
                                borderRadius: '12px',
                                mb: 1.5,
                            }}
                        >
                            <action.icon sx={{ fontSize: 26 }} />
                        </Avatar>

                        <Typography variant="caption" fontWeight={700} align="center" sx={{ color: 'text.primary', lineHeight: 1.2 }}>
                            {action.label}
                        </Typography>
                    </Paper>
                ))}
            </Box>
        </Box>
    );
};

export default ActionGrid;