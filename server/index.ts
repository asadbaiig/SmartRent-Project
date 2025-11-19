import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import "./firebase"; // Initialize Firebase
import { connectMongoDB } from "./mongodb"; // Initialize MongoDB
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Load environment variables from .env file (optional)
  try {
    await import('dotenv/config');
  } catch {
    // dotenv is optional - MongoDB will use default connection string
  }

  // Initialize MongoDB connection (non-blocking)
  log('[Server] Attempting to connect to MongoDB...');
  connectMongoDB().then(connected => {
    if (connected) {
      log('[Server] ✅ MongoDB connected successfully!');
    } else {
      log('[Server] ⚠️  MongoDB not available - using fallback data sources');
      log('[Server]    Make sure MongoDB service is running: Get-Service MongoDB');
    }
  }).catch(error => {
    log('[Server] ❌ MongoDB connection error:', error.message);
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Serve uploads folder as static files - must be before Vite middleware
  const uploadsPath = path.resolve(process.cwd(), "uploads");
  app.use('/uploads', express.static(uploadsPath));

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // Check for development mode: NODE_ENV or if dist/public doesn't exist
  const fs = await import('fs');
  const distPath = path.resolve(process.cwd(), "dist", "public");
  const distExists = fs.existsSync(distPath);
  const isDev = process.env.NODE_ENV === "development" || app.get("env") === "development" || !distExists;
  
  if (isDev) {
    log("Running in DEVELOPMENT mode with Vite dev server");
    await setupVite(app, server);
  } else {
    log("Running in PRODUCTION mode with static files");
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
