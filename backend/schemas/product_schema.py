from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.dialects.sqlite import BLOB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class Product(Base):
    __tablename__ = "products"

    # General fields
    id = Column(Integer, primary_key=True, index=True)  # product unique ID
    seller_name = Column(String, nullable=False, index=True)  # 賣方姓名
    seller_nickname = Column(String, nullable=False, index=True)  # 賣方化名
    product_name = Column(String, nullable=False, index=True)  # 產品名稱
    price = Column(Float, nullable=False)  # 賣方定價
    condition = Column(Integer, nullable=False)  # 新舊程度 (1~4)  [1=全新, 2=九成新, 3=五成新, 4=低於五成新]
    description = Column(String, nullable=False)  # 賣方描述
    image_url = Column(String, nullable=False)  # 商品圖片 URL
    ai_rating = Column(Integer, nullable=True)  # AI 鑑定等級 (1~5) [1=普通, 2=精良, 3=史詩, 4=傳說, 5=神話]
    ai_rating_reason = Column(String, nullable=True)  # AI 鑑定等級理由
    ai_comment = Column(String, nullable=True)  # AI 鑑定評價
    ai_fit_owner = Column(String, nullable=True)  # AI 鑑定合適買家類型
    product_status = Column(Integer, default=False)  # 商品狀態(0~2) [0=尚未到貨, 1=已到貨待成交, 2=已成交]
    buyer_name = Column(String, nullable=True, index=True)  # 買方姓名 (成交後填入)
    is_online_deal = Column(Boolean, default=False)  # 是否透過線上交易成交

    # Admin-only Fields
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))  # 商品提交時間
    is_approve = Column(Boolean, default=False)  # 是否審核通過
    is_rejected = Column(Boolean, default=False)  # 審核拒絕
    donation_ratio = Column(Integer, nullable=False)  # 賣方捐贈公益比例 (0, 50, 100)
    seller_income = Column(Float, nullable=True)  # 成交後賣方所得
    donation_amount = Column(Float, nullable=True)  # 成交後捐贈金額

    # For RAG-like querying
    embedding = Column(BLOB, nullable=True)  # Store product embeddings as binary data
    
    # 點閱統計
    view_count = Column(Integer, default=0)  # 商品點閱次數
    
    # 關聯關係 - 使用字符串引用避免循環導入
    online_deals = relationship("OnlineDeal", back_populates="product")
