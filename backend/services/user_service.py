from sqlalchemy.orm import Session
from schemas.user_schema import User, UserCreate, UserUpdateRequest
from schemas.product_schema import Product
from fastapi import HTTPException
from repositories.user_repository import get_user_by_email, create_user
from datetime import datetime, timezone
from services.achievement_service_simple import AchievementService

def init_user_if_not_exist(db: Session, user_create: UserCreate) -> User:
    user = get_user_by_email(db, user_create.email)
    if user:
        return user
    new_user = User(**user_create.dict())
    return create_user(db, new_user)

def update_user_profile(db: Session, email: str, data: UserUpdateRequest) -> User:
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 檢查是否更換頭像
    avatar_changed = False
    if "avatar_url" in data.__fields_set__:
        old_avatar = user.avatar_url
        new_avatar = str(data.avatar_url) if data.avatar_url is not None else None
        user.avatar_url = new_avatar
        
        # 如果頭像發生變化，標記為已更換
        if old_avatar != new_avatar:
            avatar_changed = True

    if data.mm_style is not None:
        user.mm_style = data.mm_style
        
    # 處理用戶偏好設定
    if data.default_product_status is not None:
        user.default_product_status = data.default_product_status
        
    if data.default_sort_order is not None:
        user.default_sort_order = data.default_sort_order
        
    if data.easter_egg is not None:
        if data.easter_egg and user.easter_egg: #has triggered no need to update
            raise HTTPException(status_code=400, detail="Easter egg already triggered.")
        user.easter_egg = data.easter_egg
        if data.easter_egg:
            user.easter_egg_triggered_time = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user)
    
    # 如果頭像發生變化，觸發成就檢查
    if avatar_changed:
        try:
            achievement_service = AchievementService()
            achievement_service.trigger_achievement(db, user.id, 'profile_change')
        except Exception as e:
            print(f"成就檢查失敗: {e}")
    
    return user

def increment_tickle_count(db: Session, email: str) -> User:
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.robot_tickle_count += 1
    db.commit()
    db.refresh(user)
    return user

def get_user_products(db: Session, email: str) -> list[Product]:
    """
    根據 seller_name 取得該使用者上傳的所有商品。
    僅包含已創建的商品，不論是否成交。
    """
    return db.query(Product).filter(Product.seller_name == email).all()