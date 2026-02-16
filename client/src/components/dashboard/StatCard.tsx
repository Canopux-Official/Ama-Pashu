// src/components/dashboard/StatCard.tsx
import React from 'react';
import { Paper, Typography, Box, Avatar } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: SvgIconComponent;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color }) => {
    return (
        <Paper
            elevation={0} // Flat look with custom border
            sx={{
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
                border: '1px solid',
                borderColor: 'rgba(0,0,0,0.05)', // Very subtle border
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Background decorative circle for depth */}
            <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: '50%',
                bgcolor: color,
                opacity: 0.08,
                zIndex: 0
            }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, zIndex: 1 }}>
                <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 42, height: 42 }}>
                    <Icon fontSize="small" />
                </Avatar>
            </Box>

            <Box sx={{ zIndex: 1 }}>
                <Typography variant="h4" color="text.primary" sx={{ mb: 0.5 }}>
                    {value}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    {label}
                </Typography>
            </Box>
        </Paper>
    );
};

export default StatCard;