"""
線上交易 SQLAlchemy 模型
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class OnlineDeal(Base):
    """線上交易表"""
    __tablename__ = 'online_deals'
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 關聯資訊
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False, comment='商品ID')
    buyer_email = Column(String(255), nullable=False, comment='買家email')
    seller_email = Column(String(255), nullable=False, comment='賣家email')
    
    # 請求內容
    buyer_comment = Column(Text, nullable=True, comment='買家留言')
    
    # 狀態資訊
    deal_status = Column(Integer, default=0, comment='交易狀態: 0=Waiting, 1=Approved, 2=Cancelled, 3=Rejected')
    
    # 時間戳
    created_time = Column(DateTime, default=func.now(), comment='建立時間')
    modify_time = Column(DateTime, default=func.now(), onupdate=func.now(), comment='最後修改時間')
    
    # 關聯關係 - 使用字符串引用避免循環導入
    product = relationship("Product", back_populates="online_deals")
    
    # 唯一性約束：同一商品，同一買家只能送出一次請求
    __table_args__ = (
        UniqueConstraint('product_id', 'buyer_email', name='uq_product_buyer'),
    )
