from sqlalchemy.orm import Session
from repositories.comment_repository import create_comment as repo_create_comment, get_comments as repo_get_comments
from schemas.comment_schema import CommentCreate

def create_comment_service(db: Session, product_id: int, comment: CommentCreate, email: str):
    return repo_create_comment(db, product_id, comment.content, email)

def get_comments_service(db: Session, product_id: int):
    return repo_get_comments(db, product_id)
