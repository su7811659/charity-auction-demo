"""add online deal functionality

Revision ID: c234567890cd
Revises: b123456789ab
Create Date: 2025-08-16 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c234567890cd'
down_revision = 'b123456789ab'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 創建 online_deals 表格（如果不存在）
    try:
        op.create_table('online_deals',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('product_id', sa.Integer(), nullable=False),
            sa.Column('buyer_email', sa.String(length=255), nullable=False),
            sa.Column('seller_email', sa.String(length=255), nullable=False),
            sa.Column('buyer_comment', sa.Text(), nullable=True),
            sa.Column('deal_status', sa.Integer(), nullable=True),
            sa.Column('created_time', sa.DateTime(), nullable=True),
            sa.Column('modify_time', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('product_id', 'buyer_email', name='uq_product_buyer')
        )
        op.create_index(op.f('ix_online_deals_id'), 'online_deals', ['id'], unique=False)
    except Exception:
        # 表格可能已存在，跳過創建
        pass
    
    # 為 products 表格添加 is_online_deal 欄位（如果不存在）
    try:
        op.add_column('products', sa.Column('is_online_deal', sa.Boolean(), nullable=True))
        op.execute("UPDATE products SET is_online_deal = 0 WHERE is_online_deal IS NULL")
        op.alter_column('products', 'is_online_deal', nullable=False)
    except Exception:
        # 欄位可能已存在，跳過添加
        pass
    
    # 為 system_config 表格添加線上交易相關欄位（如果不存在）
    try:
        op.add_column('system_config', sa.Column('online_deal_enabled', sa.Boolean(), nullable=True))
        op.execute("UPDATE system_config SET online_deal_enabled = 0 WHERE online_deal_enabled IS NULL")
        op.alter_column('system_config', 'online_deal_enabled', nullable=False)
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
    # 移除 system_config 的線上交易欄位
    op.drop_column('system_config', 'online_deal_end_date')
    op.drop_column('system_config', 'online_deal_begin_date')
    op.drop_column('system_config', 'max_concurrent_deals_per_user')
    op.drop_column('system_config', 'online_deal_enabled')
    
    # 移除 products 的 is_online_deal 欄位
    op.drop_column('products', 'is_online_deal')
    
    # 刪除 online_deals 表格
    op.drop_index(op.f('ix_online_deals_id'), table_name='online_deals')
    op.drop_table('online_deals')
