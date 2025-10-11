# Elior Fitness - Local Development Guide

This guide will help you set up and run the Elior Fitness application locally on your Windows machine.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Setup Options](#setup-options)
  - [Option 1: Docker (Recommended)](#option-1-docker-recommended)
  - [Option 2: Local Development (No Docker)](#option-2-local-development-no-docker)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Prerequisites

### Required Software

1. **Git** - [Download](https://git-scm.com/downloads)
2. **Python 3.11+** - [Download](https://www.python.org/downloads/)
3. **Node.js 18+** - [Download](https://nodejs.org/)

### Optional (for Docker)

4. **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)

---

## 🚀 Quick Start

### Option 1: Docker (Easiest)

1. **Start Docker Desktop**
2. **Run the startup script:**
   ```bash
   start-docker.bat
   ```
3. **Access the application:**
   - Frontend & Backend: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Option 2: Local Development (More Control)

1. **Run the startup script:**
   ```bash
   start-local.bat
   ```
2. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

---

## 🛠️ Setup Options

### Option 1: Docker (Recommended)

Docker provides a consistent environment and is the easiest way to get started.

#### Steps:

1. **Install Docker Desktop** and ensure it's running

2. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Elior
   ```

3. **Start the application:**
   ```bash
   start-docker.bat
   ```

4. **Wait for the build** (first time only, ~5-10 minutes)

5. **Application is ready!**
   - Application: http://localhost:8000
   - API Docs: http://localhost:8000/docs

#### Docker Commands:

- **Start:** `start-docker.bat`
- **Stop:** `stop-docker.bat` or press `Ctrl+C`
- **Rebuild:** `docker-compose up --build`
- **View logs:** `docker-compose logs -f`
- **Reset database:** Delete `./data/elior_fitness.db` and restart

---

### Option 2: Local Development (No Docker)

This option gives you more control and faster reload times during development.

#### Steps:

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Elior
   ```

2. **Setup Backend:**
   ```bash
   # Create virtual environment
   python -m venv venv
   
   # Activate virtual environment
   venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Setup Frontend:**
   ```bash
   cd Frontend
   npm install --legacy-peer-deps
   cd ..
   ```

4. **Start the application:**
   ```bash
   start-local.bat
   ```
   This will open two windows:
   - Backend server (http://localhost:8000)
   - Frontend dev server (http://localhost:5173)

5. **Application is ready!**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000
   - API Docs: http://localhost:8000/docs

---

## 📁 Project Structure

```
Elior/
├── app/                    # Backend application
│   ├── models/            # Database models
│   ├── routers/           # API endpoints
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Business logic
│   ├── auth/              # Authentication utilities
│   ├── main.py            # FastAPI application
│   └── database.py        # Database configuration
├── Frontend/              # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   └── services/      # API services
│   └── public/            # Static assets
├── data/                  # SQLite database
├── uploads/               # User uploaded files
├── logs/                  # Application logs
├── tests/                 # Test files
├── context/               # Project documentation
├── docs/                  # Additional documentation
├── docker-compose.yml     # Docker configuration
├── Dockerfile             # Docker build instructions
└── requirements.txt       # Python dependencies
```

---

## 🎮 Available Scripts

### Starting the Application

| Script | Description | Use Case |
|--------|-------------|----------|
| `start-local.bat` | Start both backend and frontend locally | Development with hot reload |
| `start-docker.bat` | Start with Docker | Production-like environment |
| `start-backend-local.bat` | Start backend only (local) | Backend development |
| `start-frontend.bat` | Start frontend only | Frontend development |

### Building & Deployment

| Script | Description |
|--------|-------------|
| `build-frontend.bat` | Build frontend for production |
| `stop-docker.bat` | Stop Docker services |

### Development Tools

```bash
# Run tests
cd tests
python run_tests.py

# Type check (frontend)
cd Frontend
npm run typecheck

# Lint (frontend)
cd Frontend
npm run lint

# Database migrations (if needed)
# Database auto-creates tables on startup
```

---

## ⚙️ Configuration

### Environment Variables

The application uses environment variables for configuration. In local development, these are set in `docker-compose.yml` for Docker or as defaults in the code.

**Key Variables:**

```
ENVIRONMENT=development
DOMAIN=localhost
PORT=8000
DATABASE_PATH=./data/elior_fitness.db
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000
```

### API Configuration

When running frontend and backend separately (recommended for development):

**Backend runs on:** http://localhost:8000
**Frontend runs on:** http://localhost:5173
**Frontend connects to backend API at:** http://localhost:8000/api

This is automatically configured in `Frontend/src/config/api.ts`.

**Frontend Environment Variables** (optional override):
Create `Frontend/.env.local` with:
```
VITE_API_URL=http://localhost:8000/api
```

**Important:** Both servers must be running for the application to work:
- Start backend: `start-backend-local.bat`
- Start frontend: `start-frontend.bat`
- Or start both: `start-local.bat`

### Database

- **Type:** SQLite
- **Location:** `./data/elior_fitness.db`
- **Auto-created:** Yes, on first startup
- **Migrations:** Automatic (tables created from models)

### Default Users

Test users are automatically created on first startup:

**Admin:**
- Email: admin@elior.com
- Password: admin123

**Trainer:**
- Email: trainer@elior.com
- Password: trainer123

**Client:**
- Email: client@elior.com
- Password: client123

---

## 📚 API Documentation

Once the backend is running, visit:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints:

```
POST   /api/auth/login           # User login
POST   /api/auth/register        # User registration
GET    /api/users                # List users
POST   /api/workouts             # Create workout
GET    /api/meal-plans           # List meal plans
POST   /api/progress             # Log progress
GET    /health                   # Health check
```

---

## 🔧 Troubleshooting

### Backend Issues

**Issue:** Database connection errors
```bash
# Solution: Delete and recreate database
del data\elior_fitness.db
# Restart the application
```

**Issue:** Port 8000 already in use
```bash
# Solution: Find and kill the process
netstat -ano | findstr :8000
taskkill /PID <pid> /F
```

**Issue:** Module not found errors
```bash
# Solution: Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Frontend Issues

**Issue:** npm install fails
```bash
# Solution: Use legacy peer deps flag
cd Frontend
npm install --legacy-peer-deps
```

**Issue:** Port 5173 already in use
```bash
# Solution: The Vite dev server will automatically use the next available port
```

**Issue:** API connection errors / Can't connect to backend
```bash
# Solution: Ensure both servers are running
1. Start backend: start-backend-local.bat (runs on port 8000)
2. Start frontend: start-frontend.bat (runs on port 5173)
3. Frontend automatically connects to http://localhost:8000/api
4. Check browser console for detailed error messages
5. Verify backend is accessible at http://localhost:8000/health
```

**Issue:** CORS errors in browser
- Ensure backend CORS includes http://localhost:5173
- Both servers must be running
- Check backend logs for CORS messages

### Docker Issues

**Issue:** Docker build fails
```bash
# Solution: Clean Docker cache and rebuild
docker-compose down
docker system prune -a
docker-compose up --build
```

**Issue:** Permission errors on volumes
```bash
# Solution: Ensure directories exist and have proper permissions
mkdir data uploads logs
```

### Common Issues

**Issue:** CORS errors
- Ensure `CORS_ORIGINS` includes your frontend URL
- Check browser console for exact error

**Issue:** Authentication errors
- Clear browser local storage
- Try logging in with default test users

**Issue:** File upload errors
- Ensure `uploads/` directories exist
- Check file size limits (default: 10MB)

---

## 🎓 Next Steps

1. **Read the full documentation** in the `/docs` folder
2. **Explore the API** at http://localhost:8000/docs
3. **Check out the context files** in `/context` for detailed project information
4. **Run the tests** with `python tests/run_tests.py`

---

## 📞 Support

For issues, questions, or contributions:

1. Check the `/docs` folder for detailed documentation
2. Review the `/context` files for project context
3. Check existing issues and documentation

---

## 🔐 Security Notes

- Default test users are for development only
- Change default passwords in production
- Use environment variables for sensitive data
- Never commit `.env` files with real credentials

---

## 📝 Development Workflow

### Making Changes

1. **Backend Changes:**
   - Edit files in `app/`
   - Server auto-reloads (if using `--reload` flag)
   - Check logs in console or `logs/` folder

2. **Frontend Changes:**
   - Edit files in `Frontend/src/`
   - Browser auto-reloads
   - Check browser console for errors

3. **Database Changes:**
   - Modify models in `app/models/`
   - Delete database to recreate: `del data\elior_fitness.db`
   - Restart application

### Testing Changes

```bash
# Backend tests
cd tests
python run_tests.py

# Frontend type checking
cd Frontend
npm run typecheck

# Frontend linting
cd Frontend
npm run lint
```

### Building for Production

```bash
# Build frontend
build-frontend.bat

# Build Docker image
docker build -t elior-fitness .

# Run production container
docker run -p 8000:8000 elior-fitness
```

---

## 🎉 You're Ready!

You now have everything you need to run and develop Elior Fitness locally. Happy coding! 🚀



