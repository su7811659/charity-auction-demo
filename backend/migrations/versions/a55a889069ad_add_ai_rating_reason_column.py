"""Add ai_rating_reason column

Revision ID: a55a889069ad
Revises: d345678901de
Create Date: 2025-08-19 18:05:53.880542

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a55a889069ad'
down_revision: Union[str, None] = 'd345678901de'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add ai_rating_reason column to products table (if it doesn't exist)
    try:
        op.add_column('products', sa.Column('ai_rating_reason', sa.String(), nullable=True))
    except Exception:
        # Column might already exist, ignore the error
        pass


def downgrade() -> None:
    # Remove ai_rating_reason column from products table
    op.drop_column('products', 'ai_rating_reason')
