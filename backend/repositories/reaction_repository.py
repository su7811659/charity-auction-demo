from sqlalchemy.orm import Session
from sqlalchemy import text
from schemas.comment_schema import Comment
from schemas.reaction_schema import CommentReaction
from schemas.user_schema import User
from fastapi import HTTPException
from typing import List
import logging

logger = logging.getLogger(__name__)

class ReactionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_feedback_count(self, user_id: int) -> int:
        """獲取用戶的回饋次數"""
        try:
            # 假設回饋是一種特殊的 reaction_type
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return 0
            
            # 查詢用戶的回饋次數
            return self.db.query(CommentReaction).filter(
                CommentReaction.email == user.email,
                CommentReaction.reaction_type == 'feedback'
            ).count()
        except Exception as e:
            logger.error(f"獲取用戶回饋次數失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            return 0

    def create_comment_reaction(self, comment_id: int, email: str, reaction_type: str) -> CommentReaction:
        """建立對留言的回應"""
        # 檢查留言是否存在
        comment = self.db.query(Comment).filter(Comment.id == comment_id).first()
        if not comment:
            raise HTTPException(status_code=404, detail="留言不存在")
        
        # 檢查使用者是否已對此留言使用相同類型的回應
        existing_reaction = self.db.query(CommentReaction).filter(
            CommentReaction.comment_id == comment_id,
            CommentReaction.email == email,
            CommentReaction.reaction_type == reaction_type
        ).first()
        
        if existing_reaction:
            raise HTTPException(status_code=400, detail="已經對此留言使用過相同的回應")
        
        # 建立新的回應
        new_reaction = CommentReaction(
            comment_id=comment_id,
            email=email,
            reaction_type=reaction_type
        )
        
        self.db.add(new_reaction)
        self.db.commit()
        self.db.refresh(new_reaction)
        return new_reaction

    def delete_comment_reaction(self, comment_id: int, email: str, reaction_type: str) -> dict:
        """刪除對留言的回應"""
        # 檢查留言是否存在
        comment = self.db.query(Comment).filter(Comment.id == comment_id).first()
        if not comment:
            raise HTTPException(status_code=404, detail="留言不存在")
        
        # 尋找要刪除的回應
        reaction = self.db.query(CommentReaction).filter(
            CommentReaction.comment_id == comment_id,
            CommentReaction.email == email,
            CommentReaction.reaction_type == reaction_type
        ).first()
        
        if not reaction:
            raise HTTPException(status_code=404, detail="未找到要刪除的回應")
        
        self.db.delete(reaction)
        self.db.commit()
        return {"message": "回應已刪除"}

    def get_comment_reactions(self, comment_id: int) -> List[CommentReaction]:
        """獲取留言的所有回應"""
        # 檢查留言是否存在
        comment = self.db.query(Comment).filter(Comment.id == comment_id).first()
        if not comment:
            raise HTTPException(status_code=404, detail="留言不存在")
        
        reactions = self.db.query(CommentReaction).filter(CommentReaction.comment_id == comment_id).all()
        return reactions

# 為了向後兼容，保留原有的函數形式
def create_comment_reaction(db: Session, comment_id: int, email: str, reaction_type: str) -> CommentReaction:
    repo = ReactionRepository(db)
    return repo.create_comment_reaction(comment_id, email, reaction_type)

def delete_comment_reaction(db: Session, comment_id: int, email: str, reaction_type: str) -> dict:
    repo = ReactionRepository(db)
    return repo.delete_comment_reaction(comment_id, email, reaction_type)

def get_comment_reactions(db: Session, comment_id: int) -> List[CommentReaction]:
    repo = ReactionRepository(db)
    return repo.get_comment_reactions(comment_id)
