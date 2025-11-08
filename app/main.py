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
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import re

# Universal environment configuration that works with any reverse proxy
def detect_environment():
    """Universal environment detection that works with any deployment method."""
    
    # Check for explicit environment setting
    env = os.getenv("ENVIRONMENT")
    if env:
        return env
    
    # Auto-detect production environments
    production_indicators = [
        os.getenv("RAILWAY_PUBLIC_DOMAIN"),      # Railway
        os.getenv("RAILWAY_STATIC_URL"),         # Railway
        os.getenv("RENDER_EXTERNAL_URL"),        # Render
        os.getenv("HEROKU_APP_NAME"),            # Heroku
        os.getenv("VERCEL_URL"),                 # Vercel
        os.getenv("NETLIFY_URL"),                # Netlify
        os.getenv("PORT"),                       # Any cloud platform
    ]
    
    # If any production indicator is present, assume production
    if any(indicator for indicator in production_indicators):
        return "production"
    
    # Default to development for local development
    return "development"

def detect_domain():
    """Universal domain detection."""
    # Check for explicit domain setting
    domain = os.getenv("DOMAIN")
    if domain and domain != "localhost":
        return domain
    
    # Auto-detect from various platform variables
    platform_domains = [
        os.getenv("RAILWAY_PUBLIC_DOMAIN"),
        os.getenv("RAILWAY_STATIC_URL"),
        os.getenv("RENDER_EXTERNAL_URL"),
        os.getenv("VERCEL_URL"),
        os.getenv("NETLIFY_URL"),
    ]
    
    for platform_domain in platform_domains:
        if platform_domain:
            return platform_domain
    
    return "localhost"

def detect_cors_origins():
    """Universal CORS origins detection."""
    # Check for explicit CORS setting
    cors_raw = os.getenv("CORS_ORIGINS")
    if cors_raw:
        origins = [origin.strip() for origin in cors_raw.split(",") if origin.strip()]
        if origins and origins != ["http://localhost:3000"]:
            return origins
    
    # Auto-detect from domain
    domain = detect_domain()
    if domain and domain != "localhost":
        return [f"https://{domain}", f"http://{domain}"]
    
    # Default development origins
    return ["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:3000", "http://127.0.0.1:8000"]

# Apply universal detection
ENVIRONMENT = detect_environment()
DOMAIN = detect_domain()
CORS_ORIGINS = detect_cors_origins()

# Debug output
print(f"=== UNIVERSAL ENVIRONMENT DETECTION ===")
print(f"Detected ENVIRONMENT: {ENVIRONMENT}")
print(f"Detected DOMAIN: {DOMAIN}")
print(f"Detected CORS_ORIGINS: {CORS_ORIGINS}")
print(f"Raw ENVIRONMENT env var: {os.getenv('ENVIRONMENT')}")
print(f"Raw DOMAIN env var: {os.getenv('DOMAIN')}")
print(f"Raw CORS_ORIGINS env var: {os.getenv('CORS_ORIGINS')}")
print(f"RAILWAY_PUBLIC_DOMAIN: {os.getenv('RAILWAY_PUBLIC_DOMAIN')}")
print(f"PORT: {os.getenv('PORT')}")
print("=" * 50)

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
    from app.routers import auth, users, exercises, workouts, nutrition, progress, files, websocket, meal_plans, system, notifications, meal_system, workout_system
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

    try:
        from app.migrations.meal_system_migration import run_meal_system_migrations

        run_meal_system_migrations()
        logger.info("✅ Meal system migrations applied")
    except Exception as migration_error:
        logger.error("❌ Meal system migrations failed: %s", migration_error)
        raise
    
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

