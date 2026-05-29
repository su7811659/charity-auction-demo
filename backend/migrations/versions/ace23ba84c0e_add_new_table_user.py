"""Add New Table User

Revision ID: ace23ba84c0e
Revises: 80eb294ba40c
Create Date: 2025-07-25 01:50:57.252775

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ace23ba84c0e'
down_revision: Union[str, None] = '80eb294ba40c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
