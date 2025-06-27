from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base
from app.routers import auth, users, exercises, workouts, nutrition, progress, files, websocket

# Note: Database tables are managed by Alembic migrations
# Base.metadata.create_all(bind=engine)  # Removed - use Alembic instead

app = FastAPI(
    title="Elior Fitness API",
    description="Backend API for personal trainer management system with file management and real-time updates",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0", "sprint": "5 - File Management & Real-time Updates"}

# Add OPTIONS handler for health endpoint
@app.options("/health")
async def health_check_options():
    return {"status": "healthy"}

# Import and include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["Exercises"])
app.include_router(workouts.router, prefix="/api/workouts", tags=["Workouts"])
app.include_router(nutrition.router, prefix="/api/nutrition", tags=["Nutrition"])
app.include_router(progress.router, prefix="/api/progress", tags=["Progress"])
app.include_router(files.router, prefix="/api/files", tags=["File Management"])
app.include_router(websocket.router, prefix="/api/ws", tags=["WebSocket"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to Elior Fitness API", 
        "version": "1.0.0",
        "sprint": "5 - File Management & Storage with Real-time Updates",
        "features": [
            "Secure file uploads with validation",
            "Image processing and thumbnails",
            "Storage optimization",
            "Access control on media endpoints",
            "Real-time WebSocket notifications"
        ]
    } 