from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging
from dotenv import load_dotenv

# Configure logging
logger = logging.getLogger(__name__)

load_dotenv()

# Get database URL from environment variable, or use SQLite default for development
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./data/elior_fitness.db"
)

logger.info(f"Database URL: {SQLALCHEMY_DATABASE_URL}")

# Create SQLAlchemy engine with SQLite-specific settings
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    logger.info("Configuring SQLite database...")
    # Ensure the data directory exists
    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    logger.debug(f"Database file path: {db_path}")
    
    try:
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        logger.info(f"Database directory created/verified: {os.path.dirname(db_path)}")
    except Exception as e:
        logger.error(f"Failed to create database directory: {e}")
        raise
    
    try:
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL, 
            connect_args={"check_same_thread": False}  # Needed for SQLite
        )
        logger.info("SQLite engine created successfully")
    except Exception as e:
        logger.error(f"Failed to create SQLite engine: {e}")
        raise
else:
    logger.info("Configuring non-SQLite database...")
    try:
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        logger.info("Database engine created successfully")
    except Exception as e:
        logger.error(f"Failed to create database engine: {e}")
        raise

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
logger.info("SessionLocal class created")

# Create Base class
Base = declarative_base()
logger.info("Base class created")

# Dependency
def get_db():
    logger.debug("Creating database session")
    db = SessionLocal()
    try:
        yield db
    finally:
        logger.debug("Closing database session")
        db.close()

logger.info("Database configuration completed successfully") 