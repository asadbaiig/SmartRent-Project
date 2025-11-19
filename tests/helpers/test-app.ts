import express, { type Express } from 'express';

// Create a test app instance without importing routes directly
// This avoids module linking issues
export async function createTestApp(): Promise<Express> {
  // Use dynamic import to avoid module linking issues
  const { registerRoutes } = await import('../../server/routes');
  
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  await registerRoutes(app);
  
  return app;
}
