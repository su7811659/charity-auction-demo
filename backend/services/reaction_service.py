from sqlalchemy.orm import Session
from repositories.reaction_repository import (
    create_comment_reaction as repo_create_reaction,
    delete_comment_reaction as repo_delete_reaction,
    get_comment_reactions as repo_get_reactions
)
from schemas.reaction_schema import CommentReactionCreate, AVAILABLE_REACTIONS

def create_comment_reaction_service(db: Session, comment_id: int, reaction: CommentReactionCreate, email: str):
    """建立對留言的回應服務"""
    # 驗證回應類型是否有效
    if reaction.reaction_type not in AVAILABLE_REACTIONS:
        raise ValueError(f"無效的回應類型: {reaction.reaction_type}")
    
    return repo_create_reaction(db, comment_id, email, reaction.reaction_type)

def delete_comment_reaction_service(db: Session, comment_id: int, reaction_type: str, email: str):
    """刪除對留言的回應服務"""
    # 驗證回應類型是否有效
    if reaction_type not in AVAILABLE_REACTIONS:
        raise ValueError(f"無效的回應類型: {reaction_type}")
    
    return repo_delete_reaction(db, comment_id, email, reaction_type)

def get_comment_reactions_service(db: Session, comment_id: int):
    """獲取留言的所有回應服務"""
    return repo_get_reactions(db, comment_id)
