# Elior Fitness

A comprehensive fitness management application for personal trainers and their clients.

## 🚀 Quick Start (ONE COMMAND)

### Prerequisites
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)

### Start the Application

1. **Start Docker Desktop** (wait for it to fully start)
2. **Double-click**: `START.bat`
3. **Wait** for the build to complete (~5 minutes first time)
4. **Open browser**: http://localhost:8000

That's it! Everything runs in Docker.

### Stop the Application

Press `Ctrl+C` in the terminal window or run:
```bash
docker-compose down
```

## 🔑 Default Login

- **Admin**: admin@elior.com / admin123
- **Trainer**: trainer@elior.com / trainer123
- **Client**: client@elior.com / client123

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs (when running)
- **Setup Guide**: [LOCAL_DEVELOPMENT_GUIDE.md](LOCAL_DEVELOPMENT_GUIDE.md)
- **Changes**: [CHANGES_SUMMARY.md](CHANGES_SUMMARY.md)
- **Context**: See `context/` folder for detailed documentation

## 🐳 Docker Commands

```bash
# Start (recommended)
docker-compose up --build

# Start in background
docker-compose up -d --build

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Reset everything
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## 📁 Project Structure

```
app/            - Backend (FastAPI/Python)
Frontend/       - Frontend (React/TypeScript)
data/           - SQLite database
uploads/        - User uploaded files
logs/           - Application logs
tests/          - Test files
context/        - Project documentation
```

## 🔧 Making Changes

1. Edit files in your IDE
2. Run `docker-compose up --build`
3. Test at http://localhost:8000
4. Commit to git

## 🌐 Access Points

- **Application**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 🗄️ Database

- **Type**: SQLite
- **Location**: `./data/elior_fitness.db`
- **Reset**: Delete the file and restart Docker

## 🧪 Testing

```bash
docker-compose exec elior-fitness python tests/run_tests.py
```

## ⚠️ Troubleshooting

### Docker Desktop not running
Start Docker Desktop and wait for it to fully initialize.

### Port 8000 already in use
```bash
docker-compose down
# Or change port in docker-compose.yml
```

### Build fails
```bash
docker-compose down
docker system prune -a
docker-compose up --build
```

### Database issues
```bash
Remove-Item data\elior_fitness.db
docker-compose up --build
```

## 🛠️ Technology Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Infrastructure**: Docker, Docker Compose
- **Auth**: JWT with bcrypt
- **Real-time**: WebSockets

## 📝 Features

- ✅ User Authentication & Authorization
- ✅ Workout Management & Planning
- ✅ Nutrition Tracking & Meal Plans
- ✅ Progress Tracking & Analytics
- ✅ File Uploads & Management
- ✅ Real-time Notifications
- ✅ Role-based Access (Admin, Trainer, Client)

## 🤝 Contributing

1. Create a new branch
2. Make changes
3. Test with Docker
4. Commit and push

## 📄 License

Private project - All rights reserved

---

**Need help?** Check [LOCAL_DEVELOPMENT_GUIDE.md](LOCAL_DEVELOPMENT_GUIDE.md) for detailed instructions.
