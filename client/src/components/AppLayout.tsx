import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    IconButton,
    BottomNavigation,
    BottomNavigationAction,
    Paper,
    Avatar,
    Stack
} from '@mui/material';
import {
    Home as HomeIcon,
    QrCodeScanner as ScanIcon,
    Pets as CowIcon,
    Person as ProfileIcon,
    Menu as MenuIcon,
} from '@mui/icons-material';
import { CURRENT_USER } from '../data/mockUsers';

interface AppLayoutProps {
    children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [navValue, setNavValue] = useState(0);

    // Update nav value when URL changes (e.g. back button)
    React.useEffect(() => {
        const path = location.pathname;
        let newValue = 0;
        if (path === '/') newValue = 0;
        else if (path.startsWith('/my-cows')) newValue = 1;
        else if (path.startsWith('/search') || path.startsWith('/cow/')) newValue = 2; // "Scan" or Profile details
        else if (path.startsWith('/profile')) newValue = 3; // Shifted index

        setNavValue(newValue);
    }, [location.pathname]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

            {/* TOP APP BAR */}
            <AppBar position="static" color="primary" elevation={0}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
                        <MenuIcon />
                    </IconButton>

                    <Stack direction="column" sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div" sx={{ lineHeight: 1.2 }}>
                            Mo Pashu
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {CURRENT_USER.role === 'farmer' ? 'My Herd Manager' : 'Data Collection'}
                        </Typography>
                    </Stack>

                    <Avatar
                        src={CURRENT_USER.avatarUrl}
                        alt={CURRENT_USER.name}
                        sx={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.8)' }}
                    />
                </Toolbar>
            </AppBar>

            {/* MAIN CONTENT AREA */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    bgcolor: 'background.default',
                    pb: 10,
                    pt: 2
                }}
            >
                {children}
            </Box>

            {/* BOTTOM NAVIGATION */}
            <Paper
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1200,
                    borderRadius: 0
                }}
                elevation={10}
            >
                <BottomNavigation
                    showLabels
                    value={navValue}
                    onChange={(_, newValue) => {
                        setNavValue(newValue);
                    }}
                >
                    {/* LEFT SIDE (2 ITEMS) */}
                    <BottomNavigationAction label="Home" onClick={() => navigate('/')} icon={<HomeIcon />} />
                    <BottomNavigationAction label="My Cows" onClick={() => navigate('/my-cows')} icon={<CowIcon />} />

                    {/* CENTER (SCAN BUTTON) */}
                    <BottomNavigationAction
                        label="Scan"
                        onClick={() => navigate('/search')}
                        icon={
                            <Box sx={{
                                bgcolor: 'secondary.main',
                                color: 'white',
                                p: 1.5,
                                borderRadius: '50%',
                                mt: -4,
                                boxShadow: '0px 4px 10px rgba(0,0,0,0.3)',
                                border: '4px solid white'
                            }}>
                                <ScanIcon fontSize="medium" />
                            </Box>
                        }
                    />

                    {/* RIGHT SIDE (2 ITEMS) */}
                    {/* <BottomNavigationAction label="Alerts" icon={<AlertIcon />} />  REMOVED */}
                    <BottomNavigationAction label="Profile" onClick={() => navigate('/profile')} icon={<ProfileIcon />} />
                </BottomNavigation>
            </Paper>
        </Box>
    );
};

export default AppLayout;