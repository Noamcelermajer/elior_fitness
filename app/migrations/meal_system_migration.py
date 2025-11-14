import logging
from typing import Dict, List
import os

from sqlalchemy import text

from app.database import engine

logger = logging.getLogger(__name__)

# Detect database type
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "")
IS_POSTGRESQL = SQLALCHEMY_DATABASE_URL.startswith("postgresql") if SQLALCHEMY_DATABASE_URL else False


def _table_info(table_name: str) -> List[Dict[str, object]]:
    """Return table info as a list of dicts - database-agnostic."""
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
    return any(col["name"] == column_name for col in _table_info(table_name))


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
                    pg_type = column_type.replace("TEXT", "VARCHAR").replace("INTEGER", "INTEGER").replace("REAL", "REAL")
                    connection.execute(
                        text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {pg_type}")
                    )
                else:
                    connection.execute(
                        text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
                    )


def _ensure_client_meal_choice_nullable_columns() -> None:
    """
    Older databases created client_meal_choices_v2 with NOT NULL constraints on
    food_option_id and meal_slot_id. Custom foods introduced nullable columns,
    so we recreate the table when needed.
    """
    table_name = "client_meal_choices_v2"
    columns = _table_info(table_name)

    needs_rebuild = False
    for column in columns:
        if column["name"] in {"food_option_id", "meal_slot_id"} and column["notnull"]:
            needs_rebuild = True
            break

    if not needs_rebuild:
        return

    logger.info("Rebuilding %s table to allow nullable food_option_id and meal_slot_id", table_name)

    with engine.begin() as connection:
        # Create new table with desired schema
        if IS_POSTGRESQL:
            connection.execute(
                text(
                    """
CREATE TABLE IF NOT EXISTS client_meal_choices_v2_new (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    food_option_id INTEGER,
    meal_slot_id INTEGER,
    date TIMESTAMP NOT NULL,
    quantity VARCHAR,
    photo_path VARCHAR,
    is_approved BOOLEAN,
    trainer_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    custom_food_name VARCHAR,
    custom_calories REAL,
    custom_protein REAL,
    custom_carbs REAL,
    custom_fat REAL,
    FOREIGN KEY(client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(food_option_id) REFERENCES food_options_v2(id) ON DELETE CASCADE,
    FOREIGN KEY(meal_slot_id) REFERENCES meal_slots_v2(id) ON DELETE CASCADE
)
"""
                )
            )
        else:
            connection.execute(
                text(
                    """
CREATE TABLE IF NOT EXISTS client_meal_choices_v2_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    food_option_id INTEGER,
    meal_slot_id INTEGER,
    date DATETIME NOT NULL,
    quantity VARCHAR,
    photo_path VARCHAR,
    is_approved BOOLEAN,
    trainer_comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    custom_food_name TEXT,
    custom_calories REAL,
    custom_protein REAL,
    custom_carbs REAL,
    custom_fat REAL,
    FOREIGN KEY(client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(food_option_id) REFERENCES food_options_v2(id) ON DELETE CASCADE,
    FOREIGN KEY(meal_slot_id) REFERENCES meal_slots_v2(id) ON DELETE CASCADE
)
"""
                )
            )

        # Copy existing data
        connection.execute(
            text(
                """
INSERT INTO client_meal_choices_v2_new (
    id,
    client_id,
    food_option_id,
    meal_slot_id,
    date,
    quantity,
    photo_path,
    is_approved,
    trainer_comment,
    created_at,
    custom_food_name,
    custom_calories,
    custom_protein,
    custom_carbs,
    custom_fat
)
SELECT
    id,
    client_id,
    food_option_id,
    meal_slot_id,
    date,
    quantity,
    photo_path,
    is_approved,
    trainer_comment,
    created_at,
    custom_food_name,
    custom_calories,
    custom_protein,
    custom_carbs,
    custom_fat
FROM client_meal_choices_v2
"""
            )
        )

        # Replace old table
        connection.execute(text("DROP TABLE client_meal_choices_v2"))
        connection.execute(
            text("ALTER TABLE client_meal_choices_v2_new RENAME TO client_meal_choices_v2")
        )


def _ensure_meal_slot_targets() -> None:
    _ensure_columns(
        "meal_slots_v2",
        {
            "target_calories": "INTEGER",
            "target_protein": "REAL",
            "target_carbs": "REAL",
            "target_fat": "REAL",
        },
    )


def _ensure_meal_completion_table() -> None:
    with engine.begin() as connection:
        connection.execute(
            text(
                """
CREATE TABLE IF NOT EXISTS meal_completion_status_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    meal_slot_id INTEGER NOT NULL,
    date DATETIME NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT 0,
    completion_method VARCHAR,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    UNIQUE(client_id, meal_slot_id, date),
    FOREIGN KEY(client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(meal_slot_id) REFERENCES meal_slots_v2(id) ON DELETE CASCADE
)
"""
            )
        )


def run_meal_system_migrations() -> None:
    """
    Ensure the v2 meal-system tables contain the expected columns.

    SQLite's CREATE TABLE does not alter existing tables, so we patch
    missing columns here to keep legacy databases compatible.
    """
    try:
        _ensure_columns(
            "client_meal_choices_v2",
            {
                "custom_food_name": "TEXT",
                "custom_calories": "REAL",
                "custom_protein": "REAL",
                "custom_carbs": "REAL",
                "custom_fat": "REAL",
            },
        )
        _ensure_client_meal_choice_nullable_columns()
        _ensure_meal_slot_targets()
        _ensure_meal_completion_table()
    except Exception as exc:
        logger.error("Failed to run meal system migrations: %s", exc)
        raise

