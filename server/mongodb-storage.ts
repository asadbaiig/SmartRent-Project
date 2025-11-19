import { getPropertyModel, getDocumentModel, getContractModel, type PropertyDocument, type DocumentDocument, type ContractDocument } from './mongodb-models';
import { isMongoDBConnected } from './mongodb';
import type { Property, InsertProperty, Document, InsertDocument, Contract, InsertContract } from '@shared/schema';

export class MongoDBStorage {
  private checkConnection(): void {
    if (!isMongoDBConnected()) {
      throw new Error('MongoDB is not connected. Please set up MongoDB and restart the server.');
    }
  }
  // Property operations
  async createProperty(propertyData: InsertProperty): Promise<Property> {
    this.checkConnection();
    const PropertyModel = await getPropertyModel();
    const property = new PropertyModel({
      ...propertyData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const saved = await property.save();
    return this.mapPropertyToSchema(saved);
  }

  async getProperty(id: string): Promise<Property | null> {
    if (!isMongoDBConnected()) return null;
    try {
      const PropertyModel = await getPropertyModel();
      const property = await PropertyModel.findById(id);
      if (!property) return null;
      return this.mapPropertyToSchema(property);
    } catch (error) {
      console.error('[MongoDB] Error getting property:', error);
      return null;
    }
  }

  async getProperties(filters: any = {}): Promise<Property[]> {
    if (!isMongoDBConnected()) return [];
    try {
      const PropertyModel = await getPropertyModel();
      const query: any = {};

      // Apply filters
      if (filters.city) {
        query.city = filters.city;
      }
      if (filters.propertyType) {
        query.propertyType = filters.propertyType;
      }
      if (filters.isAvailable !== undefined) {
        query.isAvailable = filters.isAvailable;
      }
      if (filters.landlordId) {
        query.landlordId = filters.landlordId;
      }
      if (filters.bedrooms !== undefined) {
        query.bedrooms = filters.bedrooms;
      }

      // Build query
      let mongoQuery = PropertyModel.find(query);

      // Apply rent filters
      if (filters.minRent !== undefined || filters.maxRent !== undefined) {
        const properties = await PropertyModel.find(query).lean();
        let filtered = properties;

        if (filters.minRent !== undefined) {
          filtered = filtered.filter(p => Number(p.monthlyRent) >= filters.minRent);
        }
        if (filters.maxRent !== undefined) {
          filtered = filtered.filter(p => Number(p.monthlyRent) <= filters.maxRent);
        }

        // Sort and apply pagination
        filtered.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        });

        if (filters.offset) {
          filtered = filtered.slice(filters.offset);
        }
        if (filters.limit) {
          filtered = filtered.slice(0, filters.limit);
        }

        return filtered.map(p => this.mapPropertyToSchema(p as any));
      }

      // Sort by creation date (newest first)
      mongoQuery = mongoQuery.sort({ createdAt: -1 });

      // Apply pagination
      if (filters.offset) {
        mongoQuery = mongoQuery.skip(filters.offset);
      }
      if (filters.limit) {
        mongoQuery = mongoQuery.limit(filters.limit);
      }

      const properties = await mongoQuery.exec();
      return properties.map(p => this.mapPropertyToSchema(p));
    } catch (error) {
      console.error('[MongoDB] Error getting properties:', error);
      return [];
    }
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property | null> {
    this.checkConnection();
    try {
      const PropertyModel = await getPropertyModel();
      const property = await PropertyModel.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true }
      );
      
      if (!property) return null;
      return this.mapPropertyToSchema(property);
    } catch (error) {
      console.error('[MongoDB] Error updating property:', error);
      return null;
    }
  }

  async deleteProperty(id: string): Promise<void> {
    this.checkConnection();
    try {
      const PropertyModel = await getPropertyModel();
      await PropertyModel.findByIdAndDelete(id);
    } catch (error) {
      console.error('[MongoDB] Error deleting property:', error);
      throw error;
    }
  }

  async getPropertiesByLandlord(landlordId: string): Promise<Property[]> {
    if (!isMongoDBConnected()) return [];
    try {
      const PropertyModel = await getPropertyModel();
      const properties = await PropertyModel.find({ landlordId })
        .sort({ createdAt: -1 })
        .exec();
      return properties.map(p => this.mapPropertyToSchema(p));
    } catch (error) {
      console.error('[MongoDB] Error getting properties by landlord:', error);
      return [];
    }
  }

  // Document operations
  async createDocument(documentData: InsertDocument): Promise<Document> {
    this.checkConnection();
    const DocumentModel = await getDocumentModel();
    const document = new DocumentModel({
      ...documentData,
      createdAt: new Date()
    });
    
    const saved = await document.save();
    return this.mapDocumentToSchema(saved);
  }

  async getDocument(id: string): Promise<Document | null> {
    if (!isMongoDBConnected()) return null;
    try {
      const DocumentModel = await getDocumentModel();
      const document = await DocumentModel.findById(id);
      if (!document) return null;
      return this.mapDocumentToSchema(document);
    } catch (error) {
      console.error('[MongoDB] Error getting document:', error);
      return null;
    }
  }

  async getDocuments(filters: any = {}): Promise<Document[]> {
    if (!isMongoDBConnected()) return [];
    try {
      const DocumentModel = await getDocumentModel();
      const query: any = {};

      if (filters.userId) {
        query.userId = filters.userId;
      }
      if (filters.propertyId) {
        query.propertyId = filters.propertyId;
      }
      if (filters.contractId) {
        query.contractId = filters.contractId;
      }

      const documents = await DocumentModel.find(query)
        .sort({ createdAt: -1 })
        .exec();
      
      return documents.map(d => this.mapDocumentToSchema(d));
    } catch (error) {
      console.error('[MongoDB] Error getting documents:', error);
      return [];
    }
  }

  async getDocumentsByProperty(propertyId: string): Promise<Document[]> {
    if (!isMongoDBConnected()) return [];
    try {
      const DocumentModel = await getDocumentModel();
      const documents = await DocumentModel.find({ propertyId })
        .sort({ createdAt: -1 })
        .exec();
      return documents.map(d => this.mapDocumentToSchema(d));
    } catch (error) {
      console.error('[MongoDB] Error getting documents by property:', error);
      return [];
    }
  }

  // Stats methods
  async getLandlordStats(landlordId: string): Promise<any> {
    if (!isMongoDBConnected()) {
      return {
        totalProperties: 0,
        availableProperties: 0,
        totalRent: 0,
        monthlyRevenue: 0
      };
    }
    try {
      const properties = await this.getPropertiesByLandlord(landlordId);
      // Get contracts from Firebase (still using Firebase for contracts)
      // For now, return property stats only
      return {
        totalProperties: properties.length,
        availableProperties: properties.filter(p => p.isAvailable).length,
        totalRent: properties.reduce((sum, p) => sum + Number(p.monthlyRent || 0), 0),
        monthlyRevenue: properties
          .filter(p => p.isAvailable)
          .reduce((sum, p) => sum + Number(p.monthlyRent || 0), 0)
      };
    } catch (error) {
      console.error('[MongoDB] Error getting landlord stats:', error);
      return {
        totalProperties: 0,
        availableProperties: 0,
        totalRent: 0,
        monthlyRevenue: 0
      };
    }
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | null> {
    this.checkConnection();
    try {
      const DocumentModel = await getDocumentModel();
      const document = await DocumentModel.findByIdAndUpdate(
        id,
        updates,
        { new: true }
      );
      
      if (!document) return null;
      return this.mapDocumentToSchema(document);
    } catch (error) {
      console.error('[MongoDB] Error updating document:', error);
      return null;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    this.checkConnection();
    try {
      const DocumentModel = await getDocumentModel();
      await DocumentModel.findByIdAndDelete(id);
    } catch (error) {
      console.error('[MongoDB] Error deleting document:', error);
      throw error;
    }
  }

  // Contract operations
  async createContract(contractData: InsertContract): Promise<Contract> {
    this.checkConnection();
    const ContractModel = await getContractModel();
    const contract = new ContractModel({
      ...contractData,
      monthlyRent: contractData.monthlyRent.toString(),
      securityDeposit: contractData.securityDeposit.toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const saved = await contract.save();
    return this.mapContractToSchema(saved);
  }

  async getContract(id: string): Promise<Contract | null> {
    if (!isMongoDBConnected()) return null;
    try {
      const ContractModel = await getContractModel();
      const contract = await ContractModel.findById(id);
      if (!contract) return null;
      return this.mapContractToSchema(contract);
    } catch (error) {
      console.error('[MongoDB] Error getting contract:', error);
      return null;
    }
  }

  async getContracts(filters: any = {}): Promise<Contract[]> {
    if (!isMongoDBConnected()) return [];
    try {
      const ContractModel = await getContractModel();
      const query: any = {};

      if (filters.landlordId) {
        query.landlordId = filters.landlordId;
      }
      if (filters.tenantId) {
        query.tenantId = filters.tenantId;
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.propertyId) {
        query.propertyId = filters.propertyId;
      }

      const contracts = await ContractModel.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100)
        .skip(filters.offset || 0)
        .exec();

      return contracts.map((c: ContractDocument) => this.mapContractToSchema(c));
    } catch (error) {
      console.error('[MongoDB] Error getting contracts:', error);
      return [];
    }
  }

  async updateContract(id: string, updates: Partial<Contract>): Promise<Contract | null> {
    this.checkConnection();
    try {
      const ContractModel = await getContractModel();
      const updateData: any = { ...updates, updatedAt: new Date() };
      
      // Convert decimal fields to strings if present
      if (updates.monthlyRent !== undefined) {
        updateData.monthlyRent = updates.monthlyRent.toString();
      }
      if (updates.securityDeposit !== undefined) {
        updateData.securityDeposit = updates.securityDeposit.toString();
      }

      const contract = await ContractModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
      
      if (!contract) return null;
      return this.mapContractToSchema(contract);
    } catch (error) {
      console.error('[MongoDB] Error updating contract:', error);
      throw error;
    }
  }

  async deleteContract(id: string): Promise<void> {
    this.checkConnection();
    try {
      const ContractModel = await getContractModel();
      await ContractModel.findByIdAndDelete(id);
    } catch (error) {
      console.error('[MongoDB] Error deleting contract:', error);
      throw error;
    }
  }

  // Helper methods to map MongoDB documents to schema types
  private mapPropertyToSchema(property: PropertyDocument): Property {
    return {
      id: property._id.toString(),
      landlordId: property.landlordId,
      title: property.title,
      description: property.description || null,
      address: property.address,
      city: property.city,
      area: property.area,
      propertyType: property.propertyType as any,
      bedrooms: property.bedrooms || null,
      bathrooms: property.bathrooms || null,
      sqft: property.sqft || null,
      monthlyRent: property.monthlyRent,
      securityDeposit: property.securityDeposit || null,
      amenities: property.amenities || null,
      images: property.images || null,
      isAvailable: property.isAvailable,
      aiSuggestedPrice: property.aiSuggestedPrice || null,
      createdAt: property.createdAt || new Date(),
      updatedAt: property.updatedAt || new Date(),
    };
  }

  private mapDocumentToSchema(document: DocumentDocument): Document {
    return {
      id: document._id.toString(),
      userId: document.userId,
      propertyId: document.propertyId || null,
      contractId: document.contractId || null,
      type: document.type,
      fileName: document.fileName,
      filePath: document.filePath,
      fileSize: document.fileSize || null,
      mimeType: document.mimeType || null,
      isVerified: document.isVerified,
      createdAt: document.createdAt || new Date(),
    };
  }

  private mapContractToSchema(contract: ContractDocument): Contract {
    return {
      id: contract._id.toString(),
      propertyId: contract.propertyId,
      landlordId: contract.landlordId,
      tenantId: contract.tenantId,
      monthlyRent: contract.monthlyRent as any,
      securityDeposit: contract.securityDeposit as any,
      startDate: contract.startDate || new Date(),
      endDate: contract.endDate || new Date(),
      terms: contract.terms || null,
      status: contract.status as any,
      blockchainHash: contract.blockchainHash || null,
      digitalSignature: contract.digitalSignature || null,
      createdAt: contract.createdAt || new Date(),
      updatedAt: contract.updatedAt || new Date(),
    };
  }
}

export const mongoDBStorage = new MongoDBStorage();

