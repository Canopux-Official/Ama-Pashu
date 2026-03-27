/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box, Typography, Dialog, IconButton, Button, CircularProgress
} from '@mui/material';
import { Close, Cameraswitch, CheckCircle } from '@mui/icons-material';

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

import { getMuzzleModel } from '../utils/MuzzleModelService';

// ─── GUIDANCE TYPES ───────────────────────────────────────────────────────────
export type CameraGuidanceType =
    | 'muzzle'   // AI video scan mode
    | 'face'     // AI video scan mode
    | 'left'     // Single photo with guide
    | 'right'    // Single photo with guide
    | 'back'     // Single photo with guide
    | 'tail'     // Single photo with guide
    | 'selfie'   // Single photo, front cam, no guide overlay
    | 'none';    // Generic single photo

interface HTML5CameraDialogProps {
    open: boolean;
    onClose: () => void;
    onCapture: (imageSrc: string) => void;
    guidanceType: CameraGuidanceType;
}

// ─── GUIDE CONFIG ─────────────────────────────────────────────────────────────
const GUIDE_CONFIG: Record<CameraGuidanceType, {
    label: string;
    icon: string;
    tips: string[];
    defaultFacing: 'environment' | 'user';
    useAIScan: boolean;
}> = {
    muzzle: {
        label: 'Muzzle Scan',
        icon: '🐾',
        tips: [
            'Wipe mud or moisture from the muzzle',
            'Ensure good lighting on the face',
            'Hold steady — 3-second scan',
        ],
        defaultFacing: 'environment',
        useAIScan: true,
    },
    face: {
        label: "Cow's Face",
        icon: '🐄',
        tips: [
            'Center Face: Keep the head in the oval and the muzzle visible.',
            'Front View: Take the photo directly from the front.',
            'Good Lighting: Ensure the muzzle is well-lit and clear.',
            'Hold Steady: Stay still for a 3-second scan.',
        ],
        defaultFacing: 'environment',
        useAIScan: true,
    },
    left: {
        label: "Cow's Left Profile",
        icon: '◀️',
        tips: [
            'Stand to the left side of the animal',
            'Capture full body from horn to tail',
            'Keep the animal still',
        ],
        defaultFacing: 'environment',
        useAIScan: false,
    },
    right: {
        label: "Cow's Right Profile",
        icon: '▶️',
        tips: [
            'Stand to the right side of the animal',
            'Capture full body from horn to tail',
            'Keep the animal still',
        ],
        defaultFacing: 'environment',
        useAIScan: false,
    },
    back: {
        label: 'Back View',
        icon: '⬆️',
        tips: [
            'Stand directly behind the animal',
            'Capture the full back and hindquarters',
            'Keep the animal still',
        ],
        defaultFacing: 'environment',
        useAIScan: false,
    },
    tail: {
        label: 'Tail / Udders',
        icon: '🔍',
        tips: [
            'Capture the udder and tail clearly',
            'Ensure good lighting underneath',
            'Keep the animal calm',
        ],
        defaultFacing: 'environment',
        useAIScan: false,
    },
    selfie: {
        label: 'Farmer Selfie with Cow',
        icon: '🤳',
        tips: [
            'Use the front-facing camera',
            'Make sure both you and the cow are visible',
            'Smile! 😄',
        ],
        defaultFacing: 'user',
        useAIScan: false,
    },
    none: {
        label: 'Take Photo',
        icon: '📸',
        tips: [
            'Ensure good lighting',
            'Hold the camera steady',
            'Tap capture when ready',
        ],
        defaultFacing: 'environment',
        useAIScan: false,
    },
};

// ─── TUNABLE CONSTANTS ────────────────────────────────────────────────────────
const MUZZLE_CONFIDENCE_THRESHOLD = 0.78;
const MODEL_INPUT_SIZE: [number, number] = [640, 640];
const RECORDING_DURATION_MS = 3000;
const CAPTURE_INTERVAL_MS = 400;
const FRAME_CAPTURE_WIDTH = 640;
const FRAME_CAPTURE_HEIGHT = 640;

// ─── SVG Progress Ring ────────────────────────────────────────────────────────
const ProgressRing: React.FC<{ progress: number; size?: number; stroke?: number; color?: string }> = ({
    progress, size = 100, stroke = 6, color = '#00FF88'
}) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (progress / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke}
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
        </svg>
    );
};

