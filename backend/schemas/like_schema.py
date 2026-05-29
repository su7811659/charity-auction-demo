from sqlalchemy import Column, Integer, String, UniqueConstraint, ForeignKey
from database import Base

class Like(Base):
    __tablename__ = "likes"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    product_id = Column(Integer, nullable=False, index=True)

    # 建立複合唯一約束，確保同一個 user 對同一個 product 只能按讚一次
    __table_args__ = (
        UniqueConstraint('email', 'product_id', name='uix_user_product'),
    )
