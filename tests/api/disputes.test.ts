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

vi.mock('../../server/mongodb-disputes-storage', () => ({
  mongoDBDisputeStorage: {
    getDisputes: vi.fn(),
    getDispute: vi.fn(),
    createDispute: vi.fn(),
    updateDispute: vi.fn(),
    addMessage: vi.fn(),
    addEvidence: vi.fn(),
  },
}));

vi.mock('../../server/firebase-storage', () => ({
  firebaseStorage: {
    getUserById: vi.fn(),
    getContract: vi.fn(),
  },
}));

// Mock multer
vi.mock('multer', () => ({
  default: vi.fn(() => ({
    array: vi.fn(() => (req: any, res: any, next: any) => {
      req.files = [
        {
          fieldname: 'files',
          originalname: 'evidence.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 1024,
          destination: 'uploads/',
          filename: 'evidence-file.pdf',
          path: 'uploads/evidence-file.pdf',
        },
      ];
      next();
    }),
  })),
}));

import { createTestApp } from '../helpers/test-app';
import { mongoDBDisputeStorage } from '../../server/mongodb-disputes-storage';
import { firebaseStorage } from '../../server/firebase-storage';
import { authenticateToken } from '../../server/firebase-auth';

describe('Disputes API', () => {
  let app: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/disputes', () => {
    it('should return disputes for user', async () => {
      const mockDisputes = [
        {
          id: 'dispute-1',
          contractId: 'contract-1',
          raisedBy: 'tenant-1',
          againstUser: 'landlord-1',
          title: 'Test Dispute',
          status: 'open',
        },
      ];

      (mongoDBDisputeStorage.getDisputes as any).mockResolvedValueOnce(mockDisputes);

      const response = await request(app)
        .get('/api/disputes')
        .set('Authorization', 'Bearer tenant-1')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter disputes by status', async () => {
      (mongoDBDisputeStorage.getDisputes as any).mockResolvedValueOnce([]);

      await request(app)
        .get('/api/disputes?status=open')
        .set('Authorization', 'Bearer tenant-1')
        .expect(200);

      expect((mongoDBDisputeStorage.getDisputes as any).mock.calls[0][0]).toHaveProperty('status');
    });
  });

  describe('GET /api/disputes/:id', () => {
    it('should return a single dispute', async () => {
      const mockDispute = {
        id: 'dispute-1',
        contractId: 'contract-1',
        raisedBy: 'tenant-1',
        againstUser: 'landlord-1',
        title: 'Test Dispute',
        description: 'Test Description',
        status: 'open',
      };

      (mongoDBDisputeStorage.getDispute as any).mockResolvedValueOnce(mockDispute);

      const response = await request(app)
        .get('/api/disputes/dispute-1')
        .set('Authorization', 'Bearer tenant-1')
        .expect(200);

      expect(response.body.id).toBe('dispute-1');
      expect(response.body.title).toBe('Test Dispute');
    });

    it('should return 404 if dispute not found', async () => {
      (mongoDBDisputeStorage.getDispute as any).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/disputes/non-existent')
        .set('Authorization', 'Bearer tenant-1')
        .expect(404);

      expect(response.body.message).toBe('Dispute not found');
    });

    it('should return 403 if user is not authorized', async () => {
      const mockDispute = {
        id: 'dispute-1',
        contractId: 'contract-1',
        raisedBy: 'other-tenant',
        againstUser: 'landlord-1',
        title: 'Test Dispute',
        status: 'open',
      };

      (mongoDBDisputeStorage.getDispute as any).mockResolvedValueOnce(mockDispute);

      const response = await request(app)
        .get('/api/disputes/dispute-1')
        .set('Authorization', 'Bearer tenant-1')
        .expect(403);

      expect(response.body.message).toBe('Access denied');
    });
  });

  describe('POST /api/disputes', () => {
    it('should create a new dispute', async () => {
      const mockContract = {
        id: 'contract-1',
        landlordId: 'landlord-1',
        tenantId: 'tenant-1',
      };

      (firebaseStorage.getContract as any).mockResolvedValueOnce(mockContract);

      const disputeData = {
        contractId: 'contract-1',
        propertyId: 'property-1',
        title: 'New Dispute',
        description: 'Dispute description',
        category: 'payment',
      };

      const createdDispute = {
        id: 'new-dispute-id',
        raisedBy: 'tenant-1',
        againstUser: 'landlord-1',
        ...disputeData,
        status: 'open',
      };

      (mongoDBDisputeStorage.createDispute as any).mockResolvedValueOnce(createdDispute);
      (mongoDBDisputeStorage.getDispute as any).mockResolvedValueOnce(createdDispute);

      const response = await request(app)
        .post('/api/disputes')
        .set('Authorization', 'Bearer tenant-1')
        .field('contractId', disputeData.contractId)
        .field('propertyId', disputeData.propertyId)
        .field('title', disputeData.title)
        .field('description', disputeData.description)
        .field('category', disputeData.category)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(disputeData.title);
    });

    it('should return 404 if contract not found', async () => {
      (firebaseStorage.getContract as any).mockResolvedValueOnce(null);

      const disputeData = {
        contractId: 'non-existent',
        title: 'New Dispute',
        description: 'Description',
      };

      const response = await request(app)
        .post('/api/disputes')
        .set('Authorization', 'Bearer tenant-1')
        .send(disputeData)
        .expect(404);

      expect(response.body.message).toBe('Contract not found');
    });
  });

  describe('PUT /api/disputes/:id', () => {
    it('should update dispute status (admin only)', async () => {
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

      const existingDispute = {
        id: 'dispute-1',
        raisedBy: 'tenant-1',
        status: 'open',
      };

      const updateData = {
        status: 'resolved',
        resolution: 'Dispute resolved',
      };

      const updatedDispute = {
        ...existingDispute,
        ...updateData,
        resolvedBy: 'admin-1',
        resolvedAt: new Date(),
      };

      (mongoDBDisputeStorage.getDispute as any).mockResolvedValueOnce(existingDispute);
      (mongoDBDisputeStorage.updateDispute as any).mockResolvedValueOnce(updatedDispute);

      const response = await request(app)
        .put('/api/disputes/dispute-1')
        .set('Authorization', 'Bearer admin-1')
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('resolved');
    });

    it('should allow creator to close dispute', async () => {
      const existingDispute = {
        id: 'dispute-1',
        raisedBy: 'tenant-1',
        againstUser: 'landlord-1',
        status: 'open',
      };

      const updateData = {
        status: 'closed',
      };

      const updatedDispute = {
        ...existingDispute,
        ...updateData,
      };

      (mongoDBDisputeStorage.getDispute as any).mockResolvedValueOnce(existingDispute);
      (mongoDBDisputeStorage.updateDispute as any).mockResolvedValueOnce(updatedDispute);

      const response = await request(app)
        .put('/api/disputes/dispute-1')
        .set('Authorization', 'Bearer tenant-1')
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('closed');
    });
  });

  describe('POST /api/disputes/:id/messages', () => {
    it('should add a message to dispute', async () => {
      const existingDispute = {
        id: 'dispute-1',
        raisedBy: 'tenant-1',
        againstUser: 'landlord-1',
        status: 'open',
        messages: [],
      };

      const messageData = {
        message: 'This is a test message',
      };

      const updatedDispute = {
        ...existingDispute,
        messages: [
          {
            senderId: 'tenant-1',
            senderName: 'Tenant User',
            message: messageData.message,
          },
        ],
      };

      (mongoDBDisputeStorage.getDispute as any).mockResolvedValueOnce(existingDispute);
      (firebaseStorage.getUserById as any).mockResolvedValueOnce({
        id: 'tenant-1',
        fullName: 'Tenant User',
      });
      (mongoDBDisputeStorage.addMessage as any).mockResolvedValueOnce(updatedDispute);

      const response = await request(app)
        .post('/api/disputes/dispute-1/messages')
        .set('Authorization', 'Bearer tenant-1')
        .send(messageData)
        .expect(200);

      expect(mongoDBDisputeStorage.addMessage).toHaveBeenCalled();
    });

    it('should return 403 if user is not authorized', async () => {
      const existingDispute = {
        id: 'dispute-1',
        raisedBy: 'other-tenant',
        againstUser: 'landlord-1',
        status: 'open',
      };

      (mongoDBDisputeStorage.getDispute as any).mockResolvedValueOnce(existingDispute);

      const response = await request(app)
        .post('/api/disputes/dispute-1/messages')
        .set('Authorization', 'Bearer tenant-1')
        .send({ message: 'Test' })
        .expect(403);

      expect(response.body.message).toBe('Access denied');
    });
  });

  describe('POST /api/disputes/:id/evidence', () => {
    it('should add evidence to dispute', async () => {
      const existingDispute = {
        id: 'dispute-1',
        raisedBy: 'tenant-1',
        status: 'open',
        evidence: [],
      };

      const updatedDispute = {
        ...existingDispute,
        evidence: [
          {
            fileName: 'evidence.pdf',
            filePath: '/uploads/evidence-file.pdf',
          },
        ],
      };

      (mongoDBDisputeStorage.getDispute as any).mockResolvedValueOnce(existingDispute);
      (mongoDBDisputeStorage.addEvidence as any).mockResolvedValueOnce(undefined);
      (mongoDBDisputeStorage.getDispute as any).mockResolvedValueOnce(updatedDispute);

      const response = await request(app)
        .post('/api/disputes/dispute-1/evidence')
        .set('Authorization', 'Bearer tenant-1')
        .attach('files', Buffer.from('test'), 'evidence.pdf')
        .expect(200);

      expect(mongoDBDisputeStorage.addEvidence).toHaveBeenCalled();
    });

    it('should return 400 if no files uploaded', async () => {
      const multer = await import('multer');
      const mockMulter = multer.default as any;
      mockMulter.mockImplementationOnce(() => ({
        array: vi.fn(() => (req: any, res: any, next: any) => {
          req.files = [];
          next();
        }),
      }));

      const existingDispute = {
        id: 'dispute-1',
        raisedBy: 'tenant-1',
        status: 'open',
      };

      (mongoDBDisputeStorage.getDispute as any).mockResolvedValueOnce(existingDispute);

      const response = await request(app)
        .post('/api/disputes/dispute-1/evidence')
        .set('Authorization', 'Bearer tenant-1')
        .expect(400);

      expect(response.body.message).toBe('No files uploaded');
    });
  });
});
