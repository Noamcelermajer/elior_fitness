"""add trainer client relationship

Revision ID: add_trainer_client_relationship
Revises: initial_migration
Create Date: 2024-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_trainer_client_relationship'
down_revision = 'initial_migration'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add trainer_id column to users table
    op.add_column('users', sa.Column('trainer_id', sa.Integer(), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_user_trainer',
        'users', 'users',
        ['trainer_id'], ['id'],
        ondelete='SET NULL'
    )

def downgrade() -> None:
    # Remove foreign key constraint
    op.drop_constraint('fk_user_trainer', 'users', type_='foreignkey')
    
    # Remove trainer_id column
    op.drop_column('users', 'trainer_id') 