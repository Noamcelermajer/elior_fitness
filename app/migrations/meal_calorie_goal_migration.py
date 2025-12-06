import logging
from sqlalchemy import text
from app.database import engine
import os

logger = logging.getLogger(__name__)

# Detect database type
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "")
IS_POSTGRESQL = SQLALCHEMY_DATABASE_URL.startswith("postgresql") if SQLALCHEMY_DATABASE_URL else False


def _column_exists(table_name: str, column_name: str) -> bool:
    """Check if column exists - database-agnostic."""
    if IS_POSTGRESQL:
        query = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = :table_name AND column_name = :column_name
        """)
        with engine.connect() as connection:
            result = connection.execute(query, {"table_name": table_name, "column_name": column_name})
            return result.fetchone() is not None
    else:
        # SQLite
        query = text(f"PRAGMA table_info('{table_name}')")
        with engine.connect() as connection:
            result = connection.execute(query)
            columns = [dict(row._mapping) for row in result]
            return any(column["name"] == column_name for column in columns)


def run_meal_calorie_goal_migration():
    """Add calorie_goal column to macro_categories_v2 table if it doesn't exist."""
    try:
        logger.info("Running meal calorie goal migration...")
        
        if not _column_exists("macro_categories_v2", "calorie_goal"):
            logger.info("Adding calorie_goal column to macro_categories_v2 table...")
            with engine.begin() as connection:
                if IS_POSTGRESQL:
                    connection.execute(
                        text("ALTER TABLE macro_categories_v2 ADD COLUMN calorie_goal INTEGER")
                    )
                else:
                    # SQLite
                    connection.execute(
                        text("ALTER TABLE macro_categories_v2 ADD COLUMN calorie_goal INTEGER")
                    )
            logger.info("✅ Successfully added calorie_goal column to macro_categories_v2 table")
        else:
            logger.info("✅ calorie_goal column already exists in macro_categories_v2 table")
            
    except Exception as e:
        logger.error(f"❌ Failed to run meal calorie goal migration: {e}")
        import traceback
        logger.error(f"Migration error traceback: {traceback.format_exc()}")
        raise

