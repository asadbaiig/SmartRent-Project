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
  requireRole: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

vi.mock('../../server/firebase-storage', () => ({
  firebaseStorage: {
    getContracts: vi.fn(),
    getTenantStats: vi.fn(),
    getAdminStats: vi.fn(),
  },
}));

vi.mock('../../server/mongodb-storage', () => ({
  mongoDBStorage: {
    getProperties: vi.fn(),
    getLandlordStats: vi.fn(),
  },
}));

import { createTestApp } from '../helpers/test-app';
import { firebaseStorage } from '../../server/firebase-storage';
import { mongoDBStorage } from '../../server/mongodb-storage';
import { authenticateToken } from '../../server/firebase-auth';

describe('Dashboard API', () => {
  let app: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard stats for landlord', async () => {
      const mockStats = {
        totalProperties: 5,
        activeContracts: 3,
        monthlyRevenue: 150000,
        pendingVerifications: 0,
      };

      (mongoDBStorage.getLandlordStats as any).mockResolvedValueOnce(mockStats);
      (firebaseStorage.getContracts as any).mockResolvedValueOnce([
        { status: 'active' },
        { status: 'active' },
        { status: 'active' },
      ]);

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer landlord-1')
        .expect(200);

      expect(response.body).toHaveProperty('totalProperties');
      expect(response.body).toHaveProperty('activeContracts');
      expect(response.body).toHaveProperty('monthlyRevenue');
      expect(mongoDBStorage.getLandlordStats).toHaveBeenCalledWith('landlord-1');
    });

    it('should return dashboard stats for tenant', async () => {
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

      const mockStats = {
        currentRent: 50000,
        contractStatus: 'active',
        nextPaymentDate: new Date('2024-02-01'),
        savedProperties: 3,
      };

      (firebaseStorage.getTenantStats as any).mockResolvedValueOnce(mockStats);

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer tenant-1')
        .expect(200);

      expect(response.body).toHaveProperty('currentRent');
      expect(response.body).toHaveProperty('contractStatus');
      expect(response.body).toHaveProperty('nextPaymentDate');
      expect(firebaseStorage.getTenantStats).toHaveBeenCalledWith('tenant-1');
    });

    it('should return dashboard stats for admin', async () => {
      (authenticateToken as any).mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = {
          uid: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          fullName: 'Admin User',
          verificationStatus: 'verified',
        };
        next();
      });

      const mockProperties = [{ id: 'prop-1' }, { id: 'prop-2' }];
      const mockAdminStats = {
        totalUsers: 100,
        pendingVerifications: 5,
        activeContracts: 50,
        openDisputes: 3,
      };

      (mongoDBStorage.getProperties as any).mockResolvedValueOnce(mockProperties);
      (firebaseStorage.getAdminStats as any).mockResolvedValueOnce(mockAdminStats);

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer admin-1')
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('totalProperties');
      expect(response.body).toHaveProperty('pendingVerifications');
      expect(response.body).toHaveProperty('activeContracts');
      expect(response.body).toHaveProperty('openDisputes');
    });

    it('should return fallback stats on error', async () => {
      (mongoDBStorage.getLandlordStats as any).mockRejectedValueOnce(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer landlord-1')
        .expect(200);

      expect(response.body).toHaveProperty('totalProperties');
      expect(response.body).toHaveProperty('activeContracts');
    });
  });
});
