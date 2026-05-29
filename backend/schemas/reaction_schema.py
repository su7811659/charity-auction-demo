from pydantic import BaseModel
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from database import Base

# 預設可用的回應類型
AVAILABLE_REACTIONS = [
    "like",     # 讚
    "laugh",    # 笑臉
    "sad",      # 悲傷
    "scared",   # 驚訝
    "checked",  # 已檢查
    "ok",       # OK
    "join",     # 加入
    "understand", # 理解
    "none",     # 無
    "shock",     # 震驚
    "heart",
]

class CommentReaction(Base):
    """留言回應的資料庫模型"""
    __tablename__ = "comment_reactions"
    
    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("comments.id"), nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    reaction_type = Column(String, nullable=False) # 對應 AVAILABLE_REACTIONS 中的字串
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    
    # 確保一個用戶對同一個評論的同一種回應類型只能使用一次
    __table_args__ = (
        UniqueConstraint('email', 'comment_id', 'reaction_type', name='uix_user_comment_reaction_type'),
    )

class CommentReactionCreate(BaseModel):
    """建立留言回應的請求模型"""
    reaction_type: str  # 對應 AVAILABLE_REACTIONS 中的字串

class CommentReactionResponse(BaseModel):
    """留言回應的回傳模型"""
    id: int
    comment_id: int
    email: str
    reaction_type: str
    created_at: str
    
    class Config:
        from_attributes = True  # ✅ 取代 orm_mode
