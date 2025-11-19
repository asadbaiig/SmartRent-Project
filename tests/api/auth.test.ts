import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app';

// Mock modules
vi.mock('../../server/firebase-auth', () => {
  const mockAuth = {
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  };
  return {
    firebaseAuth: mockAuth,
    authenticateToken: vi.fn((req: any, res: any, next: any) => {
      req.user = {
        uid: 'test-user-id',
        email: 'test@example.com',
        role: 'tenant',
        fullName: 'Test User',
        verificationStatus: 'pending',
      };
      next();
    }),
    requireRole: vi.fn(() => (req: any, res: any, next: any) => next()),
  };
});

vi.mock('../../server/firebase-storage', () => ({
  firebaseStorage: {
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
  },
}));

vi.mock('../../server/mongodb-storage', () => ({
  mongoDBStorage: {
    getProperties: vi.fn(),
    getProperty: vi.fn(),
    createProperty: vi.fn(),
    updateProperty: vi.fn(),
    deleteProperty: vi.fn(),
    getDocuments: vi.fn(),
    getDocumentsByProperty: vi.fn(),
    createDocument: vi.fn(),
    getLandlordStats: vi.fn(),
  },
}));

vi.mock('../../server/mongodb', () => ({
  isMongoDBConnected: vi.fn(() => true),
}));

import { firebaseAuth } from '../../server/firebase-auth';
import { firebaseStorage } from '../../server/firebase-storage';

describe('Authentication API', () => {
  let app: any;

  beforeAll(async () => {
    // Setup default mock implementations
    (firebaseStorage.getUserById as any).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'tenant',
      verificationStatus: 'pending',
    });
    (firebaseStorage.getUserByEmail as any).mockResolvedValue(null);
    (firebaseAuth.signUp as any).mockResolvedValue({
      user: {
        id: 'new-user-id',
        email: 'newuser@example.com',
        fullName: 'New User',
        role: 'tenant',
        verificationStatus: 'pending',
      },
      firebaseUser: { uid: 'new-user-id' },
    });
    (firebaseAuth.signIn as any).mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'tenant',
        verificationStatus: 'pending',
      },
      firebaseUser: { uid: 'test-user-id' },
    });
    (firebaseAuth.signOut as any).mockResolvedValue(undefined);

    app = await createTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default implementations
    (firebaseStorage.getUserById as any).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'tenant',
      verificationStatus: 'pending',
    });
    (firebaseStorage.getUserByEmail as any).mockResolvedValue(null);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
        phone: '1234567890',
        role: 'tenant',
        cnicNumber: '12345-1234567-1',
      };

      (firebaseStorage.getUserByEmail as any).mockResolvedValueOnce(null);
      (firebaseAuth.signUp as any).mockResolvedValueOnce({
        user: {
          id: 'new-user-id',
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role,
          verificationStatus: 'pending',
        },
        firebaseUser: { uid: 'new-user-id' },
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
    });

    it('should return 400 if user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'Existing User',
        role: 'tenant',
      };

      (firebaseStorage.getUserByEmail as any).mockResolvedValueOnce({
        id: 'existing-id',
        email: userData.email,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toBe('User already exists');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      (firebaseAuth.signIn as any).mockResolvedValueOnce({
        user: {
          id: 'test-user-id',
          email: loginData.email,
          fullName: 'Test User',
          role: 'tenant',
          verificationStatus: 'pending',
        },
        firebaseUser: { uid: 'test-user-id' },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      (firebaseAuth.signIn as any).mockRejectedValueOnce(
        new Error('Invalid credentials')
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('POST /api/auth/signout', () => {
    it('should sign out user successfully', async () => {
      (firebaseAuth.signOut as any).mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/api/auth/signout')
        .expect(200);

      expect(response.body.message).toBe('Signed out successfully');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user information', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'tenant',
        verificationStatus: 'pending',
        phone: '1234567890',
        cnicNumber: '12345-1234567-1',
      };

      (firebaseStorage.getUserById as any).mockResolvedValueOnce(mockUser);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer test-user-id')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe(mockUser.email);
    });

    it('should return 404 if user not found', async () => {
      (firebaseStorage.getUserById as any).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-id')
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });
  });
});

