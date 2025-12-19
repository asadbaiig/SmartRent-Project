# Testing Guide - SmartRent Project

## Quick Start

To run tests and get the coverage report output:

```bash
npm run test:coverage
```

## Expected Output Format

When you run `npm run test:coverage`, you should see output similar to:

```
Test Suites: 9 passed, 9 total
Tests:       42 passed, 42 total
Snapshots:   0 total
Time:        22.395 s

File                    | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------------|---------|----------|---------|---------|------------------
All files               |    XX.XX |     XX.XX |   XX.XX |   XX.XX |
 server/routes.ts       |    XX.XX |     XX.XX |   XX.XX |   XX.XX | 12-13, 19, 26-37
 server/storage.ts      |   XXX.XX |    XXX.XX |  XXX.XX |  XXX.XX |
 server/firebase-auth.ts|   XXX.XX |    XXX.XX |  XXX.XX |  XXX.XX |
```

## Test Structure

### Test Files Created

1. **tests/api/auth.test.ts** - Authentication endpoints
   - User registration
   - User login
   - User signout
   - Get current user

2. **tests/api/properties.test.ts** - Property management
   - List properties with filters
   - Get single property
   - Create property
   - Update property
   - Delete property

3. **tests/api/contracts.test.ts** - Contract management
   - List contracts
   - Create contract
   - Update contract

4. **tests/api/payments.test.ts** - Payment processing
   - List payments
   - Create payment
   - Update payment

5. **tests/api/documents.test.ts** - Document management
   - Upload document
   - List documents
   - Get documents by property

6. **tests/api/disputes.test.ts** - Dispute resolution
   - List disputes
   - Get dispute
   - Create dispute
   - Update dispute
   - Add messages
   - Add evidence

7. **tests/api/admin.test.ts** - Admin operations
   - List users
   - Update user verification

8. **tests/api/dashboard.test.ts** - Dashboard statistics
   - Landlord stats
   - Tenant stats
   - Admin stats

## Understanding Coverage Metrics

- **Statements**: Percentage of code statements executed
- **Branches**: Percentage of conditional branches tested (if/else, switch cases)
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

## Coverage Goals

- Aim for at least 80% coverage across all metrics
- Critical paths (authentication, payments) should have 90%+ coverage
- Error handling should be thoroughly tested

## Viewing HTML Coverage Report

After running `npm run test:coverage`, open:

```
coverage/index.html
```

This provides an interactive report where you can:
- Click on files to see which lines are covered/uncovered
- See detailed branch coverage
- Navigate through the codebase

## Troubleshooting

### Tests not running

1. Make sure dependencies are installed:
   ```bash
   npm install
   ```

2. Check Node.js version (should be 18+):
   ```bash
   node --version
   ```

### Coverage not showing

Make sure you're using the coverage flag:
```bash
npm run test:coverage
```

Not just:
```bash
npm test
```

### Module resolution errors

If you see "Cannot find module" errors:
1. Check that all mocks are in `tests/__mocks__/`
2. Verify module paths in `jest.config.js`
3. Ensure `@shared` alias is correctly configured

## Adding New Tests

When adding new API endpoints:

1. Create a test file in `tests/api/`
2. Follow the existing test structure
3. Mock external dependencies
4. Test both success and error cases
5. Test authorization/authentication
6. Run `npm run test:coverage` to verify coverage

## Continuous Integration

These tests are designed to run in CI/CD:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm run test:coverage
```

The tests:
- Don't require external services (Firebase, MongoDB)
- Run quickly (< 30 seconds)
- Provide detailed coverage reports
- Fail fast on errors

