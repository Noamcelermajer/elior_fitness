# Local Development Guide

This guide explains how to run the Elior Fitness project **locally** without affecting your Railway deployment.

## 🎯 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Git

### Start Local Development

```bash
# Start the application (builds and runs in one command)
docker-compose up --build
```

That's it! The application will be available at:
- **Application**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Stop Local Development

```bash
# Stop the application
docker-compose down
```

## 🔒 Local vs Railway - Complete Separation

### How It Works

1. **Local Development** uses:
   - `docker-compose.yml` - Local Docker configuration
   - Local environment variables (from `docker-compose.yml` or `.env.local`)
   - Local database in `./data/elior_fitness.db`
   - Local uploads in `./uploads/`
   - Local logs in `./logs/`

2. **Railway Deployment** uses:
   - `Dockerfile` - Production build
   - `railway.json` - Railway-specific configuration
   - Environment variables set in Railway dashboard
   - Railway volumes for persistence
   - **Completely independent** from your local setup

### Key Points

✅ **Local changes NEVER affect Railway** - Railway only uses what's in your Git repository  
✅ **Railway changes NEVER affect local** - Local uses `docker-compose.yml` which Railway ignores  
✅ **Separate databases** - Local DB is in `./data/`, Railway has its own  
✅ **Separate configurations** - Local uses development settings, Railway uses production

## 📝 Environment Variables

### Local Development (docker-compose.yml)

Local development uses these environment variables defined in `docker-compose.yml`:

```yaml
ENVIRONMENT=development
DOMAIN=localhost
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000
LOG_LEVEL=INFO
PORT=8000
DATABASE_PATH=/app/data/elior_fitness.db
DATABASE_URL=sqlite:////app/data/elior_fitness.db
```

### Optional: Custom Local Environment File

If you want to override settings locally, create a `.env.local` file (it's gitignored):

```bash
# .env.local (optional - for local overrides)
ENVIRONMENT=development
LOG_LEVEL=DEBUG
ENABLE_DEBUG_LOGGING=true
```

**Note**: The `docker-compose.yml` already has all necessary variables. You only need `.env.local` if you want to override specific settings.

## 🗂️ Local File Structure

When running locally, these directories are created and used:

```
elior_fitness/
├── data/              # Local SQLite database (gitignored)
│   └── elior_fitness.db
├── uploads/           # Local file uploads (gitignored)
├── logs/              # Local application logs (gitignored)
└── .env.local         # Optional local overrides (gitignored)
```

All of these are gitignored, so they won't affect Railway or be committed to Git.

## 🚀 Common Commands

### Start Development
```bash
docker-compose up --build
```

### Start in Background
```bash
docker-compose up -d --build
```

### View Logs
```bash
docker-compose logs -f
```

### Stop Application
```bash
docker-compose down
```

### Reset Everything (Fresh Start)
```bash
# Stop containers
docker-compose down

# Remove volumes (deletes local database and uploads)
docker-compose down -v

# Clean Docker cache (optional)
docker system prune -a

# Start fresh
docker-compose up --build
```

### Reset Database Only
```bash
# Stop containers
docker-compose down

# Delete database file
rm data/elior_fitness.db  # Linux/Mac
# OR
Remove-Item data\elior_fitness.db  # Windows PowerShell

# Restart
docker-compose up --build
```

## 🧪 Testing Locally

### Default Test Users

After starting the application, these users are automatically created:

- **Admin**: admin@elior.com / admin123
- **Trainer**: trainer@elior.com / trainer123
- **Client**: client@elior.com / client123

### Run Tests

```bash
# Run all tests
docker-compose exec elior-fitness python -m pytest

# Run with coverage
docker-compose exec elior-fitness python -m pytest --cov=app

# Run specific test file
docker-compose exec elior-fitness python -m pytest tests/test_auth.py
```

## 🔧 Troubleshooting

### Port Already in Use

If port 8000 is already in use:

1. Find what's using it:
   ```bash
   # Windows
   netstat -ano | findstr :8000
   
   # Linux/Mac
   lsof -i :8000
   ```

2. Either stop that process or change the port in `docker-compose.yml`:
   ```yaml
   ports:
     - "8001:8000"  # Change 8001 to any available port
   ```

### Container Won't Start

```bash
# Clean rebuild
docker-compose down -v
docker-compose up --build
```

### Database Issues

```bash
# Delete database and restart
docker-compose down
rm data/elior_fitness.db  # or Remove-Item on Windows
docker-compose up --build
```

### Frontend Not Loading

1. Check that the container is running: `docker-compose ps`
2. Check logs: `docker-compose logs -f`
3. Verify port mapping: `docker-compose ps` should show `0.0.0.0:8000->8000/tcp`
4. Try accessing http://127.0.0.1:8000 instead of localhost

### Changes Not Reflecting

The Dockerfile builds the frontend during image creation. To see frontend changes:

```bash
# Rebuild the container
docker-compose up --build
```

## 📊 Monitoring Local Development

### View Container Status
```bash
docker-compose ps
```

### View Resource Usage
```bash
docker stats
```

### View Application Logs
```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f elior-fitness

# Last 100 lines
docker-compose logs --tail=100
```

## 🎨 Development Workflow

### Making Code Changes

1. **Backend Changes** (Python files in `app/`):
   - Edit files in your IDE
   - Restart container: `docker-compose restart elior-fitness`
   - Or rebuild: `docker-compose up --build`

2. **Frontend Changes** (React files in `Frontend/`):
   - Edit files in your IDE
   - Rebuild container: `docker-compose up --build`
   - Frontend is built during Docker build

3. **Database Changes** (Models in `app/models/`):
   - Edit model files
   - Restart container (migrations run automatically)
   - Or reset database if needed

### Hot Reload (Future Enhancement)

Currently, the frontend is built into the Docker image. For true hot reload during development, you could:
- Run frontend separately with `npm run dev` (requires Node.js)
- Use Docker volumes for frontend source (more complex setup)

For now, rebuilding with `docker-compose up --build` is the recommended approach.

## 🚫 What NOT to Do

❌ **Don't** modify `Dockerfile` for local-only changes (affects Railway)  
❌ **Don't** modify `railway.json` for local development  
❌ **Don't** commit `.env.local` or local database files  
❌ **Don't** run `npm install` or `pip install` directly (use Docker)  
❌ **Don't** create virtual environments manually (Docker handles this)

## ✅ What TO Do

✅ **Do** use `docker-compose.yml` for local configuration  
✅ **Do** create `.env.local` if you need local-only overrides  
✅ **Do** test locally before pushing to Git  
✅ **Do** commit code changes (not local data files)  
✅ **Do** use `docker-compose up --build` for everything

## 🔗 Related Documentation

- **Railway Deployment**: See `docs/RAILWAY_DEPLOYMENT.md`
- **API Documentation**: http://localhost:8000/docs (when running)
- **Project README**: See `README.md`

## 💡 Tips

1. **Keep Docker Desktop Running**: The application needs Docker to run
2. **Check Logs First**: Most issues are visible in `docker-compose logs -f`
3. **Reset When Stuck**: `docker-compose down -v && docker-compose up --build` fixes most issues
4. **Separate Databases**: Your local DB is completely separate from Railway
5. **Git Ignore**: Local files (data/, uploads/, logs/, .env.local) are gitignored

---

**Remember**: Local development is completely isolated from Railway. You can experiment freely without affecting your production deployment! 🎉
