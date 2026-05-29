"""
線上交易 API 路由
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from services.auth_service import get_current_user
from services.online_deal_service import OnlineDealService
from schemas.online_deal_schema import OnlineDealCreate, OnlineDealUpdate
from models.system_config import SystemConfig
from database import SessionLocal
from typing import List, Dict, Any
from datetime import datetime
from schemas.user_schema import User

router = APIRouter(prefix="/api/online-deals", tags=["online-deals"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/requests", response_model=Dict[str, Any])
def create_deal_request(
    deal_data: OnlineDealCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """發送線上交易請求"""
    service = OnlineDealService(db)
    return service.create_deal_request(current_user, deal_data)

@router.get("/my-requests", response_model=List[Dict[str, Any]])
def get_my_requests(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """取得我發出的交易請求"""
    service = OnlineDealService(db)
    return service.get_user_deals_as_buyer(current_user)

@router.get("/my-received", response_model=List[Dict[str, Any]])
def get_my_received_requests(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """取得我收到的交易請求"""
    service = OnlineDealService(db)
    return service.get_user_deals_as_seller(current_user)

@router.post("/requests/{deal_id}/approve", response_model=Dict[str, Any])
def approve_deal_request(
    deal_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """同意交易請求（賣家）"""
    service = OnlineDealService(db)
    return service.approve_deal(deal_id, current_user)

@router.post("/requests/{deal_id}/reject", response_model=Dict[str, Any])
def reject_deal_request(
    deal_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """拒絕交易請求（賣家）"""
    service = OnlineDealService(db)
    return service.reject_deal(deal_id, current_user)

@router.post("/requests/{deal_id}/cancel", response_model=Dict[str, Any])
def cancel_deal_request(
    deal_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """取消交易請求（買家）"""
    service = OnlineDealService(db)
    return service.cancel_deal(deal_id, current_user)

@router.get("/my-stats", response_model=Dict[str, Any])
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """取得我的交易統計"""
    service = OnlineDealService(db)
    return service.get_user_stats(current_user)

@router.get("/products/{product_id}/requests", response_model=List[Dict[str, Any]])
def get_product_requests(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """取得商品的交易請求列表（賣家查看）"""
    service = OnlineDealService(db)
    return service.get_product_requests(product_id, current_user)

@router.get("/status")
def get_online_deal_status(
    db: Session = Depends(get_db)
):
    """取得線上交易系統狀態"""
    service = OnlineDealService(db)
    return {
        "online_deal_available": service.is_online_deal_available(),
        "max_concurrent_deals": service.get_max_concurrent_deals()
    }

@router.get("/config")
def get_online_deal_config(
    db: Session = Depends(get_db)
):
    """取得線上交易相關配置（公開API，用於前端顯示控制）"""
    config = db.query(SystemConfig).first()
    if not config:
        return {
            "online_deal_enabled": False,
            "online_deal_available": False
        }
    
    return {
        "online_deal_enabled": bool(config.online_deal_enabled),
        "online_deal_available": bool(config.online_deal_available)
    }

@router.get("/products/{product_id}/request-status")
def get_product_request_status(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """檢查用戶對特定商品的請求狀態"""
    service = OnlineDealService(db)
    existing_request = service.repo.check_existing_request(product_id, current_user)
    
    if existing_request:
        return {
            "has_request": True,
            "request_id": existing_request.id,
            "status": existing_request.deal_status,
            "status_text": service._get_status_text(existing_request.deal_status)
        }
    else:
        return {
            "has_request": False,
            "request_id": None,
            "status": None,
            "status_text": None
        }

@router.post("/page-visit")
def update_page_visit_time(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """更新用戶進入線上交易頁面的時間"""
    try:
        # 找到用戶
        user = db.query(User).filter(User.email == current_user).first()
        if not user:
            raise HTTPException(status_code=404, detail="用戶不存在")
        
        # 更新訪問時間
        user.last_online_deals_visit = datetime.utcnow()
        db.commit()
        
        return {"success": True, "message": "頁面訪問時間已更新"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新失敗: {str(e)}")

@router.get("/notifications")
def get_online_deal_notifications(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """檢查是否有需要顯示的線上交易通知"""
    
    def format_buyer_comment(comment: str, max_length: int = 20) -> str:
        """格式化買家評論，過長則截斷並加上省略號"""
        if not comment:
            return ""
        if len(comment) <= max_length:
            return comment
        return comment[:max_length] + "..."
    
    def create_received_request_message(buyer_email: str, product_name: str, buyer_comment: str) -> str:
        """創建收到購買請求的通知訊息"""
        buyer_name = buyer_email.split('@')[0] if buyer_email else '買家'
        base_message = f"{buyer_name} 想要購買您的 {product_name}"
        
        if buyer_comment:
            formatted_comment = format_buyer_comment(buyer_comment)
            return f"{base_message}：「{formatted_comment}」"
        return base_message
    
    try:
        # 找到用戶
        user = db.query(User).filter(User.email == current_user).first()
        if not user:
            raise HTTPException(status_code=404, detail="用戶不存在")
        
        service = OnlineDealService(db)
        
        # 取得用戶相關的交易
        received_deals = service.get_user_deals_as_seller(current_user)
        sent_deals = service.get_user_deals_as_buyer(current_user)
        
        notifications = []
        last_visit = user.last_online_deals_visit
        
        # 如果沒有訪問記錄，顯示所有待處理的通知
        if not last_visit:
            # 檢查收到的交易請求
            for deal in received_deals:
                if deal.get('deal_status') == 0:  # 0 = 待處理
                    notifications.append({
                        'type': 'received_request',
                        'dealId': deal.get('id'),
                        'productId': deal.get('product_id'),
                        'productName': deal.get('product_name'),
                        'productImageUrl': deal.get('product_image_url'),
                        'otherPartyEmail': deal.get('buyer_email'),
                        'otherPartyAvatarUrl': deal.get('buyer_avatar_url'),
                        'buyerComment': deal.get('buyer_comment', ''),
                        'createdAt': deal.get('created_time'),
                        'message': create_received_request_message(
                            deal.get('buyer_email', ''),
                            deal.get('product_name', ''),
                            deal.get('buyer_comment', '')
                        )
                    })
            
            # 檢查已回應的交易請求
            for deal in sent_deals:
                if deal.get('deal_status') in [1, 3]:  # 1 = 已同意, 3 = 已拒絕
                    status_type = 'request_approved' if deal.get('deal_status') == 1 else 'request_rejected'
                    notifications.append({
                        'type': status_type,
                        'dealId': deal.get('id'),
                        'productId': deal.get('product_id'),
                        'productName': deal.get('product_name'),
                        'productImageUrl': deal.get('product_image_url'),
                        'otherPartyEmail': deal.get('seller_email'),
                        'otherPartyAvatarUrl': deal.get('seller_avatar_url'),
                        'updatedAt': deal.get('updated_at'),
                        'message': f"您對 {deal.get('product_name')} 的購買請求已被{'同意' if deal.get('deal_status') == 1 else '拒絕'}"
                    })
        else:
            # 只顯示最後一次訪問後的新通知
            for deal in received_deals:
                if deal.get('deal_status') == 0:  # 0 = 待處理
                    deal_created_str = deal.get('created_time')
                    if deal_created_str:
                        try:
                            # 處理不同的時間格式
                            if isinstance(deal_created_str, str):
                                if deal_created_str.endswith('Z'):
                                    deal_created = datetime.fromisoformat(deal_created_str.replace('Z', '+00:00'))
                                else:
                                    deal_created = datetime.fromisoformat(deal_created_str)
                            else:
                                deal_created = deal_created_str
                            
                            if deal_created > last_visit:
                                notifications.append({
                                    'type': 'received_request',
                                    'dealId': deal.get('id'),
                                    'productId': deal.get('product_id'),
                                    'productName': deal.get('product_name'),
                                    'productImageUrl': deal.get('product_image_url'),
                                    'otherPartyEmail': deal.get('buyer_email'),
                                    'otherPartyAvatarUrl': deal.get('buyer_avatar_url'),
                                    'buyerComment': deal.get('buyer_comment', ''),
                                    'createdAt': deal.get('created_time'),
                                    'message': create_received_request_message(
                                        deal.get('buyer_email', ''),
                                        deal.get('product_name', ''),
                                        deal.get('buyer_comment', '')
                                    )
                                })
                        except Exception as e:
                            print(f"時間解析錯誤: {e}")
                            continue
            
            for deal in sent_deals:
                if deal.get('deal_status') in [1, 3]:  # 1 = 已同意, 3 = 已拒絕
                    deal_updated_str = deal.get('modify_time')  # 修正字段名
                    if deal_updated_str:
                        try:
                            if isinstance(deal_updated_str, str):
                                if deal_updated_str.endswith('Z'):
                                    deal_updated = datetime.fromisoformat(deal_updated_str.replace('Z', '+00:00'))
                                else:
                                    deal_updated = datetime.fromisoformat(deal_updated_str)
                            else:
                                deal_updated = deal_updated_str
                            
                            # 確保時區一致性比較
                            if deal_updated.tzinfo and last_visit.tzinfo is None:
                                deal_updated = deal_updated.replace(tzinfo=None)
                            elif deal_updated.tzinfo is None and last_visit.tzinfo:
                                last_visit = last_visit.replace(tzinfo=None)
                            
                            if deal_updated > last_visit:
                                status_type = 'request_approved' if deal.get('deal_status') == 1 else 'request_rejected'
                                notifications.append({
                                    'type': status_type,
                                    'dealId': deal.get('id'),
                                    'productId': deal.get('product_id'),
                                    'productName': deal.get('product_name'),
                                    'productImageUrl': deal.get('product_image_url'),
                                    'otherPartyEmail': deal.get('seller_email'),
                                    'otherPartyAvatarUrl': deal.get('seller_avatar_url'),
                                    'updatedAt': deal.get('modify_time'),
                                    'message': f"您對 {deal.get('product_name')} 的購買請求已被{'同意' if deal.get('deal_status') == 1 else '拒絕'}"
                                })
                        except Exception as e:
                            print(f"時間解析錯誤: {e}")
                            continue
        
        return {
            "success": True,
            "notifications": notifications,
            "lastVisit": last_visit.isoformat() if last_visit else None,
            "totalCount": len(notifications)
        }
    except Exception as e:
        print(f"檢查通知錯誤: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"檢查通知失敗: {str(e)}")
