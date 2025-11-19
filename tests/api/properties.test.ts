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

vi.mock('../../server/mongodb-storage', () => ({
  mongoDBStorage: {
    getProperties: vi.fn(),
    getProperty: vi.fn(),
    createProperty: vi.fn(),
    updateProperty: vi.fn(),
    deleteProperty: vi.fn(),
    getLandlordStats: vi.fn(),
  },
}));

vi.mock('../../server/mongodb', () => ({
  isMongoDBConnected: vi.fn(() => true),
}));

import { createTestApp } from '../helpers/test-app';
import { mongoDBStorage } from '../../server/mongodb-storage';
import { authenticateToken } from '../../server/firebase-auth';

describe('Properties API', () => {
  let app: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/properties', () => {
    it('should return list of properties', async () => {
      const mockProperties = [
        {
          id: 'property-1',
          title: 'Test Property 1',
          city: 'Lahore',
          propertyType: 'apartment',
          monthlyRent: '50000',
          isAvailable: true,
        },
        {
          id: 'property-2',
          title: 'Test Property 2',
          city: 'Karachi',
          propertyType: 'house',
          monthlyRent: '80000',
          isAvailable: true,
        },
      ];

      (mongoDBStorage.getProperties as any).mockResolvedValueOnce(mockProperties);

      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter properties by city', async () => {
      const filteredProperties = [
        {
          id: 'property-1',
          title: 'Lahore Property',
          city: 'Lahore',
          propertyType: 'apartment',
          monthlyRent: '50000',
        },
      ];

      (mongoDBStorage.getProperties as any).mockResolvedValueOnce(filteredProperties);

      const response = await request(app)
        .get('/api/properties?city=Lahore')
        .expect(200);

      expect((mongoDBStorage.getProperties as any).mock.calls[0][0]).toHaveProperty('city');
    });

    it('should filter properties by property type', async () => {
      (mongoDBStorage.getProperties as any).mockResolvedValueOnce([]);

      await request(app)
        .get('/api/properties?propertyType=apartment')
        .expect(200);

      expect((mongoDBStorage.getProperties as any).mock.calls[0][0]).toHaveProperty('propertyType');
    });

    it('should filter properties by rent range', async () => {
      (mongoDBStorage.getProperties as any).mockResolvedValueOnce([]);

      await request(app)
        .get('/api/properties?minRent=30000&maxRent=70000')
        .expect(200);

      const callArgs = (mongoDBStorage.getProperties as any).mock.calls[0][0];
      expect(callArgs).toHaveProperty('minRent');
      expect(callArgs).toHaveProperty('maxRent');
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should return a single property by id', async () => {
      const mockProperty = {
        id: 'property-1',
        title: 'Test Property',
        city: 'Lahore',
        propertyType: 'apartment',
        monthlyRent: '50000',
      };

      (mongoDBStorage.getProperty as any).mockResolvedValueOnce(mockProperty);

      const response = await request(app)
        .get('/api/properties/property-1')
        .expect(200);

      expect(response.body.id).toBe('property-1');
      expect(response.body.title).toBe('Test Property');
    });

    it('should return 404 if property not found', async () => {
      (mongoDBStorage.getProperty as any).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/properties/non-existent')
        .expect(404);

      expect(response.body.message).toBe('Property not found');
    });
  });

  describe('POST /api/properties', () => {
    it('should create a new property', async () => {
      const propertyData = {
        title: 'New Property',
        description: 'A new property',
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
      };

      const createdProperty = {
        id: 'new-property-id',
        landlordId: 'landlord-1',
        ...propertyData,
      };

      (mongoDBStorage.createProperty as any).mockResolvedValueOnce(createdProperty);

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', 'Bearer landlord-1')
        .send(propertyData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(propertyData.title);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        title: '',
        city: 'Lahore',
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', 'Bearer landlord-1')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 if user is not a landlord', async () => {
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

      const propertyData = {
        title: 'New Property',
        address: '123 Test St',
        city: 'Lahore',
        area: 'Gulberg',
        propertyType: 'apartment',
        monthlyRent: '50000',
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', 'Bearer tenant-1')
        .send(propertyData)
        .expect(403);

      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('PUT /api/properties/:id', () => {
    it('should update a property', async () => {
      const existingProperty = {
        id: 'property-1',
        landlordId: 'landlord-1',
        title: 'Old Title',
        monthlyRent: '50000',
      };

      const updateData = {
        title: 'Updated Title',
        monthlyRent: '60000',
      };

      const updatedProperty = {
        ...existingProperty,
        ...updateData,
      };

      (mongoDBStorage.getProperty as any).mockResolvedValueOnce(existingProperty);
      (mongoDBStorage.updateProperty as any).mockResolvedValueOnce(updatedProperty);

      const response = await request(app)
        .put('/api/properties/property-1')
        .set('Authorization', 'Bearer landlord-1')
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
    });

    it('should return 404 if property not found', async () => {
      (mongoDBStorage.getProperty as any).mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/properties/non-existent')
        .set('Authorization', 'Bearer landlord-1')
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body.message).toBe('Property not found');
    });
  });

  describe('DELETE /api/properties/:id', () => {
    it('should delete a property', async () => {
      const existingProperty = {
        id: 'property-1',
        landlordId: 'landlord-1',
        title: 'Test Property',
      };

      (mongoDBStorage.getProperty as any).mockResolvedValueOnce(existingProperty);
      (mongoDBStorage.deleteProperty as any).mockResolvedValueOnce(undefined);

      await request(app)
        .delete('/api/properties/property-1')
        .set('Authorization', 'Bearer landlord-1')
        .expect(204);
    });

    it('should return 404 if property not found', async () => {
      (mongoDBStorage.getProperty as any).mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/properties/non-existent')
        .set('Authorization', 'Bearer landlord-1')
        .expect(404);

      expect(response.body.message).toBe('Property not found');
    });
  });
});

