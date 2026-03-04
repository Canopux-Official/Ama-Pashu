import axios from 'axios';
import { Preferences } from '@capacitor/preferences';

/**
 * Register a new farmer and save the JWT token
 */
export const registerFarmerAPI = async (formData: { name: string; phone: string; village: string; state: string; district: string; pincode?: string }) => {
    try {
        const response = await axios.post(`${import.meta.env.VITE_SERVER_LINK}/api/auth/register`, formData);

        const data = response.data;

        if (!data.success) {
            throw new Error(data.message || 'Registration failed');
        }

        // Save Token securely
        await Preferences.set({ key: 'jwt_token', value: data.token });
        await Preferences.set({ key: 'user_data', value: JSON.stringify(data.user) });

        return data;
    } catch (error) {
        // If it's an axios error with a response, extract the message
        if (axios.isAxiosError(error) && error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw error;
    }
};

/**
 * Location APIs
 */
export const getStatesAPI = async () => {
    const response = await axios.get(`${import.meta.env.VITE_SERVER_LINK}/api/location/states`);
    return response.data;
};

export const getDistrictsAPI = async (state: string) => {
    const response = await axios.get(`${import.meta.env.VITE_SERVER_LINK}/api/location/districts`, { params: { state } });
    return response.data;
};

export const getBlocksAPI = async (district: string) => {
    const response = await axios.get(`${import.meta.env.VITE_SERVER_LINK}/api/location/blocks`, { params: { district } });
    return response.data;
};

export const getVillagesAPI = async (block: string) => {
    const response = await axios.get(`${import.meta.env.VITE_SERVER_LINK}/api/location/villages`, { params: { block } });
    return response.data;
};

/**
 * Fetch all cattle belonging to the logged-in farmer
 */
export const getMyCattleAPI = async () => {
    try {
        const { value: token } = await Preferences.get({ key: 'jwt_token' });
        if (!token) throw new Error('Not authenticated');

        const response = await axios.get(`${import.meta.env.VITE_SERVER_LINK}/api/cattle`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch cattle');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw error;
    }
};

/**
 * Fetch a specific cow profile by its MongoDB ID
 */
export const getCowProfileAPI = async (cowId: string) => {
    try {
        const { value: token } = await Preferences.get({ key: 'jwt_token' });
        if (!token) throw new Error('Not authenticated');

        const response = await axios.get(`${import.meta.env.VITE_SERVER_LINK}/api/cattle/${cowId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch cow profile');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw error;
    }
};

/**
 * Register a new cow to the farmer's herd
 */
export const registerCowAPI = async <T,>(cowData: T) => {
    try {
        const { value: token } = await Preferences.get({ key: 'jwt_token' });
        if (!token) throw new Error('Not authenticated');

        const response = await axios.post(`${import.meta.env.VITE_SERVER_LINK}/api/cattle`, cowData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.data.success) {
            const err = new Error(response.data.message || 'Failed to register cow') as Error & { responseStatus?: number };
            err.responseStatus = response.status === 200 ? 400 : response.status;
            throw err;
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const err = new Error(error.response?.data?.message || error.message) as Error & { responseStatus?: number };
            err.responseStatus = error.response?.status;
            throw err;
        }
        throw error;
    }
};

/**
 * Login an existing farmer and save the JWT token
 */
export const loginFarmerAPI = async (phone: string) => {
    try {
        const response = await axios.post(`${import.meta.env.VITE_SERVER_LINK}/api/auth/login`, { phone });

        const data = response.data;

        if (!data.success) {
            throw new Error(data.message || 'Login failed');
        }

        // Save Token securely
        await Preferences.set({ key: 'jwt_token', value: data.token });
        await Preferences.set({ key: 'user_data', value: JSON.stringify(data.user) });

        return data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw error;
    }
};

/**
 * Search for a cow using AI (Face & Muzzle)
 */
export const searchCowAPI = async (searchData: { faceImage: string; muzzleImage: string }) => {
    try {
        const { value: token } = await Preferences.get({ key: 'jwt_token' });
        if (!token) throw new Error('Not authenticated');

        const response = await axios.post(`${import.meta.env.VITE_SERVER_LINK}/api/cattle/search`, searchData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'Search failed');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw error;
    }
};

/**
 * User Profile APIs
 */
export const getUserProfileAPI = async () => {
    try {
        const { value: token } = await Preferences.get({ key: 'jwt_token' });
        if (!token) throw new Error('Not authenticated');

        const response = await axios.get(`${import.meta.env.VITE_SERVER_LINK}/api/user/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch user profile');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw error;
    }
};

export const updateUserProfileAPI = async (profileData: Record<string, unknown>) => {
    try {
        const { value: token } = await Preferences.get({ key: 'jwt_token' });
        if (!token) throw new Error('Not authenticated');

        const response = await axios.put(`${import.meta.env.VITE_SERVER_LINK}/api/user/profile`, profileData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to update user profile');
        }

        // Optionally update locally cached user data if needed
        await Preferences.set({
            key: 'user_data', value: JSON.stringify({
                id: response.data.user._id,
                name: response.data.user.name,
                role: response.data.user.role,
                phone: response.data.user.contact?.phone
            })
        });

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw error;
    }
};

export const logoutUserAPI = async () => {
    try {
        const { value: token } = await Preferences.get({ key: 'jwt_token' });
        if (!token) return { success: true };

        const response = await axios.post(`${import.meta.env.VITE_SERVER_LINK}/api/user/logout`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw error;
    }
};
