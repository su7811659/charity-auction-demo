from sqlalchemy.orm import Session
from sqlalchemy import text
from schemas.product_schema import Product
from schemas.comment_schema import Comment, CommentResponse
from schemas.user_schema import User
from fastapi import HTTPException
from typing import List
import logging

logger = logging.getLogger(__name__)

class CommentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_comment_count(self, user_id: int) -> int:
        """獲取用戶的留言數量"""
        try:
            # 根據用戶email查詢留言數量
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return 0
            
            return self.db.query(Comment).filter(Comment.email == user.email).count()
        except Exception as e:
            logger.error(f"獲取用戶留言數量失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
            return 0

    def create_comment(self, product_id: int, content: str, email: str) -> Comment:
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="商品不存在")
        new_comment = Comment(product_id=product_id, content=content, email=email)
        self.db.add(new_comment)
        self.db.commit()
        self.db.refresh(new_comment)
        return new_comment

    def get_comments(self, product_id: int) -> List[Comment]:
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="商品不存在")
        comments = self.db.query(Comment).filter(Comment.product_id == product_id).order_by(Comment.created_at.asc()).all()

        # 取得所有留言的 email 清單（去重）
        emails = list(set(comment.email for comment in comments))

        # 批次查詢 user avatar_url（避免 N+1 query）
        user_map = {
            user.email: user.avatar_url
            for user in self.db.query(User).filter(User.email.in_(emails)).all()
        }

        # 將 avatar_url 合併進 response
        responses = []
        for comment in comments:
            data = CommentResponse.from_orm(comment).dict()
            data["avatar_url"] = user_map.get(comment.email)
            responses.append(CommentResponse(**data))

        return responses

# 為了向後兼容，保留原有的函數形式
def create_comment(db: Session, product_id: int, content: str, email: str) -> Comment:
    repo = CommentRepository(db)
    return repo.create_comment(product_id, content, email)

def get_comments(db: Session, product_id: int) -> List[Comment]:
    repo = CommentRepository(db)
    return repo.get_comments(product_id)
