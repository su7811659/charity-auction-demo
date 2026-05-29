from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from schemas.like_schema import Like
from services.auth_service import get_current_user

router = APIRouter(prefix="/api")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/products/{product_id}/like")
def like_product(product_id: int, db: Session = Depends(get_db), email: str = Depends(get_current_user)):
    # 檢查是否已經按過讚
    existing = db.query(Like).filter(Like.email == email, Like.product_id == product_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="已經按過讚")
    like = Like(email=email, product_id=product_id)
    db.add(like)
    db.commit()
    return {"msg": "按讚成功"}

@router.delete("/products/{product_id}/like")
def unlike_product(product_id: int, db: Session = Depends(get_db), email: str = Depends(get_current_user)):
    like = db.query(Like).filter(Like.email == email, Like.product_id == product_id).first()
    if not like:
        raise HTTPException(status_code=404, detail="尚未按讚")
    db.delete(like)
    db.commit()
    return {"msg": "已取消讚"}

@router.get("/products/{product_id}/like_count")
def get_like_count(product_id: int, db: Session = Depends(get_db)):
    count = db.query(Like).filter(Like.product_id == product_id).count()
    return {"product_id": product_id, "like_count": count}
