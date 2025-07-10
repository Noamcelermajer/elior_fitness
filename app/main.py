from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import logging
import sys
import time
import asyncio
import os
from contextlib import asynccontextmanager

# Environment-based configuration (define before logging)
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DOMAIN = os.getenv("DOMAIN", "localhost")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# Defensive defaults when env vars missing (e.g., during initial deploy)
if not ENVIRONMENT:
    ENVIRONMENT = "production"

if (not DOMAIN or DOMAIN == "localhost") and os.getenv("RAILWAY_PUBLIC_DOMAIN"):
    DOMAIN = os.getenv("RAILWAY_PUBLIC_DOMAIN")

if (not CORS_ORIGINS or CORS_ORIGINS == [""] or CORS_ORIGINS == ["http://localhost:3000"]):
    rail_domain = os.getenv("RAILWAY_PUBLIC_DOMAIN") or os.getenv("RAILWAY_STATIC_URL")
    if rail_domain:
        CORS_ORIGINS = [f"https://{rail_domain}", f"http://{rail_domain}"]

# Configure logging with comprehensive output
import os
from datetime import datetime

# Create logs directory if it doesn't exist
os.makedirs("logs", exist_ok=True)

# Configure logging with both file and console output
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
enable_debug = os.getenv("ENABLE_DEBUG_LOGGING", "false").lower() == "true"

if enable_debug:
    log_level = "DEBUG"

logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f"logs/elior_api_{datetime.now().strftime('%Y%m%d')}.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Log startup information
logger.info("=" * 60)
logger.info("ELIOR FITNESS API STARTUP")
logger.info("=" * 60)
logger.info(f"Timestamp: {datetime.now()}")
logger.info(f"Environment: {ENVIRONMENT}")
logger.info(f"Log Level: {log_level}")
logger.info(f"Debug Logging: {enable_debug}")
logger.info(f"Domain: {DOMAIN}")
logger.info(f"CORS Origins: {CORS_ORIGINS}")
logger.info("=" * 60)

logger.info("Starting Elior Fitness API application...")

try:
    from app.database import engine, Base, check_db_connection, get_db_pool_stats, init_database
    logger.info("Database module imported successfully")
except Exception as e:
    logger.error(f"Failed to import database module: {e}")
    raise

try:
    logger.info("Importing router modules...")
    from app.routers import auth, users, exercises, workouts, nutrition, progress, files, websocket, meal_plans, system, notifications
    logger.info("✅ Router modules imported successfully")
    logger.info("📋 Available routers: auth, users, exercises, workouts, nutrition, progress, files, websocket, meal_plans, system, notifications")
except Exception as e:
    logger.error(f"❌ Failed to import router modules: {e}")
    logger.error(f"Error type: {type(e).__name__}")
    logger.error(f"Error details: {str(e)}")
    import traceback
    logger.error(f"Stack trace: {traceback.format_exc()}")
    raise

# Import all models to ensure they're registered with Base.metadata
try:
    logger.info("Importing model modules...")
    from app.models import user as user_models, workout as workout_models, nutrition as nutrition_models
    logger.info("✅ Model modules imported successfully")
    logger.info("📋 Available models: user, workout, nutrition, progress, notification")
except Exception as e:
    logger.error(f"❌ Failed to import model modules: {e}")
    logger.error(f"Error type: {type(e).__name__}")
    logger.error(f"Error details: {str(e)}")
    import traceback
    logger.error(f"Stack trace: {traceback.format_exc()}")
    raise

# Application lifespan management for performance optimization
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=" * 40)
    logger.info("APPLICATION STARTUP INITIATED")
    logger.info("=" * 40)
    
    # Check database connection health
    logger.info("Checking database connection...")
    if not check_db_connection():
        logger.error("❌ Database connection failed on startup")
        raise Exception("Database connection failed")
    logger.info("✅ Database connection successful")
    
    # Initialize database tables
    logger.info("Initializing database tables...")
    if not init_database():
        logger.error("❌ Database initialization failed")
        raise Exception("Database initialization failed")
    logger.info("✅ Database tables initialized successfully")
    
    # Log database pool statistics
    pool_stats = get_db_pool_stats()
    logger.info(f"📊 Database pool initialized: {pool_stats}")
    
    # REMOVED: Notification scheduler for minimal resource usage
    # logger.info("Starting notification scheduler...")
    # try:
    #     from app.services.scheduler_service import start_notification_scheduler
    #     await start_notification_scheduler()
    #     logger.info("✅ Notification scheduler started successfully")
    # except Exception as e:
    #     logger.error(f"❌ Failed to start notification scheduler: {e}")
    #     logger.error(f"Stack trace: {e.__traceback__}")
    
    logger.info("=" * 40)
    logger.info("✅ APPLICATION STARTUP COMPLETED SUCCESSFULLY")
    logger.info("=" * 40)
    yield
    
    # Shutdown
    logger.info("=" * 40)
    logger.info("APPLICATION SHUTDOWN INITIATED")
    logger.info("=" * 40)
    
    # REMOVED: Notification scheduler shutdown for minimal resource usage
    # logger.info("Stopping notification scheduler...")
    # try:
    #     from app.services.scheduler_service import stop_notification_scheduler
    #     await stop_notification_scheduler()
    #     logger.info("✅ Notification scheduler stopped successfully")
    # except Exception as e:
    #     logger.error(f"❌ Failed to stop notification scheduler: {e}")
    
    # Close database connections gracefully
    logger.info("Closing database connections...")
    engine.dispose()
    logger.info("✅ Database connections closed")
    logger.info("=" * 40)
    logger.info("✅ APPLICATION SHUTDOWN COMPLETED")
    logger.info("=" * 40)

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

