"""Add progress tracking models for Sprint 3

Revision ID: add_progress_tracking
Revises: add_trainer_client_relationship
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'add_progress_tracking'
down_revision = 'add_trainer_client_relationship'
branch_labels = None
depends_on = None


def upgrade():
    # Create session_completions table
    op.create_table('session_completions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workout_session_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('difficulty_rating', sa.Integer(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['workout_session_id'], ['workout_sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_session_completions_id'), 'session_completions', ['id'], unique=False)

    # Create progress_records table
    op.create_table('progress_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('workout_plan_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('weight', sa.Integer(), nullable=True),
        sa.Column('body_fat_percentage', sa.Integer(), nullable=True),
        sa.Column('muscle_mass', sa.Integer(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['workout_plan_id'], ['workout_plans.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_progress_records_id'), 'progress_records', ['id'], unique=False)


def downgrade():
    # Drop progress_records table
    op.drop_index(op.f('ix_progress_records_id'), table_name='progress_records')
    op.drop_table('progress_records')
    
    # Drop session_completions table
    op.drop_index(op.f('ix_session_completions_id'), table_name='session_completions')
    op.drop_table('session_completions') 