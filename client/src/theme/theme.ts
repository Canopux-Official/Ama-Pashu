// src/theme/theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#F97D09', // Vibrant Saffron / Orange
            light: '#FFB067', // Lighter Saffron
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#046A38', // Deep Green (Complementary color from the party flag)
        },
        background: {
            default: '#FFF9F2', // Faint, warm saffron tint
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
        MuiMenu: {
            styleOverrides: {
                list: {
                    // Ensures dropdown menu items aren't obscured by bottom phone navigation bars
                    paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)',
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    // Ensures Dialog actions don't overlap with safe area
                    paddingBottom: 'env(safe-area-inset-bottom)',
                },
            },
        },
    },
});

export default theme;