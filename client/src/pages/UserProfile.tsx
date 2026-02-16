import React, { useState } from 'react';
import {
    Container, Box, Typography, Avatar, Paper, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    Switch, Divider, Button
} from '@mui/material';
import {
    Person, Settings, Language, Help, Logout, ChevronRight, Edit
} from '@mui/icons-material';

// MOCK USER DATA
const USER = {
    name: 'Rajesh Kumar',
    role: 'Dairy Farmer',
    village: 'Pipili, Puri',
    avatar: 'https://placehold.co/150',
    phone: '+91 98765 43210'
};

const UserProfile: React.FC = () => {
    const [odia, setOdia] = useState(false);

    const handleLogout = () => {
        // Mock logout logic
        console.log("Logged out");
        // In a real app, clear tokens and redirect to login
    };

    return (
        <Container maxWidth="sm" sx={{ pt: 2, pb: 12 }}>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 3 }}>
                My Profile
            </Typography>

            {/* Profile Header Card */}
            <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid #eee' }}>
                <Avatar src={USER.avatar} sx={{ width: 80, height: 80, border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight="bold">{USER.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{USER.role} • {USER.village}</Typography>
                    <Typography variant="caption" color="primary" fontWeight="bold">
                        {USER.phone}
                    </Typography>
                </Box>
                <IconButton color="primary">
                    <Edit fontSize="small" />
                </IconButton>
            </Paper>

            {/* Settings Sections */}
            <Typography variant="overline" color="text.secondary" fontWeight="bold" sx={{ ml: 1 }}>
                PREFERENCES
            </Typography>
            <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', mb: 3, border: '1px solid #eee' }}>
                <List disablePadding>
                    <ListItemButton onClick={() => console.log('Account Settings')}>
                        <ListItemIcon><Person color="action" /></ListItemIcon>
                        <ListItemText primary="Account Settings" secondary="Edit profile details" />
                        <ChevronRight fontSize="small" color="disabled" />
                    </ListItemButton>
                    <Divider variant="inset" component="li" />
                    <ListItem>
                        <ListItemIcon><Language color="action" /></ListItemIcon>
                        <ListItemText primary="App Language" secondary={odia ? "Odia (ଓଡ଼ିଆ)" : "English"} />
                        <Switch
                            edge="end"
                            checked={odia}
                            onChange={(e) => setOdia(e.target.checked)}
                            color="primary"
                        />
                    </ListItem>
                </List>
            </Paper>

            <Typography variant="overline" color="text.secondary" fontWeight="bold" sx={{ ml: 1 }}>
                SUPPORT
            </Typography>
            <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', mb: 4, border: '1px solid #eee' }}>
                <List disablePadding>
                    <ListItemButton>
                        <ListItemIcon><Help color="action" /></ListItemIcon>
                        <ListItemText primary="Help & Support" secondary="FAQs, Contact Us" />
                        <ChevronRight fontSize="small" color="disabled" />
                    </ListItemButton>
                    <Divider variant="inset" component="li" />
                    <ListItemButton>
                        <ListItemIcon><Settings color="action" /></ListItemIcon>
                        <ListItemText primary="App Version" secondary="v1.0.2 (Beta)" />
                    </ListItemButton>
                </List>
            </Paper>

            {/* Logout Button */}
            <Button
                variant="outlined"
                color="error"
                fullWidth
                startIcon={<Logout />}
                onClick={handleLogout}
                sx={{ borderRadius: 3, py: 1.5, textTransform: 'none', fontWeight: 600 }}
            >
                Log Out
            </Button>

            <Typography variant="caption" display="block" textAlign="center" color="text.disabled" sx={{ mt: 4 }}>
                Gau-Netra © 2026 Odisha Govt.
            </Typography>

        </Container>
    );
};

export default UserProfile;

// Helper component for IconButton since it was used in code but not imported
function IconButton({ children, color, onClick }: { children: React.ReactNode, color?: "inherit" | "primary" | "secondary" | "error" | "info" | "success" | "warning", onClick?: () => void }) {
    return (
        <Button sx={{ minWidth: 'auto', p: 1, borderRadius: '50%' }} color={color} onClick={onClick}>
            {children}
        </Button>
    );
}