const PulseDot = () => (
    <Box sx={{
        width: 10, height: 10, borderRadius: '50%', bgcolor: '#FF3B30',
        boxShadow: '0 0 0 0 rgba(255,59,48,0.4)',
        animation: 'pulse 1.2s infinite',
        '@keyframes pulse': {
            '0%': { boxShadow: '0 0 0 0 rgba(255,59,48,0.6)' },
            '70%': { boxShadow: '0 0 0 10px rgba(255,59,48,0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(255,59,48,0)' },
        }
    }} />
);

// ─── GUIDE OVERLAY CORNERS ────────────────────────────────────────────────────
const GuideCorners = ({ color = 'rgba(0,255,136,0.8)' }) => (
    <>
        {[
            { top: '20%', left: '10%', borderTop: `3px solid ${color}`, borderLeft: `3px solid ${color}` },
            { top: '20%', right: '10%', borderTop: `3px solid ${color}`, borderRight: `3px solid ${color}` },
            { bottom: '25%', left: '10%', borderBottom: `3px solid ${color}`, borderLeft: `3px solid ${color}` },
            { bottom: '25%', right: '10%', borderBottom: `3px solid ${color}`, borderRight: `3px solid ${color}` },
        ].map((style, i) => (
            <Box key={i} sx={{ position: 'absolute', width: 36, height: 36, borderRadius: 0.5, ...style }} />
        ))}
    </>
);

type CapturePhase =
    | 'intro'
    | 'guidelines'
    | 'recording'         // AI scan: multi-frame video
    | 'analyzing'         // AI scan: inference
    | 'no-muzzle'         // AI scan: failed
    | 'photo-ready'       // Single shot: live viewfinder with guide
    | 'preview';          // Both modes: confirm photo

