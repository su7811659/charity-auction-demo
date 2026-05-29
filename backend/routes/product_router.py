from fastapi import APIRouter, Depends, HTTPException, Header, Query, Form, File, UploadFile, Request
from sqlalchemy import asc, desc, func
from sqlalchemy.orm import Session
from typing import Optional, List
from database import SessionLocal
from schemas.product_schema import Product
from schemas.comment_schema import Comment
from schemas.like_schema import Like
from schemas.user_schema import User
from viewmodels.product_viewmodel import ProductViewModel, ProductListResponse
from services.auth_service import get_optional_current_user
from services.langchain_service import generate_response
from services.faiss_service import search_faiss, populate_faiss_index
from utils.user_query_logger import log_user_ai_query
from utils.product_formatter import ProductFormatter
from utils.logger import Logger
from utils.data_helpers import build_sort_key
from pydantic import BaseModel
import re
from config import settings
from typing import Optional
import time
from functools import lru_cache

# Simple in-memory cache for AI query results (IDs + answer)

VALID_SORT_FIELDS = ["id", "name", "price", "like_count", "comment_count"]
ADMIN_SECRET = settings.ADMIN_SECRET

class ProductUpdateRequest(BaseModel):
    seller_name: Optional[str] = None
    seller_nickname: Optional[str] = None
    product_name: Optional[str] = None
    price: Optional[float] = None
    condition: Optional[int] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    ai_rating: Optional[int] = None
    ai_rating_reason: Optional[str] = None
    ai_comment: Optional[str] = None
    product_status: Optional[bool] = None
    buyer_name: Optional[str] = None
    is_approve: Optional[bool] = None
    donation_ratio: Optional[int] = None
    seller_income: Optional[float] = None
    donation_amount: Optional[float] = None

router = APIRouter(prefix="/api/products", tags=["product"])

logger = Logger.get_logger(logger_name="product")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_admin(admin_token: str = Header(...)):
    if admin_token != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="管理員權限不足")


@router.get("", response_model=ProductListResponse, response_model_exclude_none=True)
def get_products(
    request: Request,
    db: Session = Depends(get_db),
    seller_name: Optional[str] = None,
    seller_nickname: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    strquery: Optional[str] = None,
    order_by: Optional[str] = "id",
    is_approve: Optional[bool] = Query(default=None),
    is_rejected: Optional[bool] = None,
    limit: int = 10,
    offset: int = 0,
    email: Optional[str] = Depends(get_optional_current_user)
):
    # 手動處理 product_status 數組參數
    product_status_params = request.query_params.getlist('product_status')
    
    # 也檢查數組格式的參數
    product_status_array = []
    for key in request.query_params.keys():
        if key.startswith('product_status[') and key.endswith(']'):
            product_status_array.append(int(request.query_params[key]))
    
    # 決定使用哪個
    if product_status_array:
        product_status = product_status_array
    elif product_status_params:
        product_status = [int(x) for x in product_status_params]
    else:
        product_status = None
    query = db.query(Product)

    if seller_name:
        query = query.filter(Product.seller_name.contains(seller_name))
    if seller_nickname:
        query = query.filter(Product.seller_nickname.contains(seller_nickname))
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if strquery:
        query = query.filter(Product.product_name.contains(strquery))

    if product_status is not None and len(product_status) > 0:
        if len(product_status) == 1:
            query = query.filter(Product.product_status == product_status[0])
        else:
            query = query.filter(Product.product_status.in_(product_status))

    if is_approve is not None:
        query = query.filter(Product.is_approve == is_approve)
        if is_approve is False:
            query = query.filter(Product.is_rejected == False)
    if is_rejected is not None:  # ✅ 額外條件（避免跟上面衝突）
        query = query.filter(Product.is_rejected == is_rejected)

    total_count = query.count()

    # 處理排序邏輯，支援更多排序方式
    if order_by:
        if order_by == "id_desc":
            query = query.order_by(desc(Product.id))
        elif order_by == "price_asc":
            query = query.order_by(asc(Product.price))
        elif order_by == "price_desc":
            query = query.order_by(desc(Product.price))
        elif order_by == "like_count_desc":
            # 按收藏數排序需要子查詢
            like_count_subquery = db.query(
                Like.product_id,
                func.count(Like.id).label('like_count')
            ).group_by(Like.product_id).subquery()
            
            query = query.outerjoin(
                like_count_subquery, 
                Product.id == like_count_subquery.c.product_id
            ).order_by(
                desc(func.coalesce(like_count_subquery.c.like_count, 0)),
                desc(Product.id)  # 當收藏數相同時，按ID降序作為次要排序
            )
        elif order_by == "comment_count_desc":
            # 按討論度排序需要子查詢
            comment_count_subquery = db.query(
                Comment.product_id,
                func.count(Comment.id).label('comment_count')
            ).group_by(Comment.product_id).subquery()
            
            query = query.outerjoin(
                comment_count_subquery, 
                Product.id == comment_count_subquery.c.product_id
            ).order_by(
                desc(func.coalesce(comment_count_subquery.c.comment_count, 0)),
                desc(Product.id)  # 當討論數相同時，按ID降序作為次要排序
            )
        elif order_by == "view_count_desc":
            # 按點閱數排序
            query = query.order_by(
                desc(func.coalesce(Product.view_count, 0)),
                desc(Product.id)  # 當點閱數相同時，按ID降序作為次要排序
            )
        else:
            # 預設排序或無效的排序方式
            query = query.order_by(Product.id)

    products = query.offset(offset).limit(limit).all()

    # 回傳每個商品的 like_count 和 liked 狀態
    items = []
    for p in products:
        like_count = db.query(Like).filter(Like.product_id == p.id).count()
        liked = False
        if email:
            liked = db.query(Like).filter(Like.product_id == p.id, Like.email == email).first() is not None
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
            ai_rating_reason=p.ai_rating_reason,
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
            is_online_deal=p.is_online_deal,
            view_count=p.view_count
        ))
    return ProductListResponse(items=items, total=total_count)

