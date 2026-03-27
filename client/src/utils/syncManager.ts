/* eslint-disable @typescript-eslint/no-explicit-any */
import localforage from 'localforage';
import { registerCowAPI, getCowProfileAPI } from '../apis/apis';
import { queryClient } from '../queryClient';
import { base64ToFile } from './imageUtils';
// Initialize stores
export const pendingCowsStore = localforage.createInstance({
    name: 'AmaPashu',
    storeName: 'pendingCows'
});

export const syncManager = {
    // Save a cow locally when offline
    savePendingCow: async (cowData: any) => {
        try {
            const id = Date.now().toString();
            await pendingCowsStore.setItem(id, { ...cowData, id, syncStatus: 'pending' });
            return id;
        } catch (err) {
            console.error('Error saving pending cow:', err);
            throw err;
        }
    },

    // Get all pending cows
    getPendingCows: async () => {
        try {
            const cows: any[] = [];
            await pendingCowsStore.iterate((value: any) => {
                cows.push(value);
            });
            return cows;
        } catch (err) {
            console.error('Error getting pending cows:', err);
            return [];
        }
    },

    // Remove a synced cow
    removePendingCow: async (id: string) => {
        try {
            await pendingCowsStore.removeItem(id);
        } catch (err) {
            console.error(`Error removing pending cow ${id}:`, err);
        }
    },

    // Upload all pending data when back online (stub function)
    syncAll: async () => {
        if (!navigator.onLine) return { success: false, syncedCount: 0 };

        try {
            const pendingCows = await syncManager.getPendingCows();
            if (pendingCows.length === 0) return { success: true, syncedCount: 0 };

            console.log(`Starting sync for ${pendingCows.length} cows...`);
            let syncedCount = 0;

            for (const cow of pendingCows) {
                try {
                    const apiPayload = {
                        ...cow,
                        faceImage: base64ToFile(cow.faceImage, 'face_image.jpg'),
                        muzzleImage: base64ToFile(cow.muzzleImage, 'muzzle_image.jpg'),
                        leftImage: base64ToFile(cow.leftImage, 'left_image.jpg'),
                        rightImage: base64ToFile(cow.rightImage, 'right_image.jpg'),
                        backImage: base64ToFile(cow.backImage, 'back_image.jpg'),
                        tailImage: base64ToFile(cow.tailImage, 'tail_image.jpg'),
                        selfieImage: base64ToFile(cow.selfieImage, 'selfie_image.jpg'),
                    };
                    // Send to backend API
                    const apiResponse = await registerCowAPI(apiPayload as any);
                    const savedCowId = apiResponse.data._id;

                    // Poll for AI result using getCowProfileAPI
                    let aiSuccess = false;
                    let attempts = 0;
                    while (attempts < 20) {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        try {
                            const profileResponse = await getCowProfileAPI(savedCowId);
                            const aiStatus = profileResponse.data?.aiMetadata?.status;

                            if (aiStatus === 'SUCCESS' || aiStatus === 'DISPUTE') {
                                aiSuccess = true;
                                break;
                            } else if (aiStatus && aiStatus !== 'PENDING') {
                                throw new Error(aiStatus);
                            }
                        } catch (pollErr: any) {
                            if (pollErr.message && pollErr.message.includes('Registration failed')) {
                                throw new Error(pollErr.message);
                            } else if (pollErr.message === 'Cow not found or unauthorized' || pollErr.responseStatus === 404) {
                                throw new Error('Registration failed: Removed by AI processes.');
                            }
                            // Otherwise it may be a network glitch, continue polling
                        }
                        attempts++;
                    }

                    if (aiSuccess) {
                        // Remove from pending store if successfully processed by AI
                        await syncManager.removePendingCow(cow.id);
                        syncedCount++;
                    } else {
                        throw new Error('Timeout waiting for AI verification.');
                    }
                } catch (err: any) {
                    console.error(`Failed to sync cow ${cow.id}:`, err);

                    // Determine if it was a validation/AI rejection or a network failure
                    const isValidationError = err.responseStatus && err.responseStatus >= 400 && err.responseStatus < 500;
                    const isAiError = err.message && err.message.includes('Registration failed') || err.message === 'Timeout waiting for AI verification.';
                    
                    if (isValidationError || isAiError) {
                        try {
                            const newRetryCount = (cow.retryCount || 0) + 1;
                            if (newRetryCount >= 10) {
                                await syncManager.removePendingCow(cow.id);
                                console.warn(`Registration ${cow.id} discarded after exceeding 10 failed AI attempts.`);
                            } else {
                                await pendingCowsStore.setItem(cow.id, {
                                    ...cow,
                                    syncStatus: 'failed',
                                    retryCount: newRetryCount,
                                    errorMessage: err.message || 'Validation error from server',
                                });
                            }
                        } catch (updateErr) {
                            console.error('Failed to update pending cow status:', updateErr);
                        }
                    }
                }
            }

            console.log(`Successfully synced ${syncedCount} cows.`);

            if (syncedCount > 0) {
                // Invalidate the 'cows' query so the UI automatically fetches the latest herd list
                queryClient.invalidateQueries({ queryKey: ['cows'] });
            }

            return { success: true, syncedCount };

        } catch (err) {
            console.error('Sync failed:', err);
            return { success: false, syncedCount: 0 };
        }
    }
};