export const HTML5CameraDialog: React.FC<HTML5CameraDialogProps> = ({
    open, onClose, onCapture, guidanceType
}) => {
    const config = GUIDE_CONFIG[guidanceType];
    const isAIScan = config.useAIScan;

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const muzzleModelRef = useRef<tf.GraphModel | null>(null);
    const capturedFramesRef = useRef<string[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const [facingMode, setFacingMode] = useState<'environment' | 'user'>(config.defaultFacing);
    const [phase, setPhase] = useState<CapturePhase>('intro');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [recordingProgress, setRecordingProgress] = useState(0);
    const [analysisStatus, setAnalysisStatus] = useState('');
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [cameraReady, setCameraReady] = useState(false);

    // ── Load AI Model (only for AI scan modes) ───────────────────────────────
    useEffect(() => {
        if (!isAIScan) { setModelsLoaded(true); return; }

        let isMounted = true;
        const initializeAI = async () => {
            try {
                const model = await getMuzzleModel();
                muzzleModelRef.current = model;
                if (isMounted) setModelsLoaded(true);
            } catch (err) {
                console.error('Model load failed in component:', err);
                if (isMounted) setErrorMsg('Failed to connect to AI model.');
            }
        };
        initializeAI();
        return () => { isMounted = false; };
    }, [isAIScan]);

    // Create offscreen canvas
    useEffect(() => {
        const canvas = document.createElement('canvas');
        canvas.width = FRAME_CAPTURE_WIDTH;
        canvas.height = FRAME_CAPTURE_HEIGHT;
        captureCanvasRef.current = canvas;
    }, []);

    // ── Camera helpers ───────────────────────────────────────────────────────
    const applyTorch = useCallback(async () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        try {
            const caps = track.getCapabilities() as any;
            if (caps?.torch) {
                // We enforce flashlight to be ON during capturing based on requirements
                await (track as any).applyConstraints({ advanced: [{ torch: true }] });
            }
        } catch (err) { console.warn('Torch error:', err); }
    }, []);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    const startCamera = useCallback(async () => {
        setErrorMsg(null);
        setCameraReady(false);
        stopCamera();
        try {
            // Re-apply flashlight requirement right on stream initialization if environment facing
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    advanced: facingMode === 'environment' ? [{ torch: true } as any] : []
                },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            setCameraReady(true);

            // Just double check torch
            if (facingMode === 'environment') {
                setTimeout(() => applyTorch(), 500);
            }
        } catch {
            setErrorMsg('Camera access denied. Please allow camera permissions and retry.');
        }
    }, [facingMode, stopCamera, applyTorch]);

    // ── Open/Close Lifecycle ─────────────────────────────────────────────────
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (open) {
            setPhase('intro');
            setCapturedImage(null);
            capturedFramesRef.current = [];
            setErrorMsg(null);
            setFacingMode(config.defaultFacing);
            timer = setTimeout(() => startCamera(), 250);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            stopCamera();
            setCapturedImage(null);
            capturedFramesRef.current = [];
            setCameraReady(false);
        }
        return () => {
            if (timer) clearTimeout(timer);
            if (intervalRef.current) clearInterval(intervalRef.current);
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, facingMode]);

    // ── Single Shot Capture ──────────────────────────────────────────────────
    const captureStillPhoto = useCallback(() => {
        const video = videoRef.current;
        const canvas = captureCanvasRef.current;
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, FRAME_CAPTURE_WIDTH, FRAME_CAPTURE_HEIGHT);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
        stopCamera();
        setCapturedImage(dataUrl);
        setPhase('preview');
    }, [stopCamera]);

    // ── AI Recording Phase ───────────────────────────────────────────────────
    const startRecording = useCallback(async () => {
        await applyTorch();
        setPhase('recording');
        setRecordingProgress(0);
        setErrorMsg(null);
        capturedFramesRef.current = [];

        const video = videoRef.current;
        const canvas = captureCanvasRef.current;
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        let elapsed = 0;

        intervalRef.current = setInterval(() => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
                ctx.drawImage(videoRef.current, 0, 0, FRAME_CAPTURE_WIDTH, FRAME_CAPTURE_HEIGHT);
                capturedFramesRef.current.push(canvas.toDataURL('image/jpeg', 0.80));
            }
            elapsed += CAPTURE_INTERVAL_MS;
            setRecordingProgress(Math.min((elapsed / RECORDING_DURATION_MS) * 100, 100));

            if (elapsed >= RECORDING_DURATION_MS) {
                clearInterval(intervalRef.current!);
                intervalRef.current = null;
                stopCamera();
                setPhase('analyzing');
                runAnalysis();
            }
        }, CAPTURE_INTERVAL_MS);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applyTorch, stopCamera]);

    // ── AI Analysis ─────────────────────────────────────────────────────────
    const runAnalysis = useCallback(async () => {
        const frames = capturedFramesRef.current;
        if (frames.length === 0) { handleAnalysisError('No frames captured.'); return; }
        if (!muzzleModelRef.current) { handleAnalysisError('AI model not ready.'); return; }

        setAnalysisStatus('Scanning frames for best match…');
        setAnalysisProgress(0);

        let bestFrameUrl: string | null = null;
        let highestConf = 0;

        for (let i = 0; i < frames.length; i++) {
            const conf = await evaluateMuzzleConfidence(frames[i]);
            if (conf > highestConf) {
                highestConf = conf;
                bestFrameUrl = frames[i];
            }
            setAnalysisProgress(Math.round(((i + 1) / frames.length) * 100));
            await new Promise(r => setTimeout(r, 0));
        }

        if (highestConf < MUZZLE_CONFIDENCE_THRESHOLD || !bestFrameUrl) {
            setPhase('no-muzzle');
            return;
        }

        setCapturedImage(bestFrameUrl);
        setPhase('preview');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAnalysisError = useCallback((msg: string) => {
        setErrorMsg(msg);
        setPhase('guidelines');
        startCamera();
    }, [startCamera]);

    const handleRetryAfterNoMuzzle = useCallback(() => {
        setPhase('guidelines');
        startCamera();
    }, [startCamera]);

    const evaluateMuzzleConfidence = async (imgUrl: string): Promise<number> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = async () => {
                const inputTensor = tf.tidy(() => {
                    const raw = tf.browser.fromPixels(img);
                    const resized = tf.image.resizeBilinear(raw, MODEL_INPUT_SIZE);
                    return resized.cast('float32').expandDims(0).div(255.0);
                });
                try {
                    const predRaw = await muzzleModelRef.current!.executeAsync(inputTensor) as tf.Tensor;
                    inputTensor.dispose();
                    const transposed = predRaw.transpose([0, 2, 1]);
                    predRaw.dispose();
                    const data = transposed.dataSync();
                    transposed.dispose();
                    const numCols = data.length / 8400;
                    let maxConf = 0;
                    for (let i = 0; i < 8400; i++) {
                        const off = i * numCols;
                        for (let c = 4; c < numCols; c++) {
                            if (data[off + c] > maxConf) maxConf = data[off + c];
                        }
                    }
                    resolve(maxConf);
                } catch {
                    inputTensor.dispose();
                    resolve(0);
                }
            };
            img.src = imgUrl;
        });
    };

    const remainingSeconds = Math.ceil(
        (RECORDING_DURATION_MS / 1000) - (recordingProgress / 100) * (RECORDING_DURATION_MS / 1000)
    );

    const canSwitchCamera = phase === 'guidelines' || phase === 'intro' || phase === 'photo-ready';

    // Dynamic overlay rendering function
    const renderGuideOverlay = () => {
        if (guidanceType === 'face') {
            return (
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '65%', height: '55%', border: '4px dashed rgba(0, 255, 136, 0.8)',
                    borderRadius: '50%', zIndex: 5, pointerEvents: 'none',
                    boxShadow: '0 0 0 4000px rgba(0,0,0,0.35)', // Darken outside
                }} />
            );
        }
        if (guidanceType === 'muzzle') {
            return (
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '70%', height: '40%', border: '4px dashed rgba(0, 255, 136, 0.8)',
                    borderRadius: 4, zIndex: 5, pointerEvents: 'none',
                    boxShadow: '0 0 0 4000px rgba(0,0,0,0.4)', // Darken outside
                }} />
            );
        }
        return <GuideCorners color="rgba(255,255,255,0.6)" />;
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Dialog
            fullScreen
            open={open}
            transitionDuration={200}
            PaperProps={{
                sx: {
                    bgcolor: '#060606',
                    fontFamily: '"SF Pro Display", "Helvetica Neue", sans-serif',
                }
            }}
        >
            <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* ── Top Bar ── */}
                <Box sx={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    px: 2, pt: 3, pb: 1,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    zIndex: 100,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
                }}>
                    <IconButton
                        onClick={onClose}
                        size="small"
                        sx={{
                            color: 'white', bgcolor: 'rgba(255,255,255,0.12)',
                            backdropFilter: 'blur(12px)', width: 40, height: 40,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                        }}
                    >
                        <Close fontSize="small" />
                    </IconButton>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {canSwitchCamera && (
                            <IconButton
                                onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
                                size="small"
                                sx={{
                                    color: 'white', bgcolor: 'rgba(255,255,255,0.12)',
                                    backdropFilter: 'blur(12px)', width: 40, height: 40,
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                                }}
                            >
                                <Cameraswitch fontSize="small" />
                            </IconButton>
                        )}
                    </Box>
                </Box>

                {/* ── Video / Preview ── */}
                <Box sx={{ position: 'absolute', inset: 0, bgcolor: '#000', zIndex: 0 }}>
                    {phase === 'preview' && capturedImage ? (
                        <img
                            src={capturedImage}
                            alt="captured"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay playsInline muted
                            style={{
                                position: 'absolute', inset: 0,
                                width: '100%', height: '100%',
                                objectFit: 'contain', display: 'block',
                                // Mirror selfie cam for natural feel
                                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                            }}
                        />
                    )}
                </Box>

                {/* ════════════════════════════════════════════════════════
                    PHASE: Intro
                ════════════════════════════════════════════════════════ */}
                {phase === 'intro' && (
                    <Box sx={{
                        position: 'absolute', inset: 0, bgcolor: '#060606', zIndex: 70,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 3,
                    }}>
                        <Box sx={{
                            width: 80, height: 80, borderRadius: '50%',
                            bgcolor: 'rgba(0,200,83,0.12)', border: '2px solid rgba(0,200,83,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mb: 3, fontSize: 36,
                        }}>
                            {config.icon}
                        </Box>

                        <Typography variant="h5" fontWeight={800} color="white" textAlign="center" mb={1} sx={{ letterSpacing: '-0.4px' }}>
                            {config.label}
                        </Typography>
                        <Typography color="rgba(255,255,255,0.45)" fontSize={14} textAlign="center" mb={4} px={2}>
                            {isAIScan
                                ? "We'll take a quick 3-second video to find the clearest shot"
                                : 'Position the subject and tap Capture when ready'}
                        </Typography>

                        {config.tips.map((tip, i) => (
                            <Box key={i} sx={{
                                width: '100%', maxWidth: 340,
                                display: 'flex', alignItems: 'center', gap: 2,
                                mb: 1.5, px: 2, py: 1.5, borderRadius: 2.5,
                                bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                            }}>
                                <Typography color="rgba(255,255,255,0.8)" fontSize={14}>• {tip}</Typography>
                            </Box>
                        ))}

                        <Button
                            variant="contained"
                            onClick={() => setPhase(isAIScan ? 'guidelines' : 'photo-ready')}
                            disabled={!cameraReady}
                            fullWidth
                            sx={{
                                mt: 4, py: 1.8, borderRadius: 3, maxWidth: 340,
                                fontWeight: 700, fontSize: 16, textTransform: 'none',
                                bgcolor: cameraReady ? '#00C853' : 'rgba(255,255,255,0.12)',
                                color: cameraReady ? 'white' : 'rgba(255,255,255,0.35)',
                                boxShadow: cameraReady ? '0 0 28px rgba(0,200,83,0.35)' : 'none',
                                transition: 'all 0.25s ease',
                                '&:hover': { bgcolor: cameraReady ? '#00E676' : undefined },
                                '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
                            }}
                        >
                            {cameraReady ? "I'm Ready →" : 'Starting Camera...'}
                        </Button>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2.5, opacity: cameraReady ? 0.4 : 0.35 }}>
                            {cameraReady
                                ? <><CheckCircle sx={{ fontSize: 14, color: '#00C853' }} /><Typography color="white" fontSize={11}>Camera ready</Typography></>
                                : <><CircularProgress size={12} sx={{ color: 'white' }} /><Typography color="white" fontSize={11}>Preparing camera…</Typography></>
                            }
                        </Box>
                    </Box>
                )}

                {/* ════════════════════════════════════════════════════════
                    PHASE: Guidelines (AI scan only)
                ════════════════════════════════════════════════════════ */}
                {phase === 'guidelines' && (
                    <Box sx={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
                        zIndex: 70, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', px: 3, pb: 3,
                    }}>
                        {errorMsg && (
                            <Box sx={{ mb: 2, px: 2.5, py: 1.5, bgcolor: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.4)', borderRadius: 2 }}>
                                <Typography color="#FF6B6B" fontSize={13} textAlign="center">⚠️ {errorMsg}</Typography>
                            </Box>
                        )}
                        <Typography variant="h5" fontWeight={700} color="white" mb={2.5} sx={{ letterSpacing: '-0.3px' }}>
                            Position the {guidanceType === 'face' ? 'face' : 'muzzle'}
                        </Typography>
                        {config.tips.map((tip, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, px: 1.5, py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.07)' }}>
                                <Typography color="rgba(255,255,255,0.85)" fontSize={13.5}>• {tip}</Typography>
                            </Box>
                        ))}
                        <Button
                            variant="contained"
                            onClick={startRecording}
                            disabled={!modelsLoaded}
                            fullWidth
                            sx={{
                                mt: 3, py: 1.8, borderRadius: 3, fontWeight: 700, fontSize: 16,
                                letterSpacing: '0.2px', textTransform: 'none',
                                bgcolor: modelsLoaded ? '#00C853' : 'rgba(255,255,255,0.12)',
                                color: modelsLoaded ? 'white' : 'rgba(255,255,255,0.35)',
                                boxShadow: modelsLoaded ? '0 0 24px rgba(0,200,83,0.35)' : 'none',
                                transition: 'all 0.25s ease',
                                '&:hover': { bgcolor: modelsLoaded ? '#00E676' : undefined },
                                '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' },
                            }}
                        >
                            {modelsLoaded ? '▶  Start 3-Second Scan' : 'Loading AI…'}
                        </Button>
                    </Box>
                )}

                {/* ════════════════════════════════════════════════════════
                    PHASE: Photo Ready (single-shot mode)
                ════════════════════════════════════════════════════════ */}
                {phase === 'photo-ready' && (
                    <Box sx={{
                        position: 'absolute', inset: 0, zIndex: 60,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.45) 100%)',
                        pb: 6, pt: 2,
                    }}>
                        {/* Guide label at top */}
                        <Box sx={{
                            mt: 7, px: 3, py: 1, bgcolor: 'rgba(0,0,0,0.5)',
                            borderRadius: 10, backdropFilter: 'blur(8px)',
                        }}>
                            <Typography color="white" fontSize={14} fontWeight={600} textAlign="center">
                                {config.icon} {config.label}
                            </Typography>
                        </Box>

                        {/* Guide Overlay Shape */}
                        {renderGuideOverlay()}

                        {/* Tips at bottom */}
                        <Box sx={{ width: '100%', px: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            {config.tips.length > 0 && (
                                <Box sx={{ px: 3, py: 1, bgcolor: 'rgba(0,0,0,0.55)', borderRadius: 2, backdropFilter: 'blur(8px)', width: '100%', maxWidth: 360 }}>
                                    {config.tips.map((tip, i) => (
                                        <Typography key={i} color="rgba(255,255,255,0.75)" fontSize={12} textAlign="center">
                                            • {tip}
                                        </Typography>
                                    ))}
                                </Box>
                            )}

                            {/* Shutter Button */}
                            <Box
                                onClick={captureStillPhoto}
                                sx={{
                                    width: 76, height: 76, borderRadius: '50%',
                                    border: '4px solid white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s ease',
                                    '&:active': { transform: 'scale(0.92)' },
                                }}
                            >
                                <Box sx={{
                                    width: 58, height: 58, borderRadius: '50%',
                                    bgcolor: 'white',
                                    transition: 'transform 0.1s ease',
                                    '&:active': { transform: 'scale(0.9)' },
                                }} />
                            </Box>
                        </Box>
                    </Box>
                )}

                {/* ════════════════════════════════════════════════════════
                    PHASE: Recording (AI scan)
                ════════════════════════════════════════════════════════ */}
                {phase === 'recording' && (
                    <Box sx={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)',
                        zIndex: 60,
                    }}>
                        {renderGuideOverlay()}

                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ProgressRing progress={recordingProgress} size={120} stroke={5} />
                            <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Typography color="white" fontWeight={800} fontSize={32} lineHeight={1}>{remainingSeconds}</Typography>
                                <Typography color="rgba(255,255,255,0.6)" fontSize={11} letterSpacing="1px" textTransform="uppercase">sec</Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2.5, px: 3, py: 1, bgcolor: 'rgba(0,0,0,0.5)', borderRadius: 10 }}>
                            <PulseDot />
                            <Typography color="white" fontSize={14} fontWeight={600}>Recording — hold steady</Typography>
                        </Box>
                    </Box>
                )}

                {/* ════════════════════════════════════════════════════════
                    PHASE: Analyzing (AI scan)
                ════════════════════════════════════════════════════════ */}
                {phase === 'analyzing' && (
                    <Box sx={{
                        position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.92)', zIndex: 70,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2.5,
                    }}>
                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ProgressRing progress={analysisProgress} size={100} stroke={4} color="#00C8FF" />
                            <Typography sx={{ position: 'absolute', color: 'white', fontWeight: 700, fontSize: 16 }}>
                                {analysisProgress}%
                            </Typography>
                        </Box>
                        <Typography variant="h6" color="white" fontWeight={700}>Analyzing…</Typography>
                        <Typography color="rgba(255,255,255,0.45)" fontSize={13} textAlign="center" px={4}>{analysisStatus}</Typography>
                        <Typography color="rgba(255,255,255,0.2)" fontSize={11} textAlign="center">Camera paused to speed up processing</Typography>
                    </Box>
                )}

                {/* ════════════════════════════════════════════════════════
                    PHASE: Preview (both modes)
                ════════════════════════════════════════════════════════ */}
                {phase === 'preview' && capturedImage && (
                    <Box sx={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%)',
                        zIndex: 70, px: 3, pb: 3, pt: 6,
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                            <CheckCircle sx={{ color: '#00C853', fontSize: 20 }} />
                            <Typography color="white" fontWeight={600} fontSize={15}>
                                {isAIScan ? 'Muzzle detected — looking good!' : `${config.label} captured!`}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                            <Button
                                onClick={() => {
                                    setCapturedImage(null);
                                    if (isAIScan) {
                                        setPhase('guidelines');
                                        startCamera();
                                    } else {
                                        setPhase('photo-ready');
                                        startCamera();
                                    }
                                }}
                                variant="outlined"
                                sx={{
                                    flex: 1, py: 1.5, borderRadius: 3,
                                    color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.25)',
                                    textTransform: 'none', fontWeight: 600,
                                    '&:hover': { borderColor: 'rgba(255,255,255,0.5)', bgcolor: 'rgba(255,255,255,0.05)' }
                                }}
                            >
                                Retake
                            </Button>
                            <Button
                                onClick={() => { onCapture(capturedImage); onClose(); }}
                                variant="contained"
                                sx={{
                                    flex: 2, py: 1.5, borderRadius: 3,
                                    bgcolor: '#00C853', fontWeight: 700, fontSize: 15,
                                    textTransform: 'none',
                                    boxShadow: '0 0 20px rgba(0,200,83,0.4)',
                                    '&:hover': { bgcolor: '#00E676' },
                                }}
                            >
                                Use Photo
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* ════════════════════════════════════════════════════════
                    PHASE: No Muzzle Detected (AI scan only)
                ════════════════════════════════════════════════════════ */}
                {phase === 'no-muzzle' && (
                    <Box sx={{
                        position: 'absolute', inset: 0, bgcolor: '#060606', zIndex: 80,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 3,
                    }}>
                        <Box sx={{
                            width: 88, height: 88, borderRadius: '50%',
                            bgcolor: 'rgba(255, 59, 48, 0.1)', border: '2px solid rgba(255, 59, 48, 0.35)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mb: 3, fontSize: 40,
                            animation: 'fadeIn 0.4s ease',
                            '@keyframes fadeIn': { from: { opacity: 0, transform: 'scale(0.8)' }, to: { opacity: 1, transform: 'scale(1)' } },
                        }}>
                            😕
                        </Box>

                        <Typography variant="h5" fontWeight={800} color="white" textAlign="center" mb={1.5} sx={{ letterSpacing: '-0.4px' }}>
                            No {guidanceType === 'face' ? 'face' : 'muzzle'} found
                        </Typography>
                        <Typography color="rgba(255,255,255,0.5)" fontSize={14.5} textAlign="center" mb={4} px={1} lineHeight={1.6}>
                            We couldn't detect a {guidanceType === 'face' ? 'face' : 'muzzle'} in any of the captured frames. Here's what to try:
                        </Typography>

                        {[
                            { icon: '☀️', text: 'Move to a brighter area or turn on the flash' },
                            { icon: '📐', text: "Fill the frame with the animal's face" },
                            { icon: '💧', text: 'Wipe any mud or moisture off the muzzle' },
                            { icon: '🤚', text: 'Keep the camera very still during recording' },
                        ].map((tip, i) => (
                            <Box key={i} sx={{
                                width: '100%', maxWidth: 340,
                                display: 'flex', alignItems: 'center', gap: 2,
                                mb: 1, px: 2, py: 1.2, borderRadius: 2,
                                bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <Typography fontSize={18}>{tip.icon}</Typography>
                                <Typography color="rgba(255,255,255,0.75)" fontSize={13.5}>{tip.text}</Typography>
                            </Box>
                        ))}

                        <Button
                            variant="contained"
                            onClick={handleRetryAfterNoMuzzle}
                            fullWidth
                            sx={{
                                mt: 4, py: 1.8, borderRadius: 3, maxWidth: 340,
                                fontWeight: 700, fontSize: 16, bgcolor: '#FF3B30',
                                textTransform: 'none', boxShadow: '0 0 24px rgba(255,59,48,0.3)',
                                '&:hover': { bgcolor: '#FF6B6B' },
                            }}
                        >
                            Try Again
                        </Button>
                    </Box>
                )}

            </Box>
        </Dialog>
    );
};