from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from schemas.comment_schema import CommentCreate, CommentResponse
from services.comment_service import create_comment_service, get_comments_service
from services.auth_service import get_current_user

router = APIRouter(prefix="/api")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/products/{product_id}/comments", response_model=CommentResponse)
def create_comment(product_id: int, comment: CommentCreate, db: Session = Depends(get_db), email: str = Depends(get_current_user)):
    return create_comment_service(db, product_id, comment, email)

@router.get("/products/{product_id}/comments", response_model=list[CommentResponse])
def get_comments(product_id: int, db: Session = Depends(get_db)):
    return get_comments_service(db, product_id)
