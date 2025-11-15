import logging
from typing import Dict, List
import os

from sqlalchemy import text, inspect

from app.database import engine

logger = logging.getLogger(__name__)

# Detect database type
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "")
IS_POSTGRESQL = SQLALCHEMY_DATABASE_URL.startswith("postgresql") if SQLALCHEMY_DATABASE_URL else False


def _table_info(table_name: str) -> List[Dict[str, object]]:
    """Get table info - database-agnostic."""
    if IS_POSTGRESQL:
        query = text("""
            SELECT 
                column_name as name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = :table_name
            ORDER BY ordinal_position
        """)
        with engine.connect() as connection:
            result = connection.execute(query, {"table_name": table_name})
            return [
                {
                    "name": row.name,
                    "type": row.data_type,
                    "notnull": row.is_nullable == "NO",
                    "dflt_value": row.column_default
                }
                for row in result
            ]
    else:
        # SQLite
        query = text(f"PRAGMA table_info('{table_name}')")
        with engine.connect() as connection:
            result = connection.execute(query)
            return [dict(row._mapping) for row in result]


def _column_exists(table_name: str, column_name: str) -> bool:
    """Check if column exists - database-agnostic."""
    if IS_POSTGRESQL:
        query = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = :table_name AND column_name = :column_name
        """)
        with engine.connect() as connection:
            result = connection.execute(query, {"table_name": table_name, "column_name": column_name})
            return result.fetchone() is not None
    else:
        return any(column["name"] == column_name for column in _table_info(table_name))


def _ensure_columns(table_name: str, columns: Dict[str, str]) -> None:
    """Add columns if they don't exist - database-agnostic."""
    with engine.begin() as connection:
        for column_name, column_type in columns.items():
            if not _column_exists(table_name, column_name):
                logger.info(
                    "Adding missing column '%s.%s' (%s)",
                    table_name,
                    column_name,
                    column_type,
                )
                # Map SQLite types to PostgreSQL types
                if IS_POSTGRESQL:
                    pg_type = column_type.replace("TEXT", "VARCHAR").replace("INTEGER", "INTEGER")
                    connection.execute(
                        text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {pg_type}")
                    )
                else:
                    connection.execute(
                        text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
                    )


def _table_exists(table_name: str) -> bool:
    """Check if a table exists in the database - database-agnostic."""
    if IS_POSTGRESQL:
        query = text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = :table_name
        """)
        with engine.connect() as connection:
            result = connection.execute(query, {"table_name": table_name})
            return result.fetchone() is not None
    else:
        # SQLite
        query = text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=:table_name"
        )
        with engine.connect() as connection:
            result = connection.execute(query, {"table_name": table_name})
            return result.fetchone() is not None


def _make_column_nullable(table_name: str, column_name: str) -> None:
    """Make a column nullable - database-agnostic."""
    if not _table_exists(table_name):
        return
    
    table_info = _table_info(table_name)
    column = next((col for col in table_info if col["name"] == column_name), None)
    
    if not column:
        logger.warning(f"Column '{column_name}' does not exist in table '{table_name}'")
        return
    
    # Check if already nullable
    is_nullable = not column.get("notnull", False)
    if is_nullable:
        logger.info(f"Column '{table_name}.{column_name}' is already nullable")
        return
    
    # Make nullable
    if IS_POSTGRESQL:
        logger.info(f"Making column '{table_name}.{column_name}' nullable in PostgreSQL...")
        with engine.begin() as connection:
            # PostgreSQL supports ALTER COLUMN
            connection.execute(
                text(f"ALTER TABLE {table_name} ALTER COLUMN {column_name} DROP NOT NULL")
            )
        logger.info(f"✅ Made column '{table_name}.{column_name}' nullable")
    else:
        # SQLite doesn't support ALTER COLUMN, so we just log a warning
        logger.warning(f"⚠️ Column '{table_name}.{column_name}' is NOT NULL in SQLite but model allows NULL. "
                     f"SQLite doesn't support ALTER COLUMN, so this will be handled by the model's nullable=True")


def run_workout_system_migrations() -> None:
    """
    Ensure workout system tables contain expected columns for compatibility.
    Note: Tables are created automatically by SQLAlchemy from models.
    This migration only adds missing columns to existing tables and makes columns nullable.
    """
    try:
        # Tables are created automatically by SQLAlchemy Base.metadata.create_all()
        # We only need to add missing columns to existing tables
        
        # Add group_name column to workout_exercises_v2
        _ensure_columns(
            "workout_exercises_v2",
            {
                "group_name": "TEXT",
            },
        )
        
        # Add muscle_group_id column to exercises table
        _ensure_columns(
            "exercises",
            {
                "muscle_group_id": "INTEGER",
            },
        )
        
        # Make columns nullable in workout_exercises_v2 (PostgreSQL supports ALTER COLUMN)
        if _table_exists("workout_exercises_v2"):
            _make_column_nullable("workout_exercises_v2", "target_sets")
            _make_column_nullable("workout_exercises_v2", "target_reps")
            _make_column_nullable("workout_exercises_v2", "rest_seconds")
            _make_column_nullable("workout_exercises_v2", "group_name")
        
        # Make split_type nullable in workout_plans_v2
        if _table_exists("workout_plans_v2"):
            _make_column_nullable("workout_plans_v2", "split_type")
        
        # Change muscle_group from Enum to String if needed (SQLite doesn't enforce enum types)
        # The column type will remain compatible, we just need to ensure it exists
        
    except Exception as exc:
        logger.error("Failed to run workout system migrations: %s", exc)
        raise


