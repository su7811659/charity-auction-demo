from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from schemas.reaction_schema import CommentReactionCreate, CommentReactionResponse
from services.reaction_service import (
    create_comment_reaction_service,
    delete_comment_reaction_service,
    get_comment_reactions_service
)
from services.auth_service import get_current_user
from typing import List

router = APIRouter(prefix="/api")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/comments/{comment_id}/reactions", response_model=CommentReactionResponse)
def create_comment_reaction(
    comment_id: int, 
    reaction: CommentReactionCreate, 
    db: Session = Depends(get_db), 
    email: str = Depends(get_current_user)
):
    """建立對留言的回應"""
    try:
        return create_comment_reaction_service(db, comment_id, reaction, email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/comments/{comment_id}/reactions/{reaction_type}")
def delete_comment_reaction(
    comment_id: int, 
    reaction_type: str, 
    db: Session = Depends(get_db), 
    email: str = Depends(get_current_user)
):
    """刪除對留言的回應"""
    try:
        return delete_comment_reaction_service(db, comment_id, reaction_type, email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/comments/{comment_id}/reactions", response_model=List[CommentReactionResponse])
def get_comment_reactions(comment_id: int, db: Session = Depends(get_db)):
    """獲取留言的所有回應"""
    return get_comment_reactions_service(db, comment_id)
