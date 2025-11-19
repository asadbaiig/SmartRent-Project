import { getDisputeModel, type DisputeDocument } from './mongodb-models';
import { isMongoDBConnected } from './mongodb';
import type { Dispute, InsertDispute } from '@shared/schema';

export class MongoDBDisputeStorage {
  private checkConnection(): void {
    if (!isMongoDBConnected()) {
      throw new Error('MongoDB is not connected. Please set up MongoDB and restart the server.');
    }
  }

  // Dispute operations
  async createDispute(disputeData: InsertDispute & { propertyId?: string; category?: string }): Promise<Dispute & { messages?: any[]; evidence?: any[] }> {
    this.checkConnection();
    const DisputeModel = await getDisputeModel();
    const dispute = new DisputeModel({
      ...disputeData,
      status: 'open',
      evidence: [],
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const saved = await dispute.save();
    return this.mapDisputeToSchema(saved);
  }

  async getDispute(id: string): Promise<(Dispute & { messages?: any[]; evidence?: any[] }) | null> {
    if (!isMongoDBConnected()) return null;
    try {
      const DisputeModel = await getDisputeModel();
      const dispute = await DisputeModel.findById(id);
      if (!dispute) return null;
      return this.mapDisputeToSchema(dispute);
    } catch (error) {
      console.error('[MongoDB] Error getting dispute:', error);
      return null;
    }
  }

  async getDisputes(filters: any = {}): Promise<(Dispute & { messages?: any[]; evidence?: any[] })[]> {
    if (!isMongoDBConnected()) return [];
    try {
      const DisputeModel = await getDisputeModel();
      const query: any = {};

      if (filters.raisedBy) {
        query.raisedBy = filters.raisedBy;
      }
      if (filters.againstUser) {
        query.againstUser = filters.againstUser;
      }
      if (filters.contractId) {
        query.contractId = filters.contractId;
      }
      if (filters.propertyId) {
        query.propertyId = filters.propertyId;
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.assignedAdmin) {
        query.assignedAdmin = filters.assignedAdmin;
      }

      // If user is tenant or landlord, show disputes where they are involved
      if (filters.userId && !filters.raisedBy && !filters.againstUser) {
        query.$or = [
          { raisedBy: filters.userId },
          { againstUser: filters.userId }
        ];
      }

      let mongoQuery = DisputeModel.find(query);

      // Sort by creation date (newest first)
      mongoQuery = mongoQuery.sort({ updatedAt: -1 });

      // Apply pagination
      if (filters.offset) {
        mongoQuery = mongoQuery.skip(filters.offset);
      }
      if (filters.limit) {
        mongoQuery = mongoQuery.limit(filters.limit);
      }

      const disputes = await mongoQuery.exec();
      return disputes.map(d => this.mapDisputeToSchema(d));
    } catch (error) {
      console.error('[MongoDB] Error getting disputes:', error);
      return [];
    }
  }

  async updateDispute(id: string, updates: Partial<Dispute>): Promise<(Dispute & { messages?: any[]; evidence?: any[] }) | null> {
    this.checkConnection();
    try {
      const DisputeModel = await getDisputeModel();
      const dispute = await DisputeModel.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true }
      );
      
      if (!dispute) return null;
      return this.mapDisputeToSchema(dispute);
    } catch (error) {
      console.error('[MongoDB] Error updating dispute:', error);
      return null;
    }
  }

  async addMessage(disputeId: string, message: {
    senderId: string;
    senderName: string;
    senderRole: string;
    message: string;
    attachments?: Array<{
      fileName: string;
      filePath: string;
      fileSize?: number;
      mimeType?: string;
    }>;
  }): Promise<(Dispute & { messages?: any[]; evidence?: any[] }) | null> {
    this.checkConnection();
    try {
      const DisputeModel = await getDisputeModel();
      const dispute = await DisputeModel.findByIdAndUpdate(
        disputeId,
        {
          $push: {
            messages: {
              ...message,
              createdAt: new Date()
            }
          },
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!dispute) return null;
      return this.mapDisputeToSchema(dispute);
    } catch (error) {
      console.error('[MongoDB] Error adding message:', error);
      return null;
    }
  }

  async addEvidence(disputeId: string, evidence: {
    fileName: string;
    filePath: string;
    fileSize?: number;
    mimeType?: string;
    uploadedBy: string;
  }): Promise<(Dispute & { messages?: any[]; evidence?: any[] }) | null> {
    this.checkConnection();
    try {
      const DisputeModel = await getDisputeModel();
      const dispute = await DisputeModel.findByIdAndUpdate(
        disputeId,
        {
          $push: {
            evidence: {
              ...evidence,
              uploadedAt: new Date()
            }
          },
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!dispute) return null;
      return this.mapDisputeToSchema(dispute);
    } catch (error) {
      console.error('[MongoDB] Error adding evidence:', error);
      return null;
    }
  }

  async deleteDispute(id: string): Promise<void> {
    this.checkConnection();
    try {
      const DisputeModel = await getDisputeModel();
      await DisputeModel.findByIdAndDelete(id);
    } catch (error) {
      console.error('[MongoDB] Error deleting dispute:', error);
      throw error;
    }
  }

  // Helper method to map MongoDB document to schema type
  private mapDisputeToSchema(dispute: DisputeDocument): Dispute & { messages?: any[]; evidence?: any[] } {
    return {
      id: dispute._id.toString(),
      contractId: dispute.contractId,
      raisedBy: dispute.raisedBy,
      againstUser: dispute.againstUser,
      title: dispute.title,
      description: dispute.description,
      status: dispute.status as any,
      resolution: dispute.resolution || null,
      resolvedBy: (dispute as any).resolvedBy || null,
      resolvedAt: (dispute as any).resolvedAt || null,
      evidence: (dispute as any).evidence ? JSON.parse(JSON.stringify((dispute as any).evidence)) : null,
      createdAt: dispute.createdAt || new Date(),
      updatedAt: (dispute as any).updatedAt || new Date(),
      messages: (dispute as any).messages ? JSON.parse(JSON.stringify((dispute as any).messages)) : [],
      // Additional fields for extended dispute schema
      ...((dispute as any).propertyId && { propertyId: (dispute as any).propertyId }),
      ...((dispute as any).category && { category: (dispute as any).category }),
      ...((dispute as any).assignedAdmin && { assignedAdmin: (dispute as any).assignedAdmin }),
    } as Dispute & { messages?: any[]; evidence?: any[]; propertyId?: string; category?: string; assignedAdmin?: string };
  }
}

export const mongoDBDisputeStorage = new MongoDBDisputeStorage();
















