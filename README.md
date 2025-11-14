# Elior Fitness - Comprehensive Fitness Management Platform

A complete fitness management system for personal trainers and their clients, featuring workout planning, meal planning, progress tracking, and real-time notifications.

## 🌟 Features

### User Management
- **Three Roles**: Admin, Trainer, Client
- **Multi-language Support**: Hebrew (עברית) and English
- **Trainer-Client Assignment**: Assign clients to trainers
- **Role-based Access Control**: Granular permissions
- **User Profile Management**: Complete user profiles

### Workout Management
- **Exercise Library**: Trainer-owned exercise bank
- **Workout Plans**: Create custom workout plans with splits (Push/Pull/Legs)
- **Session Tracking**: Log workout sessions with sets and reps
- **Progress Analytics**: Track exercise progress over time
- **Photo Uploads**: Upload exercise photos

### Meal Planning
- **Component-based Meal Plans**: Flexible meal planning with macros
- **Macro Tracking**: Protein, carbs, and fat tracking
- **Food Options**: Clients select from trainer-provided food options
- **Photo Upload & Approval**: Meal photo workflow
- **Nutrition Analytics**: Track nutritional intake

### Progress Tracking
- **Weight Tracking**: Historical weight records
- **Body Composition**: Track body measurements
- **Progress Visualization**: Charts and graphs
- **Historical Data**: Long-term progress tracking

### Real-time Features
- **WebSocket Notifications**: Live updates
- **Trainer-Client Communication**: Real-time messaging
- **Activity Streams**: Recent activity tracking

### File Management
- **Secure Uploads**: Encrypted file storage
- **Image Processing**: Automatic thumbnail generation
- **Organized Storage**: Categorized file management
- **Access Control**: Role-based file permissions

## 🚀 Quick Start

