from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from schemas.user_schema import UserCreate, UserProfile, UserUpdateRequest, TopTickler, EasterEggTopUser, User
from schemas.product_schema import Product
from services.user_service import update_user_profile, increment_tickle_count, get_user_products
from services.auth_service import get_current_user
from services.user_service import init_user_if_not_exist
from database import SessionLocal
from schemas.like_schema import Like
from schemas.product_schema import Product
from datetime import timezone
from typing import List
from viewmodels.product_viewmodel import ProductViewModel, ProductListResponse
from schemas.comment_schema import Comment
from utils.product_transformer import build_product_view_model

router = APIRouter(prefix="/api/user", tags=["user"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=UserProfile)
def register_or_get_user(user: UserCreate, db: Session = Depends(get_db)):
    return init_user_if_not_exist(db, user)

@router.get("/me", response_model=UserProfile)
def get_my_profile(
    db: Session = Depends(get_db),
    email: str = Depends(get_current_user)
):
    user = db.query(User).filter_by(email=email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.patch("/me", response_model=UserProfile)
def update_user_info(
    data: UserUpdateRequest,
    db: Session = Depends(get_db),
    email: str = Depends(get_current_user)
):
    return update_user_profile(db, email, data)


@router.get("/me/product", response_model=ProductListResponse)
def get_my_products(
    db: Session = Depends(get_db),
    email: str = Depends(get_current_user)
):
    products = get_user_products(db, email)
    
    items = [build_product_view_model(p, db, email) for p in products]

    return ProductListResponse(
        items=items,
        total=len(items)
    )

@router.get("/me/purchased", response_model=ProductListResponse)
def get_my_purchased_products(
    db: Session = Depends(get_db),
    email: str = Depends(get_current_user)
):
    # 查找 buyer_name 為完整 email 或 email 的 local part 的商品
    buyer_name_local = email.split("@")[0]
    products = db.query(Product).filter(
        (Product.buyer_name == email) | (Product.buyer_name == buyer_name_local)
    ).all()

    items = [build_product_view_model(p, db, email) for p in products]

    return ProductListResponse(
        items=items,
        total=len(items)
    )

@router.post("/me/tickle", response_model=UserProfile)
def tickle_robot(
    db: Session = Depends(get_db),
    email: str = Depends(get_current_user)
):
    return increment_tickle_count(db, email)

@router.get("/me/likes", response_model=ProductListResponse)
def get_user_liked_products(
    db: Session = Depends(get_db),
    email: str = Depends(get_current_user),
    limit: int = Query(default=1000, ge=1),  # 增加預設限制到 1000
    offset: int = Query(default=0, ge=0),
):
    # 找出按過讚的 product_id 的 SELECT 子查詢（SQLAlchemy 2.0 友善寫法）
    liked_product_ids = select(Like.product_id).where(Like.email == email)

    # 總筆數
    total = db.query(Product).filter(Product.id.in_(liked_product_ids)).count()

    # 實際資料
    products = (
        db.query(Product)
        .filter(Product.id.in_(liked_product_ids))
        .offset(offset)
        .limit(limit)
        .all()
    )

    items: List[ProductViewModel] = []

    for p in products:
        like_count = db.query(Like).filter(Like.product_id == p.id).count()
        liked = True  # 一定是 true，因為來源是「我按過的」
        comment_count = db.query(Comment).filter(Comment.product_id == p.id).count()

        items.append(ProductViewModel(
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
            comment_count=comment_count
        ))

    return ProductListResponse(items=items, total=total)

@router.get("/top-ticklers", response_model=List[TopTickler])
def get_top_ticklers(db: Session = Depends(get_db)):
    users = (
        db.query(User)
        .order_by(User.robot_tickle_count.desc())
        .limit(3)
        .all()
    )
    return users

@router.get("/total-tickle-stats")
def get_total_tickle_stats(db: Session = Depends(get_db)):
    """獲取全系統戳戳統計"""
    total_tickles = db.query(func.sum(User.robot_tickle_count)).scalar() or 0
    total_ticklers = db.query(User).filter(User.robot_tickle_count > 0).count()
    
    return {
        "total_tickles": int(total_tickles),
        "total_ticklers": total_ticklers
    }

@router.get("/easter-egg/top", response_model=List[EasterEggTopUser])
def get_top_easter_egg_users(db: Session = Depends(get_db)):
    users = (
        db.query(User)
        .filter(User.easter_egg == True, User.easter_egg_triggered_time.isnot(None))
        .order_by(User.easter_egg_triggered_time.asc())
        .limit(3)
        .all()
    )
    
    # 確保時間格式正確包含時區信息
    result = []
    for user in users:
        user_data = {
            "email": user.email,
            "avatar_url": user.avatar_url,
            "easter_egg_triggered_time": user.easter_egg_triggered_time.replace(tzinfo=timezone.utc).isoformat() if user.easter_egg_triggered_time else None
        }
        result.append(user_data)
    
    return result

@router.get("/easter-egg/total-stats")
def get_total_easter_egg_stats(db: Session = Depends(get_db)):
    """獲取全系統彩蛋統計"""
    total_discoverers = db.query(User).filter(User.easter_egg == True).count()
    
    return {
        "total_discoverers": total_discoverers
    }

@router.get("/platinum-achievement")
def get_platinum_achievement_users(db: Session = Depends(get_db)):
    """獲取白金成就用戶列表"""
    try:
        # Query users who have unlocked the platinum_trophy achievement
        from models.achievement import UserAchievement
        
        # Get users with platinum achievement and join user info
        platinum_users = (
            db.query(User, UserAchievement.unlocked_at)
            .join(
                UserAchievement, 
                (User.id == UserAchievement.user_id) & 
                (UserAchievement.achievement_id == 'platinum_trophy') & 
                (UserAchievement.is_unlocked == True)
            )
            .order_by(UserAchievement.unlocked_at.asc())  # Order by achievement unlock time
            .limit(5)  # Limit to top 5 users
            .all()
        )
        
        result = []
        for user, unlocked_at in platinum_users:
            # Get user's first product nickname
            first_product = db.query(Product).filter(Product.seller_name == user.email).order_by(Product.id.asc()).first()
            
            nickname = "匿名用戶"
            if first_product and first_product.seller_nickname:
                nickname = first_product.seller_nickname
            elif user.email:
                nickname = user.email.split("@")[0]
            
            result.append({
                "id": user.id,
                "email": user.email,
                "nickname": nickname,
                "avatar_url": user.avatar_url,
                "unlocked_at": unlocked_at.replace(tzinfo=timezone.utc).isoformat() if unlocked_at else None
            })
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching platinum users: {str(e)}")

@router.get("/stats")
def get_user_stats(
    db: Session = Depends(get_db),
    email: str = Depends(get_current_user)
):
    """獲取用戶統計信息"""
    user = db.query(User).filter_by(email=email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 統計用戶相關數據
    user_products_count = db.query(Product).filter_by(seller_name=email.split("@")[0]).count()
    user_likes_count = db.query(Like).filter_by(email=email).count()
    user_comments_count = db.query(Comment).filter_by(email=email).count()
    
    return {
        "user_products": user_products_count,
        "user_likes": user_likes_count,
        "user_comments": user_comments_count,
        "robot_tickle_count": user.robot_tickle_count,
        "easter_egg": user.easter_egg,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }