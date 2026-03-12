import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box, Typography, Dialog, IconButton, Button, CircularProgress
} from '@mui/material';
import { Close, Cameraswitch, PhotoLibrary } from '@mui/icons-material';
import { resizeImage } from '../utils/imageUtils';

export type CameraGuidanceType = 'face' | 'muzzle' | 'left' | 'right' | 'back' | 'tail' | 'none';

interface HTML5CameraDialogProps {
    open: boolean;
    onClose: () => void;
    onCapture: (imageSrc: string) => void;
    guidanceType?: CameraGuidanceType;
}

const GUIDANCE_CONFIG: Record<
    Exclude<CameraGuidanceType, 'none'>,
    { label: string; overlayStyle: React.CSSProperties }
> = {
    face: { label: "Align the cow's face within the oval", overlayStyle: { width: '65%', height: '55%', borderRadius: '50%' } },
    muzzle: { label: 'Focus on the muzzle (nose print)', overlayStyle: { width: '70%', height: '40%', borderRadius: '16px' } },
    left: { label: 'Full LEFT side profile', overlayStyle: { width: '90%', height: '55%', borderRadius: '12px' } },
    right: { label: 'Full RIGHT side profile', overlayStyle: { width: '90%', height: '55%', borderRadius: '12px' } },
    back: { label: 'Rear view / Back profile', overlayStyle: { width: '65%', height: '65%', borderRadius: '12px' } },
    tail: { label: 'Tail & Udder area', overlayStyle: { width: '60%', height: '50%', borderRadius: '12px' } },
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export const HTML5CameraDialog: React.FC<HTML5CameraDialogProps> = ({
    open, onClose, onCapture, guidanceType = 'none'
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false); // Start as false to avoid effect warning
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);

    const zoomRef = useRef(1);
    const lastPinchDistRef = useRef<number | null>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        // We use a functional update or check to avoid the "cascading render" warning
        setIsLoading(prev => (prev ? prev : true));
        setErrorMsg(null);
        stopCamera();

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 3840 },
                    height: { ideal: 2160 },
                },
                audio: false
            });

            streamRef.current = newStream;
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error(err);
            setErrorMsg("Camera access denied or resolution not supported.");
        } finally {
            setIsLoading(false);
        }
    }, [facingMode, stopCamera]);

    // Cleanup and Init effect
    useEffect(() => {
        if (open) {
            startCamera();
        } else {
            stopCamera();
            setCapturedImage(null);
            setZoomLevel(1);
            zoomRef.current = 1;
        }

        return () => stopCamera();
    }, [open, facingMode, startCamera, stopCamera]);

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length !== 2) return;
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        if (lastPinchDistRef.current !== null) {
            const delta = dist / lastPinchDistRef.current;
            const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * delta));
            zoomRef.current = nextZoom;
            setZoomLevel(nextZoom);
        }
        lastPinchDistRef.current = dist;
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;

        const canvas = document.createElement('canvas');
        const fullW = video.videoWidth;
        const fullH = video.videoHeight;
        const cropW = fullW / zoomRef.current;
        const cropH = fullH / zoomRef.current;
        const startX = (fullW - cropW) / 2;
        const startY = (fullH - cropH) / 2;

        canvas.width = cropW;
        canvas.height = cropH;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, cropW, cropH);

            // Resize image after capture to save memory and processing power
            const rawImg = canvas.toDataURL('image/jpeg', 0.95);
            resizeImage(rawImg).then(resized => {
                setCapturedImage(resized);
            }).catch(err => {
                console.error('Resize failed, using original', err);
                setCapturedImage(rawImg);
            });

            stopCamera();
        }
    };

    const guidance = guidanceType !== 'none' ? GUIDANCE_CONFIG[guidanceType] : null;

    return (
        <Dialog fullScreen open={open} PaperProps={{ sx: { bgcolor: '#000' } }}>
            <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                <Box sx={{ position: 'absolute', top: 0, width: '100%', p: 2, display: 'flex', justifyContent: 'space-between', zIndex: 50 }}>
                    <IconButton onClick={onClose} sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.4)' }}><Close /></IconButton>
                    {!capturedImage && (
                        <IconButton onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.4)' }}>
                            <Cameraswitch />
                        </IconButton>
                    )}
                </Box>

                <Box
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => { lastPinchDistRef.current = null; }}
                    sx={{ flexGrow: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}
                >
                    {isLoading && <CircularProgress color="inherit" sx={{ position: 'absolute', zIndex: 5 }} />}

                    {errorMsg && (
                        <Box sx={{ textAlign: 'center', color: 'white', px: 4, zIndex: 10 }}>
                            <Typography color="error" gutterBottom>{errorMsg}</Typography>
                            <Button variant="contained" onClick={() => fileInputRef.current?.click()}>Open Gallery</Button>
                        </Box>
                    )}

                    {!capturedImage ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            style={{
                                width: '100%', height: '100%', objectFit: 'cover',
                                transform: `scale(${zoomLevel})`,
                                transition: 'transform 0.1s ease-out'
                            }}
                        />
                    ) : (
                        <img src={capturedImage} alt="captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}

                    {!errorMsg && guidance && (
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
                            <Box sx={{
                                ...guidance.overlayStyle,
                                border: '2px solid #00FF00',
                                boxShadow: '0 0 0 2000px rgba(0,0,0,0.5), inset 0 0 15px rgba(0,255,0,0.3)'
                            }} />
                            <Typography sx={{ position: 'absolute', top: '15%', color: '#00FF00', fontWeight: 'bold', textAlign: 'center', width: '80%', textShadow: '0 2px 4px #000' }}>
                                {guidance.label}
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Box sx={{ height: 160, bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'space-evenly', px: 2, zIndex: 60 }}>
                    {capturedImage ? (
                        <>
                            <Button onClick={() => { setCapturedImage(null); startCamera(); }} variant="outlined" color="inherit" sx={{ borderRadius: 10, color: 'white', px: 4 }}>Retake</Button>
                            <Button onClick={() => { onCapture(capturedImage); onClose(); }} variant="contained" color="success" sx={{ borderRadius: 10, px: 6 }}>Use Photo</Button>
                        </>
                    ) : (
                        <>
                            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = async (ev) => {
                                        const result = ev.target?.result as string;
                                        try {
                                            const resized = await resizeImage(result);
                                            onCapture(resized);
                                        } catch (err) {
                                            console.error('Gallery resize failed', err);
                                            onCapture(result);
                                        }
                                        onClose();
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }} />
                            <IconButton onClick={() => fileInputRef.current?.click()} sx={{ color: 'white' }}><PhotoLibrary fontSize="large" /></IconButton>

                            <Box onClick={capturePhoto} sx={{
                                width: 80, height: 80, borderRadius: '50%', border: '5px solid white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                '&:active': { transform: 'scale(0.9)' }
                            }}>
                                <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: 'white' }} />
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white', minWidth: 50 }}>
                                <Typography variant="caption">{zoomLevel.toFixed(1)}x</Typography>
                                <Typography variant="overline" sx={{ fontSize: '8px', lineHeight: 1 }}>Pinch</Typography>
                            </Box>
                        </>
                    )}
                </Box>
            </Box>
        </Dialog>
    );
};