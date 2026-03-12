import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
    Container, Box, TextField, InputAdornment, IconButton, Typography,
    Tabs, Tab, Paper, Avatar, Chip, Button, Stack, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, Divider, Skeleton
} from '@mui/material';
import {
    Search, FilterList, ArrowForwardIos, Close,
    CameraAlt, CheckCircle, PhotoLibrary, History
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyCattleAPI, searchCowAPI } from '../apis/apis';
import { HTML5CameraDialog } from '../components/HTML5CameraDialog';

// ── Shared Types ────────────────────────────────────────────────────────────
interface CowListSummary {
    _id: string;
    name: string;
    tagNumber: string;
    breed: string;
    currentStatus: string;
    ageMonths?: number;
    photos?: { faceProfile?: string; muzzle?: string };
}

const SEARCH_HISTORY_KEY = 'gau_netra_search_history';
const MAX_HISTORY = 3;

// ── Utilities & Hooks ───────────────────────────────────────────────────────

// 1. Custom Hook for Search History
function useSearchHistory() {
    const [history, setHistory] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]'); }
        catch { return []; }
    });

    const addHistory = useCallback((term: string) => {
        const t = term.trim();
        if (!t) return;
        setHistory(prev => {
            const newHistory = [t, ...prev.filter(item => item !== t)].slice(0, MAX_HISTORY);
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
            return newHistory;
        });
    }, []);

    return { history, addHistory };
}

// 2. Performant Search Helper
const performSearch = (cows: CowListSummary[], term: string) => {
    const t = term.trim().toLowerCase();
    if (!t) return [];

    return cows.filter(c =>
        (c.tagNumber || '').toLowerCase() === t ||
        (c.name || '').toLowerCase().includes(t) ||
        (c.breed || '').toLowerCase().includes(t)
    );
};

// 3. Image Compression Utility
const compressImage = (dataUrl: string, maxWidth = 640, maxHeight = 480): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(dataUrl); // Fallback to original if canvas fails

            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8)); // Compress to 80% JPEG
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
};

const getStatusColor = (status: string): 'error' | 'warning' | 'info' | 'default' | 'success' => {
    switch (status) {
        case 'Sick': return 'error';
        case 'Pregnant': return 'warning';
        case 'Heifer': return 'info';
        case 'Dry': return 'default';
        default: return 'success';
    }
};

