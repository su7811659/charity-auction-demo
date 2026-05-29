"""
點讚相關的資料庫操作
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

class LikeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_like_count(self, user_id: int) -> int:
        """獲取用戶的收藏數量"""
        try:
            # 首先根據 user_id 獲取用戶的 email
            user_email_result = self.db.execute(
                text("SELECT email FROM users WHERE id = :user_id"),
                {"user_id": user_id}
            ).scalar()
            
            if not user_email_result:
                logger.warning(f"找不到用戶ID: {user_id}")
                return 0
            
            # 使用 email 查詢 likes 表中的收藏數量
            result = self.db.execute(
                text("SELECT COUNT(*) FROM likes WHERE email = :email"),
                {"email": user_email_result}
            ).scalar()
            
            return result or 0
            
        except Exception as e:
            logger.error(f"獲取用戶收藏數量失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            return 0

    def get_user_received_likes_count(self, user_id: int) -> int:
        """獲取用戶收到的點讚數量"""
        try:
            # 查詢用戶的商品或內容收到的點讚數
            result = self.db.execute(
                text("""
                    SELECT COUNT(*) FROM reactions r
                    JOIN products p ON r.product_id = p.id
                    WHERE p.user_id = :user_id AND r.reaction_type = 'like'
                """),
                {"user_id": user_id}
            ).scalar()
            
            return result or 0
            
        except Exception as e:
            logger.error(f"獲取用戶收到點讚數量失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            return 0

    def create_like(self, user_id: int, product_id: int) -> bool:
        """建立點讚記錄"""
        try:
            self.db.execute(
                text("""
                    INSERT INTO reactions (user_id, product_id, reaction_type, created_at)
                    VALUES (:user_id, :product_id, 'like', datetime('now'))
                """),
                {"user_id": user_id, "product_id": product_id}
            )
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"建立點讚記錄失敗 - 用戶ID: {user_id}, 商品ID: {product_id}, 錯誤: {str(e)}")
            self.db.rollback()
            return False

    def remove_like(self, user_id: int, product_id: int) -> bool:
        """移除點讚記錄"""
        try:
            result = self.db.execute(
                text("""
                    DELETE FROM reactions 
                    WHERE user_id = :user_id AND product_id = :product_id AND reaction_type = 'like'
                """),
                {"user_id": user_id, "product_id": product_id}
            )
            self.db.commit()
            return result.rowcount > 0
            
        except Exception as e:
            logger.error(f"移除點讚記錄失敗 - 用戶ID: {user_id}, 商品ID: {product_id}, 錯誤: {str(e)}")
            self.db.rollback()
            return False

    def is_liked_by_user(self, user_id: int, product_id: int) -> bool:
        """檢查用戶是否已點讚商品"""
        try:
            result = self.db.execute(
                text("""
                    SELECT 1 FROM reactions 
                    WHERE user_id = :user_id AND product_id = :product_id AND reaction_type = 'like'
                    LIMIT 1
                """),
                {"user_id": user_id, "product_id": product_id}
            ).scalar()
            
            return result is not None
            
        except Exception as e:
            logger.error(f"檢查點讚狀態失敗 - 用戶ID: {user_id}, 商品ID: {product_id}, 錯誤: {str(e)}")
            return False
