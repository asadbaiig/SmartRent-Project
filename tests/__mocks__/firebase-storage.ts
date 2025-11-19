import { vi } from 'vitest';

// Mock Firebase Storage
export const firebaseStorage = {
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  updateUserVerificationStatus: vi.fn(),
  getContracts: vi.fn(),
  getContract: vi.fn(),
  createContract: vi.fn(),
  updateContract: vi.fn(),
  getPayments: vi.fn(),
  getPayment: vi.fn(),
  createPayment: vi.fn(),
  updatePayment: vi.fn(),
  getTenantStats: vi.fn(),
  getAdminStats: vi.fn(),
};

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  fullName: 'Test User',
  role: 'tenant',
  verificationStatus: 'pending',
  phone: '1234567890',
  cnicNumber: '12345-1234567-1',
};

// Setup default mocks
firebaseStorage.getUserById.mockResolvedValue(mockUser);
firebaseStorage.getUserByEmail.mockResolvedValue(null);
firebaseStorage.createUser.mockResolvedValue(mockUser);
firebaseStorage.updateUser.mockResolvedValue(mockUser);
firebaseStorage.updateUserVerificationStatus.mockResolvedValue(mockUser);
firebaseStorage.getContracts.mockResolvedValue([]);
firebaseStorage.getContract.mockResolvedValue(null);
firebaseStorage.createContract.mockResolvedValue({ id: 'contract-1' });
firebaseStorage.updateContract.mockResolvedValue({ id: 'contract-1' });
firebaseStorage.getPayments.mockResolvedValue([]);
firebaseStorage.getPayment.mockResolvedValue(null);
firebaseStorage.createPayment.mockResolvedValue({ id: 'payment-1' });
firebaseStorage.updatePayment.mockResolvedValue({ id: 'payment-1' });
firebaseStorage.getTenantStats.mockResolvedValue({
  currentRent: 0,
  contractStatus: 'none',
  nextPaymentDate: null,
  savedProperties: 0,
});
firebaseStorage.getAdminStats.mockResolvedValue({
  totalUsers: 0,
  pendingVerifications: 0,
  activeContracts: 0,
  openDisputes: 0,
});