// ── Search By ID Tab ─────────────────────────────────────────────────────────
const SearchTab = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [submittedTerm, setSubmittedTerm] = useState('');
    const { history, addHistory } = useSearchHistory();

    const { data: cowsResponse, isLoading } = useQuery({
        queryKey: ['cows'],
        queryFn: getMyCattleAPI,
    });

    const cows = useMemo<CowListSummary[]>(
        () => cowsResponse?.data || [],
        [cowsResponse]
    );

    const filteredCows = useMemo(() =>
        performSearch(cows, submittedTerm),
        [cows, submittedTerm]);

    const commit = useCallback((term: string) => {
        if (!term.trim()) return;
        setSubmittedTerm(term.trim());
        addHistory(term);
    }, [addHistory]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commit(searchTerm);
    };

    const clearSearch = () => {
        setSearchTerm('');
        setSubmittedTerm('');
    };

    const hasSearched = submittedTerm.trim().length > 0;

    return (
        <Box sx={{ mt: 2 }}>
            {/* Search bar */}
            <Paper elevation={0} sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: 3, mb: 1.5 }}>
                <InputAdornment position="start" sx={{ pl: 1 }}><Search color="action" /></InputAdornment>
                <TextField
                    fullWidth
                    placeholder="Tag No, Name or Breed"
                    variant="standard"
                    InputProps={{ disableUnderline: true }}
                    sx={{ ml: 1, flex: 1 }}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                {searchTerm ? (
                    <IconButton sx={{ p: '8px' }} onClick={clearSearch}><Close fontSize="small" /></IconButton>
                ) : (
                    <IconButton sx={{ p: '8px' }}><FilterList /></IconButton>
                )}
            </Paper>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Button
                    variant="contained"
                    onClick={() => commit(searchTerm)}
                    disabled={!searchTerm.trim()}
                    sx={{ borderRadius: 3, textTransform: 'none', px: 5, fontWeight: 600 }}
                >
                    Search
                </Button>
            </Box>

            {/* Recent searches */}
            {!hasSearched && history.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <History sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            RECENT SEARCHES
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {history.map(h => (
                            <Chip
                                key={h}
                                label={h}
                                size="small"
                                variant="outlined"
                                onClick={() => { setSearchTerm(h); commit(h); }}
                                sx={{ cursor: 'pointer', fontWeight: 500 }}
                            />
                        ))}
                    </Stack>
                </Box>
            )}

            {/* Results */}
            {hasSearched && (
                isLoading ? (
                    // Skeleton Loading
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            SEARCHING HERD...
                        </Typography>
                        {[1, 2, 3].map((i) => (
                            <Paper key={i} elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Skeleton variant="rounded" width={64} height={64} sx={{ borderRadius: 3 }} />
                                <Box sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Skeleton variant="text" width="40%" />
                                        <Skeleton variant="rounded" width={40} height={20} />
                                    </Box>
                                    <Skeleton variant="text" width="60%" />
                                </Box>
                            </Paper>
                        ))}
                    </Stack>
                ) : (
                    <Stack spacing={2}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {filteredCows.length} RESULT{filteredCows.length !== 1 ? 'S' : ''} FOR "{submittedTerm}"
                        </Typography>

                        {filteredCows.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 5, opacity: 0.6 }}>
                                <Typography fontSize={36}>🐄</Typography>
                                <Typography variant="body1" fontWeight={600}>No cattle matched</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Try the Tag Number, Name, or use AI Scan
                                </Typography>
                            </Box>
                        ) : (
                            filteredCows.map(cow => (
                                <Paper
                                    key={cow._id}
                                    elevation={0}
                                    onClick={() => navigate(`/profile/${cow._id}`)}
                                    sx={{
                                        p: 2, borderRadius: 3, border: '1px solid #eee',
                                        display: 'flex', alignItems: 'center', gap: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:active': { bgcolor: '#f5f5f5', transform: 'scale(0.98)' }
                                    }}
                                >
                                    <Avatar
                                        src={cow.photos?.faceProfile || cow.photos?.muzzle || ''}
                                        variant="rounded"
                                        sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: 'grey.200' }}
                                    />
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                            <Typography variant="subtitle1" fontWeight="bold">{cow.name || 'Unnamed'}</Typography>
                                            <Chip
                                                label={cow.currentStatus}
                                                size="small"
                                                color={getStatusColor(cow.currentStatus)}
                                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                            />
                                        </Box>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="caption" sx={{ bgcolor: 'grey.100', px: 0.8, py: 0.2, borderRadius: 1 }}>
                                                #{cow.tagNumber}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {cow.breed} • {cow.ageMonths ? `${cow.ageMonths}m` : 'Age unknown'}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                    <ArrowForwardIos fontSize="small" sx={{ color: '#ccc', fontSize: 14 }} />
                                </Paper>
                            ))
                        )}
                    </Stack>
                )
            )}

            {/* Empty state before any search */}
            {!hasSearched && history.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 6, opacity: 0.55 }}>
                    <Typography fontSize={40}>🔎</Typography>
                    <Typography variant="body1" fontWeight={600} sx={{ mt: 1 }}>Search your herd</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Type a Tag Number or Name and press Search
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

