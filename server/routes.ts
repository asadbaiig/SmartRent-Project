import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { z } from "zod";
import { insertUserSchema, insertPropertySchema, insertContractSchema, insertPaymentSchema, insertDocumentSchema, insertDisputeSchema } from "@shared/schema";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
  file?: Express.Multer.File;
}

const upload = multer({ dest: 'uploads/' });
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Role-based middleware
const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user!.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          fullName: user.fullName, 
          role: user.role,
          verificationStatus: user.verificationStatus 
        }, 
        token 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          fullName: user.fullName, 
          role: user.role,
          verificationStatus: user.verificationStatus 
        }, 
        token 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        id: user.id, 
        email: user.email, 
        fullName: user.fullName, 
        role: user.role,
        verificationStatus: user.verificationStatus,
        phone: user.phone,
        cnicNumber: user.cnicNumber,
        profileImage: user.profileImage
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Properties routes
  app.get("/api/properties", async (req: Request, res: Response) => {
    try {
      const { city, propertyType, minRent, maxRent, bedrooms, limit = 20, offset = 0 } = req.query;
      
      const filters = {
        city: city as string,
        propertyType: propertyType as string,
        minRent: minRent ? Number(minRent) : undefined,
        maxRent: maxRent ? Number(maxRent) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        isAvailable: true,
        limit: Number(limit),
        offset: Number(offset),
      };

      const properties = await storage.getProperties(filters);
      res.json(properties);
    } catch (error) {
      console.error("Get properties error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/properties/:id", async (req: Request, res: Response) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Get property error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/properties", authenticateToken, requireRole(['landlord']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertPropertySchema.parse({
        ...req.body,
        landlordId: req.user!.userId,
      });
      
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      console.error("Create property error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  app.put("/api/properties/:id", authenticateToken, requireRole(['landlord']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property || property.landlordId !== req.user!.userId) {
        return res.status(404).json({ message: "Property not found" });
      }

      const updatedProperty = await storage.updateProperty(req.params.id, req.body);
      res.json(updatedProperty);
    } catch (error) {
      console.error("Update property error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  app.delete("/api/properties/:id", authenticateToken, requireRole(['landlord']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property || property.landlordId !== req.user!.userId) {
        return res.status(404).json({ message: "Property not found" });
      }

      await storage.deleteProperty(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete property error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Contracts routes
  app.get("/api/contracts", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filters: any = {};
      
      if (req.user!.role === 'landlord') {
        filters.landlordId = req.user!.userId;
      } else if (req.user!.role === 'tenant') {
        filters.tenantId = req.user!.userId;
      }
      
      const contracts = await storage.getContracts(filters);
      res.json(contracts);
    } catch (error) {
      console.error("Get contracts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/contracts", authenticateToken, requireRole(['landlord']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertContractSchema.parse({
        ...req.body,
        landlordId: req.user!.userId,
      });
      
      const contract = await storage.createContract(validatedData);
      res.status(201).json(contract);
    } catch (error) {
      console.error("Create contract error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  app.put("/api/contracts/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Check permissions
      if (req.user!.role !== 'admin' && 
          contract.landlordId !== req.user!.userId && 
          contract.tenantId !== req.user!.userId) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const updatedContract = await storage.updateContract(req.params.id, req.body);
      res.json(updatedContract);
    } catch (error) {
      console.error("Update contract error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  // Payments routes
  app.get("/api/payments", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filters: any = {};
      
      if (req.user!.role === 'landlord') {
        filters.landlordId = req.user!.userId;
      } else if (req.user!.role === 'tenant') {
        filters.tenantId = req.user!.userId;
      }
      
      const payments = await storage.getPayments(filters);
      res.json(payments);
    } catch (error) {
      console.error("Get payments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/payments", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  app.put("/api/payments/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const updatedPayment = await storage.updatePayment(req.params.id, req.body);
      res.json(updatedPayment);
    } catch (error) {
      console.error("Update payment error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  // Documents routes
  app.post("/api/documents", authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const documentData = {
        userId: req.user!.userId,
        type: req.body.type,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        propertyId: req.body.propertyId || null,
        contractId: req.body.contractId || null,
      };

      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Upload document error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/documents", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filters: any = {};
      
      if (req.user!.role !== 'admin') {
        filters.userId = req.user!.userId;
      }
      
      const documents = await storage.getDocuments(filters);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      // This would need a getAllUsers method in storage
      res.json([]);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/users/:id/verification", authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.body;
      const user = await storage.updateUserVerificationStatus(req.params.id, status);
      res.json(user);
    } catch (error) {
      console.error("Update verification error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  // Dashboard stats routes
  app.get("/api/dashboard/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      let stats;
      
      if (req.user!.role === 'landlord') {
        stats = await storage.getLandlordStats(req.user!.userId);
      } else if (req.user!.role === 'tenant') {
        stats = await storage.getTenantStats(req.user!.userId);
      } else if (req.user!.role === 'admin') {
        stats = await storage.getAdminStats();
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Disputes routes
  app.get("/api/disputes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filters: any = {};
      
      if (req.user!.role !== 'admin') {
        filters.raisedBy = req.user!.userId;
      }
      
      const disputes = await storage.getDisputes(filters);
      res.json(disputes);
    } catch (error) {
      console.error("Get disputes error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/disputes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertDisputeSchema.parse({
        ...req.body,
        raisedBy: req.user!.userId,
      });
      
      const dispute = await storage.createDispute(validatedData);
      res.status(201).json(dispute);
    } catch (error) {
      console.error("Create dispute error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
