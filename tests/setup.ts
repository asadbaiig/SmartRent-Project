// Test setup file
// This runs before all tests

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '5003';

// Suppress console logs during tests (optional - comment out if you want to see logs)
const originalLog = console.log;
const originalError = console.error;

beforeAll(() => {
  console.log = vi.fn();
  console.error = vi.fn();
});

afterAll(() => {
  console.log = originalLog;
  console.error = originalError;
});

// Note: We don't reset modules here as it causes "Jest environment torn down" errors
// Mocks are handled at the test file level
