"""
成就系統服務層
處理成就的業務邏輯，包括進度追蹤、條件檢查、自動解鎖等
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from models.achievement import UserAchievement
from schemas.user_schema import User
from repositories.achievement_repository import AchievementRepository
from repositories.user_repository import UserRepository
from repositories.product_repository import ProductRepository
from repositories.comment_repository import CommentRepository
from repositories.like_repository import LikeRepository
from repositories.reaction_repository import ReactionRepository
import sys
import os

# Add parent directory to path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from achievement_config.achievements import ACHIEVEMENT_CONFIG

from schemas.achievement_schema import UserAchievementResponse, AchievementProgressResponse
import logging

logger = logging.getLogger(__name__)

class AchievementService:
    def __init__(self):
        """初始化成就服務，不需要 session"""
        pass
    
    def _get_repositories(self, db: Session):
        """獲取所有需要的 repository 實例"""
        return {
            'achievement': AchievementRepository(db),
            'user': UserRepository(db),
            'product': ProductRepository(db),
            'comment': CommentRepository(db),
            'like': LikeRepository(db),
            'reaction': ReactionRepository(db)
        }

    def get_user_achievements(self, user_id: int) -> List[UserAchievementResponse]:
        """獲取用戶的所有成就狀態"""
        try:
            user_achievements = self.achievement_repo.get_user_achievements(user_id)
            
            # 建立成就狀態字典
            achievement_status = {}
            for achievement in user_achievements:
                achievement_status[achievement.achievement_id] = {
                    'unlocked': achievement.is_unlocked,
                    'progress': achievement.progress,
                    'unlocked_at': achievement.unlocked_at
                }
            
            # 回傳所有成就的狀態
            results = []
            for achievement_id, config in ACHIEVEMENT_CONFIG.items():
                status = achievement_status.get(achievement_id, {
                    'unlocked': False,
                    'progress': 0,
                    'unlocked_at': None
                })
                
                results.append(UserAchievementResponse(
                    achievement_id=achievement_id,
                    is_unlocked=status['unlocked'],
                    progress=status['progress'],
                    unlocked_at=status['unlocked_at']
                ))
            
            return results
            
        except SQLAlchemyError as e:
            logger.error(f"獲取用戶成就失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            raise Exception(f"獲取成就資料失敗: {str(e)}")

    def check_and_update_achievements(self, user_id: int) -> List[str]:
        """檢查並更新用戶成就，回傳新解鎖的成就ID列表"""
        newly_unlocked = []
        
        try:
            # 獲取用戶資料
            user = self.user_repo.get_user_by_id(user_id)
            if not user:
                raise Exception(f"找不到用戶: {user_id}")
            
            # 檢查每個成就
            for achievement_id, config in ACHIEVEMENT_CONFIG.items():
                # 檢查是否已解鎖
                current_achievement = self.achievement_repo.get_user_achievement(user_id, achievement_id)
                if current_achievement and current_achievement.is_unlocked:
                    continue
                
                # 計算當前進度
                current_progress = self._calculate_achievement_progress(user, achievement_id, config)
                
                # 檢查是否達成條件
                is_unlocked = current_progress >= config['required_count']
                
                # 更新或建立成就記錄
                if current_achievement:
                    # 更新現有記錄
                    updated = self.achievement_repo.update_achievement_progress(
                        user_id, achievement_id, current_progress, is_unlocked
                    )
                    if updated and is_unlocked and not current_achievement.is_unlocked:
                        newly_unlocked.append(achievement_id)
                        logger.info(f"用戶 {user_id} 解鎖成就: {achievement_id}")
                else:
                    # 建立新記錄
                    created = self.achievement_repo.create_user_achievement(
                        user_id, achievement_id, current_progress, is_unlocked
                    )
                    if created and is_unlocked:
                        newly_unlocked.append(achievement_id)
                        logger.info(f"用戶 {user_id} 解鎖成就: {achievement_id}")
            
            # 檢查白金獎盃 (所有成就達成)
            if not newly_unlocked or 'platinum_trophy' not in newly_unlocked:
                self._check_platinum_trophy(user_id, newly_unlocked)
            
            return newly_unlocked
            
        except SQLAlchemyError as e:
            logger.error(f"檢查成就失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            self.db.rollback()
            raise Exception(f"檢查成就失敗: {str(e)}")

    def _calculate_achievement_progress(self, user: User, achievement_id: str, config: Dict) -> int:
        """計算特定成就的進度"""
        achievement_type = config['type']
        
        try:
            if achievement_type == 'upload':
                return self.product_repo.get_user_upload_count(user.id)
            
            elif achievement_type == 'purchase_request':
                # TODO: 需要實作購買請求的計數邏輯
                return 0
            
            elif achievement_type == 'profile_update':
                return 1 if user.avatar_url else 0
            
            elif achievement_type == 'purchase':
                # TODO: 需要實作購買計數邏輯
                return 0
            
            elif achievement_type == 'good_karma':
                # 檢查善意循環相關條件
                return self._calculate_good_karma_progress(user.id)
            
            elif achievement_type == 'comment':
                return self.comment_repo.get_user_comment_count(user.id)
            
            elif achievement_type == 'sell':
                return self.product_repo.get_user_sold_products_count(user.id)
            
            elif achievement_type == 'like':
                return self.like_repo.get_user_like_count(user.id)
            
            elif achievement_type == 'feedback':
                return self.reaction_repo.get_user_feedback_count(user.id)
            
            elif achievement_type == 'robot_tickle':
                return user.robot_tickle_count or 0
            
            elif achievement_type == 'meta':
                # 白金獎盃：檢查其他所有成就是否都已解鎖
                return self._count_unlocked_achievements(user.id)
            
            else:
                logger.warning(f"未知的成就類型: {achievement_type}")
                return 0
                
        except Exception as e:
            logger.error(f"計算成就進度失敗 - 成就ID: {achievement_id}, 錯誤: {str(e)}")
            return 0

    def _calculate_good_karma_progress(self, user_id: int) -> int:
        """計算善意循環成就進度"""
        try:
            # 檢查是否上傳了3件捐贈比例達60%的商品
            high_donation_uploads = self.product_repo.get_user_high_donation_products(user_id, donation_percentage=60)
            if len(high_donation_uploads) >= 3:
                return 1
            
            # 檢查是否購買了1樣有善意循環光球的商品
            # TODO: 需要實作善意循環商品購買檢查
            purchased_karma_products = 0  # 暫時設為0
            if purchased_karma_products >= 1:
                return 1
            
            return 0
        except Exception as e:
            logger.error(f"計算善意循環進度失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            return 0

    def _count_unlocked_achievements(self, user_id: int) -> int:
        """計算已解鎖的成就數量（不包括白金獎盃本身）"""
        try:
            total_achievements = len(ACHIEVEMENT_CONFIG) - 1  # 不包括白金獎盃
            unlocked_count = 0
            
            for achievement_id in ACHIEVEMENT_CONFIG.keys():
                if achievement_id == 'platinum_trophy':
                    continue
                    
                achievement = self.achievement_repo.get_user_achievement(user_id, achievement_id)
                if achievement and achievement.is_unlocked:
                    unlocked_count += 1
            
            return unlocked_count if unlocked_count == total_achievements else 0
        except Exception as e:
            logger.error(f"計算已解鎖成就數量失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            return 0

    def _check_platinum_trophy(self, user_id: int, newly_unlocked: List[str]) -> None:
        """檢查白金獎盃成就"""
        try:
            total_achievements = len(ACHIEVEMENT_CONFIG) - 1  # 不包括白金獎盃本身
            unlocked_count = self._count_unlocked_achievements(user_id)
            
            if unlocked_count >= total_achievements:
                # 檢查是否已經有白金獎盃
                platinum_achievement = self.achievement_repo.get_user_achievement(user_id, 'platinum_trophy')
                
                if not platinum_achievement or not platinum_achievement.is_unlocked:
                    # 解鎖白金獎盃
                    if platinum_achievement:
                        self.achievement_repo.update_achievement_progress(
                            user_id, 'platinum_trophy', total_achievements, True
                        )
                    else:
                        self.achievement_repo.create_user_achievement(
                            user_id, 'platinum_trophy', total_achievements, True
                        )
                    
                    newly_unlocked.append('platinum_trophy')
                    logger.info(f"用戶 {user_id} 解鎖白金獎盃！")
        except Exception as e:
            logger.error(f"檢查白金獎盃失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")

    def get_achievement_progress(self, user_id: int) -> List[AchievementProgressResponse]:
        """獲取用戶的成就進度詳情"""
        try:
            user = self.user_repo.get_user_by_id(user_id)
            if not user:
                raise Exception(f"找不到用戶: {user_id}")
            
            results = []
            for achievement_id, config in ACHIEVEMENT_CONFIG.items():
                current_progress = self._calculate_achievement_progress(user, achievement_id, config)
                required_count = config['required_count']
                
                # 獲取解鎖狀態
                achievement = self.achievement_repo.get_user_achievement(user_id, achievement_id)
                is_unlocked = achievement.is_unlocked if achievement else False
                unlocked_at = achievement.unlocked_at if achievement else None
                
                results.append(AchievementProgressResponse(
                    achievement_id=achievement_id,
                    current_progress=current_progress,
                    required_count=required_count,
                    is_unlocked=is_unlocked,
                    unlocked_at=unlocked_at,
                    progress_percentage=min(100, (current_progress / required_count) * 100) if required_count > 0 else 100
                ))
            
            return results
            
        except SQLAlchemyError as e:
            logger.error(f"獲取成就進度失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            raise Exception(f"獲取成就進度失敗: {str(e)}")

    def unlock_achievement_manually(self, user_id: int, achievement_id: str) -> bool:
        """手動解鎖成就（管理員功能）"""
        try:
            if achievement_id not in ACHIEVEMENT_CONFIG:
                raise Exception(f"無效的成就ID: {achievement_id}")
            
            config = ACHIEVEMENT_CONFIG[achievement_id]
            achievement = self.achievement_repo.get_user_achievement(user_id, achievement_id)
            
            if achievement:
                if achievement.is_unlocked:
                    return False  # 已經解鎖了
                
                # 更新為已解鎖
                return self.achievement_repo.update_achievement_progress(
                    user_id, achievement_id, config['required_count'], True
                )
            else:
                # 建立新的已解鎖成就
                return self.achievement_repo.create_user_achievement(
                    user_id, achievement_id, config['required_count'], True
                )
                
        except SQLAlchemyError as e:
            logger.error(f"手動解鎖成就失敗 - 用戶ID: {user_id}, 成就ID: {achievement_id}, 錯誤: {str(e)}")
            self.db.rollback()
            raise Exception(f"手動解鎖成就失敗: {str(e)}")

    def get_achievement_statistics(self) -> Dict[str, Dict]:
        """獲取成就統計資料（管理員功能）"""
        try:
            stats = {}
            total_users = self.user_repo.get_user_count()
            
            for achievement_id, config in ACHIEVEMENT_CONFIG.items():
                unlocked_count = self.achievement_repo.get_achievement_unlock_count(achievement_id)
                
                stats[achievement_id] = {
                    'total_users': total_users,
                    'unlocked_count': unlocked_count,
                    'unlock_percentage': (unlocked_count / total_users * 100) if total_users > 0 else 0,
                    'required_count': config['required_count'],
                    'type': config['type']
                }
            
            return stats
            
        except SQLAlchemyError as e:
            logger.error(f"獲取成就統計失敗: {str(e)}")
            raise Exception(f"獲取成就統計失敗: {str(e)}")

    def trigger_achievement_check(self, user_id: int, trigger_type: str, **kwargs) -> List[str]:
        """觸發特定類型的成就檢查"""
        try:
            # 根據觸發類型，只檢查相關的成就
            relevant_achievements = []
            
            for achievement_id, config in ACHIEVEMENT_CONFIG.items():
                if config['type'] == trigger_type:
                    relevant_achievements.append(achievement_id)
            
            if not relevant_achievements:
                return []
            
            # 獲取用戶資料
            user = self.user_repo.get_user_by_id(user_id)
            if not user:
                return []
            
            newly_unlocked = []
            
            for achievement_id in relevant_achievements:
                config = ACHIEVEMENT_CONFIG[achievement_id]
                
                # 檢查是否已解鎖
                current_achievement = self.achievement_repo.get_user_achievement(user_id, achievement_id)
                if current_achievement and current_achievement.is_unlocked:
                    continue
                
                # 計算當前進度
                current_progress = self._calculate_achievement_progress(user, achievement_id, config)
                
                # 檢查是否達成條件
                is_unlocked = current_progress >= config['required_count']
                
                # 更新或建立成就記錄
                if current_achievement:
                    updated = self.achievement_repo.update_achievement_progress(
                        user_id, achievement_id, current_progress, is_unlocked
                    )
                    if updated and is_unlocked and not current_achievement.is_unlocked:
                        newly_unlocked.append(achievement_id)
                else:
                    created = self.achievement_repo.create_user_achievement(
                        user_id, achievement_id, current_progress, is_unlocked
                    )
                    if created and is_unlocked:
                        newly_unlocked.append(achievement_id)
            
            return newly_unlocked
            
        except Exception as e:
            logger.error(f"觸發成就檢查失敗 - 用戶ID: {user_id}, 觸發類型: {trigger_type}, 錯誤: {str(e)}")
            return []
