import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

// Mock modules
vi.mock('../../server/firebase-auth', () => ({
  authenticateToken: vi.fn((req: any, res: any, next: any) => {
    req.user = {
      uid: 'tenant-1',
      email: 'tenant@example.com',
      role: 'tenant',
      fullName: 'Tenant User',
      verificationStatus: 'pending',
    };
    next();
  }),
  requireRole: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

vi.mock('../../server/firebase-storage', () => ({
  firebaseStorage: {
    getUserById: vi.fn(),
    getUserByEmail: vi.fn(),
    getContracts: vi.fn(),
    getContract: vi.fn(),
    getPayments: vi.fn(),
    getPayment: vi.fn(),
    createPayment: vi.fn(),
    updatePayment: vi.fn(),
  },
}));

import { createTestApp } from '../helpers/test-app';
import { firebaseStorage } from '../../server/firebase-storage';
import { authenticateToken } from '../../server/firebase-auth';

describe('Payments API', () => {
  let app: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/payments', () => {
    it('should return payments for tenant', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          contractId: 'contract-1',
          tenantId: 'tenant-1',
          landlordId: 'landlord-1',
          amount: '50000',
          status: 'pending',
          dueDate: new Date('2024-02-01'),
        },
      ];

      (firebaseStorage.getPayments as any).mockResolvedValueOnce(mockPayments);

      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', 'Bearer tenant-1')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect((firebaseStorage.getPayments as any).mock.calls[0][0]).toHaveProperty('tenantId');
    });

    it('should return payments for landlord', async () => {
      (authenticateToken as any).mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = {
          uid: 'landlord-1',
          email: 'landlord@example.com',
          role: 'landlord',
          fullName: 'Landlord User',
          verificationStatus: 'verified',
        };
        next();
      });

      const mockPayments = [
        {
          id: 'payment-1',
          contractId: 'contract-1',
          tenantId: 'tenant-1',
          landlordId: 'landlord-1',
          amount: '50000',
          status: 'paid',
        },
      ];

      (firebaseStorage.getPayments as any).mockResolvedValueOnce(mockPayments);

      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', 'Bearer landlord-1')
        .expect(200);

      expect((firebaseStorage.getPayments as any).mock.calls[0][0]).toHaveProperty('landlordId');
    });
  });

  describe('POST /api/payments', () => {
    it('should create a new payment', async () => {
      const paymentData = {
        contractId: 'contract-1',
        tenantId: 'tenant-1',
        landlordId: 'landlord-1',
        amount: '50000',
        dueDate: '2024-02-01T00:00:00.000Z',
        status: 'pending',
        paymentMethod: 'card',
      };

      const createdPayment = {
        id: 'new-payment-id',
        ...paymentData,
      };

      (firebaseStorage.createPayment as any).mockResolvedValueOnce(createdPayment);

      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', 'Bearer tenant-1')
        .send(paymentData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.amount).toBe(paymentData.amount);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        contractId: '',
        amount: '50000',
      };

      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', 'Bearer tenant-1')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/payments/:id', () => {
    it('should update a payment', async () => {
      const existingPayment = {
        id: 'payment-1',
        contractId: 'contract-1',
        tenantId: 'tenant-1',
        landlordId: 'landlord-1',
        amount: '50000',
        status: 'pending',
      };

      const updateData = {
        status: 'paid',
        paidDate: new Date(),
      };

      const updatedPayment = {
        ...existingPayment,
        ...updateData,
      };

      (firebaseStorage.getPayment as any).mockResolvedValueOnce(existingPayment);
      (firebaseStorage.updatePayment as any).mockResolvedValueOnce(updatedPayment);

      const response = await request(app)
        .put('/api/payments/payment-1')
        .set('Authorization', 'Bearer tenant-1')
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('paid');
    });

    it('should return 404 if payment not found', async () => {
      (firebaseStorage.getPayment as any).mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/payments/non-existent')
        .set('Authorization', 'Bearer tenant-1')
        .send({ status: 'paid' })
        .expect(404);

      expect(response.body.message).toBe('Payment not found');
    });
  });
});
