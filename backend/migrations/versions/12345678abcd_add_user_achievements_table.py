"""Add user achievements table

Revision ID: 12345678abcd
Revises: ff4e998ef5d5
Create Date: 2025-08-30 19:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '12345678abcd'
down_revision: Union[str, None] = 'ff4e998ef5d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 創建用戶成就表
    op.create_table('user_achievements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('achievement_id', sa.String(length=50), nullable=False),
        sa.Column('progress', sa.Integer(), nullable=True),
        sa.Column('is_unlocked', sa.Boolean(), nullable=True),
        sa.Column('unlocked_at', sa.DateTime(), nullable=True),
        sa.Column('notification_shown', sa.Boolean(), nullable=True),
        sa.Column('last_viewed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'achievement_id', name='uq_user_achievement')
    )
    op.create_index(op.f('ix_user_achievements_id'), 'user_achievements', ['id'], unique=False)


def downgrade() -> None:
    # 刪除用戶成就表
    op.drop_index(op.f('ix_user_achievements_id'), table_name='user_achievements')
    op.drop_table('user_achievements')