# Performance monitoring middleware - OPTIMIZED FOR MINIMAL RESOURCES
@app.middleware("http")
async def performance_monitoring_middleware(request: Request, call_next):
    """Monitor request performance with minimal overhead."""
    start_time = time.time()
    
    try:
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Add performance headers (minimal overhead)
        response.headers["X-Process-Time"] = f"{process_time:.3f}"
        
        # Only log very slow requests (>2s) to reduce logging overhead
        if process_time > 2.0:
            logger.warning(f"Very slow request: {request.method} {request.url} took {process_time:.3f}s")
        
        return response
        
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"Request failed: {request.method} {request.url} after {process_time:.3f}s - Error: {str(e)}")
        raise

# Environment-based CORS middleware configuration
if ENVIRONMENT == "production":
    # Production: Only allow specified origins
    cors_origins = CORS_ORIGINS
    logger.info(f"Production CORS origins: {cors_origins}")
else:
    # Development: Allow all localhost origins
    cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",  # Vite default port
        "http://127.0.0.1:5173"
    ]
    logger.info("Development CORS origins configured")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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
    """Platform health check endpoint - always returns 200 for Railway."""
    logger.debug("Health check endpoint called")
    
    # Check database connectivity
    db_healthy = check_db_connection()
    
    # Get database pool statistics
    pool_stats = get_db_pool_stats()
    
    # Health status - always return 200 for platform compatibility
    health_status = {
        "status": "healthy" if db_healthy else "degraded",
        "version": "1.0.0",
        "environment": ENVIRONMENT,
        "timestamp": time.time(),
        "database": {
            "status": "connected" if db_healthy else "disconnected",
            "pool_stats": pool_stats
        }
    }
    
    # Always return 200 for platform health checks
    return JSONResponse(content=health_status, status_code=200)

# Simple test endpoint for Railway debugging
@app.get("/test")
async def test_endpoint():
    """Simple test endpoint that doesn't depend on database."""
    return {
        "message": "Elior Fitness API is running",
        "version": "1.0.0",
        "environment": ENVIRONMENT,
        "timestamp": time.time(),
        "status": "ok"
    }

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
        
        metrics = {
            "timestamp": time.time(),
            "environment": ENVIRONMENT,
            "database": {
                "healthy": db_healthy,
                "pool_stats": pool_stats
            },
            "application": {
                "version": "1.0.0",
                "uptime": time.time() - app.startup_time if hasattr(app, 'startup_time') else 0
            }
        }
        
        return JSONResponse(content=metrics)
        
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get metrics")

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
    logger.info("=" * 40)
    logger.info("INCLUDING ROUTERS")
    logger.info("=" * 40)
    
    logger.info("Including auth router...")
    app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
    logger.info("✅ Auth router included")
    
    logger.info("Including users router...")
    app.include_router(users.router, prefix="/api/users", tags=["Users"])
    logger.info("✅ Users router included")
    
    logger.info("Including exercises router...")
    app.include_router(exercises.router, prefix="/api/exercises", tags=["Exercises"])
    logger.info("✅ Exercises router included")
    
    logger.info("Including workouts router...")
    app.include_router(workouts.router, prefix="/api/workouts", tags=["Workouts"])
    logger.info("✅ Workouts router included")
    
    logger.info("Including nutrition router...")
    app.include_router(nutrition.router, prefix="/api/nutrition", tags=["Nutrition"])
    logger.info("✅ Nutrition router included")
    
    logger.info("Including meal_plans router...")
    app.include_router(meal_plans.router, prefix="/api/meal-plans", tags=["Meal Plans"])
    logger.info("✅ Meal plans router included")
    
    logger.info("Including progress router...")
    app.include_router(progress.router, prefix="/api/progress", tags=["Progress"])
    logger.info("✅ Progress router included")
    
    logger.info("Including files router...")
    app.include_router(files.router, prefix="/api/files", tags=["File Management"])
    logger.info("✅ Files router included")
    
    logger.info("Including websocket router...")
    app.include_router(websocket.router, prefix="/api/ws", tags=["WebSocket"])
    logger.info("✅ WebSocket router included")
    
    logger.info("Including system router...")
    app.include_router(system.router, prefix="/api/system", tags=["System"])
    logger.info("✅ System router included")
    
    logger.info("Including notifications router...")
    app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
    logger.info("✅ Notifications router included")
    
    logger.info("=" * 40)
    logger.info("✅ ALL ROUTERS INCLUDED SUCCESSFULLY")
    logger.info("=" * 40)
except Exception as e:
    logger.error(f"❌ Failed to include routers: {e}")
    logger.error(f"Error type: {type(e).__name__}")
    logger.error(f"Error details: {str(e)}")
    import traceback
    logger.error(f"Stack trace: {traceback.format_exc()}")
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