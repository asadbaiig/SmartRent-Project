import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

// Mock modules
vi.mock('../../server/firebase-auth', () => ({
  authenticateToken: vi.fn((req: any, res: any, next: any) => {
    req.user = {
      uid: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      fullName: 'Admin User',
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
    updateUserVerificationStatus: vi.fn(),
  },
}));

import { createTestApp } from '../helpers/test-app';
import { firebaseStorage } from '../../server/firebase-storage';
import { authenticateToken } from '../../server/firebase-auth';

describe('Admin API', () => {
  let app: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should return list of users (admin only)', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer admin-1')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 403 if user is not admin', async () => {
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

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer tenant-1')
        .expect(403);

      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('PUT /api/admin/users/:id/verification', () => {
    it('should update user verification status', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        verificationStatus: 'pending',
      };

      const updatedUser = {
        ...mockUser,
        verificationStatus: 'verified',
      };

      (firebaseStorage.updateUserVerificationStatus as any).mockResolvedValueOnce(updatedUser);

      const response = await request(app)
        .put('/api/admin/users/user-1/verification')
        .set('Authorization', 'Bearer admin-1')
        .send({ status: 'verified' })
        .expect(200);

      expect(response.body.verificationStatus).toBe('verified');
      expect(firebaseStorage.updateUserVerificationStatus).toHaveBeenCalledWith('user-1', 'verified');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put('/api/admin/users/user-1/verification')
        .set('Authorization', 'Bearer admin-1')
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });
});
