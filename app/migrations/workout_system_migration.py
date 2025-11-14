import logging
from typing import Dict, List

from sqlalchemy import text

from app.database import engine

logger = logging.getLogger(__name__)


def _table_info(table_name: str) -> List[Dict[str, object]]:
    query = text(f"PRAGMA table_info('{table_name}')")
    with engine.connect() as connection:
        result = connection.execute(query)
        return [dict(row._mapping) for row in result]


def _column_exists(table_name: str, column_name: str) -> bool:
    return any(column["name"] == column_name for column in _table_info(table_name))


def _ensure_columns(table_name: str, columns: Dict[str, str]) -> None:
    with engine.begin() as connection:
        for column_name, column_type in columns.items():
            if not _column_exists(table_name, column_name):
                logger.info(
                    "Adding missing column '%s.%s' (%s)",
                    table_name,
                    column_name,
                    column_type,
                )
                connection.execute(
                    text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
                )


def _table_exists(table_name: str) -> bool:
    """Check if a table exists in the database."""
    query = text(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=:table_name"
    )
    with engine.connect() as connection:
        result = connection.execute(query, {"table_name": table_name})
        return result.fetchone() is not None


def run_workout_system_migrations() -> None:
    """
    Ensure workout system tables contain expected columns for compatibility.
    """
    try:
        # Create muscle_groups table if it doesn't exist
        if not _table_exists("muscle_groups"):
            logger.info("Creating muscle_groups table...")
            with engine.begin() as connection:
                connection.execute(
                    text("""
                        CREATE TABLE muscle_groups (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name TEXT NOT NULL UNIQUE,
                            created_by INTEGER NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
                        )
                    """)
                )
                logger.info("✅ muscle_groups table created")
        
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
        
        # Create workout_splits table if it doesn't exist
        if not _table_exists("workout_splits"):
            logger.info("Creating workout_splits table...")
            with engine.begin() as connection:
                connection.execute(
                    text("""
                        CREATE TABLE workout_splits (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name TEXT NOT NULL,
                            description TEXT,
                            days_per_week INTEGER,
                            created_by INTEGER NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
                        )
                    """)
                )
                logger.info("✅ workout_splits table created")
        
        # Make split_type nullable in workout_plans_v2 (SQLite doesn't support ALTER COLUMN, so we need to recreate)
        # Check if split_type column exists and if it's nullable
        if _table_exists("workout_plans_v2"):
            table_info = _table_info("workout_plans_v2")
            split_type_col = next((col for col in table_info if col["name"] == "split_type"), None)
            if split_type_col and split_type_col.get("notnull", 0) == 1:
                logger.info("Making split_type nullable in workout_plans_v2...")
                # SQLite doesn't support ALTER COLUMN, so we'll need to handle this differently
                # For now, we'll just note it - the model allows NULL but DB constraint doesn't
                # This will be handled by the model's nullable=True
                logger.warning("⚠️ split_type column is NOT NULL in DB but model allows NULL. Manual migration may be needed.")
        
        # Change muscle_group from Enum to String if needed (SQLite doesn't enforce enum types)
        # The column type will remain compatible, we just need to ensure it exists
        
    except Exception as exc:
        logger.error("Failed to run workout system migrations: %s", exc)
        raise