@router.get("/stats")
def get_product_stats(db: Session = Depends(get_db)):
    """
    獲取商品統計資料
    """
    try:
        # 總商品數量
        total_products = db.query(Product).filter(Product.is_approve == True).count()
        
        # 已售出商品數量 (product_status = 2 表示已售出)
        sold_products = db.query(Product).filter(
            Product.is_approve == True,
            Product.product_status == 2
        ).count()
        
        # 參與用戶數量（平台總註冊用戶數）
        total_participants = db.query(User).count()
        
        # 平均價格
        avg_price_result = db.query(func.avg(Product.price)).filter(
            Product.is_approve == True
        ).scalar()
        
        avg_price = int(avg_price_result) if avg_price_result else 0
        
        return {
            "total_products": total_products,
            "sold_products": sold_products,
            "total_participants": total_participants,
            "average_price": avg_price
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")

@router.get("/legendary-stats")
def get_legendary_product_stats(db: Session = Depends(get_db)):
    """
    獲取創世商品統計（第一個史詩/傳說/神話級商品）
    """
    try:
        # 獲取各等級商品總數
        epic_count = db.query(Product).filter(
            Product.is_approve == True,
            Product.ai_rating == 3
        ).count()
        
        legendary_count = db.query(Product).filter(
            Product.is_approve == True,
            Product.ai_rating == 4
        ).count()
        
        mythical_count = db.query(Product).filter(
            Product.is_approve == True,
            Product.ai_rating == 5
        ).count()
        
        result = {
            "epic_count": epic_count,
            "legendary_count": legendary_count,
            "mythical_count": mythical_count
        }
        
        # 獲取第一個史詩級商品 (3星)
        first_epic = db.query(Product).filter(
            Product.is_approve == True,
            Product.ai_rating == 3
        ).order_by(Product.created_at.asc()).first()
        
        if first_epic:
            result["first_epic"] = {
                "id": first_epic.id,
                "product_name": first_epic.product_name,
                "image_url": first_epic.image_url,
                "ai_rating": first_epic.ai_rating,
                "seller_nickname": first_epic.seller_nickname,
                "created_at": first_epic.created_at.isoformat(),
                "rating_tier": "史詩級"
            }
        
        # 獲取第一個傳說級商品 (4星)
        first_legendary = db.query(Product).filter(
            Product.is_approve == True,
            Product.ai_rating == 4
        ).order_by(Product.created_at.asc()).first()
        
        if first_legendary:
            result["first_legendary"] = {
                "id": first_legendary.id,
                "product_name": first_legendary.product_name,
                "image_url": first_legendary.image_url,
                "ai_rating": first_legendary.ai_rating,
                "seller_nickname": first_legendary.seller_nickname,
                "created_at": first_legendary.created_at.isoformat(),
                "rating_tier": "傳說級"
            }
        
        # 獲取第一個神話級商品 (5星)
        first_mythical = db.query(Product).filter(
            Product.is_approve == True,
            Product.ai_rating == 5
        ).order_by(Product.created_at.asc()).first()
        
        if first_mythical:
            result["first_mythical"] = {
                "id": first_mythical.id,
                "product_name": first_mythical.product_name,
                "image_url": first_mythical.image_url,
                "ai_rating": first_mythical.ai_rating,
                "seller_nickname": first_mythical.seller_nickname,
                "created_at": first_mythical.created_at.isoformat(),
                "rating_tier": "神話級"
            }
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top_donors")
def get_top_donors(db: Session = Depends(get_db)):
    """
    獲取捐款排行榜前十名，顯示該使用者第一個上傳商品的seller_nickname
    """
    # 計算每個用戶的總捐款金額
    top_donors = (
        db.query(
            Product.seller_name,
            func.sum(Product.donation_amount).label('total_donation')
        )
        .filter(Product.donation_amount.isnot(None))
        .filter(Product.donation_amount > 0)
        .group_by(Product.seller_name)
        .order_by(func.sum(Product.donation_amount).desc())
        .limit(10)  # 取前10名
        .all()
    )
    
    # 取得用戶資訊和第一個商品的seller_nickname
    result = []
    for seller_email, total_donation in top_donors:
        # 找到該用戶第一個上傳的商品的seller_nickname
        first_product = (
            db.query(Product)
            .filter(Product.seller_name == seller_email)
            .order_by(Product.id.asc())  # 按照id排序，取最早的商品
            .first()
        )
        
        # 找到用戶資訊
        user = db.query(User).filter(User.email == seller_email).first()
        
        nickname = "匿名用戶"
        if first_product and first_product.seller_nickname:
            nickname = first_product.seller_nickname
        elif seller_email:
            nickname = seller_email.split("@")[0]
        
        avatar_url = None
        if user and user.avatar_url:
            avatar_url = user.avatar_url
        
        result.append({
            "nickname": nickname,
            "email": seller_email,
            "email_local": seller_email.split("@")[0] if seller_email else "匿名",
            "avatar_url": avatar_url,
            "total_donation": float(total_donation) if total_donation else 0
        })
    
    return result


@router.get("/total_donation")
def get_total_donation(db: Session = Depends(get_db)):
    """
    獲取總捐款金額
    """
    total = db.query(func.sum(Product.donation_amount)).filter(
        Product.donation_amount.isnot(None),
        Product.donation_amount > 0
    ).scalar()
    
    return {
        "total_donation_amount": float(total) if total else 0
    }

# get product by ID
@router.get("/{product_id}", response_model=ProductViewModel, response_model_exclude_none=True)
def get_product(
    product_id: int, 
    db: Session = Depends(get_db), 
    email: Optional[str] = Depends(get_optional_current_user),
    increment_view: bool = Query(default=True, description="是否增加點閱率")
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if p is None:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    # 只有當 increment_view 為 True 時才增加點閱率
    if increment_view:
        p.view_count = (p.view_count or 0) + 1
        db.commit()
    
    like_count = db.query(Like).filter(Like.product_id == p.id).count()
    liked = False
    if email:
        liked = db.query(Like).filter(Like.product_id == p.id, Like.email == email).first() is not None
    comment_count = db.query(Comment).filter(Comment.product_id == p.id).count()
    product = ProductViewModel(
                id=p.id,
                seller_name=p.seller_name,
                seller_nickname=p.seller_nickname,
                product_name=p.product_name,
                price=p.price,
                condition=p.condition,
                description=p.description,
                image_url=p.image_url,
                ai_rating=p.ai_rating,
                ai_rating_reason=p.ai_rating_reason,
                ai_comment=p.ai_comment,
                ai_fit_owner=p.ai_fit_owner,
                product_status=p.product_status,
                buyer_name=p.buyer_name,
                created_at=p.created_at.isoformat(),
                is_approve=p.is_approve,
                donation_ratio=p.donation_ratio,
                seller_income=p.seller_income,
                donation_amount=p.donation_amount,
                like_count=like_count,
                liked=liked,
                comment_count=comment_count,
                view_count=p.view_count
            )
    return product

@router.put("/{product_id}")
def update_prodcut(
    product_id: int,
    update_data: ProductUpdateRequest,
    db: Session = Depends(get_db),
    admin_token: str = Header(...)
):
    verify_admin(admin_token)

    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="商品不存在")
   
    if product.product_status and update_data.price is not None:
        raise HTTPException(status_code=400, detail="商品已售出，無法更改價格")

    if product.is_approve and (update_data.product_name or update_data.condition):
        raise HTTPException(status_code=400, detail="商品已審核通過，無法修改名稱或新舊程度")

    if update_data.seller_name is not None:
        product.seller_name = update_data.seller_name
    if update_data.seller_nickname is not None:
        product.seller_nickname = update_data.seller_nickname
    if update_data.product_name is not None:
        product.product_name = update_data.product_name
    if update_data.price is not None:
        if update_data.price <= 0:
            raise HTTPException(status_code=400, detail="價格必須大於 0")
        product.price = update_data.price
    if update_data.condition is not None:
        if update_data.condition not in [1, 2, 3, 4]:
            raise HTTPException(status_code=400, detail="新舊程度只能是 1~4")
        product.condition = update_data.condition
    if update_data.description is not None:
        product.description = update_data.description
    if update_data.image_url is not None:
        product.image_url = update_data.image_url
    if update_data.product_status is not None:
        product.product_status = update_data.product_status
    if update_data.buyer_name is not None:
        product.buyer_name = update_data.buyer_name
    if update_data.is_approve is not None:
        product.is_approve = update_data.is_approve
    if update_data.donation_ratio is not None:
        if update_data.donation_ratio not in [0, 20, 40, 60, 80, 100]:
            raise HTTPException(status_code=400, detail="捐贈比例只能是 0, 20, 40, 60, 80, 100")
        product.donation_ratio = update_data.donation_ratio
    if update_data.seller_income is not None:
        product.seller_income = update_data.seller_income
    if update_data.donation_amount is not None:
        product.donation_amount = update_data.donation_amount
    
    db.commit()
    db.refresh(product)

    # 將 product 轉換為字典並移除 embedding 欄位
    product_dict = product.__dict__.copy()
    product_dict.pop("embedding", None)

    return product_dict

# delete product
@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin_token: str = Header(...)
):
    verify_admin(admin_token)

    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="商品不存在")
    
    #Todo: Can set on delete cascade in the future
    db.query(Comment).filter(Comment.product_id == product_id).delete()

    db.query(Like).filter(Like.product_id == product_id).delete()

    db.delete(product)
    db.commit()
    return {"msg": "商品已刪除"}


