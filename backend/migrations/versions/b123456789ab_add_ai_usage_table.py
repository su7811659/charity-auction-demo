"""Add AI Usage Table

Revision ID: b123456789ab
Revises: a0357e010449
Create Date: 2025-01-08 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b123456789ab'
down_revision: Union[str, None] = 'a0357e010449'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ai_usage table
    op.create_table(
        'ai_usage',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('usage_date', sa.Date(), nullable=False),
        sa.Column('rewrite_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_ai_usage_id', 'id'),
        sa.Index('ix_ai_usage_user_id', 'user_id'),
    )


def downgrade() -> None:
    # Drop ai_usage table
    op.drop_table('ai_usage')
