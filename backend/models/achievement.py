# models/achievement.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from datetime import datetime
from database import Base

class UserAchievement(Base):
    """用戶成就表 - 簡化版"""
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(String(50), nullable=False)  # 'first_upload', 'ai_annoying' 等
    progress = Column(Integer, default=0)  # 當前進度
    is_unlocked = Column(Boolean, default=False)  # 是否已解鎖
    unlocked_at = Column(DateTime, nullable=True)  # 解鎖時間
    notification_shown = Column(Boolean, default=False)  # 是否已顯示過通知
    last_viewed_at = Column(DateTime, nullable=True)  # 最後查看時間

    # 建立複合唯一索引，確保同一用戶的同一成就只有一筆記錄
    __table_args__ = (
        UniqueConstraint('user_id', 'achievement_id', name='uq_user_achievement'),
    )
