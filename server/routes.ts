import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { firebaseStorage } from "./firebase-storage";
import { mongoDBStorage } from "./mongodb-storage";
import { authenticateToken, requireRole, firebaseAuth, type AuthenticatedRequest } from "./firebase-auth";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { insertUserSchema, insertPropertySchema, insertContractSchema, insertPaymentSchema, insertDocumentSchema, insertDisputeSchema } from "@shared/schema";

const upload = multer({ dest: 'uploads/' });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Helper: load properties from dataset folder (JSON or CSV)
  async function loadDatasetProperties(): Promise<any[]> {
    try {
      const datasetDir = path.resolve(process.cwd(), "server", "dataset");
      console.log("[Dataset] Looking in:", datasetDir);
      const entries = await fs.readdir(datasetDir);
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
        // CSV: first line headers. Limit to first 200 lines to avoid memory issues.
        const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 200);
        if (lines.length === 0) return [];
        const splitCsv = (line: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"' ) {
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
        for (let i = 1; i < lines.length && items.length < 50; i++) {
          const cols = splitCsv(lines[i]);
          const obj: any = {};
          headers.forEach((h, idx) => (obj[h] = cols[idx]));
          // Map your specific CSV columns
          const propertyId = getVal(cols, ["property_id", "id"], "");
          const city = getVal(cols, ["city"], "");
          const area = getVal(cols, ["location", "locality", "area"], "");
          const province = getVal(cols, ["province_name", "province"], "");
          const typeRaw = getVal(cols, ["property_type", "propertytype", "type"], "apartment");
          const type = typeRaw.toString().toLowerCase();
          const bedrooms = getVal(cols, ["bedrooms", "beds"], "");
          const bathrooms = getVal(cols, ["baths", "bathrooms"], "");
          const sqft = getVal(cols, ["area_sqft", "sqft", "size"], "");
          const priceRaw = getVal(cols, ["price"], "0");
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
          // Convert sale price to monthly rent estimate (divide by 240 months = 20 years)
          const priceNum = parseFloat(priceRaw.toString().replace(/[^\d.]/g, "")) || 0;
          const rent = priceNum > 0 ? Math.round(priceNum / 240).toString() : "0";
          const address = getVal(cols, ["location", "locality"], "");
          const agent = getVal(cols, ["agent"], "");
          if (i === 1 && agent) {
            console.log("[Dataset] First property agent:", agent);
          }
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
      
      const mapped = items.slice(0, 50).map((p, idx) => {
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
      const validatedData = insertUserSchema.parse(req.body);
      
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
      console.log("[API /properties] Dataset returned", datasetItems.length, "items");
      
      // Merge: MongoDB properties first, then dataset properties
      const allProperties = [...mongoProperties, ...datasetItems];
      console.log("[API /properties] Total combined:", allProperties.length, "properties");
      
      res.setHeader("Cache-Control", "no-store");
      
      if (allProperties.length > 0) {
        const sliced = allProperties.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 20));
        console.log("[API /properties] Returning", sliced.length, "items");
        return res.json(sliced);
      }
      
      // Only if both sources are empty, use demo data
      if (allProperties.length === 0) {
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
            amenities: ["Lift","Parking","Security"],
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
            amenities: ["Garden","Car Porch","Security"],
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
            amenities: ["Generator","Fiber Internet","Lift"],
            images: ["https://images.unsplash.com/photo-1524758631624-e2822e304c36"],
            isAvailable: true,
          },
        ];
        return res.json(demo.slice(0, Number(limit) || 20));
      }
      res.json(properties);
    } catch (error) {
      console.error("Get properties error:", error);
      // Gracefully degrade to dataset
      console.log("[API /properties] Error, loading from dataset...");
      res.setHeader("Cache-Control", "no-store");
      const ds = await loadDatasetProperties();
      console.log("[API /properties] Dataset returned", ds.length, "items in catch block");
      if (ds.length > 0) {
        const sliced = ds.slice(Number(req.query.offset || 0), Number(req.query.offset || 0) + Number(req.query.limit || 20));
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

      const targetCities = ["islamabad", "lahore", "karachi"];
      const cityCounts: Record<string, number> = { islamabad: 0, lahore: 0, karachi: 0 };
      const mapProperties: any[] = [];

      // Read through CSV to find properties from target cities
      for (let i = 1; i < lines.length && (cityCounts.islamabad < 20 || cityCounts.lahore < 20 || cityCounts.karachi < 20); i++) {
        const cols = splitCsv(lines[i]);
        const city = getVal(cols, ["city"], "").toLowerCase().trim();
        
        // Check if this city is one we want and we need more
        if (targetCities.includes(city) && cityCounts[city] < 20) {
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
          amenities: ["Lift","Parking","Security"],
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
          amenities: ["Garden","Car Porch","Security"],
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
          amenities: ["Generator","Fiber Internet","Lift"],
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
      if (contracts.length === 0 && !isMongoDBConnected()) {
        contracts = await firebaseStorage.getContracts(filters);
      }
      
      res.json(contracts);
    } catch (error) {
      console.error("Get contracts error:", error);
      // Fallback to Firebase on error
      try {
        const filters: any = {};
        if (req.user!.role === 'landlord') {
          filters.landlordId = req.user!.uid;
        } else if (req.user!.role === 'tenant') {
          filters.tenantId = req.user!.uid;
        }
        const contracts = await firebaseStorage.getContracts(filters);
        res.json(contracts);
      } catch (fallbackError) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.post("/api/contracts", authenticateToken, requireRole(['landlord']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertContractSchema.parse({
        ...req.body,
        landlordId: req.user!.uid,
      });
      
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

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        await fs.unlink(req.file.path);
        return res.status(400).json({ message: "Only JPEG, PNG, WebP images and PDF files are allowed" });
      }

      // Validate file size (10MB max for receipts)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (req.file.size > maxSize) {
        await fs.unlink(req.file.path);
        return res.status(400).json({ message: "File size must be less than 10MB" });
      }

      // Get payment ID from request body if provided
      const { paymentId, contractId } = req.body;

      // Store receipt as document in MongoDB
      const fileUrl = `/uploads/${path.basename(req.file.path)}`;
      const documentData = {
        userId: req.user!.uid,
        contractId: contractId || undefined,
        type: 'payment_receipt',
        fileName: req.file.originalname,
        filePath: fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        isVerified: false,
      };

      const receipt = await mongoDBStorage.createDocument(documentData);

      res.status(200).json({
        success: true,
        receipt: {
          id: receipt.id,
          url: fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        },
      });
    } catch (error: any) {
      console.error("Receipt upload error:", error);
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
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

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        // Delete the uploaded file
        await fs.unlink(req.file.path);
        return res.status(400).json({ message: "Only JPEG, PNG, and WebP images are allowed" });
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        await fs.unlink(req.file.path);
        return res.status(400).json({ message: "File size must be less than 5MB" });
      }

      // Return the file URL
      const fileUrl = `/uploads/${path.basename(req.file.path)}`;
      res.status(200).json({
        success: true,
        url: fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Documents routes
  app.post("/api/documents", authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const documentData = {
        userId: req.user!.uid,
        type: req.body.type,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        propertyId: req.body.propertyId || null,
        contractId: req.body.contractId || null,
      };

      // Store in MongoDB
      const document = await mongoDBStorage.createDocument(documentData);
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
      const user = await firebaseStorage.updateUserVerificationStatus(req.params.id, status);
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
        const contracts = await firebaseStorage.getContracts({ landlordId: req.user!.uid });
        stats = {
          ...propertyStats,
          activeContracts: contracts.filter(c => c.status === 'active').length,
        };
      } else if (req.user!.role === 'tenant') {
        stats = await firebaseStorage.getTenantStats(req.user!.uid);
      } else if (req.user!.role === 'admin') {
        // Get property count from MongoDB
        const allProperties = await mongoDBStorage.getProperties({});
        const adminStats = await firebaseStorage.getAdminStats();
        stats = {
          ...adminStats,
          totalProperties: allProperties.length,
        };
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      // Fallback: return dummy stats instead of 500 error
      const dummyStats = {
        totalProperties: 65,
        activeContracts: 45,
        monthlyRevenue: 670000,
        pendingVerifications: 12,
        currentRent: 35000,
        contractStatus: 'active',
        nextPaymentDate: '2025-12-20',
        savedProperties: 8,
        totalUsers: 1150,
        openDisputes: 3,
      };
      res.json(dummyStats);
    }
  });
  // Disputes routes
  app.get("/api/disputes", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filters: any = {};
      
      if (req.user!.role !== 'admin') {
        filters.raisedBy = req.user!.uid;
      }
      
      const disputes = await firebaseStorage.getDisputes(filters);
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
        raisedBy: req.user!.uid,
      });
      
      const dispute = await firebaseStorage.createDispute(validatedData);
      res.status(201).json(dispute);
    } catch (error) {
      console.error("Create dispute error:", error);
      res.status(400).json({ message: "Invalid data provided" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
