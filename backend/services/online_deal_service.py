"""
線上交易業務邏輯
"""

from sqlalchemy.orm import Session
from repositories.online_deal_repository import OnlineDealRepository
from schemas.online_deal_schema import OnlineDealCreate
from schemas.product_schema import Product
from schemas.user_schema import User
from models.system_config import SystemConfig
from services.achievement_service_simple import AchievementService
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import HTTPException


class OnlineDealService:
    """線上交易服務類"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repo = OnlineDealRepository(db)
    
    def is_online_deal_available(self) -> bool:
        """檢查線上交易功能是否開放"""
        config = self.db.query(SystemConfig).first()
        
        # 檢查系統功能是否啟用
        if not config or not config.online_deal_enabled:
            return False
        
        # 檢查用戶申請是否開放
        if not config.online_deal_available:
            return False
        
        now = datetime.utcnow()
        
        # 檢查開始時間
        if config.online_deal_begin_date and now < config.online_deal_begin_date:
            return False
        
        # 檢查結束時間
        if config.online_deal_end_date and now > config.online_deal_end_date:
            return False
        
        return True
    
    def get_max_concurrent_deals(self) -> int:
        """取得最大同時交易數限制"""
        config = self.db.query(SystemConfig).first()
        return config.max_concurrent_deals_per_user if config else 2
    
    def can_user_make_request(self, buyer_email: str) -> tuple[bool, str]:
        """檢查使用者是否可以發出新請求"""
        # 檢查系統是否開放線上交易
        if not self.is_online_deal_available():
            return False, "線上交易功能未開放或已關閉"
        
        # 檢查名額限制
        current_count = self.repo.get_user_pending_deals_count(buyer_email)
        max_allowed = self.get_max_concurrent_deals()
        
        if current_count >= max_allowed:
            return False, f"已達到最大同時參與交易數限制 ({max_allowed})"
        
        return True, ""
    
    def create_deal_request(self, buyer_email: str, deal_data: OnlineDealCreate) -> Dict[str, Any]:
        """創建線上交易請求"""
        # 檢查使用者是否可以發出請求
        can_request, error_msg = self.can_user_make_request(buyer_email)
        if not can_request:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # 檢查商品是否存在
        product = self.db.query(Product).filter(Product.id == deal_data.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="商品不存在")
        
        # 檢查是否已存在請求
        existing = self.repo.check_existing_request(deal_data.product_id, buyer_email)
        if existing:
            raise HTTPException(status_code=400, detail="您已對此商品發出過請求")
        
        # 不能對自己的商品發出請求
        # 智能處理email格式：如果seller_name沒有@，加上@example.com
        seller_email = product.seller_name if '@' in product.seller_name else f"{product.seller_name}@example.com"
        if seller_email == buyer_email:
            raise HTTPException(status_code=400, detail="不能對自己的商品發出交易請求")
        
        # 創建請求
        deal = self.repo.create_deal_request(
            buyer_email=buyer_email,
            seller_email=seller_email,  # 使用智能處理後的email
            deal_data=deal_data
        )
        
        # 觸發成就檢查：第一次購買請求
        try:
            # 獲取用戶ID
            user = self.db.query(User).filter(User.email == buyer_email).first()
            if user:
                achievement_service = AchievementService()
                result = achievement_service.trigger_achievement(self.db, user.id, 'first_purchase_request')
                if result.get('newly_unlocked'):
                    print(f"🎉 用戶 {buyer_email} 解鎖成就: {result['achievement']['name']}")
        except Exception as e:
            print(f"成就檢查失敗: {e}")
        
        return {
            "id": deal.id,
            "message": "交易請求已發送",
            "product_name": product.product_name,
            "seller_name": product.seller_name
        }
    
    def get_user_deals_as_buyer(self, buyer_email: str) -> List[Dict[str, Any]]:
        """取得使用者作為買家的交易列表"""
        deals_with_products_and_users = self.repo.get_deals_with_products_and_users(buyer_email, as_buyer=True)
        
        result = []
        for deal, product, seller_user in deals_with_products_and_users:
            # 取得買家用戶資料
            from schemas.user_schema import User
            buyer_user = self.db.query(User).filter(User.email == buyer_email).first()
            
            result.append({
                "id": deal.id,
                "product_id": deal.product_id,
                "product_name": product.product_name,
                "product_price": product.price,
                "product_image_url": product.image_url,
                "seller_name": product.seller_name,
                "seller_nickname": product.seller_nickname,
                "seller_email": deal.seller_email,
                "seller_avatar_url": seller_user.avatar_url if seller_user else None,
                "buyer_email": deal.buyer_email,
                "buyer_avatar_url": buyer_user.avatar_url if buyer_user else None,
                "buyer_comment": deal.buyer_comment,
                "deal_status": deal.deal_status,
                "status_text": self._get_status_text(deal.deal_status),
                "created_time": deal.created_time,
                "modify_time": deal.modify_time
            })
        
        return result
    
    def get_user_deals_as_seller(self, seller_email: str) -> List[Dict[str, Any]]:
        """取得使用者作為賣家的交易列表"""
        deals_with_products_and_users = self.repo.get_deals_with_products_and_users(seller_email, as_buyer=False)
        
        result = []
        for deal, product, buyer_user in deals_with_products_and_users:
            result.append({
                "id": deal.id,
                "product_id": deal.product_id,
                "product_name": product.product_name,
                "product_price": product.price,
                "product_image_url": product.image_url,
                "buyer_email": deal.buyer_email,
                "buyer_avatar_url": buyer_user.avatar_url if buyer_user else None,
                "buyer_comment": deal.buyer_comment,
                "deal_status": deal.deal_status,
                "status_text": self._get_status_text(deal.deal_status),
                "created_time": deal.created_time,
                "modify_time": deal.modify_time
            })
        
        return result
    
    def approve_deal(self, deal_id: int, seller_email: str) -> Dict[str, Any]:
        """賣家同意交易"""
        deal = self.repo.get_deal_by_id(deal_id)
        if not deal:
            raise HTTPException(status_code=404, detail="交易請求不存在")
        
        if deal.seller_email != seller_email:
            raise HTTPException(status_code=403, detail="無權限操作此交易")
        
        if deal.deal_status != 0:  # 只能處理 Waiting 狀態的請求
            raise HTTPException(status_code=400, detail="交易請求狀態不正確")
        
        # 更新交易狀態為 Approved
        updated_deal = self.repo.update_deal_status(deal_id, 1)
        
        # 更新商品資料 - 完全按照 deal_product 的流程
        from schemas.product_schema import Product
        from schemas.user_schema import User
        from math import floor
        
        product = self.db.query(Product).filter(Product.id == deal.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="商品不存在")
        
        if product.product_status == 2:
            raise HTTPException(status_code=400, detail="商品已成交，無法重複成交")
        
        # 找到買家資料（如果 User 表沒有 full_name 欄位，則使用 email）
        buyer = self.db.query(User).filter(User.email == deal.buyer_email).first()
        buyer_name = deal.buyer_email  # 直接使用 email 作為 buyer_name
        
        # 計算捐贈金額與賣家收入 (線上交易特殊處理)
        donation_amount = floor(product.price * product.donation_ratio / 100)
        # 線上交易時賣家收入設為0，因為管理員不處理金流
        seller_income = 0
        
        # 更新商品資料 (線上交易特殊處理)
        product.buyer_name = buyer_name
        product.product_status = 2  # 成交
        product.donation_amount = donation_amount
        product.seller_income = seller_income  # 線上交易時設為0
        product.is_online_deal = True  # 標記為線上交易
        
        # 自動拒絕該商品的其他待處理請求
        from models.online_deal import OnlineDeal
        other_pending_deals = self.db.query(OnlineDeal).filter(
            OnlineDeal.product_id == deal.product_id,
            OnlineDeal.id != deal_id,
            OnlineDeal.deal_status == 0  # Waiting
        ).all()
        
        for other_deal in other_pending_deals:
            other_deal.deal_status = 3  # Rejected
            other_deal.modify_time = datetime.utcnow()
        
        self.db.commit()
        
        return {
            "id": deal_id,
            "message": "交易請求已同意",
            "buyer_email": deal.buyer_email,
            "buyer_name": buyer_name,
            "donation_amount": donation_amount,
            "seller_income": seller_income  # 線上交易時為0
        }
    
    def reject_deal(self, deal_id: int, seller_email: str) -> Dict[str, Any]:
        """賣家拒絕交易"""
        deal = self.repo.get_deal_by_id(deal_id)
        if not deal:
            raise HTTPException(status_code=404, detail="交易請求不存在")
        
        if deal.seller_email != seller_email:
            raise HTTPException(status_code=403, detail="無權限操作此交易")
        
        if deal.deal_status != 0:  # 只能處理 Waiting 狀態的請求
            raise HTTPException(status_code=400, detail="交易請求狀態不正確")
        
        # 更新狀態為 Rejected
        updated_deal = self.repo.update_deal_status(deal_id, 3)
        
        return {
            "id": deal_id,
            "message": "交易請求已拒絕",
            "buyer_email": deal.buyer_email
        }
    
    def cancel_deal(self, deal_id: int, buyer_email: str) -> Dict[str, Any]:
        """買家取消交易請求"""
        success = self.repo.cancel_user_request(deal_id, buyer_email)
        if not success:
            raise HTTPException(status_code=400, detail="無法取消此交易請求")
        
        return {
            "id": deal_id,
            "message": "交易請求已取消"
        }
    
    def get_user_stats(self, buyer_email: str) -> Dict[str, Any]:
        """取得使用者交易統計"""
        stats = self.repo.get_user_stats(buyer_email)
        max_deals = self.get_max_concurrent_deals()
        
        stats.update({
            "max_concurrent_deals": max_deals,
            "available_slots": max(0, max_deals - stats["pending_requests"] - stats["approved_requests"]),
            "online_deal_available": self.is_online_deal_available()
        })
        
        return stats
    
    def get_product_requests(self, product_id: int, seller_email: str) -> List[Dict[str, Any]]:
        """取得商品的交易請求列表（賣家查看）"""
        # 先驗證商品所有權
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="商品不存在")
        
        # 智能處理email格式：如果seller_name沒有@，加上@example.com
        product_seller_email = product.seller_name if '@' in product.seller_name else f"{product.seller_name}@example.com"
        if product_seller_email != seller_email:
            raise HTTPException(status_code=403, detail="無權限查看此商品的交易請求")
        
        deals = self.repo.get_product_deals(product_id)
        
        result = []
        for deal in deals:
            result.append({
                "id": deal.id,
                "buyer_email": deal.buyer_email,
                "buyer_comment": deal.buyer_comment,
                "deal_status": deal.deal_status,
                "status_text": self._get_status_text(deal.deal_status),
                "created_time": deal.created_time,
                "modify_time": deal.modify_time
            })
        
        return result
    
    def _get_status_text(self, status: int) -> str:
        """取得狀態文字"""
        status_map = {
            0: "等待處理",
            1: "已同意",
            2: "已取消",
            3: "已拒絕"
        }
        return status_map.get(status, "未知狀態")
