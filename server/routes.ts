import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { firebaseStorage } from "./firebase-storage";
import { mongoDBStorage } from "./mongodb-storage";
import { authenticateToken, requireRole, firebaseAuth, type AuthenticatedRequest } from "./firebase-auth";
import { isMongoDBConnected } from "./mongodb";
import { getNotificationModel } from "./mongodb-models";
import { blockchainService } from "./blockchain-service";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { insertUserSchema, insertPropertySchema, insertContractSchema, insertPaymentSchema, insertDocumentSchema, insertDisputeSchema } from "@shared/schema";

const upload = multer({ dest: 'uploads/' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwpkax3ma',
  api_key: process.env.CLOUDINARY_API_KEY || '921133431241869',
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const DOCUMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, 'application/pdf'];

async function cleanupTempFile(file?: Express.Multer.File) {
  if (file?.path) {
    await fs.unlink(file.path).catch(() => { });
  }
}

async function validateUploadedFile(
  file: Express.Multer.File,
  allowedMimeTypes: string[],
  maxSize: number,
  typeMessage: string,
) {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    await cleanupTempFile(file);
    throw new Error(typeMessage);
  }

  if (file.size > maxSize) {
    await cleanupTempFile(file);
    throw new Error(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
  }
}

async function uploadFileToCloudinary(file: Express.Multer.File, folder: string) {
  if (!process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET === '<your_api_secret>') {
    await cleanupTempFile(file);
    throw new Error('CLOUDINARY_API_SECRET is missing in .env');
  }

  try {
    return await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
    });
  } finally {
    await cleanupTempFile(file);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const getAIServiceUrl = () => {
    const aiServiceUrl = process.env.AI_SERVICE_URL;
    const aiServiceHostPort = process.env.AI_SERVICE_HOSTPORT;

    if (aiServiceUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(aiServiceUrl)) {
      return aiServiceUrl;
    }

    if (aiServiceHostPort) {
      return `http://${aiServiceHostPort}`;
    }

    return aiServiceUrl || "http://localhost:8000";
  };
  let datasetPropertiesCache: Promise<any[]> | null = null;

  // Helper: load properties from dataset folder (JSON or CSV)
  async function loadDatasetProperties(): Promise<any[]> {
    if (datasetPropertiesCache) {
      return datasetPropertiesCache;
    }

    datasetPropertiesCache = loadDatasetPropertiesFromDisk().catch((error) => {
      datasetPropertiesCache = null;
      throw error;
    });

    return datasetPropertiesCache;
  }

  async function loadDatasetPropertiesFromDisk(): Promise<any[]> {
    try {
      let datasetDir = path.resolve(process.cwd(), "server", "dataset");
      let entries: string[] = [];
      try {
        entries = await fs.readdir(datasetDir);
      } catch {
        // Fallback: use AI service dataset so "View matching properties" works without copying CSV
        datasetDir = path.resolve(process.cwd(), "ai-service", "dataset");
        try {
          entries = await fs.readdir(datasetDir);
        } catch {
          console.log("[Dataset] No server/dataset or ai-service/dataset folder");
          return [];
        }
        console.log("[Dataset] Using ai-service/dataset (server/dataset not found)");
      }
      console.log("[Dataset] Looking in:", datasetDir);
      console.log("[Dataset] Found files:", entries);
      const candidate = entries.find((f) => f.toLowerCase().endsWith(".json") || f.toLowerCase().endsWith(".csv"));
      if (!candidate) {
        console.log("[Dataset] No CSV/JSON file found");
        return [];
      }
      const fullPath = path.join(datasetDir, candidate);
      console.log("[Dataset] Reading file:", fullPath);
      const raw = await fs.readFile(fullPath, "utf-8");
      console.log("[Dataset] File size:", raw.length, "chars");
      let items: any[] = [];
      if (candidate.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(raw);
        items = Array.isArray(parsed) ? parsed : (parsed?.items || []);
      } else {
        // CSV: Load all lines efficiently without slicing to fetch all properties
        const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length === 0) return [];
        const splitCsv = (line: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (ch === ',' && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += ch;
            }
          }
          result.push(current.trim());
          return result;
        };
        const headers = splitCsv(lines[0]).map((h) => h.trim());
        console.log("[Dataset] CSV Headers:", headers.slice(0, 10), "...");
        console.log("[Dataset] Total lines to process:", lines.length);
        const headerIndex: Record<string, number> = {};
        headers.forEach((h, idx) => {
          headerIndex[h.toLowerCase()] = idx;
        });
        console.log("[Dataset] Agent column index:", headerIndex["agent"]);
        const getVal = (cols: string[], keys: string[], fallback?: any) => {
          for (const k of keys) {
            const idx = headerIndex[k.toLowerCase()];
            if (idx !== undefined && cols[idx] !== undefined && cols[idx] !== "") return cols[idx];
          }
          return fallback;
        };
        // Load all properties from CSV (removed the limit of 50 items)
        for (let i = 1; i < lines.length; i++) {
          const cols = splitCsv(lines[i]);
          const obj: any = {};
          headers.forEach((h, idx) => (obj[h] = cols[idx]));
          // Map your specific CSV columns
          const propertyId = getVal(cols, ["property_id", "id"], "");
          const city = getVal(cols, ["city"], "").trim(); // Trim whitespace from city
          const area = getVal(cols, ["location", "locality", "area"], "");
          const province = getVal(cols, ["province_name", "province"], "");
          const typeRaw = getVal(cols, ["property_type", "propertytype", "type"], "apartment");
          const type = typeRaw.toString().toLowerCase();
          const bedrooms = getVal(cols, ["bedrooms", "beds"], "");
          const bathrooms = getVal(cols, ["baths", "bathrooms"], "");
          const sqft = getVal(cols, ["area_sqft", "sqft", "size"], "");
          const priceRaw = getVal(cols, ["price"], "0");
          const purpose = (getVal(cols, ["purpose"], "") || "").toString().trim();
          const latitudeRaw = getVal(cols, ["latitude", "lat"], "");
          const longitudeRaw = getVal(cols, ["longitude", "lng", "long", "lon"], "");
          const parseCoordinate = (value: any) => {
            if (typeof value !== "string" && typeof value !== "number") return undefined;
            const numeric = typeof value === "number"
              ? value
              : parseFloat(value.toString().replace(/[^\d.-]/g, ""));
            return Number.isFinite(numeric) ? numeric : undefined;
          };
          const latitude = parseCoordinate(latitudeRaw);
          const longitude = parseCoordinate(longitudeRaw);
          const priceNum = parseFloat(priceRaw.toString().replace(/[^\d.]/g, "")) || 0;
          // If CSV has "For Rent" purpose, price is already monthly rent (matches AI training)
          const rent = priceNum > 0
            ? (purpose.toLowerCase() === "for rent" ? Math.round(priceNum).toString() : Math.round(priceNum / 240).toString())
            : "0";
          const address = getVal(cols, ["location", "locality"], "");
          const agent = getVal(cols, ["agent"], "");
          if (i === 1 && agent) {
            console.log("[Dataset] First property agent:", agent);
          }
          // When CSV has purpose column, only include "For Rent" so budget filter matches AI suggestions
          if (headerIndex["purpose"] !== undefined && purpose.toLowerCase() !== "for rent") continue;

          const title = `${type[0].toUpperCase()}${type.slice(1)}${bedrooms ? " " + bedrooms + " Bed" : ""}${area ? " in " + area : ""}${city ? ", " + city : ""}`.trim();
          const propertyObj: any = {
            id: propertyId || `ds-${i}`,
            title,
            address: address || area || city || "",
            city: city || "",
            area: area || "",
            propertyType: ["apartment", "house", "commercial", "office"].includes(type) ? type : "apartment",
            bedrooms: bedrooms ? Number(bedrooms) : undefined,
            bathrooms: bathrooms ? Number(bathrooms) : undefined,
            sqft: sqft ? Number(sqft) : undefined,
            monthlyRent: rent,
            description: `${type[0].toUpperCase()}${type.slice(1)} located in ${area || city || province || ""}`,
            latitude,
            longitude,
            coordinates: latitude !== undefined && longitude !== undefined ? { lat: latitude, lng: longitude } : undefined,
          };
          if (agent && agent.trim().length > 0) {
            propertyObj.agent = agent.trim();
          }
          items.push(propertyObj);
        }
        console.log("[Dataset] Parsed", items.length, "items from CSV");
      }
      // Generate property-specific images using local uploads folder
      const getPropertyImage = (property: any, index: number): string => {
        // Local images from uploads folder (1.jpeg through 12.jpeg)
        const localImages = [
          "1.jpeg",
          "2.jpeg",
          "3.jpeg",
          "4.jpeg",
          "5.jpeg",
          "6.jpeg",
          "7.jpeg",
          "8.jpeg",
          "9.jpeg",
          "10.jpeg",
          "11.jpeg",
          "12.jpeg"
        ];

        // For first 12 properties: assign unique images (no repeats)
        // After that: cycle through images based on property ID
        if (index < 12) {
          // First 12 properties get unique images in order
          const imageName = localImages[index];
          return `/uploads/${imageName}`;
        } else {
          // For properties beyond the first 12, use hash to cycle through images
          const propertyId = property.id || index.toString();
          const hash = propertyId.split("").reduce((acc: number, char: string) => {
            return acc + char.charCodeAt(0);
          }, 0);
          const imageIndex = hash % localImages.length;
          const imageName = localImages[imageIndex];
          return `/uploads/${imageName}`;
        }
      };

      // Fallback images - use local images as fallback too
      const imageByType: Record<string, string> = {
        apartment: "/uploads/1.jpeg",
        house: "/uploads/2.jpeg",
        commercial: "/uploads/3.jpeg",
        office: "/uploads/4.jpeg",
      };

      // Map all items so filters (city, type, budget) can find matches across the full dataset
      const mapped = items.map((p, idx) => {
        const propertyType = (p.propertyType || p.type || "apartment").toString().toLowerCase();
        const images = Array.isArray(p.images)
          ? p.images
          : (typeof p.images === "string" && p.images.length > 0 ? [p.images] : []);
        const extractCoordinate = (value: any) => {
          if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
          if (typeof value === "string") {
            const num = parseFloat(value.trim());
            return Number.isFinite(num) ? num : undefined;
          }
          return undefined;
        };
        const latitudeSource = p.latitude ?? p.lat ?? (p.coordinates ? (p.coordinates.lat ?? p.coordinates.latitude) : undefined);
        const longitudeSource = p.longitude ?? p.lng ?? p.lon ?? (p.coordinates ? (p.coordinates.lng ?? p.coordinates.longitude) : undefined);
        const latitude = extractCoordinate(latitudeSource);
        const longitude = extractCoordinate(longitudeSource);
        const coordinates = latitude !== undefined && longitude !== undefined ? { lat: latitude, lng: longitude } : undefined;

        // Generate property-specific image
        const propertyImage = getPropertyImage(p, idx);
        const fallbackImage = imageByType[propertyType] || imageByType["apartment"];
        return {
          id: p.id || `ds-${idx}`,
          title: p.title || `${(propertyType || "apartment")[0].toUpperCase()}${(propertyType || "apartment").slice(1)} in ${p.area || p.city || ""}`.trim(),
          description: p.description || "",
          address: p.address || "",
          city: p.city || "",
          area: p.area || "",
          propertyType,
          bedrooms: p.bedrooms ? Number(p.bedrooms) : undefined,
          bathrooms: p.bathrooms ? Number(p.bathrooms) : undefined,
          sqft: p.sqft ? Number(p.sqft) : undefined,
          monthlyRent: (p.monthlyRent ?? p.rent ?? "0").toString(),
          securityDeposit: p.securityDeposit ? p.securityDeposit.toString() : undefined,
          amenities: Array.isArray(p.amenities)
            ? p.amenities
            : (typeof p.amenities === "string" && p.amenities.includes(",") ? p.amenities.split(",").map((s: string) => s.trim()) : undefined),
          images: images.length > 0 ? images : [propertyImage, fallbackImage],
          isAvailable: ("isAvailable" in p) ? Boolean(p.isAvailable) : true,
          latitude,
          longitude,
          coordinates,
          ...(p.agent && p.agent.trim().length > 0 ? { agent: p.agent.trim() } : {}),
        };
      });
      console.log("[Dataset] Returning", mapped.length, "mapped properties");
      return mapped;
    } catch (error: any) {
      console.error("[Dataset] Error loading dataset:", error?.message || error);
      console.error("[Dataset] Stack:", error?.stack);
      return [];
    }
  }
  // Authentication routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body) as any;

      // Check if user exists
      try {
        const existingUser = await firebaseStorage.getUserByEmail(validatedData.email);
        if (existingUser) {
          return res.status(400).json({ message: "User already exists" });
        }
      } catch (e: any) {
        // If permission denied, we can't check existence; proceed to sign up
      }

      // Create user with Firebase Auth
      const { user, firebaseUser } = await firebaseAuth.signUp(
        validatedData.email,
        validatedData.password,
        {
          email: validatedData.email,
          fullName: validatedData.fullName,
          phone: validatedData.phone,
          role: validatedData.role,
          cnicNumber: validatedData.cnicNumber,
          profileImage: validatedData.profileImage
        }
      );

      const token = firebaseUser.uid; // simplified token; in production use Firebase ID token
      res.status(201).json({
        user: {
          id: user.uid,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          verificationStatus: user.verificationStatus,
        },
        token,
        message: "User registered successfully with Firebase Auth"
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if ((error.message || '').toLowerCase().includes('insufficient permissions')) {
        const v = req.body;
        const id = `demo-${Buffer.from(v.email || '').toString('hex').slice(0, 8)}`;
        return res.status(201).json({
          user: {
            id,
            email: v.email,
            fullName: v.fullName,
            role: v.role || 'tenant',
            verificationStatus: 'pending',
          },
          token: id,
          message: "User registered (limited mode)"
        });
      }
      res.status(400).json({ message: error.message || "Invalid data provided" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Sign in with Firebase Auth
      const { user, firebaseUser } = await firebaseAuth.signIn(email, password);

      const token = firebaseUser.uid; // simplified token; in production use Firebase ID token
      res.json({
        user: {
          id: user.uid,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          verificationStatus: user.verificationStatus,
        },
        token,
        message: "User signed in successfully with Firebase Auth"
      });
    } catch (error: any) {
      console.error("Login error:", error);
      // Demo-friendly fallback when Firestore permissions block normal flow
      if ((error.message || '').toLowerCase().includes('insufficient permissions')) {
        const { email } = req.body;
        const fallbackUser = {
          id: `demo-${Buffer.from(email || '').toString('hex').slice(0, 8)}`,
          email,
          fullName: (email || 'demo').split('@')[0],
          role: 'tenant',
          verificationStatus: 'pending',
        };
        const token = fallbackUser.id;
        return res.json({
          user: fallbackUser,
          token,
          message: "Signed in (limited mode)"
        });
      }
      res.status(401).json({ message: error.message || "Invalid credentials" });
    }
  });

  app.post("/api/auth/signout", async (req: Request, res: Response) => {
    try {
      await firebaseAuth.signOut();
      res.json({ message: "Signed out successfully" });
    } catch (error: any) {
      console.error("Sign out error:", error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  // Google authentication routes
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { user: firebaseUser, idToken } = req.body;

      if (!firebaseUser || !idToken) {
        return res.status(400).json({ message: "Firebase user data and ID token are required" });
      }

      // Handle Google auth - check if user exists or create new
      const { user, firebaseUser: fbUser } = await firebaseAuth.handleGoogleAuth(firebaseUser);

      const token = fbUser.uid; // Use Firebase UID as token
      res.json({
        user: {
          id: user.uid,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          verificationStatus: user.verificationStatus,
        },
        token,
        message: "Signed in with Google successfully"
      });
    } catch (error: any) {
      console.error("Google login error:", error);
      // Demo-friendly fallback when Firestore permissions block normal flow
      if ((error.message || '').toLowerCase().includes('insufficient permissions') ||
        (error.message || '').includes('PERMISSION_DENIED')) {
        const { user: firebaseUser } = req.body;
        if (firebaseUser && firebaseUser.email) {
          const fallbackUser = {
            id: firebaseUser.uid || `google-${Buffer.from(firebaseUser.email || '').toString('hex').slice(0, 8)}`,
            email: firebaseUser.email,
            fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            role: 'tenant', // Default role for Google login fallback
            verificationStatus: 'pending',
          };
          const token = fallbackUser.id;
          return res.json({
            user: fallbackUser,
            token,
            message: "Signed in with Google (limited mode)"
          });
        }
      }
      res.status(400).json({ message: error.message || "Google authentication failed" });
    }
  });

  app.post("/api/auth/google/register", async (req: Request, res: Response) => {
    try {
      const { user: firebaseUser, idToken, role } = req.body;

      if (!firebaseUser || !idToken || !role) {
        return res.status(400).json({ message: "Firebase user data, ID token, and role are required" });
      }

      if (!['tenant', 'landlord'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'tenant' or 'landlord'" });
      }

      // Handle Google auth with role for new registrations
      const { user, firebaseUser: fbUser } = await firebaseAuth.handleGoogleAuth(firebaseUser, role);

      const token = fbUser.uid; // Use Firebase UID as token
      res.status(201).json({
        user: {
          id: user.uid,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          verificationStatus: user.verificationStatus,
        },
        token,
        message: "Registered with Google successfully"
      });
    } catch (error: any) {
      console.error("Google registration error:", error);
      // Demo-friendly fallback when Firestore permissions block normal flow
      if ((error.message || '').toLowerCase().includes('insufficient permissions') ||
        (error.message || '').includes('PERMISSION_DENIED')) {
        const { user: firebaseUser, role } = req.body;
        if (firebaseUser && firebaseUser.email && role) {
          const fallbackUser = {
            id: firebaseUser.uid || `google-${Buffer.from(firebaseUser.email || '').toString('hex').slice(0, 8)}`,
            email: firebaseUser.email,
            fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            role: role,
            verificationStatus: 'pending',
          };
          const token = fallbackUser.id;
          return res.status(201).json({
            user: fallbackUser,
            token,
            message: "Registered with Google (limited mode)"
          });
        }
      }
      res.status(400).json({ message: error.message || "Google registration failed" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await firebaseStorage.getUserById(req.user!.uid);
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

  // User lookup by email (for contract creation)
  app.get("/api/users/by-email", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email query parameter is required" });
      }

      const user = await firebaseStorage.getUserByEmail(email);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        verificationStatus: user.verificationStatus
      });
    } catch (error) {
      console.error("Get user by email error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Properties routes
  app.get("/api/properties", async (req: Request, res: Response) => {
    try {
      const { city, propertyType, minRent, maxRent, bedrooms, bedroomsMin, bathrooms, sqftMin, limit = 20, offset = 0 } = req.query;

      const filters = {
        city: city as string,
        propertyType: propertyType as string,
        minRent: minRent ? Number(minRent) : undefined,
        maxRent: maxRent ? Number(maxRent) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bedroomsMin: bedroomsMin ? Number(bedroomsMin) : undefined, // For "3+" case
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        sqftMin: sqftMin ? Number(sqftMin) : undefined,
        isAvailable: true,
        limit: Number(limit),
        offset: Number(offset),
      };

      console.log("[API /properties] Filters received:", JSON.stringify(filters));

      // Load from both MongoDB AND dataset, then merge
      const isMongoConnected = await import('./mongodb').then(m => m.isMongoDBConnected());
      let mongoProperties: any[] = [];

      if (isMongoConnected) {
        try {
          mongoProperties = await mongoDBStorage.getProperties(filters);
          console.log("[API /properties] MongoDB returned", mongoProperties?.length || 0, "properties");
        } catch (error) {
          console.error("[API /properties] MongoDB error:", error);
        }
      }

      // Always load dataset properties to supplement MongoDB
      console.log("[API /properties] Loading dataset properties...");
      const datasetItems = await loadDatasetProperties();
      console.log("[API /properties] Dataset total items:", datasetItems.length);

      // Apply filters to dataset properties
      let filteredDataset = datasetItems;

      // City filter - exact match (case-insensitive)
      if (filters.city) {
        const cityLower = filters.city.toLowerCase().trim();
        filteredDataset = filteredDataset.filter(p => {
          const propCity = (p.city || '').toString().toLowerCase().trim();
          return propCity === cityLower;
        });
        console.log("[API /properties] After city filter (", filters.city, "):", filteredDataset.length, "properties");
      }

      // Property type filter
      if (filters.propertyType) {
        filteredDataset = filteredDataset.filter(p =>
          (p.propertyType || '').toString().toLowerCase() === filters.propertyType!.toLowerCase()
        );
        console.log("[API /properties] After propertyType filter:", filteredDataset.length, "properties");
      }

      // Min rent filter
      if (filters.minRent !== undefined) {
        filteredDataset = filteredDataset.filter(p => {
          const rent = Number(p.monthlyRent || 0);
          return rent >= filters.minRent!;
        });
        console.log("[API /properties] After minRent filter:", filteredDataset.length, "properties");
      }

      // Max rent filter
      if (filters.maxRent !== undefined) {
        filteredDataset = filteredDataset.filter(p => {
          const rent = Number(p.monthlyRent || 0);
          return rent <= filters.maxRent!;
        });
        console.log("[API /properties] After maxRent filter:", filteredDataset.length, "properties");
      }

      // Bedrooms filter
      if (filters.bedroomsMin !== undefined) {
        // For "3+" case - filter bedrooms >= 3
        filteredDataset = filteredDataset.filter(p => {
          const beds = Number(p.bedrooms || 0);
          return beds >= filters.bedroomsMin!;
        });
        console.log("[API /properties] After bedroomsMin filter:", filteredDataset.length, "properties");
      } else if (filters.bedrooms !== undefined) {
        // Exact match for specific bedroom count
        filteredDataset = filteredDataset.filter(p => {
          const beds = Number(p.bedrooms || 0);
          return beds === filters.bedrooms!;
        });
        console.log("[API /properties] After bedrooms filter:", filteredDataset.length, "properties");
      }

      // Bathrooms filter (if provided from AI suggestions)
      if (filters.bathrooms !== undefined) {
        filteredDataset = filteredDataset.filter(p => {
          const baths = Number(p.bathrooms || 0);
          return baths >= filters.bathrooms!; // At least the suggested number
        });
        console.log("[API /properties] After bathrooms filter:", filteredDataset.length, "properties");
      }

      // Square feet minimum filter (from AI suggestions)
      if (filters.sqftMin !== undefined) {
        filteredDataset = filteredDataset.filter(p => {
          const sqft = Number(p.sqft || 0);
          return sqft >= filters.sqftMin!; // At least the suggested size
        });
        console.log("[API /properties] After sqftMin filter:", filteredDataset.length, "properties");
      }

      // Only show available properties
      filteredDataset = filteredDataset.filter(p => p.isAvailable !== false);

      // Merge user-created MongoDB listings first so newly listed properties appear immediately.
      const allProperties = [...mongoProperties, ...filteredDataset];
      console.log("[API /properties] Total combined after all filters:", allProperties.length, "properties");

      res.setHeader("Cache-Control", "no-store");

      if (allProperties.length > 0) {
        const sliced = allProperties.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 20));
        console.log("[API /properties] Returning", sliced.length, "items (offset:", offset, "limit:", limit, ")");
        return res.json(sliced);
      }

      // Only if both sources are empty AND no filters applied, use demo data
      if (allProperties.length === 0 && !filters.city && !filters.propertyType && filters.minRent === undefined && filters.maxRent === undefined) {
        // Fallback demo items so UI has content when DB is empty
        const demo = [
          {
            id: "demo-apt-1",
            title: "Modern 2 Bed Apartment in Gulberg",
            description: "Near Liberty, newly renovated, lift + parking.",
            address: "123 Liberty Market",
            city: "Lahore",
            area: "Gulberg",
            propertyType: "apartment",
            bedrooms: 2,
            bathrooms: 2,
            sqft: 950,
            monthlyRent: "65000",
            securityDeposit: "130000",
            amenities: ["Lift", "Parking", "Security"],
            images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"],
            isAvailable: true,
          },
          {
            id: "demo-house-1",
            title: "Spacious 3 Marla House in DHA",
            description: "Quiet street, near park, separate meters.",
            address: "Street 9, DHA Phase 6",
            city: "Karachi",
            area: "DHA",
            propertyType: "house",
            bedrooms: 3,
            bathrooms: 3,
            sqft: 1800,
            monthlyRent: "120000",
            securityDeposit: "240000",
            amenities: ["Garden", "Car Porch", "Security"],
            images: ["https://images.unsplash.com/photo-1505691723518-36a5ac3b2d95"],
            isAvailable: true,
          },
          {
            id: "demo-office-1",
            title: "Furnished Office Space Blue Area",
            description: "Ready to move, fiber internet, generator backup.",
            address: "Blue Area Block C",
            city: "Islamabad",
            area: "Blue Area",
            propertyType: "office",
            sqft: 1200,
            monthlyRent: "180000",
            securityDeposit: "360000",
            amenities: ["Generator", "Fiber Internet", "Lift"],
            images: ["https://images.unsplash.com/photo-1524758631624-e2822e304c36"],
            isAvailable: true,
          },
        ];
        return res.json(demo.slice(0, Number(limit) || 20));
      }
      res.json(allProperties);
    } catch (error) {
      console.error("Get properties error:", error);
      // Gracefully degrade to dataset
      console.log("[API /properties] Error, loading from dataset...");
      res.setHeader("Cache-Control", "no-store");
      const { city, propertyType, minRent, maxRent, bedrooms, bedroomsMin, limit = 20, offset = 0 } = req.query;

      const filters = {
        city: city as string,
        propertyType: propertyType as string,
        minRent: minRent ? Number(minRent) : undefined,
        maxRent: maxRent ? Number(maxRent) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bedroomsMin: bedroomsMin ? Number(bedroomsMin) : undefined,
      };

      let ds = await loadDatasetProperties();
      console.log("[API /properties] Dataset returned", ds.length, "items in catch block");

      // Apply filters to dataset
      if (filters.city) {
        ds = ds.filter(p => (p.city || '').toString().toLowerCase().includes(filters.city!.toLowerCase()));
      }
      if (filters.propertyType) {
        ds = ds.filter(p => (p.propertyType || '').toString().toLowerCase() === filters.propertyType!.toLowerCase());
      }
      if (filters.minRent !== undefined) {
        ds = ds.filter(p => Number(p.monthlyRent || 0) >= filters.minRent!);
      }
      if (filters.maxRent !== undefined) {
        ds = ds.filter(p => Number(p.monthlyRent || 0) <= filters.maxRent!);
      }
      if (filters.bedroomsMin !== undefined) {
        ds = ds.filter(p => Number(p.bedrooms || 0) >= filters.bedroomsMin!);
      } else if (filters.bedrooms !== undefined) {
        ds = ds.filter(p => Number(p.bedrooms || 0) === filters.bedrooms!);
      }
      ds = ds.filter(p => p.isAvailable !== false);

      if (ds.length > 0) {
        const sliced = ds.slice(Number(offset || 0), Number(offset || 0) + Number(limit || 20));
        console.log("[API /properties] Returning", sliced.length, "items from dataset (catch)");
        return res.json(sliced);
      }
      const demo = [
        {
          id: "demo-apt-1",
          title: "Modern 2 Bed Apartment in Gulberg",
          description: "Near Liberty, newly renovated, lift + parking.",
          address: "123 Liberty Market",
          city: "Lahore",
          area: "Gulberg",
          propertyType: "apartment",
          bedrooms: 2,
          bathrooms: 2,
          sqft: 950,
          monthlyRent: "65000",
          images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"],
          isAvailable: true,
        },
      ];
      return res.json(demo);
    }
  });

  // Delete property (Admin only)
  app.delete("/api/properties/:id", authenticateToken, requireRole(["admin"]), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      await mongoDBStorage.deleteProperty(id);
      res.json({ message: "Property deleted successfully" });
    } catch (error: any) {
      console.error("Delete property error:", error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  // Map-specific endpoint: Load properties from CSV for Islamabad, Lahore, and Karachi
  app.get("/api/properties/map", async (req: Request, res: Response) => {
    try {
      const datasetDir = path.resolve(process.cwd(), "server", "dataset");
      const entries = await fs.readdir(datasetDir);
      const csvFile = entries.find((f) => f.toLowerCase().endsWith(".csv"));

      if (!csvFile) {
        return res.json([]);
      }

      const fullPath = path.join(datasetDir, csvFile);
      const raw = await fs.readFile(fullPath, "utf-8");

      // Parse CSV - read more lines to get enough properties
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) return res.json([]);

      const splitCsv = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += ch;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = splitCsv(lines[0]).map((h) => h.trim());
      const headerIndex: Record<string, number> = {};
      headers.forEach((h, idx) => {
        headerIndex[h.toLowerCase()] = idx;
      });

      const getVal = (cols: string[], keys: string[], fallback?: any) => {
        for (const k of keys) {
          const idx = headerIndex[k.toLowerCase()];
          if (idx !== undefined && cols[idx] !== undefined && cols[idx] !== "") return cols[idx];
        }
        return fallback;
      };

      const parseCoordinate = (value: any) => {
        if (typeof value !== "string" && typeof value !== "number") return undefined;
        const numeric = typeof value === "number"
          ? value
          : parseFloat(value.toString().replace(/[^\d.-]/g, ""));
        return Number.isFinite(numeric) ? numeric : undefined;
      };

      const targetCities = ["islamabad", "lahore", "karachi"];
      const cityCounts: Record<string, number> = { islamabad: 0, lahore: 0, karachi: 0 };
      const mapProperties: any[] = [];

      if (isMongoDBConnected()) {
        const mongoMapProperties = await mongoDBStorage.getProperties({ isAvailable: true, limit: 100 });
        for (const property of mongoMapProperties) {
          const latitude = parseCoordinate((property as any).latitude ?? (property as any).coordinates?.lat);
          const longitude = parseCoordinate((property as any).longitude ?? (property as any).coordinates?.lng);

          if (latitude !== undefined && longitude !== undefined) {
            mapProperties.push({
              ...property,
              latitude,
              longitude,
              coordinates: { lat: latitude, lng: longitude },
            });
          }
        }
      }

      // Read through CSV to find properties from target cities
      for (let i = 1; i < lines.length && (cityCounts.islamabad < 20 || cityCounts.lahore < 20 || cityCounts.karachi < 20); i++) {
        const cols = splitCsv(lines[i]);
        const city = getVal(cols, ["city"], "").toLowerCase().trim();

        // Check if this city is one we want and we need more
        if (targetCities.includes(city) && cityCounts[city] < 20) {
          const latitudeRaw = getVal(cols, ["latitude", "lat"], "");
          const longitudeRaw = getVal(cols, ["longitude", "lng", "long", "lon"], "");

          const latitude = parseCoordinate(latitudeRaw);
          const longitude = parseCoordinate(longitudeRaw);

          // Only add if we have valid coordinates
          if (latitude !== undefined && longitude !== undefined) {
            const propertyId = getVal(cols, ["property_id", "id"], `map-${i}`);
            const location = getVal(cols, ["location", "locality"], "");
            const propertyType = getVal(cols, ["property_type", "propertytype", "type"], "apartment").toString().toLowerCase();
            const bedrooms = getVal(cols, ["bedrooms", "beds"], "");
            const area = getVal(cols, ["area", "area_marla", "area_sqft"], "");
            const priceRaw = getVal(cols, ["price"], "0");
            const priceNum = parseFloat(priceRaw.toString().replace(/[^\d.]/g, "")) || 0;
            const rent = priceNum > 0 ? Math.round(priceNum / 240).toString() : "0";

            const title = `${propertyType[0].toUpperCase()}${propertyType.slice(1)}${bedrooms ? " " + bedrooms + " Bed" : ""}${location ? " in " + location : ""}`.trim();

            mapProperties.push({
              id: propertyId,
              title: title || `${propertyType} in ${location || city}`,
              city: city.charAt(0).toUpperCase() + city.slice(1),
              area: location || area || "",
              monthlyRent: rent,
              latitude,
              longitude,
              coordinates: { lat: latitude, lng: longitude },
            });

            cityCounts[city]++;
          }
        }
      }

      console.log(`[API /properties/map] Loaded ${mapProperties.length} properties:`, cityCounts);
      res.setHeader("Cache-Control", "no-store");
      return res.json(mapProperties);
    } catch (error: any) {
      console.error("[API /properties/map] Error:", error?.message || error);
      return res.json([]);
    }
  });

  app.get("/api/properties/:id", async (req: Request, res: Response) => {
    try {
      // Try MongoDB first
      const property = await mongoDBStorage.getProperty(req.params.id);
      if (property) {
        return res.json(property);
      }
      // Fallback: search dataset/CSV for this id
      const ds = await loadDatasetProperties();
      const found = ds.find((p: any) => String(p.id) === String(req.params.id));
      if (found) {
        return res.json(found);
      }
      return res.status(404).json({ message: "Property not found" });
    } catch (error) {
      console.error("Get property error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/properties", authenticateToken, requireRole(['landlord']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertPropertySchema.parse({
        ...req.body,
        landlordId: req.user!.uid,
      });

      // Store in MongoDB
      const property = await mongoDBStorage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      console.error("Create property error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  // Dev: Seed demo properties for the current landlord
  app.post("/api/dev/seed/properties", authenticateToken, requireRole(['landlord']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const landlordId = req.user!.uid;
      const samples = [
        {
          title: "Modern 2 Bed Apartment in Gulberg",
          description: "Near Liberty, newly renovated, lift + parking.",
          address: "123 Liberty Market",
          city: "Lahore",
          area: "Gulberg",
          propertyType: "apartment",
          bedrooms: 2,
          bathrooms: 2,
          sqft: 950,
          monthlyRent: "65000",
          securityDeposit: "130000",
          amenities: ["Lift", "Parking", "Security"],
          images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"],
          isAvailable: true,
        },
        {
          title: "Spacious 3 Marla House in DHA",
          description: "Quiet street, near park, separate meters.",
          address: "Street 9, DHA Phase 6",
          city: "Karachi",
          area: "DHA",
          propertyType: "house",
          bedrooms: 3,
          bathrooms: 3,
          sqft: 1800,
          monthlyRent: "120000",
          securityDeposit: "240000",
          amenities: ["Garden", "Car Porch", "Security"],
          images: ["https://images.unsplash.com/photo-1505691723518-36a5ac3b2d95"],
          isAvailable: true,
        },
        {
          title: "Furnished Office Space Blue Area",
          description: "Ready to move, fiber internet, generator backup.",
          address: "Blue Area Block C",
          city: "Islamabad",
          area: "Blue Area",
          propertyType: "office",
          sqft: 1200,
          monthlyRent: "180000",
          securityDeposit: "360000",
          amenities: ["Generator", "Fiber Internet", "Lift"],
          images: ["https://images.unsplash.com/photo-1524758631624-e2822e304c36"],
          isAvailable: true,
        },
      ];

      const created: any[] = [];
      for (const sample of samples) {
        const validated = insertPropertySchema.parse({ ...sample, landlordId });
        // Store in MongoDB
        const property = await mongoDBStorage.createProperty(validated);
        created.push(property);
      }

      res.status(201).json({ count: created.length, properties: created });
    } catch (error: any) {
      console.error("Seed properties error:", error);
      res.status(400).json({ message: error.message || "Failed to seed properties" });
    }
  });

  app.put("/api/properties/:id", authenticateToken, requireRole(['landlord']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const property = await mongoDBStorage.getProperty(req.params.id);
      if (!property || property.landlordId !== req.user!.uid) {
        return res.status(404).json({ message: "Property not found" });
      }

      const updatedProperty = await mongoDBStorage.updateProperty(req.params.id, req.body);
      res.json(updatedProperty);
    } catch (error) {
      console.error("Update property error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  app.delete("/api/properties/:id", authenticateToken, requireRole(['landlord']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const property = await mongoDBStorage.getProperty(req.params.id);
      if (!property || property.landlordId !== req.user!.uid) {
        return res.status(404).json({ message: "Property not found" });
      }

      await mongoDBStorage.deleteProperty(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete property error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ─────────────────────────────────────────────
  // AI PRICE SUGGESTION (calls Python FastAPI)
  // ─────────────────────────────────────────────
  const AI_SERVICE_URL = getAIServiceUrl();

  app.post("/api/ai/price-suggestion", async (req: Request, res: Response) => {
    try {
      const { city, propertyType, sqft, bedrooms, bathrooms, area } = req.body;

      // Validate required fields
      if (!city || !propertyType || !sqft) {
        return res.status(400).json({
          error: "city, propertyType, and sqft are required"
        });
      }

      console.log(`[AI Service] Received request: city=${city}, type=${propertyType}, sqft=${sqft}`);

      // Call the Python AI service
      const aiResponse = await fetch(`${AI_SERVICE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          property_type: propertyType,   // map camelCase → snake_case
          sqft: Number(sqft),
          bedrooms: bedrooms ? Number(bedrooms) : undefined,
          bathrooms: bathrooms ? Number(bathrooms) : undefined,
          area: area || null,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("[AI Service] Error response:", errText);
        return res.status(502).json({ 
          error: "AI service unavailable",
          details: errText 
        });
      }

      const aiData = await aiResponse.json();
      console.log(`[AI Service] Prediction returned: ₨${aiData.suggested_price}`);

      // Return in the format your frontend expects
      return res.json({
        suggestedPrice: aiData.suggested_price,
        priceRangeMin: aiData.price_range_min,
        priceRangeMax: aiData.price_range_max,
        confidence: aiData.confidence,
        description: aiData.message,
        currency: "PKR",
        featuresUsed: aiData.features_used,
      });

    } catch (error: any) {
      console.error("[AI Service] Error:", error.message);
      return res.status(503).json({ 
        error: "AI service unavailable",
        details: error.message 
      });
    }
  });

  // ─────────────────────────────────────────────
  // AI MODEL INFO (diagnostic endpoint)
  // ─────────────────────────────────────────────
  app.get("/api/ai/model-info", async (req: Request, res: Response) => {
    try {
      const AI_SERVICE_URL = getAIServiceUrl();
      const response = await fetch(`${AI_SERVICE_URL}/model-info`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(503).json({ error: "AI service unavailable" });
    }
  });

  // ─────────────────────────────────────────────
  // AI SERVICE HEALTH CHECK
  // ─────────────────────────────────────────────
  app.get("/api/ai/health", async (req: Request, res: Response) => {
    try {
      const AI_SERVICE_URL = getAIServiceUrl();
      const response = await fetch(`${AI_SERVICE_URL}/health`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(503).json({
        status: "unavailable",
        error: "AI service unreachable",
        details: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error && "cause" in error ? String((error as any).cause?.message || (error as any).cause) : undefined,
        configuredUrl: getAIServiceUrl(),
      });
    }
  });

  app.get("/api/ai/debug", async (_req: Request, res: Response) => {
    res.json({
      configuredUrl: getAIServiceUrl(),
      hasAIServiceUrl: Boolean(process.env.AI_SERVICE_URL),
      hasAIServiceHostPort: Boolean(process.env.AI_SERVICE_HOSTPORT),
      aiServiceHostPort: process.env.AI_SERVICE_HOSTPORT || null,
    });
  });

  // ─────────────────────────────────────────────
  // AI AREA / NEIGHBORHOOD INSIGHTS (proxy to ai-service)
  // ─────────────────────────────────────────────
  app.get("/api/ai/area-stats", async (req: Request, res: Response) => {
    try {
      const AI_SERVICE_URL = getAIServiceUrl();
      const params = new URLSearchParams();
      const city = req.query.city as string | undefined;
      const propertyType = req.query.propertyType as string | undefined;
      const area = req.query.area as string | undefined;
      const bedrooms = req.query.bedrooms as string | undefined;
      if (city) params.set("city", city);
      if (propertyType) params.set("property_type", propertyType);
      if (area) params.set("area", area);
      if (bedrooms) params.set("bedrooms", bedrooms);
      const url = `${AI_SERVICE_URL}/area-stats${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: errText || "AI service error" });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("[AI area-stats] Error:", error?.message);
      res.status(503).json({ error: "AI service unavailable", details: error?.message });
    }
  });

  // Contracts routes
  app.get("/api/contracts", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filters: any = {};

      if (req.user!.role === 'landlord') {
        filters.landlordId = req.user!.uid;
      } else if (req.user!.role === 'tenant') {
        filters.tenantId = req.user!.uid;
      }

      // Try MongoDB first, fallback to Firebase
      let contracts = await mongoDBStorage.getContracts(filters);

      // If MongoDB is not connected or returns empty, try Firebase
      if (contracts.length === 0 && !await isMongoDBConnected()) {
        contracts = await firebaseStorage.getContracts(filters);
      }

      // Populate tenant and landlord emails
      const contractsWithUsers = await Promise.all(contracts.map(async (contract: any) => {
        try {
          const tenant = await firebaseStorage.getUserById(contract.tenantId);
          const landlord = await firebaseStorage.getUserById(contract.landlordId);
          return {
            ...contract,
            tenantEmail: tenant?.email || 'Unknown',
            landlordEmail: landlord?.email || 'Unknown',
          };
        } catch (err) {
          return {
            ...contract,
            tenantEmail: 'Unknown',
            landlordEmail: 'Unknown',
          };
        }
      }));

      res.json(contractsWithUsers);
    } catch (error) {
      console.error("Get contracts error:", error);
      res.json([]);
    }
  });

  app.post("/api/contracts", authenticateToken, requireRole(['landlord']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Prepare contract data - dates will be added in storage layer if missing
      const contractData = {
        ...req.body,
        landlordId: req.user!.uid,
        duration: req.body.duration ? parseInt(String(req.body.duration)) : 12,
      };

      const validatedData = insertContractSchema.parse(contractData);

      // Add dates if not provided (database requires them)
      if (!validatedData.startDate) {
        validatedData.startDate = new Date();
      }
      if (!validatedData.endDate) {
        const durationMonths = (typeof validatedData.duration === 'number' ? validatedData.duration :
          typeof validatedData.duration === 'string' ? parseInt(validatedData.duration) : 12);
        const endDate = new Date(validatedData.startDate);
        endDate.setMonth(endDate.getMonth() + durationMonths);
        validatedData.endDate = endDate;
      }
      // Remove duration as it's not in the schema
      delete (validatedData as any).duration;

      // Try MongoDB first, fallback to Firebase
      let contract;
      try {
        contract = await mongoDBStorage.createContract(validatedData);
      } catch (mongoError) {
        // If MongoDB fails, use Firebase
        console.log('[Contracts] MongoDB not available, using Firebase');
        contract = await firebaseStorage.createContract(validatedData);
      }

      res.status(201).json(contract);
    } catch (error: any) {
      console.error("Create contract error:", error);
      res.status(400).json({ message: error.message || "Invalid data provided" });
    }
  });

  app.put("/api/contracts/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Try MongoDB first, fallback to Firebase
      let contract = await mongoDBStorage.getContract(req.params.id);
      let updatedContract;
      let useMongoDB = !!contract;

      if (!contract) {
        // Try Firebase
        contract = await firebaseStorage.getContract(req.params.id);
      }

      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Check permissions
      if (req.user!.role !== 'admin' &&
        contract.landlordId !== req.user!.uid &&
        contract.tenantId !== req.user!.uid) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Update in the same storage where it was found
      if (useMongoDB) {
        updatedContract = await mongoDBStorage.updateContract(req.params.id, req.body);
      } else {
        updatedContract = await firebaseStorage.updateContract(req.params.id, req.body);
      }

      if (!updatedContract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Determine what fields changed
      const changedFields: string[] = [];
      if (req.body.monthlyRent && req.body.monthlyRent !== contract.monthlyRent) changedFields.push("monthly rent");
      if (req.body.securityDeposit && req.body.securityDeposit !== contract.securityDeposit) changedFields.push("security deposit");
      if (req.body.endDate && req.body.endDate !== contract.endDate) changedFields.push("end date");
      if (req.body.status && req.body.status !== contract.status) changedFields.push("status");
      if (req.body.terms) changedFields.push("terms");
      const fieldSummary = changedFields.length > 0 ? changedFields.join(", ") : "contract details";

      // Record modification on blockchain
      let blockchainHash: string | null = null;
      try {
        if (blockchainService.isEnabled()) {
          blockchainHash = await blockchainService.modifyContract(
            req.params.id,
            fieldSummary,
            req.body.monthlyRent ? Number(req.body.monthlyRent) : undefined,
            req.body.securityDeposit ? Number(req.body.securityDeposit) : undefined,
            req.body.endDate ? new Date(req.body.endDate) : undefined,
          );
        }
      } catch (bcErr) {
        console.warn("[Contracts] Blockchain modify failed (non-blocking):", bcErr);
      }

      // Notify all contract parties
      try {
        const NotificationModel = await getNotificationModel();
        const modifierName = req.user!.uid;
        const partyIds = [contract.landlordId, contract.tenantId].filter(
          (id) => id !== req.user!.uid
        );

        const notifications = partyIds.map((userId) => ({
          userId,
          type: "contract_modified",
          title: "Contract Modified",
          message: `A contract you are part of has been updated (${fieldSummary}).${blockchainHash ? " This change is recorded on the blockchain." : ""}`,
          contractId: req.params.id,
          blockchainHash: blockchainHash || undefined,
          isRead: false,
          createdAt: new Date(),
        }));

        if (notifications.length > 0) {
          await NotificationModel.insertMany(notifications);
          console.log(`[Contracts] Sent ${notifications.length} modification notifications`);
        }
      } catch (notifErr) {
        console.warn("[Contracts] Failed to create notifications (non-blocking):", notifErr);
      }

      res.json(updatedContract);
    } catch (error) {
      console.error("Update contract error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  app.delete("/api/contracts/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    console.log('[DELETE /api/contracts/:id] Request received for contract:', req.params.id);
    console.log('[DELETE /api/contracts/:id] User:', req.user?.uid);

    try {
      const { password } = req.body;
      console.log('[DELETE /api/contracts/:id] Password provided:', !!password);

      // Verify password is provided
      if (!password) {
        console.log('[DELETE /api/contracts/:id] ERROR: No password provided');
        return res.status(400).json({ message: "Password is required to delete a contract" });
      }

      // Get user from Firebase to verify password
      const user = await firebaseStorage.getUserById(req.user!.uid);
      if (!user) {
        console.log('[DELETE /api/contracts/:id] ERROR: User not found');
        return res.status(404).json({ message: "User not found" });
      }
      console.log('[DELETE /api/contracts/:id] User found:', user.email);

      // Verify password by attempting to sign in
      try {
        await firebaseAuth.signIn(user.email, password);
        console.log('[DELETE /api/contracts/:id] Password verified successfully');
      } catch (error) {
        console.log('[DELETE /api/contracts/:id] ERROR: Incorrect password');
        return res.status(401).json({ message: "Incorrect password" });
      }

      // Try MongoDB first, fallback to Firebase
      let contract = await mongoDBStorage.getContract(req.params.id);
      let useMongoDB = !!contract;

      if (!contract) {
        // Try Firebase
        contract = await firebaseStorage.getContract(req.params.id);
      }

      if (!contract) {
        console.log('[DELETE /api/contracts/:id] ERROR: Contract not found');
        return res.status(404).json({ message: "Contract not found" });
      }
      console.log('[DELETE /api/contracts/:id] Contract found, landlordId:', contract.landlordId);

      // Check permissions - only landlord can delete
      if (req.user!.role !== 'admin' && contract.landlordId !== req.user!.uid) {
        console.log('[DELETE /api/contracts/:id] ERROR: User is not the landlord');
        return res.status(403).json({ message: "Only the landlord can delete this contract" });
      }
      console.log('[DELETE /api/contracts/:id] Permission check passed');

      // Delete from the same storage where it was found
      if (useMongoDB) {
        console.log('[DELETE /api/contracts/:id] Deleting from MongoDB');
        await mongoDBStorage.deleteContract(req.params.id);
      } else {
        console.log('[DELETE /api/contracts/:id] Deleting from Firebase');
        await firebaseStorage.deleteContract(req.params.id);
      }

      console.log('[DELETE /api/contracts/:id] SUCCESS: Contract deleted');
      res.status(200).json({ message: "Contract deleted successfully" });
    } catch (error: any) {
      console.error("Delete contract error:", error);
      res.status(500).json({ message: error.message || "Failed to delete contract" });
    }
  });

  // ─── Notification routes ──────────────────────────────────────────────────────

  // Get notifications for the current user
  app.get("/api/notifications", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const NotificationModel = await getNotificationModel();
      const notifications = await NotificationModel.find({ userId: req.user!.uid })
        .sort({ createdAt: -1 })
        .limit(50)
        .exec();

      res.json(
        notifications.map((n: any) => ({
          id: n._id.toString(),
          userId: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          contractId: n.contractId,
          blockchainHash: n.blockchainHash,
          isRead: n.isRead,
          createdAt: n.createdAt,
        }))
      );
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const NotificationModel = await getNotificationModel();
      const notification = await NotificationModel.findOneAndUpdate(
        { _id: req.params.id, userId: req.user!.uid },
        { isRead: true },
        { new: true }
      );
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  // Mark all notifications as read
  app.put("/api/notifications/read-all", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const NotificationModel = await getNotificationModel();
      await NotificationModel.updateMany(
        { userId: req.user!.uid, isRead: false },
        { isRead: true }
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all read error:", error);
      res.status(500).json({ message: "Failed to update notifications" });
    }
  });

  // Payments routes
  app.get("/api/payments", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filters: any = {};

      if (req.user!.role === 'landlord') {
        filters.landlordId = req.user!.uid;
      } else if (req.user!.role === 'tenant') {
        filters.tenantId = req.user!.uid;
      }

      const payments = await firebaseStorage.getPayments(filters);
      res.json(payments);
    } catch (error) {
      console.error("Get payments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/payments", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await firebaseStorage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  app.put("/api/payments/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payment = await firebaseStorage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const updatedPayment = await firebaseStorage.updatePayment(req.params.id, req.body);
      res.json(updatedPayment);
    } catch (error) {
      console.error("Update payment error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  // Receipt upload endpoint for payment receipts
  app.post("/api/payments/upload-receipt", authenticateToken, upload.single('receipt'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No receipt file uploaded" });
      }

      await validateUploadedFile(
        req.file,
        DOCUMENT_MIME_TYPES,
        MAX_DOCUMENT_SIZE,
        "Only JPEG, PNG, WebP images and PDF files are allowed",
      );

      // Get payment ID from request body if provided
      const { paymentId, contractId } = req.body;
      const uploadedReceipt = await uploadFileToCloudinary(req.file, 'smartrent/receipts');

      // Store receipt as document in MongoDB
      const documentData = {
        userId: req.user!.uid,
        contractId: contractId || undefined,
        type: 'payment_receipt',
        fileName: req.file.originalname,
        filePath: uploadedReceipt.secure_url,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        isVerified: false,
      };

      const receipt = await mongoDBStorage.createDocument(documentData);

      res.status(200).json({
        success: true,
        receipt: {
          id: receipt.id,
          url: uploadedReceipt.secure_url,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        },
      });
    } catch (error: any) {
      console.error("Receipt upload error:", error);
      if (req.file) {
        await cleanupTempFile(req.file);
      }
      res.status(500).json({ message: error.message || "Failed to upload receipt" });
    }
  });

  // Pakistani Credit Card Payment Endpoint
  app.post("/api/payments/process-card", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        cardNumber,
        cardholderName,
        expiryDate,
        cvv,
        amount,
        contractId,
        landlordId,
        dueDate
      } = req.body;

      // Validate required fields
      if (!cardNumber || !cardholderName || !expiryDate || !cvv || !amount || !contractId || !landlordId) {
        return res.status(400).json({ message: "Missing required payment fields" });
      }

      // Validate card number (Pakistani cards typically 16 digits)
      const cleanedCardNumber = cardNumber.replace(/\s/g, '');
      if (!/^\d{16}$/.test(cleanedCardNumber)) {
        return res.status(400).json({ message: "Invalid card number. Must be 16 digits." });
      }

      // Validate CVV (3 or 4 digits)
      if (!/^\d{3,4}$/.test(cvv)) {
        return res.status(400).json({ message: "Invalid CVV. Must be 3 or 4 digits." });
      }

      // Validate expiry date (MM/YY format)
      if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
        return res.status(400).json({ message: "Invalid expiry date format. Use MM/YY." });
      }

      // Check if card is expired
      const [month, year] = expiryDate.split('/');
      const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
      if (expiry < new Date()) {
        return res.status(400).json({ message: "Card has expired." });
      }

      // Simulate payment processing with Pakistani payment gateway
      // In production, integrate with: PayPro, Bank Alfalah, HBL, UBL, or MCB payment gateway
      const transactionId = `PKR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate payment success (in production, this would be actual gateway response)
      // For demo purposes, we'll accept all valid format cards
      const paymentStatus = 'success'; // In production, check gateway response

      if (paymentStatus === 'success') {
        // Create payment record in database
        const paymentData = {
          contractId,
          tenantId: req.user!.uid,
          landlordId,
          amount: amount.toString(),
          dueDate: dueDate ? new Date(dueDate) : new Date(),
          paidDate: new Date(),
          status: 'paid' as const,
          paymentMethod: 'card',
          transactionId: transactionId,
          notes: `Pakistani Credit Card Payment - Card ending in ${cleanedCardNumber.slice(-4)}`,
        };

        const validatedData = insertPaymentSchema.parse(paymentData);
        const payment = await firebaseStorage.createPayment(validatedData);

        res.json({
          success: true,
          payment,
          transaction: {
            id: transactionId,
            status: 'completed',
            amount: parseFloat(amount),
            currency: 'PKR',
          },
        });
      } else {
        res.status(400).json({
          message: "Payment failed. Please check your card details and try again."
        });
      }
    } catch (error: any) {
      console.error("Process card payment error:", error);
      res.status(500).json({ message: error.message || "Failed to process payment" });
    }
  });

  // Image upload route for property images
  app.post("/api/upload/image", authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      await validateUploadedFile(
        req.file,
        IMAGE_MIME_TYPES,
        MAX_IMAGE_SIZE,
        "Only JPEG, PNG, and WebP images are allowed",
      );

      const uploadedImage = await uploadFileToCloudinary(req.file, 'smartrent/properties');
      res.status(200).json({
        success: true,
        url: uploadedImage.secure_url,
        publicId: uploadedImage.public_id,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });
    } catch (error: any) {
      console.error("Image upload error:", error);
      if (req.file) {
        await cleanupTempFile(req.file);
      }
      res.status(500).json({ message: error.message || "Failed to upload image" });
    }
  });

  // Documents routes
  app.post("/api/documents", authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      await validateUploadedFile(
        req.file,
        DOCUMENT_MIME_TYPES,
        MAX_DOCUMENT_SIZE,
        "Only JPEG, PNG, WebP images and PDF files are allowed",
      );

      const uploadedDocument = await uploadFileToCloudinary(req.file, 'smartrent/documents');

      const documentData = {
        userId: req.user!.uid,
        type: req.body.type,
        fileName: req.file.originalname,
        filePath: uploadedDocument.secure_url,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        propertyId: req.body.propertyId || null,
        contractId: req.body.contractId || null,
      };

      // Store in MongoDB
      const document = await mongoDBStorage.createDocument(documentData);

      // If this is a verification document (cnicFront, cnicBack, or additional), 
      // set user verification status to pending if not already verified
      const verificationDocTypes = ['cnicFront', 'cnicBack', 'additional'];
      if (verificationDocTypes.includes(req.body.type)) {
        try {
          const currentUser = await firebaseStorage.getUserById(req.user!.uid);
          if (currentUser && currentUser.verificationStatus !== 'verified') {
            await firebaseStorage.updateUserVerificationStatus(req.user!.uid, 'pending');
          }
        } catch (error) {
          console.error("Failed to update user verification status:", error);
          // Don't fail the document upload if status update fails
        }
      }

      res.status(201).json(document);
    } catch (error: any) {
      console.error("Upload document error:", error);
      if (req.file) {
        await cleanupTempFile(req.file);
      }
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  app.get("/api/documents", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filters: any = {};

      if (req.user!.role !== 'admin') {
        filters.userId = req.user!.uid;
      }

      // Get from MongoDB
      const documents = await mongoDBStorage.getDocuments(filters);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get documents by property ID
  app.get("/api/documents/property/:propertyId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const documents = await mongoDBStorage.getDocumentsByProperty(req.params.propertyId);
      res.json(documents);
    } catch (error) {
      console.error("Get documents by property error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await firebaseStorage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user by ID (for admin to fetch user details)
  app.get("/api/admin/users/:id", authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await firebaseStorage.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Get user by ID error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/users/:id/verification", authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, notes } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const user = await firebaseStorage.updateUserVerificationStatus(req.params.id, status, notes);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
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
        // Use MongoDB for property stats
        const propertyStats = await mongoDBStorage.getLandlordStats(req.user!.uid);
        // Get contract stats from Firebase
        const mongoContracts = isMongoDBConnected() ? await mongoDBStorage.getContracts({ landlordId: req.user!.uid }) : [];
        const firebaseContracts = await firebaseStorage.getContracts({ landlordId: req.user!.uid });
        const contractsById = new Map<string, any>();
        [...mongoContracts, ...firebaseContracts].forEach((contract: any) => contractsById.set(contract.id, contract));
        const contracts = Array.from(contractsById.values());
        const activeContracts = contracts.filter(c => c.status === 'active');
        stats = {
          ...propertyStats,
          activeContracts: activeContracts.length,
          monthlyRevenue: activeContracts.reduce((sum, contract) => sum + Number(contract.monthlyRent || 0), 0),
        };
      } else if (req.user!.role === 'tenant') {
        stats = await firebaseStorage.getTenantStats(req.user!.uid);
      } else if (req.user!.role === 'admin') {
        // Get property count from MongoDB
        const allProperties = isMongoDBConnected() ? await mongoDBStorage.getProperties({}) : [];
        const mongoContracts = isMongoDBConnected() ? await mongoDBStorage.getContracts({}) : [];
        const firebaseContracts = await firebaseStorage.getContracts({});
        const contractsById = new Map<string, any>();
        [...mongoContracts, ...firebaseContracts].forEach((contract: any) => contractsById.set(contract.id, contract));
        const contracts = Array.from(contractsById.values());
        const adminStats = await firebaseStorage.getAdminStats();
        stats = {
          ...adminStats,
          totalProperties: isMongoDBConnected() ? allProperties.length : adminStats.totalProperties,
          totalContracts: contracts.length,
          activeContracts: contracts.filter(contract => contract.status === 'active').length,
        };
      }

      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      const emptyStats = {
        totalProperties: 0,
        activeContracts: 0,
        monthlyRevenue: 0,
        pendingVerifications: 0,
        currentRent: 0,
        contractStatus: 'none',
        nextPaymentDate: null,
        savedProperties: 0,
        totalUsers: 0,
        openDisputes: 0,
      };
      res.json(emptyStats);
    }
  });

  app.get("/api/dashboard/analytics", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.uid;
      const role = req.user!.role;
      const now = new Date();
      const months = Array.from({ length: 12 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
        return {
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
          month: date.toLocaleString("en-US", { month: "short" }),
          revenue: 0,
          properties: 0,
          contracts: 0,
          visitors: 0,
          payments: 0,
          savedProperties: 0,
        };
      });
      const monthMap = new Map(months.map((month) => [month.key, month]));

      const getMonthKey = (value: any) => {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      };

      type NumericAnalyticsField = "revenue" | "properties" | "contracts" | "visitors" | "payments" | "savedProperties";
      const addToMonth = (dateValue: any, field: NumericAnalyticsField, amount = 1) => {
        const key = getMonthKey(dateValue);
        if (!key || !monthMap.has(key)) return;
        const bucket = monthMap.get(key)!;
        bucket[field] += amount;
      };

      const getScopedContracts = async () => {
        const filters = role === 'tenant' ? { tenantId: userId } : role === 'landlord' ? { landlordId: userId } : {};
        const mongoContracts = isMongoDBConnected() ? await mongoDBStorage.getContracts(filters) : [];
        const firebaseContracts = await firebaseStorage.getContracts(filters);
        const byId = new Map<string, any>();
        [...mongoContracts, ...firebaseContracts].forEach((contract: any) => byId.set(contract.id, contract));
        return Array.from(byId.values());
      };

      if (role === 'landlord') {
        const properties = isMongoDBConnected()
          ? await mongoDBStorage.getPropertiesByLandlord(userId)
          : await firebaseStorage.getProperties({ landlordId: userId });
        const contracts = await getScopedContracts();
        const payments = await firebaseStorage.getPayments({ landlordId: userId });

        properties.forEach((property: any) => addToMonth(property.createdAt, "properties"));
        contracts.forEach((contract: any) => {
          addToMonth(contract.createdAt, "contracts");
          if (contract.status === "active") {
            addToMonth(contract.startDate ?? contract.createdAt, "revenue", Number(contract.monthlyRent || 0));
          }
        });
        payments
          .filter((payment: any) => payment.status === "paid")
          .forEach((payment: any) => addToMonth(payment.paidDate ?? payment.dueDate ?? payment.createdAt, "revenue", Number(payment.amount || 0)));
      } else if (role === 'tenant') {
        const contracts = await getScopedContracts();
        const payments = await firebaseStorage.getPayments({ tenantId: userId });
        const savedProperties = await firebaseStorage.getSavedProperties(userId);

        contracts.forEach((contract: any) => addToMonth(contract.createdAt, "contracts"));
        payments.forEach((payment: any) => {
          const paymentDate = payment.paidDate ?? payment.dueDate ?? payment.createdAt;
          addToMonth(paymentDate, "payments", Number(payment.amount || 0));
        });
        savedProperties.forEach((savedProperty: any) => addToMonth(savedProperty.createdAt, "savedProperties"));
      } else {
        const properties = isMongoDBConnected()
          ? await mongoDBStorage.getProperties({})
          : await firebaseStorage.getProperties({});
        const contracts = await getScopedContracts();
        const payments = await firebaseStorage.getPayments({});

        properties.forEach((property: any) => addToMonth(property.createdAt, "properties"));
        contracts.forEach((contract: any) => {
          addToMonth(contract.createdAt, "contracts");
          if (contract.status === "active") {
            addToMonth(contract.startDate ?? contract.createdAt, "revenue", Number(contract.monthlyRent || 0));
          }
        });
        payments
          .filter((payment: any) => payment.status === "paid")
          .forEach((payment: any) => addToMonth(payment.paidDate ?? payment.dueDate ?? payment.createdAt, "revenue", Number(payment.amount || 0)));
      }

      res.json(months);
    } catch (error) {
      console.error("Get dashboard analytics error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard analytics" });
    }
  });

  app.post("/api/properties/:id/save", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const savedProperty = await firebaseStorage.saveProperty(req.user!.uid, req.params.id);
      res.status(201).json(savedProperty);
    } catch (error) {
      console.error("Save property error:", error);
      res.status(500).json({ message: "Failed to save property" });
    }
  });
  // ==========================================
  // DISPUTE RESOLUTION ROUTES
  // ==========================================
  
  // Helper: get dispute storage (MongoDB primary, Firebase fallback)
  const getDisputeStorage = async () => {
    const isMongoConnected = isMongoDBConnected();
    if (isMongoConnected) {
      const { mongoDBDisputeStorage } = await import('./mongodb-disputes-storage');
      return { type: 'mongodb' as const, storage: mongoDBDisputeStorage };
    }
    return { type: 'firebase' as const, storage: firebaseStorage };
  };

  // Helper: get contract (MongoDB primary, Firebase fallback)
  const getContractForDispute = async (contractId: string) => {
    const isMongoConnected = isMongoDBConnected();
    if (isMongoConnected) {
      const contract = await mongoDBStorage.getContract(contractId);
      if (contract) return contract;
    }
    return firebaseStorage.getContractById(contractId);
  };

  // GET /api/disputes - List disputes (role-based filtering)
  app.get("/api/disputes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.query;
      const userId = req.user!.uid;
      const userRole = req.user!.role;

      const { type, storage } = await getDisputeStorage();

      if (type === 'mongodb') {
        const filters: any = {};

        // Role-based filtering: admin sees all, others see only disputes they're involved in
        if (userRole !== 'admin') {
          filters.userId = userId; // This triggers $or: [{raisedBy}, {againstUser}] in MongoDB storage
        }

        if (status && status !== 'all') {
          filters.status = status as string;
        }

        const disputes = await storage.getDisputes(filters);
        return res.json(disputes);
      } else {
        // Firebase fallback
        let disputes = await storage.getDisputes({});

        // Filter by user role
        if (userRole !== 'admin') {
          disputes = disputes.filter((d: any) =>
            d.raisedBy === userId || d.againstUser === userId
          );
        }

        // Filter by status
        if (status && status !== 'all') {
          disputes = disputes.filter((d: any) => d.status === status);
        }

        return res.json(disputes);
      }
    } catch (error) {
      console.error("Get disputes error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/disputes/:id - Get single dispute with messages and evidence
  app.get("/api/disputes/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      const userRole = req.user!.role;

      const { type, storage } = await getDisputeStorage();

      let dispute: any = null;

      if (type === 'mongodb') {
        dispute = await storage.getDispute(id);
      } else {
        dispute = await (storage as typeof firebaseStorage).getDisputeById(id);
      }

      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      // Authorization: only admin or involved parties can view
      if (userRole !== 'admin' && dispute.raisedBy !== userId && dispute.againstUser !== userId) {
        return res.status(403).json({ message: "You are not authorized to view this dispute" });
      }

      res.json(dispute);
    } catch (error) {
      console.error("Get dispute error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/disputes - Create a new dispute
  app.post("/api/disputes", authenticateToken, upload.array('files'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log("[Dispute] Received request body:", req.body);
      console.log("[Dispute] Received files:", req.files);
      console.log("[Dispute] User:", req.user?.uid);

      const { title, description, contractId, propertyId, category } = req.body;

      console.log("[Dispute] Parsed fields:", { title, description, contractId, propertyId, category });

      if (!title || !description || !contractId) {
        console.error("[Dispute] Missing required fields:", { title: !!title, description: !!description, contractId: !!contractId });
        return res.status(400).json({ message: "Title, description, and contract ID are required" });
      }

      // Get contract to find the againstUser (the other party)
      const contract = await getContractForDispute(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Determine againstUser (if raisedBy is landlord, againstUser is tenant, and vice versa)
      const raisedBy = req.user!.uid;
      const againstUser = contract.landlordId === raisedBy ? contract.tenantId : contract.landlordId;

      if (!againstUser) {
        return res.status(400).json({ message: "Could not determine the other party in the contract" });
      }

      // Process uploaded files as evidence
      const evidence: any[] = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          await validateUploadedFile(
            file,
            DOCUMENT_MIME_TYPES,
            MAX_DOCUMENT_SIZE,
            `File ${file.originalname} is not a valid type. Only JPEG, PNG, WebP images and PDF files are allowed.`,
          );
          const uploadedEvidence = await uploadFileToCloudinary(file, 'smartrent/disputes/evidence');
          evidence.push({
            fileName: file.originalname,
            filePath: uploadedEvidence.secure_url,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedBy: raisedBy,
            uploadedAt: new Date()
          });
        }
      }

      const disputeData: any = {
        contractId: String(contractId),
        raisedBy: String(raisedBy),
        againstUser: String(againstUser),
        title: String(title),
        description: String(description),
        status: 'open',
        evidence: evidence.length > 0 ? evidence : [],
      };

      if (propertyId) {
        disputeData.propertyId = String(propertyId);
      } else if (contract.propertyId) {
        disputeData.propertyId = String(contract.propertyId);
      }

      if (category) {
        disputeData.category = String(category);
      }

      console.log("[Dispute] Creating dispute with data:", JSON.stringify(disputeData, null, 2));

      if (!disputeData.contractId || !disputeData.raisedBy || !disputeData.againstUser || !disputeData.title || !disputeData.description) {
        return res.status(400).json({ message: "Missing required fields: contractId, raisedBy, againstUser, title, and description are required" });
      }

      const { type, storage } = await getDisputeStorage();

      let dispute: any;
      if (type === 'mongodb') {
        dispute = await storage.createDispute(disputeData);
      } else {
        dispute = await (storage as typeof firebaseStorage).createDispute(disputeData);
      }

      res.status(201).json(dispute);
    } catch (error: any) {
      console.error("Create dispute error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        errors: error.errors
      });

      // Clean up uploaded files if creation failed
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          await cleanupTempFile(file);
        }
      }

      let errorMessage = "Invalid data provided";
      if (error.errors && Array.isArray(error.errors)) {
        errorMessage = error.errors.map((e: any) => `${e.path?.join('.') || 'field'}: ${e.message}`).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }

      res.status(400).json({ message: errorMessage });
    }
  });

  // PUT /api/disputes/:id - Update dispute (status, resolution, assignment)
  app.put("/api/disputes/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      const userRole = req.user!.role;
      const updates = req.body;

      console.log("[Dispute] Update request:", { id, userId, userRole, updates });

      const { type, storage } = await getDisputeStorage();

      // Get the existing dispute first to check permissions
      let existingDispute: any = null;
      if (type === 'mongodb') {
        existingDispute = await storage.getDispute(id);
      } else {
        existingDispute = await (storage as typeof firebaseStorage).getDisputeById(id);
      }

      if (!existingDispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      // Authorization check
      const isInvolved = existingDispute.raisedBy === userId || existingDispute.againstUser === userId;
      const isAdmin = userRole === 'admin';

      if (!isAdmin && !isInvolved) {
        return res.status(403).json({ message: "You are not authorized to update this dispute" });
      }

      // Non-admin users can only close/withdraw their own dispute
      if (!isAdmin) {
        const allowedStatuses = ['closed'];
        if (updates.status && !allowedStatuses.includes(updates.status)) {
          return res.status(403).json({ message: "Only admins can change dispute status to " + updates.status });
        }
        // Non-admins can't set resolution or assign admins
        delete updates.resolution;
        delete updates.assignedAdmin;
        delete updates.resolvedBy;
      }

      // Build the update object
      const updateData: any = {};
      if (updates.status) updateData.status = updates.status;
      if (updates.resolution) updateData.resolution = updates.resolution;
      if (updates.assignedAdmin) updateData.assignedAdmin = updates.assignedAdmin;

      // If resolving, record who resolved and when
      if (updates.status === 'resolved' || updates.status === 'closed' || updates.status === 'rejected') {
        updateData.resolvedBy = userId;
        updateData.resolvedAt = new Date();
      }

      let updatedDispute: any;
      if (type === 'mongodb') {
        updatedDispute = await storage.updateDispute(id, updateData);
      } else {
        updatedDispute = await (storage as typeof firebaseStorage).updateDispute(id, updateData);
      }

      if (!updatedDispute) {
        return res.status(500).json({ message: "Failed to update dispute" });
      }

      res.json(updatedDispute);
    } catch (error: any) {
      console.error("Update dispute error:", error);
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  // POST /api/disputes/:id/messages - Add a message to a dispute
  app.post("/api/disputes/:id/messages", authenticateToken, upload.array('attachments'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      const userRole = req.user!.role;
      const { message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const { type, storage } = await getDisputeStorage();

      // Get dispute to check authorization
      let dispute: any = null;
      if (type === 'mongodb') {
        dispute = await storage.getDispute(id);
      } else {
        dispute = await (storage as typeof firebaseStorage).getDisputeById(id);
      }

      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      // Authorization: only admin or involved parties can message
      const isInvolved = dispute.raisedBy === userId || dispute.againstUser === userId;
      const isAdmin = userRole === 'admin';

      if (!isAdmin && !isInvolved) {
        return res.status(403).json({ message: "You are not authorized to message on this dispute" });
      }

      // Check if dispute is still open for messages
      if (['resolved', 'closed', 'rejected'].includes(dispute.status)) {
        return res.status(400).json({ message: "Cannot add messages to a " + dispute.status + " dispute" });
      }

      // Process attachments
      const attachments: any[] = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          await validateUploadedFile(
            file,
            DOCUMENT_MIME_TYPES,
            MAX_DOCUMENT_SIZE,
            `File ${file.originalname} is not a valid type. Only JPEG, PNG, WebP images and PDF files are allowed.`,
          );
          const uploadedAttachment = await uploadFileToCloudinary(file, 'smartrent/disputes/messages');
          attachments.push({
            fileName: file.originalname,
            filePath: uploadedAttachment.secure_url,
            fileSize: file.size,
            mimeType: file.mimetype,
          });
        }
      }

      // Get sender name from user profile
      let senderName = req.user!.fullName || req.user!.email || 'Unknown User';
      try {
        const userProfile = await firebaseStorage.getUserById(userId);
        if (userProfile) {
          senderName = userProfile.fullName || userProfile.email;
        }
      } catch (e) {
        // Use fallback name
      }

      const messageData = {
        senderId: userId,
        senderName,
        senderRole: userRole,
        message: message.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      if (type === 'mongodb') {
        const { mongoDBDisputeStorage } = await import('./mongodb-disputes-storage');
        const updatedDispute = await mongoDBDisputeStorage.addMessage(id, messageData);
        if (!updatedDispute) {
          return res.status(500).json({ message: "Failed to add message" });
        }
        return res.json(updatedDispute);
      } else {
        // Firebase fallback: update the dispute with a new message in the messages array
        const existingMessages = (dispute as any).messages || [];
        const newMessage = {
          ...messageData,
          createdAt: new Date(),
        };
        existingMessages.push(newMessage);

        const updatedDispute = await (storage as typeof firebaseStorage).updateDispute(id, {
          messages: existingMessages,
        } as any);
        return res.json(updatedDispute);
      }
    } catch (error: any) {
      console.error("Add dispute message error:", error);
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          await cleanupTempFile(file);
        }
      }
      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  // POST /api/disputes/:id/evidence - Add evidence to a dispute
  app.post("/api/disputes/:id/evidence", authenticateToken, upload.array('files'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      const userRole = req.user!.role;

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "At least one file is required" });
      }

      const { type, storage } = await getDisputeStorage();

      // Get dispute to check authorization
      let dispute: any = null;
      if (type === 'mongodb') {
        dispute = await storage.getDispute(id);
      } else {
        dispute = await (storage as typeof firebaseStorage).getDisputeById(id);
      }

      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      // Authorization: only admin or involved parties can add evidence
      const isInvolved = dispute.raisedBy === userId || dispute.againstUser === userId;
      const isAdmin = userRole === 'admin';

      if (!isAdmin && !isInvolved) {
        return res.status(403).json({ message: "You are not authorized to add evidence to this dispute" });
      }

      // Process files
      let updatedDispute: any = dispute;
      for (const file of req.files) {
        await validateUploadedFile(
          file,
          DOCUMENT_MIME_TYPES,
          MAX_DOCUMENT_SIZE,
          `File ${file.originalname} is not a valid type.`,
        );
        const uploadedEvidence = await uploadFileToCloudinary(file, 'smartrent/disputes/evidence');
        const evidenceData = {
          fileName: file.originalname,
          filePath: uploadedEvidence.secure_url,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: userId,
        };

        if (type === 'mongodb') {
          const { mongoDBDisputeStorage } = await import('./mongodb-disputes-storage');
          updatedDispute = await mongoDBDisputeStorage.addEvidence(id, evidenceData);
        } else {
          const existingEvidence = (dispute as any).evidence || [];
          existingEvidence.push({ ...evidenceData, uploadedAt: new Date() });
          updatedDispute = await (storage as typeof firebaseStorage).updateDispute(id, {
            evidence: existingEvidence,
          } as any);
        }
      }

      res.json(updatedDispute);
    } catch (error: any) {
      console.error("Add dispute evidence error:", error);

      // Clean up uploaded files on error
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          await cleanupTempFile(file);
        }
      }

      res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
