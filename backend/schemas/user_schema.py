# schemas/user_schema.py

from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from database import Base

# --- SQLAlchemy ORM model ---

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    avatar_url = Column(String, nullable=True)

    robot_tickle_count = Column(Integer, default=0)
    mm_style = Column(Integer, default=5)  # 0: 海水藍, 1: 天空藍, 2: 青草綠, 3: 活力黃, 4: 熱情紅, 5: 皇家紫, 6: 典雅黑
    easter_egg = Column(Boolean, default=False)
    easter_egg_triggered_time = Column(DateTime, nullable=True)
    
    # 線上交易通知相關欄位
    last_online_deals_visit = Column(DateTime, nullable=True)
    
    # 商品搜尋偏好設定
    default_product_status = Column(Integer, default=4)    # 預設商品狀態篩選 (4=沒選)
    default_sort_order = Column(Integer, default=1)        # 預設排序方式 (1=新上架優先)

    created_at = Column(DateTime, default=datetime.utcnow)

# --- Pydantic Schemas ---

class UserCreate(BaseModel):
    email: str
    avatar_url: Optional[HttpUrl] = None

class AvatarUpdateRequest(BaseModel):
    avatar_url: HttpUrl

class UserUpdateRequest(BaseModel):
    avatar_url: Optional[HttpUrl] = None
    mm_style: Optional[int] = None
    easter_egg: Optional[bool] = None
    default_product_status: Optional[int] = None
    default_sort_order: Optional[int] = None

class UserProfile(BaseModel):
    id: int
    email: str
    avatar_url: Optional[HttpUrl] = None
    robot_tickle_count: int = 0
    mm_style: int = 5
    easter_egg: bool = False
    easter_egg_triggered_time: Optional[datetime] = None
    last_online_deals_visit: Optional[datetime] = None
    default_product_status: int = 4
    default_sort_order: int = 1
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # ✅ 取代 orm_mode

class TopTickler(BaseModel):
    email: str
    avatar_url: Optional[HttpUrl] = None
    robot_tickle_count: int

    class Config:
        from_attributes = True  # ✅ 取代 orm_mode

class EasterEggTopUser(BaseModel):
    email: str
    avatar_url: Optional[HttpUrl] = None
    easter_egg_triggered_time: datetime

    class Config:
        from_attributes = True  # ✅ 取代 orm_mode

class UserStats(BaseModel):
    total_easter_egg_users: int
    total_robot_tickles: int