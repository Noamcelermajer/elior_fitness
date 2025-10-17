# Quick Start Guide - Playwright E2E Tests

## 🚀 Run Tests in 3 Steps

### 1. Start the Application

```bash
# From project root
docker-compose up --build
```

Wait until you see:
```
✅ Application is running at http://localhost:8000
```

### 2. Navigate to Tests

```bash
cd tests/e2e
```

### 3. Run Tests

```bash
# Quick smoke tests (3-5 minutes)
npm run test:smoke

# Full test suite (20-30 minutes)
npm test
```

## 📊 Test Commands Cheat Sheet

```bash
# By Category
npm run test:auth           # Authentication tests
npm run test:admin          # Admin functionality
npm run test:trainer        # Trainer workflows
npm run test:client         # Client workflows
npm run test:files          # File uploads
npm run test:realtime       # WebSocket notifications
npm run test:visual         # Visual regression

# By Browser
npm run test:chromium       # Chrome only
npm run test:firefox        # Firefox only
npm run test:webkit         # Safari only

# Interactive
npm run test:ui             # Open Playwright UI
npm run test:headed         # See browser while testing
npm run test:debug          # Debug mode with inspector

# Reports
npm run report              # View HTML report
```

## 🎯 What Gets Tested?

- ✅ Login for all 3 roles (Admin, Trainer, Client)
- ✅ Exercise bank management
- ✅ Workout plan creation & assignment
- ✅ Meal plan creation & tracking
- ✅ Client progress monitoring
- ✅ File uploads (photos)
- ✅ Real-time notifications
- ✅ UI visual consistency

## 🔑 Test Accounts

The tests use these existing accounts:

- **Admin**: admin@elior.com / admin123
- **Trainer**: trainer@elior.com / trainer123  
- **Client**: client@elior.com / client123

## ❓ Troubleshooting

### Tests fail immediately?

Check if Docker is running:
```bash
docker ps
```

Should see `elior-fitness` container.

### Timeout errors?

Application might be slow to start. Wait longer after `docker-compose up`.

### Need to reset database?

```bash
docker-compose down -v
docker-compose up --build
```

## 📚 Full Documentation

See [README.md](./README.md) for comprehensive documentation.

## 🎓 Example: Run Specific Test

```bash
# Run only login tests
npx playwright test specs/01-auth/login.spec.ts

# Run with UI to see what's happening
npx playwright test specs/01-auth/login.spec.ts --ui

# Debug a failing test
npx playwright test specs/01-auth/login.spec.ts --debug
```

## ✨ Pro Tips

1. **Start with smoke tests** - They're fast and test critical paths
2. **Use UI mode** - Great for understanding what tests do
3. **Check reports** - Screenshots show exactly what failed
4. **Run headed mode** - See the browser if tests are confusing

---

**That's it! Happy testing! 🎉**






