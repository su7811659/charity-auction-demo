"""add missing online deal columns

Revision ID: d345678901de
Revises: c234567890cd
Create Date: 2025-08-16 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd345678901de'
down_revision = 'c234567890cd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 為 products 表格添加 is_online_deal 欄位（如果不存在）
    try:
        op.add_column('products', sa.Column('is_online_deal', sa.Boolean(), nullable=True))
        op.execute("UPDATE products SET is_online_deal = 0 WHERE is_online_deal IS NULL")
        op.alter_column('products', 'is_online_deal', nullable=False)
    except Exception:
        # 欄位可能已存在，忽略錯誤
        pass
    
    # 為 system_config 表格添加線上交易相關欄位（如果不存在）
    try:
        op.add_column('system_config', sa.Column('online_deal_enabled', sa.Boolean(), nullable=True))
        op.execute("UPDATE system_config SET online_deal_enabled = 0 WHERE online_deal_enabled IS NULL")
        op.alter_column('system_config', 'online_deal_enabled', nullable=False)
    except Exception:
        pass
    
    try:
        op.add_column('system_config', sa.Column('online_deal_available', sa.Boolean(), nullable=True))
        op.execute("UPDATE system_config SET online_deal_available = 1 WHERE online_deal_available IS NULL")
        op.alter_column('system_config', 'online_deal_available', nullable=False)
    except Exception:
        pass
    
    try:
        op.add_column('system_config', sa.Column('max_concurrent_deals_per_user', sa.Integer(), nullable=True))
        op.execute("UPDATE system_config SET max_concurrent_deals_per_user = 2 WHERE max_concurrent_deals_per_user IS NULL")
        op.alter_column('system_config', 'max_concurrent_deals_per_user', nullable=False)
    except Exception:
        pass
    
    try:
        op.add_column('system_config', sa.Column('online_deal_begin_date', sa.DateTime(), nullable=True))
    except Exception:
        pass
    
    try:
        op.add_column('system_config', sa.Column('online_deal_end_date', sa.DateTime(), nullable=True))
    except Exception:
        pass


def downgrade() -> None:
    # 移除添加的欄位
    op.drop_column('system_config', 'online_deal_end_date')
    op.drop_column('system_config', 'online_deal_begin_date')
    op.drop_column('system_config', 'max_concurrent_deals_per_user')
    op.drop_column('system_config', 'online_deal_available')
    op.drop_column('system_config', 'online_deal_enabled')
    op.drop_column('products', 'is_online_deal')
