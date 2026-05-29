# schemas/achievement_schema.py

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- 簡化的成就 Schema 設計 ---

class UserAchievementBase(BaseModel):
    user_id: int
    achievement_id: str       # 保持與前端一致：'first_upload', 'ai_annoying' 等
    progress: int = 0         # 當前進度：已上傳 2 件商品
    is_unlocked: bool = False # 是否已解鎖
    unlocked_at: Optional[datetime] = None     # 解鎖時間
    notification_shown: bool = False           # 是否已顯示過達成通知
    last_viewed_at: Optional[datetime] = None  # 最後查看時間（用於判斷是否看過）

class UserAchievementCreate(UserAchievementBase):
    pass

class UserAchievementUpdate(BaseModel):
    progress: Optional[int] = None
    is_unlocked: Optional[bool] = None
    notification_shown: Optional[bool] = None
    last_viewed_at: Optional[datetime] = None

class UserAchievement(UserAchievementBase):
    id: int

    class Config:
        from_attributes = True

class UserAchievementResponse(BaseModel):
    """前端展示用的用戶成就響應"""
    achievement_id: str       # 'first_upload'
    progress: int = 0         # 當前進度
    is_unlocked: bool = False # 是否已解鎖
    unlocked_at: Optional[datetime] = None
    has_new_notification: bool = False  # 是否有新通知（剛達成但還沒看過）

    class Config:
        from_attributes = True

class AchievementProgressResponse(BaseModel):
    """成就進度詳情響應"""
    achievement_id: str
    current_progress: int
    required_count: int
    is_unlocked: bool
    unlocked_at: Optional[datetime] = None
    progress_percentage: float

    class Config:
        from_attributes = True

class AchievementNotificationResponse(BaseModel):
    """通知專用響應"""
    achievement_id: str
    achievement_name: str     # 從前端定義映射過來
    unlocked_at: datetime

class AchievementProgressUpdate(BaseModel):
    """更新進度專用"""
    achievement_id: str
    progress_increment: int = 1  # 增加的進度，預設+1