// ── Photo Capture Component ───────────────────────────────────────────────────
const PhotoCaptureBox = ({
    label,
    guidanceType,
    currentImage,
    onCapture
}: {
    label: string,
    guidanceType: 'face' | 'muzzle',
    currentImage?: string,
    onCapture: (img: string) => void
}) => {
    const [cameraOpen, setCameraOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const result = event.target?.result;
                if (typeof result === 'string') {
                    // Compress image before setting state
                    const compressed = await compressImage(result);
                    onCapture(compressed);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCameraCapture = async (capturedSrc: string) => {
        const compressed = await compressImage(capturedSrc);
        onCapture(compressed);
        setCameraOpen(false);
    }

    return (
        <>
            <Paper
                elevation={0}
                sx={{
                    bgcolor: '#F3F4F6', border: '2px dashed #CBD5E1', borderRadius: 2,
                    p: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: 200, position: 'relative', overflow: 'hidden',
                }}
            >
                {currentImage ? (
                    <>
                        <img src={currentImage} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <Box sx={{
                            position: 'absolute', top: 0, left: 0, right: 0,
                            bgcolor: 'rgba(0,0,0,0.5)', color: 'white', py: 0.5, px: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
                        }}>
                            <Typography variant="caption" fontWeight="bold" noWrap>{label}</Typography>
                        </Box>

                        <Box sx={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            bgcolor: 'rgba(0,0,0,0.6)', display: 'flex', zIndex: 2,
                        }}>
                            <Button
                                size="small" color="inherit" onClick={() => setCameraOpen(true)}
                                startIcon={<CameraAlt sx={{ fontSize: 16 }} />}
                                sx={{ flex: 1, color: 'white', borderRadius: 0, py: 1 }}
                            >
                                <Typography variant="caption" fontWeight="bold">Retake</Typography>
                            </Button>
                            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                            <Button
                                size="small" color="inherit" onClick={() => fileInputRef.current?.click()}
                                startIcon={<PhotoLibrary sx={{ fontSize: 16 }} />}
                                sx={{ flex: 1, color: 'white', borderRadius: 0, py: 1 }}
                            >
                                <Typography variant="caption" fontWeight="bold">Gallery</Typography>
                            </Button>
                        </Box>
                    </>
                ) : (
                    <Box sx={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        <Typography variant="body1" fontWeight={600} align="center" sx={{ mb: 2 }}>{label}</Typography>
                        <Stack direction="row" spacing={2} sx={{ width: '100%', px: 2, justifyContent: 'center' }}>
                            <Button
                                variant="contained" color="primary" onClick={() => setCameraOpen(true)}
                                startIcon={<CameraAlt />} sx={{ borderRadius: 4, textTransform: 'none', px: 3 }}
                            >
                                Camera
                            </Button>
                            <Button
                                variant="outlined" color="primary" onClick={() => fileInputRef.current?.click()}
                                startIcon={<PhotoLibrary />} sx={{ borderRadius: 4, textTransform: 'none', px: 3, bgcolor: 'white' }}
                            >
                                Gallery
                            </Button>
                        </Stack>
                    </Box>
                )}

                {!currentImage && (
                    <Box sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'secondary.main', color: 'white', fontSize: 10, px: 1, borderBottomLeftRadius: 8, zIndex: 2 }}>
                        AI SCAN
                    </Box>
                )}
            </Paper>

            <input
                type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }}
                onChange={handleFileUpload}
            />

            <HTML5CameraDialog
                open={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={handleCameraCapture}
                guidanceType={guidanceType}
            />
        </>
    );
};

