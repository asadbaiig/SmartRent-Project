import { 
  users, properties, contracts, payments, documents, disputes, reviews,
  type User, type InsertUser, 
  type Property, type InsertProperty,
  type Contract, type InsertContract,
  type Payment, type InsertPayment,
  type Document, type InsertDocument,
  type Dispute, type InsertDispute,
  type Review, type InsertReview
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, like, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  updateUserVerificationStatus(id: string, status: "pending" | "verified" | "rejected"): Promise<User>;
  
  // Property methods
  getProperties(filters?: {
    city?: string;
    propertyType?: string;
    minRent?: number;
    maxRent?: number;
    bedrooms?: number;
    isAvailable?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  getPropertiesByLandlord(landlordId: string): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property>;
  deleteProperty(id: string): Promise<void>;
  
  // Contract methods
  getContracts(filters?: {
    landlordId?: string;
    tenantId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Contract[]>;
  getContract(id: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, updates: Partial<InsertContract>): Promise<Contract>;
  
  // Payment methods
  getPayments(filters?: {
    contractId?: string;
    tenantId?: string;
    landlordId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment>;
  
  // Document methods
  getDocuments(filters?: {
    userId?: string;
    propertyId?: string;
    contractId?: string;
    type?: string;
  }): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document>;
  
  // Dispute methods
  getDisputes(filters?: {
    contractId?: string;
    raisedBy?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Dispute[]>;
  getDispute(id: string): Promise<Dispute | undefined>;
  createDispute(dispute: InsertDispute): Promise<Dispute>;
  updateDispute(id: string, updates: Partial<InsertDispute>): Promise<Dispute>;
  
  // Review methods
  getReviews(filters?: {
    contractId?: string;
    reviewerId?: string;
    revieweeId?: string;
  }): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  // Dashboard stats
  getLandlordStats(landlordId: string): Promise<{
    totalProperties: number;
    activeContracts: number;
    monthlyRevenue: number;
    pendingVerifications: number;
  }>;
  getTenantStats(tenantId: string): Promise<{
    currentRent: number;
    contractStatus: string;
    nextPaymentDate: Date | null;
    savedProperties: number;
  }>;
  getAdminStats(): Promise<{
    totalUsers: number;
    pendingVerifications: number;
    activeContracts: number;
    openDisputes: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserVerificationStatus(id: string, status: "pending" | "verified" | "rejected"): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ verificationStatus: status, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Property methods
  async getProperties(filters?: {
    city?: string;
    propertyType?: string;
    minRent?: number;
    maxRent?: number;
    bedrooms?: number;
    isAvailable?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Property[]> {
    let query = db.select().from(properties);
    
    const conditions = [];
    
    if (filters?.city) {
      conditions.push(like(properties.city, `%${filters.city}%`));
    }
    if (filters?.propertyType) {
      conditions.push(eq(properties.propertyType, filters.propertyType as any));
    }
    if (filters?.minRent) {
      conditions.push(gte(properties.monthlyRent, filters.minRent.toString()));
    }
    if (filters?.maxRent) {
      conditions.push(lte(properties.monthlyRent, filters.maxRent.toString()));
    }
    if (filters?.bedrooms) {
      conditions.push(eq(properties.bedrooms, filters.bedrooms));
    }
    if (filters?.isAvailable !== undefined) {
      conditions.push(eq(properties.isAvailable, filters.isAvailable));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(properties.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || undefined;
  }

  async getPropertiesByLandlord(landlordId: string): Promise<Property[]> {
    return await db.select().from(properties)
      .where(eq(properties.landlordId, landlordId))
      .orderBy(desc(properties.createdAt));
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [newProperty] = await db
      .insert(properties)
      .values(property)
      .returning();
    return newProperty;
  }

  async updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property> {
    const [property] = await db
      .update(properties)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return property;
  }

  async deleteProperty(id: string): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  // Contract methods
  async getContracts(filters?: {
    landlordId?: string;
    tenantId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Contract[]> {
    let query = db.select().from(contracts);
    
    const conditions = [];
    
    if (filters?.landlordId) {
      conditions.push(eq(contracts.landlordId, filters.landlordId));
    }
    if (filters?.tenantId) {
      conditions.push(eq(contracts.tenantId, filters.tenantId));
    }
    if (filters?.status) {
      conditions.push(eq(contracts.status, filters.status as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(contracts.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
  }

  async getContract(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract || undefined;
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db
      .insert(contracts)
      .values(contract)
      .returning();
    return newContract;
  }

  async updateContract(id: string, updates: Partial<InsertContract>): Promise<Contract> {
    const [contract] = await db
      .update(contracts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return contract;
  }

  // Payment methods
  async getPayments(filters?: {
    contractId?: string;
    tenantId?: string;
    landlordId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Payment[]> {
    let query = db.select().from(payments);
    
    const conditions = [];
    
    if (filters?.contractId) {
      conditions.push(eq(payments.contractId, filters.contractId));
    }
    if (filters?.tenantId) {
      conditions.push(eq(payments.tenantId, filters.tenantId));
    }
    if (filters?.landlordId) {
      conditions.push(eq(payments.landlordId, filters.landlordId));
    }
    if (filters?.status) {
      conditions.push(eq(payments.status, filters.status as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(payments.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db
      .insert(payments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  // Document methods
  async getDocuments(filters?: {
    userId?: string;
    propertyId?: string;
    contractId?: string;
    type?: string;
  }): Promise<Document[]> {
    let query = db.select().from(documents);
    
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(documents.userId, filters.userId));
    }
    if (filters?.propertyId) {
      conditions.push(eq(documents.propertyId, filters.propertyId));
    }
    if (filters?.contractId) {
      conditions.push(eq(documents.contractId, filters.contractId));
    }
    if (filters?.type) {
      conditions.push(eq(documents.type, filters.type));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(documents.createdAt));
    
    return await query;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return newDocument;
  }

  async updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document> {
    const [document] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  // Dispute methods
  async getDisputes(filters?: {
    contractId?: string;
    raisedBy?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Dispute[]> {
    let query = db.select().from(disputes);
    
    const conditions = [];
    
    if (filters?.contractId) {
      conditions.push(eq(disputes.contractId, filters.contractId));
    }
    if (filters?.raisedBy) {
      conditions.push(eq(disputes.raisedBy, filters.raisedBy));
    }
    if (filters?.status) {
      conditions.push(eq(disputes.status, filters.status as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(disputes.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
  }

  async getDispute(id: string): Promise<Dispute | undefined> {
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, id));
    return dispute || undefined;
  }

  async createDispute(dispute: InsertDispute): Promise<Dispute> {
    const [newDispute] = await db
      .insert(disputes)
      .values(dispute)
      .returning();
    return newDispute;
  }

  async updateDispute(id: string, updates: Partial<InsertDispute>): Promise<Dispute> {
    const [dispute] = await db
      .update(disputes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(disputes.id, id))
      .returning();
    return dispute;
  }

  // Review methods
  async getReviews(filters?: {
    contractId?: string;
    reviewerId?: string;
    revieweeId?: string;
  }): Promise<Review[]> {
    let query = db.select().from(reviews);
    
    const conditions = [];
    
    if (filters?.contractId) {
      conditions.push(eq(reviews.contractId, filters.contractId));
    }
    if (filters?.reviewerId) {
      conditions.push(eq(reviews.reviewerId, filters.reviewerId));
    }
    if (filters?.revieweeId) {
      conditions.push(eq(reviews.revieweeId, filters.revieweeId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(reviews.createdAt));
    
    return await query;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db
      .insert(reviews)
      .values(review)
      .returning();
    return newReview;
  }

  // Dashboard stats
  async getLandlordStats(landlordId: string): Promise<{
    totalProperties: number;
    activeContracts: number;
    monthlyRevenue: number;
    pendingVerifications: number;
  }> {
    const [propertiesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(eq(properties.landlordId, landlordId));

    const [contractsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contracts)
      .where(and(eq(contracts.landlordId, landlordId), eq(contracts.status, "active")));

    const [revenueResult] = await db
      .select({ total: sql<number>`sum(cast(monthly_rent as decimal))` })
      .from(contracts)
      .where(and(eq(contracts.landlordId, landlordId), eq(contracts.status, "active")));

    const [pendingDocs] = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(and(eq(documents.userId, landlordId), eq(documents.isVerified, false)));

    return {
      totalProperties: propertiesCount.count || 0,
      activeContracts: contractsCount.count || 0,
      monthlyRevenue: revenueResult.total || 0,
      pendingVerifications: pendingDocs.count || 0,
    };
  }

  async getTenantStats(tenantId: string): Promise<{
    currentRent: number;
    contractStatus: string;
    nextPaymentDate: Date | null;
    savedProperties: number;
  }> {
    const [activeContract] = await db
      .select()
      .from(contracts)
      .where(and(eq(contracts.tenantId, tenantId), eq(contracts.status, "active")))
      .limit(1);

    const [nextPayment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), eq(payments.status, "pending")))
      .orderBy(asc(payments.dueDate))
      .limit(1);

    return {
      currentRent: activeContract ? Number(activeContract.monthlyRent) : 0,
      contractStatus: activeContract?.status || "none",
      nextPaymentDate: nextPayment?.dueDate || null,
      savedProperties: 0, // This would require a favorites/saved properties table
    };
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    pendingVerifications: number;
    activeContracts: number;
    openDisputes: number;
  }> {
    const [usersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [pendingVerifications] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.verificationStatus, "pending"));

    const [activeContracts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contracts)
      .where(eq(contracts.status, "active"));

    const [openDisputes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(disputes)
      .where(eq(disputes.status, "open"));

    return {
      totalUsers: usersCount.count || 0,
      pendingVerifications: pendingVerifications.count || 0,
      activeContracts: activeContracts.count || 0,
      openDisputes: openDisputes.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