@router.post("/populate_faiss_index")
def populate_index(db: Session = Depends(get_db)):
    populate_faiss_index(db)
    return {"msg": "FAISS index populated successfully"}

@router.post("/query", response_model=ProductListResponse, response_model_exclude_none=True)
def query_products(
    user_query: str = Query(...),
    top_k: int = 100,
    db: Session = Depends(get_db),
    email: Optional[str] = Depends(get_optional_current_user)
):
    """AI semantic search with LLM reasoning + pagination.
    - Caches LLM answer & ordered ID list for identical user_query (case-insensitive) for TTL.
    - Robust parsing of ID list.
    - Returns page slice while total = full matched count for proper pagination.
    """
    # 處理空查詢的情況
    if not user_query or not user_query.strip():
        raise HTTPException(status_code=400, detail="查詢內容不能為空")
    
    # 記錄用戶AI查詢（如果有用戶email的話）
    if email:
        log_user_ai_query(email, user_query.strip())
    
    # 獲取市集總商品數量
    total_products = db.query(Product).filter(Product.is_approve == True).count()
    
    # Step 1: Retrieve relevant products
    relevant_products = search_faiss(db, user_query, top_k=top_k, email=email, use_openai=True)
    criteria = [("price", "asc"), ("id", "asc")]
    sort_key = build_sort_key(*criteria)
    relevant_products.sort(key=sort_key)

    # Step 2: Prepare context for LangChain
    context = "\n".join([
        ProductFormatter.format(p, "langchain_context") for p in relevant_products
    ])
    # Step 3: Generate a response using LangChain，傳入商品總數
    response = generate_response(context, user_query, total_products)
    logger.info(f"AI Query Response: {response}")

    # Step 4: Parse response to get the number of items to return
    try:
        array = response.split("|")
        index_str = array[0].strip("{} ")
        # 過濾掉空字串與非數字
        indices = [int(x.strip(" '\"")) for x in re.split(r",\s*", index_str) if x.strip().isdigit()]
        
        id_map = {p.id: p for p in relevant_products}
        items = [id_map.get(i) for i in indices if id_map.get(i) is not None]
    except (ValueError, IndexError) as e:
        logger.error(f"Error parsing AI response: {e}.")
        return ProductListResponse(
            ai_query_response=response if len(array) < 2 else array[1].strip(),
            items=relevant_products,
            total=len(relevant_products)
        )

    # Return the response and relevant products
    return ProductListResponse(
        ai_query_response=array[1],
        items= items,
        total= len(items)
    )