### Prerequisites
- Docker Desktop ([Download](https://www.docker.com/products/docker-desktop/))
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/elior_fitness.git
cd elior_fitness
```

2. Start the application:
```bash
docker-compose up --build
```

3. Access the application:
- **Application**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Default Credentials

- **Admin**: admin@elior.com / admin123
- **Trainer**: trainer@elior.com / trainer123
- **Client**: client@elior.com / client123

## 📁 Project Structure

```
elior_fitness/
├── app/                      # Backend (FastAPI)
│   ├── models/              # Database models (8 files)
│   ├── routers/             # API routers (13 routers)
│   ├── services/            # Business logic (12 services)
│   ├── schemas/             # Pydantic schemas (7 files)
│   ├── auth/                # Auth utilities
│   └── main.py              # Application entry point
├── Frontend/                # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── pages/           # 22 page components
│   │   ├── components/      # Reusable components + shadcn/ui
│   │   ├── contexts/        # React contexts (Auth, Notifications)
│   │   ├── services/        # API services
│   │   ├── hooks/           # Custom React hooks
│   │   ├── config/          # Configuration
│   │   └── i18n/            # Internationalization
│   └── package.json
├── data/                    # SQLite database
├── uploads/                 # User uploaded files
├── logs/                    # Application logs
├── tests/                   # Test suite
├── docs/                     # Documentation
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI 0.120.0
- **Database**: SQLite with SQLAlchemy 2.0
- **Authentication**: JWT with python-jose and passlib
- **File Processing**: Pillow, python-magic
- **Async**: uvicorn with uvloop

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Library**: shadcn/ui
- **State**: React Query
- **Routing**: React Router v6
- **i18n**: react-i18next

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Deployment**: Single container architecture
- **Monolith**: FastAPI serves both API and static files

## 📊 API Structure

### Routers (13 total)
1. **auth** (`/api/auth`) - Authentication and registration
2. **users** (`/api/users`) - User management
3. **exercises** (`/api/exercises`) - Exercise operations
4. **workouts** (`/api/workouts`) - Workout plans and sessions (v1)
5. **nutrition** (`/api/nutrition`) - Legacy nutrition system
6. **meal-plans** (`/api/meal-plans`) - Advanced meal planning
7. **v2/meals** (`/api/v2/meals`) - Meal system v2
8. **v2/workouts** (`/api/v2/workouts`) - Workout system v2
9. **progress** (`/api/progress`) - Progress tracking
10. **files** (`/api/files`) - File management
11. **notifications** (`/api/notifications`) - Notification management
12. **ws** (`/api/ws`) - WebSocket connections
13. **system** (`/api/system`) - System monitoring

### Database Models (8 files)
- `user.py` - User and profiles
- `workout.py` - Legacy workout system
- `workout_system.py` - Enhanced workout system (v2)
- `nutrition.py` - Legacy nutrition system
- `meal_system.py` - Enhanced meal system (v2)
- `progress.py` - Progress tracking
- `notification.py` - Notifications
- Base models with relationships

### Services (12 files)
- `auth_service.py` - Authentication logic
- `user_service.py` - User management
- `workout_service.py` - Workout operations
- `nutrition_service.py` - Nutrition operations
- `meal_plan_service.py` - Meal planning
- `file_service.py` - File handling
- `notification_service.py` - Notifications
- `progress_service.py` - Progress tracking
- `system_service.py` - System monitoring
- `websocket_service.py` - WebSocket handling
- `password_service.py` - Password operations
- `scheduler_service.py` - Scheduled tasks

## 🎨 Frontend Pages (22 pages)

### Public
- `Login.tsx` - Authentication
- `NotFound.tsx` - 404 page

### Admin
- `AdminDashboard.tsx` - Admin overview
- `UsersPage.tsx` - User management
- `SystemPage.tsx` - System monitoring
- `SecretUsersPage.tsx` - Special user management

### Trainer
- `TrainerDashboard.tsx` - Trainer overview
- `ClientProfile.tsx` - Individual client view
- `ClientsPage.tsx` - All clients
- `CreateExercise.tsx` - Exercise creation
- `CreateWorkout.tsx` - Workout plan creation
- `CreateMealPlan.tsx` - Meal plan creation
- `CreateWorkoutPlanV2.tsx` - Advanced workout creation
- `ExerciseBank.tsx` - Exercise library

### Client/Trainer
- `Index.tsx` - Dashboard
- `MealsPage.tsx` - Meal tracking
- `TrainingPage.tsx` - Workout tracking
- `ProgressPage.tsx` - Progress tracking
- `WorkoutDetailPage.tsx` - Workout details

### Legacy
- `CreateWorkoutPage.tsx` - Old workout creation
- `CreateExercisePage.tsx` - Old exercise creation
- `CreateMealPlanPage.tsx` - Old meal plan creation

## 🔐 Authentication & Security

- **JWT Tokens**: Secure token-based authentication
- **Bcrypt**: Password hashing with bcrypt
- **Role-based Access**: Granular permissions
- **File Security**: Encrypted file uploads
- **CORS**: Configured CORS for cross-origin requests
- **Input Validation**: Pydantic schemas for validation

## 📈 Development History

### Sprint 1: Foundation & Authentication
- User roles and authentication
- Database setup
- Basic UI structure

### Sprint 2: User Management & Relationships
- Trainer-client relationships
- User profiles
- Admin dashboard

### Sprint 3: Workout Management
- Exercise library
- Workout plans and sessions
- Progress tracking

### Sprint 4: Nutrition Management
- Meal planning
- Nutrition tracking
- Photo uploads

### Sprint 5: File Management & Real-time
- File uploads and processing
- WebSocket notifications
- Real-time updates

### Sprint 6: Advanced Systems & i18n
- Enhanced workout system (v2)
- Enhanced meal system (v2)
- Multi-language support (Hebrew/English)
- System optimizations

## 🧪 Testing

```bash
# Run all tests
docker-compose exec elior-fitness python -m pytest

# With coverage
docker-compose exec elior-fitness python -m pytest --cov=app

# Specific test file
docker-compose exec elior-fitness python -m pytest tests/test_auth.py
```

## 🚀 Deployment

### Local Development
```bash
docker-compose up --build
```

### Production
```bash
# Copy production environment file
cp docs/env.production.example .env.production

# Set environment variables
# Then deploy:
docker-compose up -d --build
```

### Railway Deployment
1. Connect GitHub repository to Railway
2. Railway detects Docker configuration
3. Application builds and deploys automatically
4. Database and uploads persist in volumes

## 📝 Documentation

- **API Documentation**: `/docs` (Swagger UI)
- **Database Schema**: See `docs/DATABASE_AND_API_DOCUMENTATION.md`
- **Deployment**: See `docs/RAILWAY_DEPLOYMENT_GUIDE.md`
- **System Architecture**: See `docs/PROJECT_SUMMARY.md`

## 🐛 Troubleshooting

### Docker Issues
```bash
# Clean rebuild
docker-compose down -v
docker system prune -a
docker-compose up --build
```

### Database Issues
```bash
# Reset database
rm data/elior_fitness.db
docker-compose up --build
```

### Port Conflicts
```bash
# Change port in docker-compose.yml
ports:
  - "8001:8000"  # Change 8001 to available port
```

## 📄 License

Private project - All rights reserved

## 🤝 Contributing

1. Create a feature branch
2. Make changes
3. Test with Docker
4. Commit and push
5. Create a pull request

---

**Status**: Production-ready ✅ | **Version**: 1.0.0 | **Last Updated**: October 2025
