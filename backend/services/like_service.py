from sqlalchemy.orm import Session
from sqlalchemy import select
from schemas.like_schema import Like
from schemas.product_schema import Product
from typing import List

def get_liked_products_by_email(db: Session, email: str) -> List[Product]:
    # Use a scalar SELECT instead of .subquery() to avoid SAWarning in SQLAlchemy 2.x
    liked_product_ids = select(Like.product_id).where(Like.email == email)
    return db.query(Product).filter(Product.id.in_(liked_product_ids)).all()
