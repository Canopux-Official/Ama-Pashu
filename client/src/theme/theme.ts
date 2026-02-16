// src/theme/theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#0A5C36', // Deep Forest Green (More professional than standard green)
            light: '#34D399',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#F59E0B', // Professional Amber
        },
        background: {
            default: '#F3F4F6', // Cool gray (Modern app background)
            paper: '#FFFFFF',
        },
        text: {
            primary: '#111827', // Almost black (Sharper)
            secondary: '#6B7280', // Cool gray text
        },
    },
    typography: {
        fontFamily: '"Inter", "sans-serif"', // THE BIG CHANGE
        h4: { fontWeight: 700, letterSpacing: '-0.5px' },
        h5: { fontWeight: 700, letterSpacing: '-0.5px' },
        h6: { fontWeight: 600, letterSpacing: '-0.25px' },
        button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.2px' },
    },
    shape: {
        borderRadius: 16, // Modern "Card" rounded corners
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none', // Remove default MUI overlay
                    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)', // Soft, expensive-looking shadow
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    padding: '12px 24px',
                    boxShadow: 'none',
                },
            },
        },
    },
});

export default theme;