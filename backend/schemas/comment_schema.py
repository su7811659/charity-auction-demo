from pydantic import BaseModel
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String, ForeignKey
from database import Base

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: int
    product_id: int
    email: str
    content: str
    created_at: datetime
    avatar_url: str | None = None
    model_config = {
        "from_attributes": True  # ✅ 取代 orm_mode
    }