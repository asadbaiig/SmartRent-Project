import type { Property, InsertProperty, Document, InsertDocument, Dispute, InsertDispute, Contract, InsertContract, AuditLog } from '@shared/schema';

// Dynamic imports to handle mongoose
let PropertyModel: any;
let DocumentModel: any;
let DisputeModel: any;
let ContractModel: any;
let NotificationModel: any;
let AuditLogModel: any;
let modelsInitialized = false;

export async function getPropertyModel() {
  if (!modelsInitialized) {
    await initializeModels();
  }
  return PropertyModel;
}

export async function getDocumentModel() {
  if (!modelsInitialized) {
    await initializeModels();
  }
  return DocumentModel;
}

export async function getDisputeModel() {
  if (!modelsInitialized) {
    await initializeModels();
  }
  return DisputeModel;
}

export async function getContractModel() {
  if (!modelsInitialized) {
    await initializeModels();
  }
  return ContractModel;
}

export async function getNotificationModel() {
  if (!modelsInitialized) {
    await initializeModels();
  }
  return NotificationModel;
}

export async function getAuditLogModel() {
  if (!modelsInitialized) {
    await initializeModels();
  }
  return AuditLogModel;
}

async function initializeModels() {
  if (modelsInitialized) return;
  
  try {
    const mongoose = (await import('mongoose')).default;
    const { Schema } = mongoose;

    // Property Schema
    const PropertySchema = new Schema({
      landlordId: { type: String, required: true, index: true },
      title: { type: String, required: true },
      description: { type: String },
      address: { type: String, required: true },
      city: { type: String, required: true, index: true },
      area: { type: String, required: true },
      propertyType: { 
        type: String, 
        required: true, 
        enum: ['apartment', 'house', 'commercial', 'office'],
        index: true 
      },
      bedrooms: { type: Number },
      bathrooms: { type: Number },
      sqft: { type: Number },
      monthlyRent: { type: String, required: true },
      securityDeposit: { type: String },
      amenities: { type: [String] },
      images: { type: [String] },
      isAvailable: { type: Boolean, required: true, default: true, index: true },
      approvalStatus: {
        type: String,
        required: true,
        default: 'pending_review',
        enum: ['pending_review', 'approved', 'rejected'],
        index: true
      },
      approvalNotes: { type: String },
      approvedBy: { type: String, index: true },
      approvedAt: { type: Date },
      aiSuggestedPrice: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }, {
      timestamps: false
    });

    // Create indexes
    PropertySchema.index({ city: 1, propertyType: 1, isAvailable: 1, approvalStatus: 1 });
    PropertySchema.index({ landlordId: 1, createdAt: -1 });
    PropertySchema.index({ isAvailable: 1, createdAt: -1 });

    PropertyModel = mongoose.models.Property || mongoose.model('Property', PropertySchema);

    // Document Schema
    const DocumentSchema = new Schema({
      userId: { type: String, required: true, index: true },
      propertyId: { type: String },
      contractId: { type: String },
      type: { type: String, required: true },
      fileName: { type: String, required: true },
      filePath: { type: String, required: true },
      fileSize: { type: Number },
      mimeType: { type: String },
      isVerified: { type: Boolean, required: true, default: false },
      createdAt: { type: Date, default: Date.now }
    }, {
      timestamps: false
    });

    // Create indexes
    DocumentSchema.index({ userId: 1, createdAt: -1 });
    DocumentSchema.index({ propertyId: 1 });
    DocumentSchema.index({ contractId: 1 });

    DocumentModel = mongoose.models.Document || mongoose.model('Document', DocumentSchema);

    // Dispute Schema
    const DisputeSchema = new Schema({
      contractId: { type: String, required: true, index: true },
      propertyId: { type: String, index: true },
      raisedBy: { type: String, required: true, index: true },
      againstUser: { type: String, required: true, index: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
      category: { type: String },
      status: { 
        type: String, 
        required: true, 
        default: 'open',
        enum: ['open', 'in_progress', 'awaiting_response', 'resolved', 'closed', 'rejected'],
        index: true 
      },
      resolution: { type: String },
      resolvedBy: { type: String, index: true },
      assignedAdmin: { type: String, index: true },
      resolvedAt: { type: Date },
      evidence: [{
        fileName: { type: String, required: true },
        filePath: { type: String, required: true },
        fileSize: { type: Number },
        mimeType: { type: String },
        uploadedBy: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
      }],
      messages: [{
        senderId: { type: String, required: true },
        senderName: { type: String, required: true },
        senderRole: { type: String, required: true },
        message: { type: String, required: true },
        attachments: [{
          fileName: { type: String, required: true },
          filePath: { type: String, required: true },
          fileSize: { type: Number },
          mimeType: { type: String }
        }],
        createdAt: { type: Date, default: Date.now }
      }],
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }, {
      timestamps: false
    });

    // Create indexes
    DisputeSchema.index({ raisedBy: 1, createdAt: -1 });
    DisputeSchema.index({ againstUser: 1, createdAt: -1 });

    DisputeSchema.index({ status: 1, createdAt: -1 });
    DisputeSchema.index({ assignedAdmin: 1, status: 1 });

    DisputeModel = mongoose.models.Dispute || mongoose.model('Dispute', DisputeSchema);

    // Contract Schema
    const ContractSchema = new Schema({
      propertyId: { type: String, required: true },
      landlordId: { type: String, required: true, index: true },
      tenantId: { type: String, required: true, index: true },
      monthlyRent: { type: String, required: true },
      securityDeposit: { type: String, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      terms: { type: Schema.Types.Mixed }, // JSON object
      status: { 
        type: String, 
        required: true, 
        default: 'draft',
        enum: ['draft', 'active', 'expired', 'terminated']
      },
      blockchainHash: { type: String },
      digitalSignature: { type: Schema.Types.Mixed }, // JSON object
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }, {
      timestamps: false
    });

    // Create indexes
    ContractSchema.index({ landlordId: 1, createdAt: -1 });
    ContractSchema.index({ tenantId: 1, createdAt: -1 });
    ContractSchema.index({ propertyId: 1 });
    ContractSchema.index({ status: 1, createdAt: -1 });

    ContractModel = mongoose.models.Contract || mongoose.model('Contract', ContractSchema);

    // Notification Schema
    const NotificationSchema = new Schema({
      userId: { type: String, required: true, index: true },
      type: {
        type: String,
        required: true,
        enum: ['contract_modified', 'contract_created', 'contract_terminated', 'contract_status_changed', 'property_approval', 'general'],
      },
      title: { type: String, required: true },
      message: { type: String, required: true },
      contractId: { type: String, index: true },
      propertyId: { type: String, index: true },
      blockchainHash: { type: String },
      isRead: { type: Boolean, default: false, index: true },
      createdAt: { type: Date, default: Date.now },
    }, {
      timestamps: false
    });

    NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

    NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

    // Audit Log Schema
    const AuditLogSchema = new Schema({
      actorId: { type: String, index: true },
      actorRole: { type: String },
      action: { type: String, required: true, index: true },
      entityType: { type: String, required: true, index: true },
      entityId: { type: String, required: true, index: true },
      summary: { type: String, required: true },
      metadata: { type: Schema.Types.Mixed },
      createdAt: { type: Date, default: Date.now, index: true }
    }, {
      timestamps: false
    });

    AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
    AuditLogSchema.index({ actorId: 1, createdAt: -1 });

    AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

    modelsInitialized = true;
  } catch (error) {
    console.error('[MongoDB] Error initializing models:', error);
    throw error;
  }
}

// Export interfaces for TypeScript
export interface PropertyDocument extends Omit<Property, 'id'> {
  _id: any;
}

export interface DocumentDocument extends Omit<Document, 'id'> {
  _id: any;
}

export interface DisputeDocument extends Omit<Dispute, 'id' | 'evidence'> {
  _id: any;
  messages?: Array<{
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
    createdAt: Date;
  }>;
  evidence?: Array<{
    fileName: string;
    filePath: string;
    fileSize?: number;
    mimeType?: string;
    uploadedBy: string;
    uploadedAt: Date;
  }>;
}

export interface ContractDocument extends Omit<Contract, 'id'> {
  _id: any;
}

export interface NotificationDocument {
  _id: any;
  userId: string;
  type: string;
  title: string;
  message: string;
  contractId?: string;
  propertyId?: string;
  blockchainHash?: string;
  isRead: boolean;
  createdAt: Date;
}

export interface AuditLogDocument extends Omit<AuditLog, 'id'> {
  _id: any;
}
