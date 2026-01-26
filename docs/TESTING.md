# Testing Infrastructure

This document describes the testing setup and conventions for the repository.

## Test Frameworks

### Unit Tests - Vitest
The project uses [Vitest](https://vitest.dev/) for unit testing.

**Configuration**: `vitest.config.ts`

**Running tests:**
```bash
npm test                # Run all unit tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

**Test files location**: 
- Co-located with source files: `src/**/*.test.ts` or `src/**/*.test.tsx`
- Test setup: `src/test/setup.ts`

### E2E Tests - Playwright
The project uses [Playwright](https://playwright.dev/) for end-to-end testing.

**Configuration**: `playwright.config.ts`

**Running tests:**
```bash
npm run test:e2e           # Run all E2E tests
npm run test:e2e:ui        # Run tests with UI mode
npm run test:e2e:report    # View test report
```

**Test files location**: 
- `tests/e2e/**/*.spec.ts`

**Browsers tested**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myFunction } from './my-module';

describe('MyModule', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should display page correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading')).toBeVisible();
});
```

## Test Coverage

### Current Test Files

#### Unit Tests
1. `src/components/VideoInput.test.tsx` - Video input component tests
2. `src/lib/gemini.test.ts` - Gemini AI integration tests
3. `src/lib/logger.test.ts` - Winston logger tests
4. `src/lib/secrets.test.ts` - Secrets manager tests
5. `src/lib/queue.test.ts` - RabbitMQ queue tests

#### E2E Tests
1. `tests/e2e/video-analysis.spec.ts` - Video analysis flow tests

### Coverage Goals
- Aim for >80% code coverage for critical paths
- All new features should include tests
- Bug fixes should include regression tests

## Mocking

### Mocking Modules with Vitest

```typescript
vi.mock('./logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));
```

### Mocking Environment Variables

```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.stubEnv('MY_VAR', 'test-value');
});

afterEach(() => {
  vi.unstubAllEnvs();
});
```

## CI Integration

Tests run automatically on:
- Pull requests
- Push to main branch
- Manual workflow dispatch

See `.github/workflows/` for CI configuration.

## Troubleshooting

### Tests Failing Locally
1. Ensure dependencies are installed: `npm install`
2. Clear cache: `npx vitest --clearCache`
3. Check environment variables are set correctly

### E2E Tests Failing
1. Ensure the development server is running
2. Check browser installation: `npx playwright install`
3. Verify network connectivity

### Slow Tests
- Use `test.concurrent` for independent tests
- Mock external API calls
- Use `beforeAll` instead of `beforeEach` when possible

## Best Practices

1. **Test Naming**: Use descriptive names that explain what is being tested
2. **Test Independence**: Each test should be independent and not rely on others
3. **Arrange-Act-Assert**: Follow the AAA pattern for test structure
4. **Mock External Dependencies**: Mock APIs, databases, and external services
5. **Test Edge Cases**: Don't just test happy paths
6. **Keep Tests Fast**: Use mocks to avoid slow operations
7. **One Assertion per Test**: When possible, test one thing at a time
8. **Clean Up**: Always clean up resources in `afterEach` or `afterAll`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
