import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AppBar, Toolbar, Typography, Box, IconButton, BottomNavigation,
    BottomNavigationAction, Paper, Avatar, Stack
} from '@mui/material';
import {
    Home as HomeIcon, QrCodeScanner as ScanIcon, Pets as CowIcon,
    Person as ProfileIcon, Menu as MenuIcon, Notifications as AlertIcon
} from '@mui/icons-material';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { CURRENT_USER } from '../data/mockUsers';

interface AppLayoutProps {
    children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const [navValue, setNavValue] = useState(0);
    const navigate = useNavigate();

    // 1. Setup Status Bar Appearance on Mount
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            StatusBar.setStyle({ style: Style.Dark }); // White text icons
            StatusBar.setBackgroundColor({ color: '#2E7D32' }); // Match your App Bar Green
            StatusBar.setOverlaysWebView({ overlay: false }); // Pushes app DOWN so it doesn't overlap
        }
    }, []);

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden',
            // CRITICAL FIX: Safe Area for Top (Status Bar) & Bottom (Home Bar)
            pt: 'env(safe-area-inset-top)',
            pb: 'env(safe-area-inset-bottom)',
            bgcolor: 'primary.main' // Fills the status bar area with green
        }}>

            {/* 2. TOP APP BAR */}
            <AppBar position="static" elevation={0} sx={{ zIndex: 1100 }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" sx={{ mr: 2 }}>
                        <MenuIcon />
                    </IconButton>

                    <Stack direction="column" sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ lineHeight: 1.2 }}>Mo Pashu</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {CURRENT_USER.role === 'farmer' ? 'My Herd Manager' : 'Data Collection'}
                        </Typography>
                    </Stack>

                    <Avatar
                        src={CURRENT_USER.avatarUrl}
                        sx={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.8)' }}
                    />
                </Toolbar>
            </AppBar>

            {/* 3. MAIN CONTENT (Scrollable) */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    bgcolor: 'background.default',
                    // Add extra padding at bottom so content isn't hidden behind Bottom Nav
                    pb: 10,
                    pt: 2,
                    // Rounded corners at top to look like a modern "Sheet"
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                }}
            >
                {children}
            </Box>

            {/* 4. BOTTOM NAVIGATION */}
            <Paper
                sx={{
                    position: 'fixed',
                    bottom: 0, left: 0, right: 0,
                    zIndex: 1200, borderRadius: 0,
                    // CRITICAL: Push up from bottom home bar
                    pb: 'env(safe-area-inset-bottom)',
                    bgcolor: 'white'
                }}
                elevation={10}
            >
                <BottomNavigation
                    showLabels
                    value={navValue}
                    onChange={(_, newValue) => setNavValue(newValue)}
                >
                    <BottomNavigationAction label="Home" onClick={() => navigate('/')} icon={<HomeIcon />} />
                    <BottomNavigationAction label="My Cows" icon={<CowIcon />} />

                    {/* Scan Button */}
                    <BottomNavigationAction
                        label="Scan"
                        onClick={() => navigate('/search')}
                        icon={
                            <Box sx={{
                                bgcolor: 'secondary.main', color: 'white', p: 1.5,
                                borderRadius: '50%', mt: -4, border: '4px solid white',
                                boxShadow: '0px 4px 10px rgba(0,0,0,0.3)'
                            }}>
                                <ScanIcon />
                            </Box>
                        }
                    />

                    <BottomNavigationAction label="Alerts" icon={<AlertIcon />} />
                    <BottomNavigationAction label="Profile" icon={<ProfileIcon />} />
                </BottomNavigation>
            </Paper>
        </Box>
    );
};

export default AppLayout;