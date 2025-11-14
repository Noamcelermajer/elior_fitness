from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker
import os
import logging
import time
from dotenv import load_dotenv
from contextlib import contextmanager
from typing import Generator, Any

# Configure logging
logger = logging.getLogger(__name__)

load_dotenv()

# Get environment (production vs development)
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Get database path from environment variable, default to local data directory
# Use ./data/elior_fitness.db for local development
DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/elior_fitness.db")

# Ensure the path is absolute for better reliability
if not os.path.isabs(DATABASE_PATH):
    DATABASE_PATH = os.path.abspath(DATABASE_PATH)

# Get database URL from environment variable
DATABASE_URL_ENV = os.getenv("DATABASE_URL")
DATABASE_PUBLIC_URL_ENV = os.getenv("DATABASE_PUBLIC_URL")  # Railway public URL fallback

# In production, DATABASE_URL MUST be set and MUST be PostgreSQL
if ENVIRONMENT == "production":
    if not DATABASE_URL_ENV:
        # Try public URL as fallback
        if DATABASE_PUBLIC_URL_ENV and DATABASE_PUBLIC_URL_ENV.startswith("postgresql"):
            logger.warning("DATABASE_URL not set, using DATABASE_PUBLIC_URL as fallback")
            DATABASE_URL_ENV = DATABASE_PUBLIC_URL_ENV
        else:
            error_msg = (
                "CRITICAL: DATABASE_URL environment variable is not set in production! "
                "PostgreSQL connection string is required. "
                "Please set DATABASE_URL in Railway service variables."
            )
            logger.error(error_msg)
            raise ValueError(error_msg)
    
    if DATABASE_URL_ENV.startswith("sqlite"):
        error_msg = (
            "CRITICAL: SQLite is not allowed in production! "
            "DATABASE_URL must be a PostgreSQL connection string. "
            f"Current value starts with 'sqlite://' which is not allowed in production."
        )
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    if not DATABASE_URL_ENV.startswith("postgresql"):
        error_msg = (
            f"CRITICAL: Invalid database URL in production! "
            f"DATABASE_URL must be a PostgreSQL connection string (starting with 'postgresql://'). "
            f"Current value: {DATABASE_URL_ENV[:50]}..."
        )
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    # Check if using internal Railway URL and we have a public URL available
    # Internal URLs often have connectivity issues, so prefer public URL
    if ".railway.internal" in DATABASE_URL_ENV and DATABASE_PUBLIC_URL_ENV:
        if DATABASE_PUBLIC_URL_ENV.startswith("postgresql"):
            logger.warning(
                "Internal Railway URL detected but public URL available. "
                "Switching to public URL for better connectivity."
            )
            SQLALCHEMY_DATABASE_URL = DATABASE_PUBLIC_URL_ENV
        else:
            SQLALCHEMY_DATABASE_URL = DATABASE_URL_ENV
            logger.warning(
                "Internal Railway URL detected. If connection fails, "
                "consider using DATABASE_PUBLIC_URL instead."
            )
    else:
        SQLALCHEMY_DATABASE_URL = DATABASE_URL_ENV
    
    logger.info("Production mode: Using PostgreSQL database (SQLite fallback disabled)")

else:
    # Development mode: Allow SQLite fallback
    SQLALCHEMY_DATABASE_URL = DATABASE_URL_ENV or f"sqlite:///{DATABASE_PATH}"
    logger.info(f"Development mode: Database URL: {SQLALCHEMY_DATABASE_URL[:50]}...")

logger.info(f"Database URL configured (type: {'PostgreSQL' if SQLALCHEMY_DATABASE_URL.startswith('postgresql') else 'SQLite'})")

# Database configuration based on database type
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    logger.info("Configuring SQLite database with optimizations...")
    
    # Ensure the data directory exists
    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    try:
        os.makedirs(db_dir, exist_ok=True)
        logger.info(f"Database directory created/verified: {db_dir}")
    except Exception as e:
        logger.error(f"Failed to create database directory: {e}")
        raise
    
    # SQLite-specific optimizations
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,  # 5 minutes
        echo=False,  # Set to True for debugging
        connect_args={
            "check_same_thread": False,
            "timeout": 20  # 20 second timeout for SQLite
        }
    )
    
    # SQLite performance optimizations - OPTIMIZED FOR MINIMAL RESOURCES
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        """Set SQLite-specific performance optimizations for minimal resource usage."""
        cursor = dbapi_connection.cursor()
        # Enable WAL mode for better concurrency
        cursor.execute("PRAGMA journal_mode=WAL")
        # REDUCED cache size for minimal memory usage (was 64MB, now 8MB)
        cursor.execute("PRAGMA cache_size=-8192")  # 8MB cache
        # Enable foreign keys
        cursor.execute("PRAGMA foreign_keys=ON")
        # Optimize synchronous mode for better performance
        cursor.execute("PRAGMA synchronous=NORMAL")
        # Set temp store to memory
        cursor.execute("PRAGMA temp_store=MEMORY")
        # Optimize page size
        cursor.execute("PRAGMA page_size=4096")
        # REDUCED memory mapping for minimal memory usage (was 256MB, now 32MB)
        cursor.execute("PRAGMA mmap_size=33554432")  # 32MB
        cursor.close()
    
    logger.info("SQLite engine created with performance optimizations")