// ── AI Scan Tab ─────────────────────────────────────────────────────────────
const ScanTab = () => {
    const navigate = useNavigate();
    const [scanning, setScanning] = useState(false);
    const [faceImage, setFaceImage] = useState<string | null>(null);
    const [muzzleImage, setMuzzleImage] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [notFoundOpen, setNotFoundOpen] = useState(false);
    const [notFoundReason, setNotFoundReason] = useState('');
    const [matchedCow, setMatchedCow] = useState<{
        cowId: string;
        cow: { name?: string; tagNumber?: string; photos?: { faceProfile?: string; muzzle?: string; } };
        confidence: number
    } | null>(null);

    // 5. Memory Cleanup
    useEffect(() => {
        return () => {
            setFaceImage(null);
            setMuzzleImage(null);
        };
    }, []);

    const handleSearch = async () => {
        if (!faceImage || !muzzleImage) return;

        setScanning(true);

        try {
            const response = await searchCowAPI({ faceImage, muzzleImage });

            if (response.success && response.data.cowId) {
                setMatchedCow(response.data);
                setDialogOpen(true);
            } else {
                setNotFoundReason('No matching cow found in the database.');
                setNotFoundOpen(true);
            }
        } catch (err: any) {
            const msg = err.message || 'AI Verification failed. Please ensure clear images.';
            setNotFoundReason(msg);
            setNotFoundOpen(true);
        } finally {
            setScanning(false);
        }
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Please capture or upload both Face and Muzzle images for AI verification. Align the subject within the green boundaries.
            </Typography>

            <Stack spacing={3}>
                <PhotoCaptureBox
                    label="Muzzle (Nose Print)"
                    guidanceType="muzzle"
                    currentImage={muzzleImage || undefined}
                    onCapture={setMuzzleImage}
                />

                <PhotoCaptureBox
                    label="Face Profile"
                    guidanceType="face"
                    currentImage={faceImage || undefined}
                    onCapture={setFaceImage}
                />
            </Stack>

            {/* Verification Trigger */}
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                {scanning ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <CircularProgress color="secondary" sx={{ mb: 2 }} />
                        <Typography variant="subtitle2" color="text.secondary">Running AI Models...</Typography>
                    </Box>
                ) : (
                    <Button
                        variant="contained"
                        color="secondary"
                        disabled={!faceImage || !muzzleImage}
                        onClick={handleSearch}
                        endIcon={<CheckCircle />}
                        sx={{ py: 1.5, px: 4, borderRadius: 8, boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)', fontWeight: 'bold' }}
                    >
                        Start Verification
                    </Button>
                )}
            </Box>

            {/* ── Not Found Dialog ───────────────────────────────────── */}
            <Dialog open={notFoundOpen} onClose={() => setNotFoundOpen(false)} fullWidth maxWidth="xs">
                <DialogContent sx={{ textAlign: 'center', pt: 4, pb: 2 }}>
                    <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                        <Typography fontSize={36}>🔍</Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={800} gutterBottom>
                        Cow Not Found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {notFoundReason}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Tip: Ensure the face &amp; muzzle are clear, well-lit, and closely framed.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3, flexDirection: 'column', gap: 1 }}>
                    <Button
                        variant="contained" color="error" fullWidth
                        onClick={() => {
                            setNotFoundOpen(false);
                            setFaceImage(null);
                            setMuzzleImage(null);
                        }}
                        sx={{ borderRadius: 6, fontWeight: 'bold', py: 1.2 }}
                    >
                        🔄 Retry with New Photos
                    </Button>
                    <Button fullWidth onClick={() => setNotFoundOpen(false)} sx={{ borderRadius: 6 }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Match Found Dialog ──────────────────────────────────── */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 'bold', textAlign: 'center' }}>Match Found!</DialogTitle>
                <DialogContent>
                    {matchedCow && matchedCow.cow && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                            <Avatar
                                src={matchedCow.cow.photos?.faceProfile || matchedCow.cow.photos?.muzzle || ''}
                                sx={{ width: 80, height: 80, mb: 2 }}
                            />
                            <Typography variant="h6" fontWeight="bold">
                                {matchedCow.cow.name || 'Unnamed Cow'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Tag: #{matchedCow.cow.tagNumber}
                            </Typography>
                            <Chip
                                label={`Confidence: ${(matchedCow.confidence * 100).toFixed(1)}%`}
                                color="success" size="small" sx={{ fontWeight: 'bold' }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 2, px: 3 }}>
                    <Button onClick={() => setDialogOpen(false)} color="inherit" fullWidth>
                        Cancel
                    </Button>
                    <Button
                        variant="contained" color="primary" fullWidth
                        onClick={() => {
                            setDialogOpen(false);
                            navigate(`/profile/${matchedCow?.cowId}`);
                        }}
                        sx={{ borderRadius: 6, fontWeight: 'bold' }}
                    >
                        View Profile
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

// ── Main Component ──────────────────────────────────────────────────────────
const SearchCow: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);

    return (
        <Container maxWidth="sm" sx={{ pt: 2, pb: 10 }}>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Find Cattle</Typography>
            <Paper elevation={0} sx={{ borderBottom: '1px solid #eee' }}>
                <Tabs value={tabValue} onChange={(_e, v) => setTabValue(v)} variant="fullWidth" indicatorColor="primary" textColor="primary">
                    <Tab icon={<CameraAlt />} iconPosition="start" label="AI Scan" sx={{ fontWeight: 600 }} />
                    <Tab icon={<Search />} iconPosition="start" label="Search ID" sx={{ fontWeight: 600 }} />
                </Tabs>
            </Paper>
            {tabValue === 0 ? <ScanTab /> : <SearchTab />}
        </Container>
    );
};

export default SearchCow;