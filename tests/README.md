# Test Suite for SmartRent API

This directory contains comprehensive test cases for the SmartRent API endpoints.

## Test Structure

```
tests/
├── __mocks__/              # Mock implementations for external dependencies
│   ├── firebase-auth.ts
│   ├── firebase-storage.ts
│   ├── mongodb-storage.ts
│   └── mongodb-disputes-storage.ts
├── api/                    # API endpoint tests
│   ├── auth.test.ts        # Authentication endpoints
│   ├── properties.test.ts  # Property CRUD operations
│   ├── contracts.test.ts   # Contract management
│   ├── payments.test.ts    # Payment processing
│   ├── documents.test.ts   # Document upload/management
│   ├── disputes.test.ts    # Dispute resolution
│   ├── admin.test.ts       # Admin operations
│   └── dashboard.test.ts   # Dashboard statistics
├── helpers/                # Test utilities
│   └── test-app.ts         # Test app factory
├── setup.ts                # Test setup configuration
└── README.md               # This file
```

## Running Tests

### Install Dependencies

First, make sure all dependencies are installed:

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage Report

To get the detailed coverage report with percentages and uncovered lines (like the example shown):

```bash
npm run test:coverage
```

**Windows (PowerShell):**
```powershell
npm run test:coverage
```

**Linux/Mac:**
```bash
npm run test:coverage
```

This will generate:
- **Terminal output**: A detailed table showing coverage percentages (Statements, Branches, Functions, Lines) for each file, with uncovered line numbers
- **HTML report**: Detailed interactive report at `coverage/index.html`
- **LCOV report**: Machine-readable coverage data at `coverage/lcov.info`

### Run Specific Test File

```bash
npm test -- tests/api/auth.test.ts
```

### Coverage Report Format

The coverage report will show a table like this:

```
File                    | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------------|---------|----------|---------|---------|------------------
All files               |    XX.XX |     XX.XX |   XX.XX |   XX.XX |
 server/routes.ts       |    XX.XX |     XX.XX |   XX.XX |   XX.XX | 12-13, 19, 26-37
 server/storage.ts      |   XXX.XX |    XXX.XX |  XXX.XX |  XXX.XX |
```

Files with 100% coverage will not show uncovered lines. Files with partial coverage will list specific line numbers that need testing.

## Test Coverage

The test suite covers:

### Authentication API (`/api/auth`)
- ✅ User registration
- ✅ User login
- ✅ User signout
- ✅ Get current user info
- ✅ Validation and error handling

### Properties API (`/api/properties`)
- ✅ List properties with filters (city, type, rent range, bedrooms)
- ✅ Get single property by ID
- ✅ Create new property (landlord only)
- ✅ Update property (owner only)
- ✅ Delete property (owner only)
- ✅ Authorization checks

### Contracts API (`/api/contracts`)
- ✅ List contracts (role-based filtering)
- ✅ Create new contract (landlord only)
- ✅ Update contract status
- ✅ Permission validation

### Payments API (`/api/payments`)
- ✅ List payments (role-based filtering)
- ✅ Create new payment
- ✅ Update payment status
- ✅ Payment validation

### Documents API (`/api/documents`)
- ✅ Upload document
- ✅ List user documents
- ✅ Get documents by property
- ✅ File validation

### Disputes API (`/api/disputes`)
- ✅ List disputes (role-based filtering)
- ✅ Get single dispute
- ✅ Create new dispute
- ✅ Update dispute status
- ✅ Add messages to dispute
- ✅ Add evidence to dispute
- ✅ Access control

### Admin API (`/api/admin`)
- ✅ List all users (admin only)
- ✅ Update user verification status
- ✅ Admin authorization

### Dashboard API (`/api/dashboard/stats`)
- ✅ Landlord dashboard stats
- ✅ Tenant dashboard stats
- ✅ Admin dashboard stats
- ✅ Error handling and fallbacks

## Mocking Strategy

The tests use mocks for:
- **Firebase Auth**: Authentication and user management
- **Firebase Storage**: Firestore operations
- **MongoDB Storage**: Property and document storage
- **MongoDB Disputes Storage**: Dispute management

This allows tests to run without requiring:
- Active Firebase connection
- Active MongoDB connection
- External API dependencies

## Test Data

Test data is generated within each test case to ensure:
- Tests are isolated and independent
- No side effects between tests
- Predictable test outcomes

## Writing New Tests

When adding new tests:

1. **Follow the existing pattern**: Use the same structure as existing test files
2. **Mock external dependencies**: Use the existing mocks or create new ones
3. **Test both success and failure cases**: Include error scenarios
4. **Test authorization**: Verify role-based access control
5. **Test validation**: Check input validation and error messages

### Example Test Structure

```typescript
describe('API Endpoint', () => {
  let app: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/endpoint', () => {
    it('should return expected data', async () => {
      // Arrange
      mockFunction.mockResolvedValueOnce(mockData);

      // Act
      const response = await request(app)
        .get('/api/endpoint')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('expectedField');
      expect(mockFunction).toHaveBeenCalled();
    });
  });
});
```

## Troubleshooting

### Tests fail with "Cannot find module"
- Ensure all dependencies are installed: `npm install`
- Check that module paths in `jest.config.js` are correct

### Tests timeout
- Increase `testTimeout` in `jest.config.js` if needed
- Check for hanging async operations in tests

### Mock not working
- Ensure mocks are placed in `tests/__mocks__/` directory
- Verify mock names match the actual module paths
- Check that `jest.mock()` is called before imports

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- No external dependencies required
- Fast execution
- Deterministic results
- Comprehensive coverage

