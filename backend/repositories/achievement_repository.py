# repositories/achievement_repository.py

from sqlalchemy.orm import Session
from sqlalchemy import and_, text
from typing import List, Optional
from datetime import datetime
from models.achievement import UserAchievement
import logging

logger = logging.getLogger(__name__)

class AchievementRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_achievements(self, user_id: int) -> List[UserAchievement]:
        """獲取用戶的所有成就進度"""
        try:
            return self.db.query(UserAchievement).filter(UserAchievement.user_id == user_id).all()
        except Exception as e:
            logger.error(f"獲取用戶成就失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            return []

    def get_user_achievement(self, user_id: int, achievement_id: str) -> Optional[UserAchievement]:
        """獲取用戶特定成就的進度"""
        try:
            return self.db.query(UserAchievement).filter(
                and_(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement_id
                )
            ).first()
        except Exception as e:
            logger.error(f"獲取用戶成就失敗 - 用戶ID: {user_id}, 成就ID: {achievement_id}, 錯誤: {str(e)}")
            return None

    def create_user_achievement(self, user_id: int, achievement_id: str, progress: int, is_unlocked: bool) -> bool:
        """創建用戶成就記錄"""
        try:
            user_achievement = UserAchievement(
                user_id=user_id,
                achievement_id=achievement_id,
                progress=progress,
                is_unlocked=is_unlocked,
                unlocked_at=datetime.utcnow() if is_unlocked else None
            )
            self.db.add(user_achievement)
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"創建用戶成就失敗 - 用戶ID: {user_id}, 成就ID: {achievement_id}, 錯誤: {str(e)}")
            self.db.rollback()
            return False

    def update_achievement_progress(self, user_id: int, achievement_id: str, progress: int, is_unlocked: bool) -> bool:
        """更新用戶成就進度"""
        try:
            user_achievement = self.get_user_achievement(user_id, achievement_id)
            if user_achievement:
                user_achievement.progress = progress
                if is_unlocked and not user_achievement.is_unlocked:
                    user_achievement.is_unlocked = True
                    user_achievement.unlocked_at = datetime.utcnow()
                self.db.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"更新用戶成就進度失敗 - 用戶ID: {user_id}, 成就ID: {achievement_id}, 錯誤: {str(e)}")
            self.db.rollback()
            return False

    def get_achievement_unlock_count(self, achievement_id: str) -> int:
        """獲取特定成就的解鎖人數"""
        try:
            return self.db.query(UserAchievement).filter(
                and_(
                    UserAchievement.achievement_id == achievement_id,
                    UserAchievement.is_unlocked == True
                )
            ).count()
        except Exception as e:
            logger.error(f"獲取成就解鎖人數失敗 - 成就ID: {achievement_id}, 錯誤: {str(e)}")
            return 0

    def get_unlocked_achievements_count(self, user_id: int) -> int:
        """獲取用戶已解鎖的成就數量"""
        try:
            return self.db.query(UserAchievement).filter(
                and_(
                    UserAchievement.user_id == user_id,
                    UserAchievement.is_unlocked == True
                )
            ).count()
        except Exception as e:
            logger.error(f"獲取用戶已解鎖成就數量失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            return 0

    def initialize_user_achievements(self, user_id: int, achievement_ids: List[str]):
        """為新用戶初始化所有成就記錄"""
        try:
            for achievement_id in achievement_ids:
                existing = self.get_user_achievement(user_id, achievement_id)
                if not existing:
                    self.create_user_achievement(user_id, achievement_id, 0, False)
        except Exception as e:
            logger.error(f"初始化用戶成就失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            self.db.rollback()
