from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

logger.info("Starting Elior Fitness API application...")

try:
    from app.database import engine, Base
    logger.info("Database module imported successfully")
except Exception as e:
    logger.error(f"Failed to import database module: {e}")
    raise

try:
    from app.routers import auth, users, exercises, workouts, nutrition, progress, files, websocket, meal_plans, system
    logger.info("Router modules imported successfully")
except Exception as e:
    logger.error(f"Failed to import router modules: {e}")
    raise

# Import all models to ensure they're registered with Base.metadata
try:
    from app.models import user as user_models, workout as workout_models, nutrition as nutrition_models
    logger.info("Model modules imported successfully")
except Exception as e:
    logger.error(f"Failed to import model modules: {e}")
    raise

# Create database tables (SQLite auto-creation)
try:
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
except Exception as e:
    logger.error(f"Failed to create database tables: {e}")
    raise

app = FastAPI(
    title="Elior Fitness API",
    description="Backend API for personal trainer management system with file management and real-time updates",
    version="1.0.0"
)

logger.info("FastAPI application created")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ],  # Added 8080 ports for frontend dev
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*", "Authorization", "Content-Type"],
)

logger.info("CORS middleware configured")

# Mount static files for uploads
try:
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
    logger.info("Static files mounted successfully")
except Exception as e:
    logger.warning(f"Could not mount uploads directory: {e}")

# Health check endpoint
@app.get("/health")
async def health_check():
    logger.debug("Health check endpoint called")
    return {"status": "healthy", "version": "1.0.0", "sprint": "5 - File Management & Real-time Updates"}

# Add OPTIONS handler for health endpoint
@app.options("/health")
async def health_check_options():
    logger.debug("Health check OPTIONS endpoint called")
    return {"status": "healthy"}

# Import and include routers
try:
    logger.info("Including routers...")
    app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
    app.include_router(users.router, prefix="/api/users", tags=["Users"])
    app.include_router(exercises.router, prefix="/api/exercises", tags=["Exercises"])
    app.include_router(workouts.router, prefix="/api/workouts", tags=["Workouts"])
    app.include_router(nutrition.router, prefix="/api/nutrition", tags=["Nutrition"])
    app.include_router(meal_plans.router, prefix="/api/meal-plans", tags=["Meal Plans"])
    app.include_router(progress.router, prefix="/api/progress", tags=["Progress"])
    app.include_router(files.router, prefix="/api/files", tags=["File Management"])
    app.include_router(websocket.router, prefix="/api/ws", tags=["WebSocket"])
    app.include_router(system.router, prefix="/api/system", tags=["System"])
    logger.info("All routers included successfully")
except Exception as e:
    logger.error(f"Failed to include routers: {e}")
    raise

@app.get("/")
async def root():
    logger.debug("Root endpoint called")
    return {
        "message": "Welcome to Elior Fitness API", 
        "version": "1.0.0",
        "sprint": "6 - Advanced Meal Plan System",
        "features": [
            "Advanced meal plan management",
            "Meal entries with components (protein, carbs, fats, vegetables)",
            "Client meal photo uploads with approval system",
            "Macronutrient tracking and goals",
            "Real-time WebSocket notifications",
            "Secure file uploads with validation",
            "Image processing and thumbnails"
        ]
    }

logger.info("Elior Fitness API application startup completed successfully") 