else:
    logger.info("Configuring PostgreSQL database with connection pooling...")
    
    # Verify psycopg2 is installed (required for PostgreSQL)
    try:
        import psycopg2
        logger.info(f"psycopg2 is available (version: {psycopg2.__version__})")
    except ImportError:
        error_msg = (
            "CRITICAL: psycopg2-binary is not installed! "
            "PostgreSQL requires psycopg2-binary package. "
            "Please ensure requirements.txt includes 'psycopg2-binary>=2.9.9' and rebuild the Docker image."
        )
        logger.error(error_msg)
        if ENVIRONMENT == "production":
            raise ImportError(error_msg)
        else:
            logger.warning(f"Warning: {error_msg}")
    
    # Log connection details and determine SSL mode
    try:
        from urllib.parse import urlparse
        parsed_url = urlparse(SQLALCHEMY_DATABASE_URL)
        logger.info(f"PostgreSQL connection details: host={parsed_url.hostname}, port={parsed_url.port}, database={parsed_url.path.lstrip('/')}, user={parsed_url.username}")
    except Exception:
        parsed_url = None
        logger.warning("Could not parse DATABASE_URL for connection details")
    
    # Determine SSL mode based on URL type
    if parsed_url:
        is_public_url = "proxy.rlwy.net" in parsed_url.hostname or "railway.app" in parsed_url.hostname
        is_internal_url = ".railway.internal" in parsed_url.hostname
    else:
        is_public_url = "proxy.rlwy.net" in SQLALCHEMY_DATABASE_URL or "railway.app" in SQLALCHEMY_DATABASE_URL
        is_internal_url = ".railway.internal" in SQLALCHEMY_DATABASE_URL
    
    # SSL configuration: public URLs need SSL, internal might not
    if is_public_url:
        ssl_mode = "require"  # Public URLs require SSL
        logger.info("Using SSL mode 'require' for public Railway URL")
    elif is_internal_url:
        ssl_mode = "prefer"  # Internal URLs can use SSL but don't require it
        logger.info("Using SSL mode 'prefer' for internal Railway URL")
    else:
        ssl_mode = "prefer"  # Default to prefer for other URLs
        logger.info("Using SSL mode 'prefer' for database connection")
    
    # PostgreSQL-specific optimizations with improved error handling
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=5,  # Reduced for Railway (was 20)
        max_overflow=10,  # Reduced for Railway (was 30)
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=3600,  # Recycle connections after 1 hour
        echo=False,  # Set to True for debugging
        connect_args={
            "options": "-c statement_timeout=30000",  # 30 second timeout
            "connect_timeout": 60,  # Increased timeout for Railway (was 30)
            "application_name": "elior_fitness_api",
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5,
            "sslmode": ssl_mode
        }
    )
    
    # PostgreSQL performance optimizations
    @event.listens_for(engine, "connect")
    def set_postgresql_optimizations(dbapi_connection, connection_record):
        """Set PostgreSQL-specific optimizations."""
        with dbapi_connection.cursor() as cursor:
            # Enable query plan caching
            cursor.execute("SET plan_cache_mode = 'force_generic_plan'")
            # Optimize work memory for better sorting/grouping
            cursor.execute("SET work_mem = '32MB'")
            # Enable parallel query execution
            cursor.execute("SET max_parallel_workers_per_gather = 4")
            # Optimize random page cost for SSDs
            cursor.execute("SET random_page_cost = 1.1")
            # Enable JIT compilation for complex queries
            cursor.execute("SET jit = on")
    
    logger.info("PostgreSQL engine created with performance optimizations")

# REMOVED: Expensive query monitoring for minimal resource usage
# @event.listens_for(engine, "before_cursor_execute")
# def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
#     """Monitor query execution time."""
#     context._query_start_time = time.time()

