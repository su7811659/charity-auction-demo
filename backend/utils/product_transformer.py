from schemas.product_schema import Product
from schemas.like_schema import Like
from schemas.comment_schema import Comment
from viewmodels.product_viewmodel import ProductViewModel
from sqlalchemy.orm import Session
from typing import Optional


def build_product_view_model(
        p: Product,
        db: Session,
        email: Optional[str]) -> ProductViewModel:
    like_count = db.query(Like).filter(Like.product_id == p.id).count()
    liked = bool(email and db.query(Like).filter(Like.product_id == p.id, Like.email == email).first())
    comment_count = db.query(Comment).filter(Comment.product_id == p.id).count()

    return ProductViewModel(
        id=p.id,
        seller_name=p.seller_name,
        seller_nickname=p.seller_nickname,
        product_name=p.product_name,
        price=p.price,
        condition=p.condition,
        description=p.description,
        image_url=p.image_url,
        ai_rating=p.ai_rating,
        ai_comment=p.ai_comment,
        ai_fit_owner=p.ai_fit_owner,
        product_status=p.product_status,
        buyer_name=p.buyer_name,
        created_at=p.created_at.isoformat(),
        is_approve=p.is_approve,
        is_rejected=p.is_rejected,
        donation_ratio=p.donation_ratio,
        seller_income=p.seller_income,
        donation_amount=p.donation_amount,
        like_count=like_count,
        liked=liked,
        comment_count=comment_count,
        is_online_deal=p.is_online_deal
    )