# Custom CORS middleware for wildcard domains
def is_allowed_origin(origin: str) -> bool:
    if not origin:
        return False
    # Allow localhost and 127.0.0.1 for dev
    if re.match(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$", origin):
        return True
    # Allow any subdomain of duckdns.org
    if re.match(r"^https?://([a-zA-Z0-9-]+\.)*duckdns\.org(:\d+)?$", origin):
        return True
    # Allow any subdomain of up.railway.app
    if re.match(r"^https?://([a-zA-Z0-9-]+\.)*up\.railway\.app(:\d+)?$", origin):
        return True
    return False

class WildcardCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        origin = request.headers.get("origin")
        if is_allowed_origin(origin):
            # Preflight request
            if request.method == "OPTIONS":
                resp = Response()
                resp.headers["Access-Control-Allow-Origin"] = origin
                resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS,PATCH"
                resp.headers["Access-Control-Allow-Headers"] = request.headers.get(
                    "access-control-request-headers", "*")
                resp.headers["Access-Control-Allow-Credentials"] = "true"
                return resp
            # Normal request
            response = await call_next(request)
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Expose-Headers"] = "X-Process-Time, X-Request-ID"
            return response
        else:
            # Not allowed origin: proceed without CORS headers
            return await call_next(request)

# Add the custom CORS middleware
app.add_middleware(WildcardCORSMiddleware)

logger.info("CORS middleware configured with frontend integration support")

# Mount static files for uploads with optimized settings
try:
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
    logger.info("Static files mounted successfully")
except Exception as e:
    logger.warning(f"Could not mount uploads directory: {e}")

# Mount frontend static files with performance optimizations
try:
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    import os
    import mimetypes
    from datetime import datetime, timedelta
    
    # Custom static files handler with caching and compression
    class OptimizedStaticFiles(StaticFiles):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            
        async def __call__(self, scope, receive, send):
            # Add cache headers for static assets
            if scope["path"].startswith("/assets/"):
                # Cache static assets for 1 year
                scope["headers"] = [
                    (b"cache-control", b"public, max-age=31536000, immutable"),
                    (b"vary", b"Accept-Encoding")
                ]
            elif scope["path"].endswith((".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico")):
                # Cache other static files for 1 month
                scope["headers"] = [
                    (b"cache-control", b"public, max-age=2592000"),
                    (b"vary", b"Accept-Encoding")
                ]
            
            await super().__call__(scope, receive, send)
    
    app.mount("/assets", OptimizedStaticFiles(directory="static/assets"), name="assets")
    logger.info("Frontend assets mounted with performance optimizations")
except Exception as e:
    logger.warning(f"Could not mount frontend assets: {e}")

# Serve frontend files with performance optimizations
try:
    from fastapi.responses import FileResponse, HTMLResponse
    import os
    from datetime import datetime, timedelta
    
    # Cache disabled for development - always read fresh
    def get_index_html():
        """Get index.html without caching for development."""
        import os
        index_path = "static/index.html"
        abs_path = os.path.abspath(index_path)
        logger.info(f"Reading index.html from: {abs_path}")
        logger.info(f"File exists: {os.path.exists(index_path)}")
        if os.path.exists(index_path):
            with open(index_path, 'r', encoding='utf-8') as f:
                content = f.read()
                logger.info(f"Index.html content preview: {content[:200]}")
                return content
        logger.error(f"Index.html not found at {abs_path}")
        return None
    
    @app.get("/", response_class=HTMLResponse)
    async def serve_frontend():
        """Serve the React frontend with caching."""
        html_content = get_index_html()
        if html_content:
            return HTMLResponse(
                content=html_content,
                headers={
                    "Cache-Control": "public, max-age=300",  # Cache for 5 minutes
                    "Vary": "Accept-Encoding"
                }
            )
        else:
            return HTMLResponse(
                content="<h1>Frontend not found</h1>",
                status_code=404
            )
            
    @app.get("/favicon.ico")
    async def serve_favicon():
        """Serve favicon with caching."""
        favicon_path = "static/favicon.ico"
        if os.path.exists(favicon_path):
            return FileResponse(
                favicon_path,
                headers={
                    "Cache-Control": "public, max-age=86400",  # Cache for 1 day
                    "Vary": "Accept-Encoding"
                }
            )
        return {"message": "Favicon not found"}
        
    @app.get("/robots.txt")
    async def serve_robots():
        """Serve robots.txt with caching."""
        robots_path = "static/robots.txt"
        if os.path.exists(robots_path):
            return FileResponse(
                robots_path,
                headers={
                    "Cache-Control": "public, max-age=86400",  # Cache for 1 day
                    "Vary": "Accept-Encoding"
                }
            )
        return {"message": "Robots.txt not found"}
    
    # Catch-all route for SPA routing - will be moved to the end
    # This is just a placeholder - the actual route will be defined after all other routes
        
    logger.info("Frontend serving endpoints configured with performance optimizations")
except Exception as e:
    logger.warning(f"Could not configure frontend serving: {e}")

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

# API test endpoint for debugging authentication flow
@app.get("/api/test")
async def api_test_endpoint():
    """API test endpoint for debugging authentication flow."""
    return {
        "message": "API endpoint is accessible!",
        "environment": ENVIRONMENT,
        "domain": DOMAIN,
        "cors_origins": CORS_ORIGINS,
        "timestamp": time.time(),
        "api_status": "working"
    }

# Environment debug endpoint
@app.get("/api/debug/env")
async def debug_environment():
    """Debug endpoint to check environment variables."""
    return {
        "raw_environment": os.getenv("ENVIRONMENT"),
        "raw_domain": os.getenv("DOMAIN"),
        "raw_cors_origins": os.getenv("CORS_ORIGINS"),
        "railway_public_domain": os.getenv("RAILWAY_PUBLIC_DOMAIN"),
        "railway_static_url": os.getenv("RAILWAY_STATIC_URL"),
        "port": os.getenv("PORT"),
        "processed_environment": ENVIRONMENT,
        "processed_domain": DOMAIN,
        "processed_cors_origins": CORS_ORIGINS,
        "timestamp": time.time()
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
    
    logger.info("Including meal_system router (v2)...")
    app.include_router(meal_system.router, prefix="/api/v2/meals", tags=["Meal System V2"])
    logger.info("✅ Meal system V2 router included")
    
    logger.info("Including workout_system router (v2)...")
    app.include_router(workout_system.router, prefix="/api/v2/workouts", tags=["Workout System V2"])
    logger.info("✅ Workout system V2 router included")
    
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

# Catch-all route for SPA routing - MUST BE LAST
@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_spa_routes(full_path: str):
    """Serve index.html for all non-API routes to support SPA routing."""
    # Don't serve index.html for API routes or system endpoints
    if (full_path.startswith("api/") or 
        full_path in ["health", "test", "metrics"] or
        full_path.startswith("health/") or
        full_path.startswith("metrics/") or
        full_path.startswith("status/") or
        full_path.startswith("uploads/") or
        full_path.startswith("docs/") or
        full_path.startswith("redoc/")):
        raise HTTPException(status_code=404, detail="Not found")
    
    # Serve index.html for all other routes (SPA routing)
    html_content = get_index_html()
    if html_content:
        return HTMLResponse(
            content=html_content,
            headers={
                "Cache-Control": "public, max-age=300",  # Cache for 5 minutes
                "Vary": "Accept-Encoding"
            }
        )
    else:
        return HTMLResponse(
            content="<h1>Frontend not found</h1>",
            status_code=404
        )

logger.info("Elior Fitness API application startup completed successfully") 