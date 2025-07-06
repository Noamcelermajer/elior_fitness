from sqlalchemy import create_engine, event
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

# Get database URL from environment variable, or use SQLite default for development
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./data/elior_fitness.db"
)

logger.info(f"Database URL: {SQLALCHEMY_DATABASE_URL}")

# Database configuration based on database type
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    logger.info("Configuring SQLite database with optimizations...")
    
    # Ensure the data directory exists
    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    logger.debug(f"Database file path: {db_path}")
    
    try:
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        logger.info(f"Database directory created/verified: {os.path.dirname(db_path)}")
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
    
    # SQLite performance optimizations
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        """Set SQLite-specific performance optimizations."""
        cursor = dbapi_connection.cursor()
        # Enable WAL mode for better concurrency
        cursor.execute("PRAGMA journal_mode=WAL")
        # Increase cache size (negative value = KB)
        cursor.execute("PRAGMA cache_size=-64000")  # 64MB cache
        # Enable foreign keys
        cursor.execute("PRAGMA foreign_keys=ON")
        # Optimize synchronous mode
        cursor.execute("PRAGMA synchronous=NORMAL")
        # Set temp store to memory
        cursor.execute("PRAGMA temp_store=MEMORY")
        # Optimize page size
        cursor.execute("PRAGMA page_size=4096")
        # Enable memory mapping
        cursor.execute("PRAGMA mmap_size=268435456")  # 256MB
        cursor.close()
    
    logger.info("SQLite engine created with performance optimizations")

else:
    logger.info("Configuring PostgreSQL database with connection pooling...")
    
    # PostgreSQL-specific optimizations
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=20,  # Number of connections to maintain
        max_overflow=30,  # Additional connections beyond pool_size
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=3600,  # Recycle connections after 1 hour
        echo=False,  # Set to True for debugging
        connect_args={
            "options": "-c statement_timeout=30000",  # 30 second timeout
            "connect_timeout": 10,
            "application_name": "elior_fitness_api"
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

# Add connection performance monitoring
@event.listens_for(engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Monitor query execution time."""
    context._query_start_time = time.time()

@event.listens_for(engine, "after_cursor_execute")
def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log slow queries."""
    total = time.time() - context._query_start_time
    if total > 0.1:  # Log queries taking more than 100ms
        logger.warning(f"Slow query: {total:.3f}s - {statement[:100]}...")

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
            if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
                result = conn.execute("SELECT 1")
            else:
                result = conn.execute("SELECT 1")
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
        return {
            "pool_size": pool.size(),
            "checked_in_connections": pool.checkedin(),
            "checked_out_connections": pool.checkedout(),
            "overflow_connections": pool.overflow(),
            "invalid_connections": pool.invalid()
        }
    except Exception as e:
        logger.error(f"Failed to get pool stats: {e}")
        return {"error": str(e)}

# Database initialization function
def init_database():
    """Initialize database with all tables."""
    try:
        logger.info("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        return False

logger.info("Database configuration completed successfully") 