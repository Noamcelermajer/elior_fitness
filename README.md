# Elior Fitness Platform

A comprehensive fitness management platform with meal planning, workout tracking, and real-time notifications.

## Features

- **User Management**: Trainer and client roles with secure authentication
- **Meal Planning**: Advanced meal plan system with macronutrient tracking
- **Workout Management**: Exercise library and workout creation
- **Progress Tracking**: Client progress monitoring and analytics
- **Real-time Notifications**: WebSocket-based notifications
- **File Management**: Secure file uploads with image processing

## Quick Start

### Local Development

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd Elior
   ```

2. **Start with Docker**:
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application**:
   - Frontend: http://localhost:8000
   - API (internal): http://localhost:8001

### Railway Deployment

1. **Connect to Railway**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and link project
   railway login
   railway link
   ```

2. **Deploy**:
   ```bash
   railway up
   ```

3. **Set environment variables** (in Railway dashboard):
   ```
   ENVIRONMENT=production
   JWT_SECRET=your-secure-jwt-secret
   DATABASE_URL=your-database-url
   ```

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI + Python 3.11
- **Database**: SQLite (local) / PostgreSQL (production)
- **Reverse Proxy**: Nginx
- **Container**: Docker with multi-stage builds

## Security Features

- JWT-based authentication
- CORS protection
- Rate limiting
- Input validation
- File upload security
- Internal API access only

## Health Checks

The application provides health check endpoints:
- `/health` - Platform health check (always returns 200)
- `/metrics` - Performance metrics (internal only)
- `/status/database` - Database status (internal only)

## Development

### Running Tests
```bash
# Run all tests
python run_tests.py

# Run specific test suite
pytest tests/test_auth.py
```

### Code Quality
```bash
# Auto-commit with smart detection
./autocommit.bat

# Quick commit
./quick-commit.bat
```

## License

MIT License - see LICENSE file for details. 