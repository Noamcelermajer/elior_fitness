# Elior Fitness E2E Test Suite

Comprehensive end-to-end testing using Playwright for the Elior Fitness application.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Configuration](#configuration)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This test suite provides comprehensive E2E testing coverage for:

- ✅ Authentication & Authorization (3 roles)
- ✅ Admin functionality (user management, system monitoring)
- ✅ Trainer workflows (exercise bank, workouts, meal plans, client management)
- ✅ Client workflows (workout viewing/completion, meal tracking, progress logging)
- ✅ File management (profile photos, progress photos, meal photos)
- ✅ Real-time notifications (WebSocket)
- ✅ Visual regression testing
- ✅ Smoke tests for critical paths

**Total Tests: 75+**

## 🔧 Prerequisites

1. **Docker Desktop** installed and running
2. **Node.js** 18+ installed
3. **Application running** at `http://localhost:8000`

### Starting the Application

```bash
# From project root
docker-compose up --build
```

Wait for the application to be fully started before running tests.

## 📦 Installation

```bash
# From project root
cd tests/e2e

# Install dependencies
npm install

# Install Playwright browsers (already done if you followed setup)
npx playwright install
```

## 🚀 Running Tests

### Full Test Suite

```bash
# Run all tests across all browsers
npx playwright test

# Run with UI mode (interactive)
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed
```

### Smoke Tests Only (~3-5 minutes)

```bash
npx playwright test specs/00-smoke/
```

### By Category

```bash
# Authentication tests
npx playwright test specs/01-auth/

# Admin tests
npx playwright test specs/02-admin/

# Trainer tests
npx playwright test specs/03-trainer/

# Client tests
npx playwright test specs/04-client/

# File management tests
npx playwright test specs/05-file-management/

# Real-time tests
npx playwright test specs/06-realtime/

# Visual regression tests
npx playwright test specs/07-visual-regression/
```

### Single Test File

```bash
npx playwright test specs/03-trainer/exercise-bank.spec.ts
```

### Specific Browser

```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# WebKit only
npx playwright test --project=webkit
```

### Debug Mode

```bash
# Debug a specific test
npx playwright test specs/01-auth/login.spec.ts --debug

# Debug with inspector
npx playwright test --debug
```

## 📁 Test Structure

```
tests/e2e/
├── playwright.config.ts       # Main configuration
├── global.setup.ts           # Global setup (verification)
├── fixtures/
│   ├── auth.fixture.ts       # Authentication fixtures
│   ├── test-data.ts          # Test data factory
│   └── page-objects/         # Page Object Models
│       ├── LoginPage.ts
│       ├── AdminDashboard.ts
│       ├── TrainerDashboard.ts
│       ├── ClientDashboard.ts
│       ├── WorkoutPages.ts
│       ├── NutritionPages.ts
│       └── ProgressPages.ts
├── utils/
│   ├── api-helpers.ts        # API utility functions
│   ├── test-helpers.ts       # General test utilities
│   └── visual-regression.ts  # Visual testing utilities
└── specs/
    ├── 00-smoke/             # Quick smoke tests
    ├── 01-auth/              # Authentication tests
    ├── 02-admin/             # Admin functionality
    ├── 03-trainer/           # Trainer workflows
    ├── 04-client/            # Client workflows
    ├── 05-file-management/   # File uploads
    ├── 06-realtime/          # WebSocket tests
    └── 07-visual-regression/ # Visual tests
```

## ✍️ Writing Tests

### Using Fixtures

```typescript
import { test, expect } from '../../fixtures/auth.fixture';

test('my test', async ({ trainerPage, trainerToken, clientUser }) => {
  // trainerPage - browser page logged in as trainer
  // trainerToken - JWT token for API calls
  // clientUser - test client user object
});
```

### Using Page Objects

```typescript
import { WorkoutPages } from '../../fixtures/page-objects/WorkoutPages';

test('create workout', async ({ trainerPage }) => {
  const workoutPages = new WorkoutPages(trainerPage);
  
  await workoutPages.gotoCreateWorkout();
  await workoutPages.createWorkoutPlan({
    name: 'Test Workout',
    description: 'Test',
    clientId: '1',
  });
});
```

### Using Test Data

```typescript
import { TEST_DATA } from '../../fixtures/test-data';

test('create exercise', async ({ request, trainerToken }) => {
  const exerciseData = TEST_DATA.exercise.basic();
  const exercise = await createExercise(request, trainerToken, exerciseData);
  
  expect(exercise.name).toBe(exerciseData.name);
});
```

### API Testing

```typescript
import { createWorkoutPlan, deleteWorkoutPlan } from '../../utils/api-helpers';

test('workout via API', async ({ request, trainerToken, clientUser }) => {
  const workout = await createWorkoutPlan(
    request,
    trainerToken,
    TEST_DATA.workoutPlan.basic(clientUser.id)
  );
  
  expect(workout).toHaveProperty('id');
  
  // Cleanup
  await deleteWorkoutPlan(request, trainerToken, workout.id);
});
```

## ⚙️ Configuration

### playwright.config.ts

Key settings:

- **Base URL**: `http://localhost:8000`
- **Timeout**: 30 seconds per test
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: On failure
- **Video**: On retry
- **Browsers**: Chromium, Firefox, WebKit

### Test Users

```typescript
// Available in TEST_USERS constant
admin@elior.com / admin123
trainer@elior.com / trainer123
client@elior.com / client123
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start Docker
        run: docker-compose up -d --build
      
      - name: Wait for app
        run: npx wait-on http://localhost:8000/health
      
      - name: Install dependencies
        run: cd tests/e2e && npm ci
      
      - name: Run smoke tests
        run: cd tests/e2e && npx playwright test specs/00-smoke/
      
      - name: Run full tests
        run: cd tests/e2e && npx playwright test
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: tests/e2e/test-results/
```

### Test Reports

Reports are generated in:
- `test-results/html/` - HTML report
- `test-results/results.json` - JSON report
- `test-results/junit.xml` - JUnit XML

View HTML report:

```bash
npx playwright show-report test-results/html
```

## 🐛 Troubleshooting

### Application Not Running

```
Error: connect ECONNREFUSED 127.0.0.1:8000
```

**Solution**: Ensure Docker is running:

```bash
docker-compose up --build
```

### Browser Not Installed

```
Error: Executable doesn't exist at /path/to/browser
```

**Solution**: Install browsers:

```bash
npx playwright install
```

### Test Failures

1. **Check application logs**:
   ```bash
   docker-compose logs -f
   ```

2. **Run in headed mode** to see what's happening:
   ```bash
   npx playwright test --headed
   ```

3. **Use debug mode**:
   ```bash
   npx playwright test --debug
   ```

4. **Check screenshots** in `test-results/` folder

### Timeout Errors

If tests are timing out:

1. Increase timeout in `playwright.config.ts`
2. Check if application is slow to respond
3. Verify network connectivity

### Visual Regression Failures

To update visual baselines:

```bash
npx playwright test --update-snapshots
```

### Database Issues

Reset the database:

```bash
docker-compose down -v
docker-compose up --build
```

## 📊 Test Coverage

| Category | Tests | Coverage |
|----------|-------|----------|
| Authentication | 10+ | Login, Registration, Role Access |
| Admin | 8+ | User Management, Trainer Creation, System |
| Trainer | 30+ | Exercises, Workouts, Meal Plans, Clients |
| Client | 20+ | Viewing, Completions, Progress, Meals |
| File Management | 6+ | Profile, Progress, Meal Photos |
| Real-time | 4+ | WebSocket, Notifications |
| Visual Regression | 10+ | UI Components, Pages |
| Smoke Tests | 8+ | Critical Paths |

## 🎯 Best Practices

1. **Always cleanup test data** - Delete created resources
2. **Use fixtures** - Leverage authentication fixtures
3. **Use Page Objects** - Encapsulate page interactions
4. **Test data factory** - Use TEST_DATA for consistent data
5. **API helpers** - Use helper functions for API calls
6. **Meaningful assertions** - Test actual behavior, not implementation
7. **Independent tests** - Each test should run independently
8. **Descriptive names** - Test names should explain what is tested

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Testing](https://playwright.dev/docs/api-testing)
- [Visual Comparisons](https://playwright.dev/docs/test-snapshots)

## 🤝 Contributing

1. Write tests for new features
2. Follow existing patterns and structure
3. Update this README for new test categories
4. Ensure all tests pass before committing
5. Add appropriate cleanup for test data

## 📝 Maintenance

### Updating Test Data

Edit `fixtures/test-data.ts`:

```typescript
export const TEST_DATA = {
  exercise: {
    basic: () => ({
      name: `Test Exercise ${randomString()}`,
      // ...
    }),
  },
};
```

### Updating Page Objects

Edit page objects in `fixtures/page-objects/`:

```typescript
export class WorkoutPages {
  async createWorkoutPlan(data) {
    // ...
  }
}
```

### Adding New Tests

1. Create new spec file in appropriate folder
2. Import fixtures and helpers
3. Write tests following existing patterns
4. Add cleanup for created resources
5. Run tests to verify

---

**Questions or Issues?**

Check the main project documentation or create an issue.






