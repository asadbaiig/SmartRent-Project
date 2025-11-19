import { vi } from 'vitest';

// Mock Firebase Auth
export const firebaseAuth = {
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
};

export const mockFirebaseUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
};

export const mockUser = {
  id: 'test-user-id',
  uid: 'test-user-id',
  email: 'test@example.com',
  fullName: 'Test User',
  role: 'tenant',
  verificationStatus: 'pending',
  phone: '1234567890',
  cnicNumber: '12345-1234567-1',
};

// Setup default mocks
firebaseAuth.signUp.mockResolvedValue({
  user: mockUser,
  firebaseUser: mockFirebaseUser,
});

firebaseAuth.signIn.mockResolvedValue({
  user: mockUser,
  firebaseUser: mockFirebaseUser,
});

firebaseAuth.signOut.mockResolvedValue(undefined);
