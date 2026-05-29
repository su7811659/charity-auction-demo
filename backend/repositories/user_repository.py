from sqlalchemy.orm import Session
from sqlalchemy import text
from schemas.user_schema import User
import logging

logger = logging.getLogger(__name__)

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def create_user(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_user_by_id(self, user_id: int) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_user_count(self) -> int:
        """獲取總用戶數量"""
        try:
            return self.db.query(User).count()
        except Exception as e:
            logger.error(f"獲取用戶數量失敗: {str(e)}")
            return 0

    def update_user_robot_tickle_count(self, user_id: int, count: int) -> bool:
        """更新用戶的機器人搔癢次數"""
        try:
            user = self.get_user_by_id(user_id)
            if user:
                user.robot_tickle_count = count
                self.db.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"更新機器人搔癢次數失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            self.db.rollback()
            return False

    def update_user_easter_egg(self, user_id: int, easter_egg: bool, triggered_time=None) -> bool:
        """更新用戶的彩蛋狀態"""
        try:
            user = self.get_user_by_id(user_id)
            if user:
                user.easter_egg = easter_egg
                if triggered_time:
                    user.easter_egg_triggered_time = triggered_time
                self.db.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"更新彩蛋狀態失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            self.db.rollback()
            return False

# 為了向後兼容，保留原有的函數形式
def get_user_by_email(db: Session, email: str) -> User | None:
    repo = UserRepository(db)
    return repo.get_user_by_email(email)

def create_user(db: Session, user: User) -> User:
    repo = UserRepository(db)
    return repo.create_user(user)

def get_user_by_id(db: Session, user_id: int) -> User | None:
    repo = UserRepository(db)
    return repo.get_user_by_id(user_id)
