"""Add last_online_deals_visit column

Revision ID: 2db160fc5f01
Revises: 3222502341d6
Create Date: 2025-09-17 17:04:53.418747

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2db160fc5f01'
down_revision: Union[str, None] = '3222502341d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        op.add_column('users', sa.Column('last_online_deals_visit', sa.DATETIME(), nullable=True))
    except Exception:
        # Column might already exist, ignore the error
        pass


def downgrade() -> None:
    op.drop_column('users', 'last_online_deals_visit')
