"""Add user search preferences columns

Revision ID: 3cc6d92faa15
Revises: 2db160fc5f01
Create Date: 2025-09-18 01:54:23.524765

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3cc6d92faa15'
down_revision: Union[str, None] = '2db160fc5f01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 添加使用者搜尋偏好設定欄位
    op.add_column('users', sa.Column('default_product_status', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('default_sort_order', sa.Integer(), nullable=True))
    
    # 設定預設值：default_product_status = 4 (沒選), default_sort_order = 1 (新上架優先)
    op.execute("UPDATE users SET default_product_status = 4 WHERE default_product_status IS NULL")
    op.execute("UPDATE users SET default_sort_order = 1 WHERE default_sort_order IS NULL")


def downgrade() -> None:
    # 移除使用者搜尋偏好設定欄位
    op.drop_column('users', 'default_sort_order')
    op.drop_column('users', 'default_product_status')