# @event.listens_for(engine, "after_cursor_execute")
# def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
#     """Log slow queries."""
#     total = time.time() - context._query_start_time
#     if total > 0.1:  # Log queries taking more than 100ms
#         logger.warning(f"Slow query: {total:.3f}s - {statement[:100]}...")

# Create SessionLocal class with optimized configuration
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Prevent lazy loading after commit
)

logger.info("SessionLocal class created with optimizations")

# Create Base class
Base = declarative_base()
logger.info("Base class created")

# Optimized dependency with proper error handling
def get_db():
    """Database session dependency with error handling."""
    logger.debug("Creating database session")
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        logger.debug("Closing database session")
        db.close()

# Context manager for database operations
@contextmanager
def get_db_context() -> Generator[Any, None, None]:
    """Context manager for database operations."""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database context error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

# Connection health check function
def check_db_connection() -> bool:
    """Check if database connection is healthy."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        return True
    except Exception as e:
        logger.error(f"Database connection health check failed: {e}")
        return False

# Get database connection pool statistics
def get_db_pool_stats() -> dict:
    """Get database connection pool statistics."""
    try:
        pool = engine.pool
        stats = {
            "pool_size": pool.size(),
            "checked_in_connections": pool.checkedin(),
            "checked_out_connections": pool.checkedout(),
            "overflow_connections": pool.overflow()
        }
        
        # Add invalid connections if available (PostgreSQL only)
        if hasattr(pool, 'invalid'):
            stats["invalid_connections"] = pool.invalid()
        
        return stats
    except Exception as e:
        logger.error(f"Failed to get pool stats: {e}")
        return {"error": str(e)}

# Database initialization function with retry logic and network diagnostics
def init_database(max_retries=5, retry_delay=10):
    """Initialize database with all tables, with retry logic for connection issues."""
    import time
    import socket
    
    # Log connection diagnostics
    try:
        from urllib.parse import urlparse
        parsed = urlparse(SQLALCHEMY_DATABASE_URL)
        logger.info(f"Attempting to connect to: {parsed.hostname}:{parsed.port or 5432}")
        
        # Test basic network connectivity
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((parsed.hostname, parsed.port or 5432))
            sock.close()
            if result == 0:
                logger.info("✓ Network connectivity test passed")
            else:
                logger.warning(f"⚠ Network connectivity test failed (error code: {result})")
        except socket.gaierror as e:
            logger.warning(f"⚠ DNS resolution failed for {parsed.hostname}: {e}")
        except Exception as e:
            logger.warning(f"⚠ Network test failed: {e}")
    except Exception as e:
        logger.warning(f"Could not parse URL for diagnostics: {e}")
    
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Initializing database tables... (attempt {attempt}/{max_retries})")
            
            # Test connection first with explicit timeout
            logger.info("Testing database connection...")
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1 as test"))
                test_value = result.fetchone()
                logger.info(f"✓ Connection test successful: {test_value}")
            
            # Create tables
            logger.info("Creating database tables...")
            Base.metadata.create_all(bind=engine)
            logger.info("✓ Database tables initialized successfully")
            return True
            
        except Exception as e:
            error_msg = str(e)
            logger.warning(f"Database initialization attempt {attempt} failed: {error_msg}")
            
            # More detailed error diagnostics
            if "timeout" in error_msg.lower():
                logger.error("Connection timeout detected. Possible causes:")
                logger.error("  - PostgreSQL service is not running or not ready")
                logger.error("  - Network firewall blocking connection")
                logger.error("  - Incorrect hostname/port in DATABASE_URL")
                logger.error("  - SSL/TLS handshake failing")
            elif "connection" in error_msg.lower():
                logger.error("Connection error detected. Possible causes:")
                logger.error("  - Services not properly linked in Railway")
                logger.error("  - PostgreSQL service is down")
                logger.error("  - Network connectivity issues")
            
            if attempt < max_retries:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 1.5, 30)  # Exponential backoff, max 30s
            else:
                logger.error(f"Failed to initialize database after {max_retries} attempts")
                logger.error("Final diagnostics:")
                logger.error("  1. Verify DATABASE_URL is correct in Railway variables")
                logger.error("  2. Check PostgreSQL service is running and healthy")
                logger.error("  3. Ensure services are in the same Railway project")
                logger.error("  4. Try using internal URL if public URL fails")
                logger.error("  5. Check Railway service logs for PostgreSQL errors")
                return False
    
    return False

logger.info("Database configuration completed successfully") 