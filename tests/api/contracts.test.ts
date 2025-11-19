import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

// Mock modules
vi.mock('../../server/firebase-auth', () => ({
  authenticateToken: vi.fn((req: any, res: any, next: any) => {
    req.user = {
      uid: 'landlord-1',
      email: 'landlord@example.com',
      role: 'landlord',
      fullName: 'Landlord User',
      verificationStatus: 'verified',
    };
    next();
  }),
  requireRole: vi.fn((roles) => (req: any, res: any, next: any) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ message: 'Insufficient permissions' });
    }
  }),
}));

vi.mock('../../server/firebase-storage', () => ({
  firebaseStorage: {
    getUserById: vi.fn(),
    getUserByEmail: vi.fn(),
    getContracts: vi.fn(),
    getContract: vi.fn(),
    createContract: vi.fn(),
    updateContract: vi.fn(),
    getPayments: vi.fn(),
    getPayment: vi.fn(),
    createPayment: vi.fn(),
    updatePayment: vi.fn(),
  },
}));

import { createTestApp } from '../helpers/test-app';
import { firebaseStorage } from '../../server/firebase-storage';
import { authenticateToken } from '../../server/firebase-auth';

describe('Contracts API', () => {
  let app: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/contracts', () => {
    it('should return contracts for landlord', async () => {
      const mockContracts = [
        {
          id: 'contract-1',
          propertyId: 'property-1',
          landlordId: 'landlord-1',
          tenantId: 'tenant-1',
          monthlyRent: '50000',
          status: 'active',
        },
      ];

      (firebaseStorage.getContracts as any).mockResolvedValueOnce(mockContracts);

      const response = await request(app)
        .get('/api/contracts')
        .set('Authorization', 'Bearer landlord-1')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect((firebaseStorage.getContracts as any).mock.calls[0][0]).toHaveProperty('landlordId');
    });

    it('should return contracts for tenant', async () => {
      (authenticateToken as any).mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = {
          uid: 'tenant-1',
          email: 'tenant@example.com',
          role: 'tenant',
          fullName: 'Tenant User',
          verificationStatus: 'pending',
        };
        next();
      });

      const mockContracts = [
        {
          id: 'contract-1',
          propertyId: 'property-1',
          landlordId: 'landlord-1',
          tenantId: 'tenant-1',
          monthlyRent: '50000',
          status: 'active',
        },
      ];

      (firebaseStorage.getContracts as any).mockResolvedValueOnce(mockContracts);

      const response = await request(app)
        .get('/api/contracts')
        .set('Authorization', 'Bearer tenant-1')
        .expect(200);

      expect((firebaseStorage.getContracts as any).mock.calls[0][0]).toHaveProperty('tenantId');
    });
  });

  describe('POST /api/contracts', () => {
    it('should create a new contract', async () => {
      const contractData = {
        propertyId: 'property-1',
        tenantId: 'tenant-1',
        monthlyRent: '50000',
        securityDeposit: '100000',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T00:00:00.000Z',
        terms: { noticePeriod: 30 },
        status: 'draft',
      };

      const createdContract = {
        id: 'new-contract-id',
        landlordId: 'landlord-1',
        ...contractData,
      };

      (firebaseStorage.createContract as any).mockResolvedValueOnce(createdContract);

      const response = await request(app)
        .post('/api/contracts')
        .set('Authorization', 'Bearer landlord-1')
        .send(contractData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.landlordId).toBe('landlord-1');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        propertyId: '',
        tenantId: 'tenant-1',
      };

      const response = await request(app)
        .post('/api/contracts')
        .set('Authorization', 'Bearer landlord-1')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/contracts/:id', () => {
    it('should update a contract', async () => {
      const existingContract = {
        id: 'contract-1',
        propertyId: 'property-1',
        landlordId: 'landlord-1',
        tenantId: 'tenant-1',
        status: 'draft',
      };

      const updateData = {
        status: 'active',
      };

      const updatedContract = {
        ...existingContract,
        ...updateData,
      };

      (firebaseStorage.getContract as any).mockResolvedValueOnce(existingContract);
      (firebaseStorage.updateContract as any).mockResolvedValueOnce(updatedContract);

      const response = await request(app)
        .put('/api/contracts/contract-1')
        .set('Authorization', 'Bearer landlord-1')
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('active');
    });

    it('should return 404 if contract not found', async () => {
      (firebaseStorage.getContract as any).mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/contracts/non-existent')
        .set('Authorization', 'Bearer landlord-1')
        .send({ status: 'active' })
        .expect(404);

      expect(response.body.message).toBe('Contract not found');
    });

    it('should return 403 if user is not authorized', async () => {
      const existingContract = {
        id: 'contract-1',
        propertyId: 'property-1',
        landlordId: 'other-landlord',
        tenantId: 'tenant-1',
        status: 'draft',
      };

      (firebaseStorage.getContract as any).mockResolvedValueOnce(existingContract);

      const response = await request(app)
        .put('/api/contracts/contract-1')
        .set('Authorization', 'Bearer landlord-1')
        .send({ status: 'active' })
        .expect(403);

      expect(response.body.message).toBe('Insufficient permissions');
    });
  });
});
