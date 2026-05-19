import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["landlord", "tenant", "admin"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "verified", "rejected"]);
export const propertyApprovalStatusEnum = pgEnum("property_approval_status", ["pending_review", "approved", "rejected"]);
export const propertyTypeEnum = pgEnum("property_type", ["apartment", "house", "commercial", "office"]);
export const contractStatusEnum = pgEnum("contract_status", ["draft", "active", "expired", "terminated"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "overdue", "failed"]);
export const disputeStatusEnum = pgEnum("dispute_status", ["open", "in_progress", "resolved", "closed"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("tenant"),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
  cnicNumber: text("cnic_number"),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Properties table
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landlordId: varchar("landlord_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  area: text("area").notNull(),
  propertyType: propertyTypeEnum("property_type").notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  sqft: integer("sqft"),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  securityDeposit: decimal("security_deposit", { precision: 10, scale: 2 }),
  amenities: jsonb("amenities"),
  images: jsonb("images"),
  isAvailable: boolean("is_available").notNull().default(true),
  approvalStatus: propertyApprovalStatusEnum("approval_status").notNull().default("pending_review"),
  approvalNotes: text("approval_notes"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  aiSuggestedPrice: decimal("ai_suggested_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").references(() => users.id),
  actorRole: text("actor_role"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  summary: text("summary").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Contracts table
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  landlordId: varchar("landlord_id").notNull().references(() => users.id),
  tenantId: varchar("tenant_id").notNull().references(() => users.id),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  securityDeposit: decimal("security_deposit", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  terms: jsonb("terms"),
  status: contractStatusEnum("status").notNull().default("draft"),
  blockchainHash: text("blockchain_hash"),
  digitalSignature: jsonb("digital_signature"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => contracts.id),
  tenantId: varchar("tenant_id").notNull().references(() => users.id),
  landlordId: varchar("landlord_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  propertyId: varchar("property_id").references(() => properties.id),
  contractId: varchar("contract_id").references(() => contracts.id),
  type: text("type").notNull(), // cnic_front, cnic_back, bank_statement, etc.
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Disputes table
export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => contracts.id),
  raisedBy: varchar("raised_by").notNull().references(() => users.id),
  againstUser: varchar("against_user").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: disputeStatusEnum("status").notNull().default("open"),
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  evidence: jsonb("evidence"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Reviews table
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => contracts.id),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  revieweeId: varchar("reviewee_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  categories: jsonb("categories"), // {cleanliness: 5, communication: 4, etc}
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedProperties: many(properties),
  landlordContracts: many(contracts, { relationName: "landlord" }),
  tenantContracts: many(contracts, { relationName: "tenant" }),
  payments: many(payments),
  documents: many(documents),
  raisedDisputes: many(disputes, { relationName: "raisedBy" }),
  disputesAgainst: many(disputes, { relationName: "againstUser" }),
  givenReviews: many(reviews, { relationName: "reviewer" }),
  receivedReviews: many(reviews, { relationName: "reviewee" }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  landlord: one(users, {
    fields: [properties.landlordId],
    references: [users.id],
  }),
  contracts: many(contracts),
  documents: many(documents),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  property: one(properties, {
    fields: [contracts.propertyId],
    references: [properties.id],
  }),
  landlord: one(users, {
    fields: [contracts.landlordId],
    references: [users.id],
    relationName: "landlord",
  }),
  tenant: one(users, {
    fields: [contracts.tenantId],
    references: [users.id],
    relationName: "tenant",
  }),
  payments: many(payments),
  documents: many(documents),
  disputes: many(disputes),
  reviews: many(reviews),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  contract: one(contracts, {
    fields: [payments.contractId],
    references: [contracts.id],
  }),
  tenant: one(users, {
    fields: [payments.tenantId],
    references: [users.id],
  }),
  landlord: one(users, {
    fields: [payments.landlordId],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [documents.propertyId],
    references: [properties.id],
  }),
  contract: one(contracts, {
    fields: [documents.contractId],
    references: [contracts.id],
  }),
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  contract: one(contracts, {
    fields: [disputes.contractId],
    references: [contracts.id],
  }),
  raisedByUser: one(users, {
    fields: [disputes.raisedBy],
    references: [users.id],
    relationName: "raisedBy",
  }),
  againstUser: one(users, {
    fields: [disputes.againstUser],
    references: [users.id],
    relationName: "againstUser",
  }),
  resolvedByUser: one(users, {
    fields: [disputes.resolvedBy],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  contract: one(contracts, {
    fields: [reviews.contractId],
    references: [contracts.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: "reviewer",
  }),
  reviewee: one(users, {
    fields: [reviews.revieweeId],
    references: [users.id],
    relationName: "reviewee",
  }),
}));

// Insert schemas
const createTypedInsertSchema = (table: Parameters<typeof createInsertSchema>[0]) =>
  createInsertSchema(table) as z.ZodObject<any>;

export const insertUserSchema = createTypedInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createTypedInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Create schema without date requirements - dates will be handled in storage layer
export const insertContractSchema = createTypedInsertSchema(contracts)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    startDate: true,
    endDate: true,
  })
  .extend({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    duration: z.union([z.number(), z.string()]).optional(),
  });

const basePaymentSchema = createTypedInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = basePaymentSchema.merge(
  z.object({
    dueDate: z.coerce.date(),
    paidDate: z.coerce.date().optional(),
  })
);

export const insertDocumentSchema = createTypedInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertDisputeSchema = createTypedInsertSchema(disputes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createTypedInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createTypedInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = Partial<Omit<User, "id" | "createdAt" | "updatedAt">> & Pick<User, "email" | "password" | "fullName">;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = Partial<Omit<Property, "id" | "createdAt" | "updatedAt">> &
  Pick<Property, "landlordId" | "title" | "address" | "city" | "area" | "propertyType" | "monthlyRent">;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = Partial<Omit<Contract, "id" | "createdAt" | "updatedAt" | "startDate" | "endDate">> &
  Pick<Contract, "propertyId" | "landlordId" | "tenantId" | "monthlyRent" | "securityDeposit"> & {
  startDate?: Date;
  endDate?: Date;
  duration?: number | string;
};
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = Partial<Omit<Payment, "id" | "createdAt" | "updatedAt" | "dueDate" | "paidDate">> &
  Pick<Payment, "landlordId" | "tenantId" | "contractId" | "amount"> & {
  dueDate: Date;
  paidDate?: Date;
};
export type Document = typeof documents.$inferSelect;
export type InsertDocument = Partial<Omit<Document, "id" | "createdAt">> &
  Pick<Document, "userId" | "type" | "fileName" | "filePath">;
export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = Partial<Omit<Dispute, "id" | "createdAt" | "updatedAt">> &
  Pick<Dispute, "contractId" | "raisedBy" | "againstUser" | "title" | "description">;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = Partial<Omit<Review, "id" | "createdAt">> &
  Pick<Review, "contractId" | "reviewerId" | "revieweeId" | "rating">;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = Partial<Omit<AuditLog, "id" | "createdAt">> &
  Pick<AuditLog, "action" | "entityType" | "entityId" | "summary">;
