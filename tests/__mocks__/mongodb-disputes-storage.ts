import { vi } from 'vitest';

// Mock MongoDB Disputes Storage
export const mongoDBDisputeStorage = {
  getDisputes: vi.fn(),
  getDispute: vi.fn(),
  createDispute: vi.fn(),
  updateDispute: vi.fn(),
  addMessage: vi.fn(),
  addEvidence: vi.fn(),
};

export const mockDispute = {
  id: 'dispute-1',
  contractId: 'contract-1',
  raisedBy: 'tenant-1',
  againstUser: 'landlord-1',
  title: 'Test Dispute',
  description: 'Test Description',
  status: 'open',
  evidence: [],
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Setup default mocks
mongoDBDisputeStorage.getDisputes.mockResolvedValue([mockDispute]);
mongoDBDisputeStorage.getDispute.mockResolvedValue(mockDispute);
mongoDBDisputeStorage.createDispute.mockResolvedValue(mockDispute);
mongoDBDisputeStorage.updateDispute.mockResolvedValue(mockDispute);
mongoDBDisputeStorage.addMessage.mockResolvedValue(mockDispute);
mongoDBDisputeStorage.addEvidence.mockResolvedValue(mockDispute);