# Summary statistics endpoints
@router.get("/summary/top-liked")
def get_top_liked_products(db: Session = Depends(get_db)):
    """獲取最熱門商品前三名 (Like最多的前三名)"""
    
    # Query to get products with like counts, ordered by like count desc
    result = (
        db.query(Product, func.count(Like.id).label('like_count'))
        .outerjoin(Like, Product.id == Like.product_id)
        .filter(Product.is_approve == True)
        .group_by(Product.id)
        .order_by(desc('like_count'), desc(Product.id))
        .limit(3)
        .all()
    )
    
    return [
        {
            "id": product.id,
            "product_name": product.product_name,
            "image_url": product.image_url,
            "like_count": like_count,
            "price": product.price
        }
        for product, like_count in result
    ]

@router.get("/summary/top-commented")
def get_top_commented_products(db: Session = Depends(get_db)):
    """獲取討論度最高的商品前三名 (Comment數前三多的)"""
    
    # Query to get products with comment counts, ordered by comment count desc
    result = (
        db.query(Product, func.count(Comment.id).label('comment_count'))
        .outerjoin(Comment, Product.id == Comment.product_id)
        .filter(Product.is_approve == True)
        .group_by(Product.id)
        .order_by(desc('comment_count'), desc(Product.id))
        .limit(3)
        .all()
    )
    
    return [
        {
            "id": product.id,
            "product_name": product.product_name,
            "image_url": product.image_url,
            "comment_count": comment_count,
            "price": product.price
        }
        for product, comment_count in result
    ]

@router.get("/summary/top-viewed")
def get_top_viewed_products(limit: int = Query(default=3, ge=1, le=10), db: Session = Depends(get_db)):
    """獲取點閱率最高的商品前N名"""
    
    # Query to get products ordered by view count desc
    products = (
        db.query(Product)
        .filter(Product.is_approve == True)
        .filter(Product.view_count.isnot(None))
        .order_by(desc(Product.view_count), desc(Product.id))
        .limit(limit)
        .all()
    )
    
    return [
        {
            "id": product.id,
            "product_name": product.product_name,
            "image_url": product.image_url,
            "view_count": product.view_count or 0,
            "price": product.price,
            "seller_nickname": product.seller_nickname
        }
        for product in products
    ]
