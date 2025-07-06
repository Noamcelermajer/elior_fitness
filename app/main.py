from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging
import sys
import time
import asyncio
from contextlib import asynccontextmanager

# Configure logging with performance focus
logging.basicConfig(
    level=logging.INFO,  # Changed from DEBUG to INFO for better performance
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

logger.info("Starting Elior Fitness API application...")

try:
    from app.database import engine, Base, check_db_connection, get_db_pool_stats, init_database
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

# Application lifespan management for performance optimization
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Application startup initiated...")
    
    # Check database connection health
    if not check_db_connection():
        logger.error("Database connection failed on startup")
        raise Exception("Database connection failed")
    
    # Initialize database tables
    if not init_database():
        logger.error("Database initialization failed")
        raise Exception("Database initialization failed")
    
    # Log database pool statistics
    pool_stats = get_db_pool_stats()
    logger.info(f"Database pool initialized: {pool_stats}")
    
    logger.info("Application startup completed successfully")
    yield
    
    # Shutdown
    logger.info("Application shutdown initiated...")
    # Close database connections gracefully
    engine.dispose()
    logger.info("Application shutdown completed")

# Create FastAPI app with performance optimizations
app = FastAPI(
    title="Elior Fitness API",
    description="Backend API for personal trainer management system with file management and real-time updates",
    version="1.0.0",
    lifespan=lifespan,
    # Performance optimizations
    docs_url="/docs",  # Keep docs available in all environments for this version
    redoc_url="/redoc",
    generate_unique_id_function=lambda route: f"{route.tags[0]}-{route.name}" if route.tags else route.name
)

logger.info("FastAPI application created with performance optimizations")

# Performance monitoring middleware
@app.middleware("http")
async def performance_monitoring_middleware(request: Request, call_next):
    """Monitor request performance and add metrics headers."""
    start_time = time.time()
    
    # Add request ID for tracking
    request_id = f"{int(start_time * 1000)}"
    
    try:
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Add performance headers
        response.headers["X-Process-Time"] = f"{process_time:.3f}"
        response.headers["X-Request-ID"] = request_id
        
        # Log slow requests for monitoring
        if process_time > 1.0:  # Log requests taking more than 1 second
            logger.warning(
                f"Slow request detected: {request.method} {request.url} "
                f"took {process_time:.3f}s (ID: {request_id})"
            )
        elif process_time > 0.5:  # Log moderately slow requests
            logger.info(
                f"Moderate response time: {request.method} {request.url} "
                f"took {process_time:.3f}s (ID: {request_id})"
            )
        
        return response
        
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            f"Request failed: {request.method} {request.url} "
            f"after {process_time:.3f}s - Error: {str(e)} (ID: {request_id})"
        )
        raise

# Enhanced CORS middleware configuration for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",  # Vite default port
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*", "Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Process-Time", "X-Request-ID"]  # Expose performance headers
)

logger.info("CORS middleware configured with frontend integration support")

# Mount static files for uploads with optimized settings
try:
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
    logger.info("Static files mounted successfully")
except Exception as e:
    logger.warning(f"Could not mount uploads directory: {e}")

# Enhanced health check endpoint with comprehensive system status
@app.get("/health")
async def health_check():
    """Comprehensive health check with database and system status."""
    logger.debug("Health check endpoint called")
    
    # Check database connectivity
    db_healthy = check_db_connection()
    
    # Get database pool statistics
    pool_stats = get_db_pool_stats()
    
    # Basic system health
    health_status = {
        "status": "healthy" if db_healthy else "unhealthy",
        "version": "1.0.0",
        "sprint": "6 - Advanced Meal Plan System",
        "timestamp": time.time(),
        "database": {
            "status": "connected" if db_healthy else "disconnected",
            "pool_stats": pool_stats
        },
        "performance": {
            "response_compression": "not_implemented",  # TODO: Add compression
            "connection_pooling": "enabled",
            "query_optimization": "enabled",
            "performance_monitoring": "enabled"
        }
    }
    
    status_code = 200 if db_healthy else 503
    return JSONResponse(content=health_status, status_code=status_code)

# Add OPTIONS handler for health endpoint
@app.options("/health")
async def health_check_options():
    """OPTIONS handler for health check endpoint."""
    logger.debug("Health check OPTIONS endpoint called")
    return {"status": "healthy"}

# Performance metrics endpoint for monitoring
@app.get("/metrics")
async def get_performance_metrics():
    """Get comprehensive performance metrics for monitoring."""
    try:
        # Database metrics
        pool_stats = get_db_pool_stats()
        db_healthy = check_db_connection()
        
        # Basic application metrics
        metrics = {
            "timestamp": time.time(),
            "database": {
                "healthy": db_healthy,
                "pool_stats": pool_stats
            },
            "system": {
                "python_version": sys.version,
                "platform": sys.platform
            },
            "performance": {
                "slow_query_threshold_ms": 100,
                "slow_request_threshold_ms": 1000,
                "moderate_request_threshold_ms": 500
            }
        }
        
        return JSONResponse(content=metrics)
        
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve metrics")

# Database status endpoint for detailed database information
@app.get("/status/database")
async def get_database_status():
    """Get detailed database status and statistics."""
    try:
        db_healthy = check_db_connection()
        pool_stats = get_db_pool_stats()
        
        status = {
            "healthy": db_healthy,
            "connection_pool": pool_stats,
            "database_url_type": "sqlite" if str(engine.url).startswith("sqlite") else "postgresql",
            "engine_info": {
                "echo": engine.echo,
                "pool_pre_ping": True,  # We enabled this
                "pool_recycle": 300 if str(engine.url).startswith("sqlite") else 3600
            }
        }
        
        return JSONResponse(content=status)
        
    except Exception as e:
        logger.error(f"Failed to get database status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve database status")

# Include routers with error handling
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
    """Root endpoint with enhanced feature information."""
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
            "Image processing and thumbnails",
            "Performance monitoring and optimization",
            "Database connection pooling",
            "Query performance optimization"
        ],
        "performance_features": {
            "database_connection_pooling": "enabled",
            "query_performance_monitoring": "enabled",
            "request_performance_tracking": "enabled",
            "slow_query_detection": "enabled",
            "health_monitoring": "enabled"
        },
        "api_endpoints": {
            "health": "/health",
            "metrics": "/metrics",
            "database_status": "/status/database"
        }
    }

logger.info("Elior Fitness API application startup completed successfully") 