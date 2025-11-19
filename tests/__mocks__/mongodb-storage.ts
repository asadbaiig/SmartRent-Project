import { vi } from 'vitest';

// Mock MongoDB Storage
export const mongoDBStorage = {
  getProperties: vi.fn(),
  getProperty: vi.fn(),
  createProperty: vi.fn(),
  updateProperty: vi.fn(),
  deleteProperty: vi.fn(),
  getDocuments: vi.fn(),
  getDocumentsByProperty: vi.fn(),
  createDocument: vi.fn(),
  getLandlordStats: vi.fn(),
};

export const mockProperty = {
  id: 'property-1',
  landlordId: 'landlord-1',
  title: 'Test Property',
  description: 'Test Description',
  address: '123 Test St',
  city: 'Lahore',
  area: 'Gulberg',
  propertyType: 'apartment',
  bedrooms: 2,
  bathrooms: 2,
  sqft: 1000,
  monthlyRent: '50000',
  securityDeposit: '100000',
  amenities: ['Lift', 'Parking'],
  images: ['/uploads/test.jpg'],
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Setup default mocks
mongoDBStorage.getProperties.mockResolvedValue([mockProperty]);
mongoDBStorage.getProperty.mockResolvedValue(mockProperty);
mongoDBStorage.createProperty.mockResolvedValue(mockProperty);
mongoDBStorage.updateProperty.mockResolvedValue(mockProperty);
mongoDBStorage.deleteProperty.mockResolvedValue(undefined);
mongoDBStorage.getDocuments.mockResolvedValue([]);
mongoDBStorage.getDocumentsByProperty.mockResolvedValue([]);
mongoDBStorage.createDocument.mockResolvedValue({
  id: 'doc-1',
  userId: 'user-1',
  type: 'cnic_front',
  fileName: 'test.pdf',
  filePath: '/uploads/test.pdf',
});
mongoDBStorage.getLandlordStats.mockResolvedValue({
  totalProperties: 1,
  activeContracts: 0,
  monthlyRevenue: 0,
  pendingVerifications: 0,
});
