from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.utils import get_openapi

from app.database import engine, Base
from app.routers import auth, users, exercises, workouts, nutrition, progress

# Note: Database tables are managed by Alembic migrations
# Base.metadata.create_all(bind=engine)  # Removed - use Alembic instead

app = FastAPI(
    title="Elior Fitness API",
    description="Backend API for personal trainer management system with JWT authentication",
    version="1.0.0",
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User authentication and authorization endpoints"
        },
        {
            "name": "Users",
            "description": "User management and profile operations"
        },
        {
            "name": "Exercises",
            "description": "Exercise library and management"
        },
        {
            "name": "Workouts",
            "description": "Workout planning and tracking"
        },
        {
            "name": "Nutrition",
            "description": "Nutrition plans, recipes, and meal tracking"
        },
        {
            "name": "Progress",
            "description": "Progress tracking and analytics"
        }
    ]
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

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Add JWT Bearer authentication
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter your JWT token in the format: Bearer <token>"
        }
    }
    
    # Add global security requirement
    openapi_schema["security"] = [
        {
            "BearerAuth": []
        }
    ]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

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

@app.get("/")
async def root():
    return {"message": "Welcome to Elior Fitness API"} 