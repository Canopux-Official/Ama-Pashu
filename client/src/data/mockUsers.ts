// src/data/mockUsers.ts

export const MOCK_FARMER = {
    _id: '101',
    name: 'Rajesh Kumar',
    role: 'farmer',
    location: { village: 'Pipili', district: 'Puri' },
    avatarUrl: 'https://i.pravatar.cc/150?u=rajesh',
};

export const MOCK_COLLECTOR = {
    _id: '202',
    name: 'Anita Das (OCAC)',
    role: 'collector',
    employeeId: 'OCAC-2026-X',
    avatarUrl: 'https://i.pravatar.cc/150?u=anita',
};

// Toggle this variable to switch roles while developing!
export const CURRENT_USER = MOCK_FARMER;