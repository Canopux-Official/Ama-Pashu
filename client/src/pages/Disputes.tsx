import React from 'react';
import { Box, Typography, Container, Card, CardContent, CircularProgress, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getMyCattleAPI } from '../apis/apis';
import { WarningAmber } from '@mui/icons-material';

interface DisputedCow {
    _id: string;
    name: string;
    tagNumber: string;
    isDispute?: boolean;
    createdAt: string;
    photos?: {
        faceProfile?: string;
    };
}

const Disputes: React.FC = () => {
    const { data: cowsResponse, isLoading, isError } = useQuery({
        queryKey: ['cows'],
        queryFn: getMyCattleAPI,
    });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, pt: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (isError) {
        return (
            <Box sx={{ p: 4, pt: 10 }}>
                <Alert severity="error">Failed to load disputed cattle.</Alert>
            </Box>
        );
    }

    const cows = cowsResponse?.data || [];
    const disputedCows = cows.filter((cow: DisputedCow) => cow.isDispute === true);

    return (
        <Container maxWidth="md" sx={{ py: 3, pt: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <WarningAmber color="error" fontSize="large" />
                <Typography variant="h5" fontWeight="bold">
                    Disputed Cattle
                </Typography>
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                The following cattle registrations were flagged as highly similar to an existing record across the central database.
                These registrations require manual review from authorized officials.
            </Typography>

            {disputedCows.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'background.paper', borderRadius: 2 }}>
                    <Typography variant="body1">
                        You have no disputed cattle records.
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {disputedCows.map((cow: DisputedCow) => (
                        <Card key={cow._id} sx={{ display: 'flex', border: '1px solid', borderColor: 'error.light', borderRadius: 2 }}>
                            {cow.photos?.faceProfile && (
                                <Box
                                    component="img"
                                    src={cow.photos.faceProfile}
                                    sx={{ width: 120, height: 120, objectFit: 'cover' }}
                                    alt="Cow face"
                                />
                            )}
                            <CardContent>
                                <Typography variant="h6" fontWeight="bold">
                                    {cow.name || 'Unnamed'} ({cow.tagNumber})
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Status: <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>Under Dispute Review</span>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Registered: {new Date(cow.createdAt).toLocaleDateString()}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}
        </Container>
    );
};

export default Disputes;
