// src/components/dashboard/ActionGrid.tsx
import React from 'react';
import { Paper, Typography, Box, Avatar } from '@mui/material';
import { AddCircleOutline, QrCodeScanner, LocalPhone } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
// Updated icons for a cleaner look
const actions = [
    { label: 'Register New', icon: AddCircleOutline, color: '#10B981', bg: '#D1FAE5' }, // Emerald Green
    { label: 'Scan Cow', icon: QrCodeScanner, color: '#F59E0B', bg: '#FEF3C7' },       // Amber
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
                gridTemplateColumns: 'repeat(3, 1fr)', // 3 columns for better density
                gap: 2
            }}>
                {actions.map((action) => (
                    <Paper
                        key={action.label}
                        onClick={() => {
                            if (action.label === 'Register New') navigate('/add');
                        }}
                        elevation={0}
                        sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            bgcolor: 'transparent', // Transparent background to look like app icons
                            transition: 'transform 0.2s',
                            '&:active': { transform: 'scale(0.95)' },
                        }}
                    >
                        {/* The "App Icon" Bubble */}
                        <Avatar
                            sx={{
                                width: 64,
                                height: 64,
                                bgcolor: action.bg,
                                color: action.color,
                                mb: 1.5,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}
                        >
                            <action.icon sx={{ fontSize: 30 }} />
                        </Avatar>

                        <Typography variant="caption" fontWeight={600} align="center" sx={{ color: 'text.secondary', lineHeight: 1.2 }}>
                            {action.label}
                        </Typography>
                    </Paper>
                ))}
            </Box>
        </Box>
    );
};

export default ActionGrid;