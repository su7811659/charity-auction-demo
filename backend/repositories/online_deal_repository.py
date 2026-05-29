"""
線上交易資料庫操作
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from models.online_deal import OnlineDeal
from schemas.product_schema import Product
from schemas.user_schema import User
from schemas.online_deal_schema import OnlineDealCreate, OnlineDealUpdate
from typing import List, Optional
from datetime import datetime


class OnlineDealRepository:
    """線上交易資料庫操作類"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_deal_request(self, buyer_email: str, seller_email: str, deal_data: OnlineDealCreate) -> OnlineDeal:
        """創建線上交易請求，如果存在已取消或已拒絕的記錄則重新啟用"""
        # 先檢查是否有任何狀態的請求記錄（不限於有效狀態）
        existing_deal = self.db.query(OnlineDeal).filter(
            OnlineDeal.product_id == deal_data.product_id,
            OnlineDeal.buyer_email == buyer_email
        ).first()
        
        if existing_deal:
            # 如果已存在記錄，檢查其狀態
            if existing_deal.deal_status in [2, 3]:  # 已取消或已拒絕，可以重新申請
                # 更新現有記錄為新的請求
                existing_deal.buyer_comment = deal_data.buyer_comment
                existing_deal.deal_status = 0  # 重設為 Waiting
                existing_deal.modify_time = func.now()
                self.db.commit()
                self.db.refresh(existing_deal)
                return existing_deal
            else:
                # 狀態為 0(等待) 或 1(已同意)，不應該走到這裡，但以防萬一
                raise ValueError(f"已存在有效的請求記錄，狀態: {existing_deal.deal_status}")
        
        # 沒有現有記錄，創建新的
        db_deal = OnlineDeal(
            product_id=deal_data.product_id,
            buyer_email=buyer_email,
            seller_email=seller_email,
            buyer_comment=deal_data.buyer_comment,
            deal_status=0  # Waiting
        )
        self.db.add(db_deal)
        self.db.commit()
        self.db.refresh(db_deal)
        return db_deal
    
    def get_deal_by_id(self, deal_id: int) -> Optional[OnlineDeal]:
        """根據 ID 取得交易"""
        return self.db.query(OnlineDeal).filter(OnlineDeal.id == deal_id).first()
    
    def get_user_pending_deals_count(self, buyer_email: str) -> int:
        """取得使用者目前待處理的交易數量"""
        return self.db.query(OnlineDeal).filter(
            OnlineDeal.buyer_email == buyer_email,
            OnlineDeal.deal_status.in_([0, 1])  # Waiting 或 Approved
        ).count()
    
    def get_user_deals(self, email: str, as_buyer: bool = True) -> List[OnlineDeal]:
        """取得使用者的交易列表"""
        if as_buyer:
            return self.db.query(OnlineDeal).filter(
                OnlineDeal.buyer_email == email
            ).order_by(OnlineDeal.created_time.desc()).all()
        else:
            return self.db.query(OnlineDeal).filter(
                OnlineDeal.seller_email == email
            ).order_by(OnlineDeal.created_time.desc()).all()
    
    def get_product_deals(self, product_id: int) -> List[OnlineDeal]:
        """取得商品的所有交易請求"""
        return self.db.query(OnlineDeal).filter(
            OnlineDeal.product_id == product_id
        ).order_by(OnlineDeal.created_time.desc()).all()
    
    def get_product_pending_deals(self, product_id: int) -> List[OnlineDeal]:
        """取得商品的待處理交易請求"""
        return self.db.query(OnlineDeal).filter(
            OnlineDeal.product_id == product_id,
            OnlineDeal.deal_status == 0  # Waiting
        ).order_by(OnlineDeal.created_time.desc()).all()
    
    def update_deal_status(self, deal_id: int, new_status: int) -> Optional[OnlineDeal]:
        """更新交易狀態"""
        db_deal = self.get_deal_by_id(deal_id)
        if db_deal:
            db_deal.deal_status = new_status
            db_deal.modify_time = datetime.utcnow()
            self.db.commit()
            self.db.refresh(db_deal)
        return db_deal
    
    def check_existing_request(self, product_id: int, buyer_email: str) -> Optional[OnlineDeal]:
        """檢查是否已存在有效請求（排除已取消和已拒絕的請求）"""
        return self.db.query(OnlineDeal).filter(
            OnlineDeal.product_id == product_id,
            OnlineDeal.buyer_email == buyer_email,
            OnlineDeal.deal_status.in_([0, 1])  # 只檢查等待處理(0)和已同意(1)的請求
        ).first()
    
    def cancel_user_request(self, deal_id: int, buyer_email: str) -> bool:
        """買家取消自己的請求"""
        db_deal = self.db.query(OnlineDeal).filter(
            OnlineDeal.id == deal_id,
            OnlineDeal.buyer_email == buyer_email,
            OnlineDeal.deal_status == 0  # 只能取消 Waiting 狀態的請求
        ).first()
        
        if db_deal:
            db_deal.deal_status = 2  # Cancelled
            db_deal.modify_time = datetime.utcnow()
            self.db.commit()
            return True
        return False
    
    def get_deals_with_products(self, email: str, as_buyer: bool = True) -> List[tuple]:
        """取得包含商品資訊的交易列表"""
        query = self.db.query(OnlineDeal, Product).join(
            Product, OnlineDeal.product_id == Product.id
        )
        
        if as_buyer:
            query = query.filter(OnlineDeal.buyer_email == email)
        else:
            query = query.filter(OnlineDeal.seller_email == email)
        
        return query.order_by(OnlineDeal.created_time.desc()).all()
    
    def get_deals_with_products_and_users(self, email: str, as_buyer: bool = True) -> List[tuple]:
        """取得包含商品資訊和用戶資訊的交易列表"""
        if as_buyer:
            # 作為買家：獲取交易、商品和賣家資訊
            query = self.db.query(OnlineDeal, Product, User).join(
                Product, OnlineDeal.product_id == Product.id
            ).outerjoin(  # 使用LEFT JOIN，避免因為User不存在而過濾掉交易記錄
                User, User.email == OnlineDeal.seller_email
            ).filter(OnlineDeal.buyer_email == email)
        else:
            # 作為賣家：獲取交易、商品和買家資訊
            query = self.db.query(OnlineDeal, Product, User).join(
                Product, OnlineDeal.product_id == Product.id
            ).outerjoin(  # 使用LEFT JOIN，避免因為User不存在而過濾掉交易記錄
                User, User.email == OnlineDeal.buyer_email
            ).filter(OnlineDeal.seller_email == email)
        
        return query.order_by(OnlineDeal.created_time.desc()).all()
    
    def get_user_stats(self, buyer_email: str) -> dict:
        """取得使用者交易統計"""
        deals = self.get_user_deals(buyer_email, as_buyer=True)
        
        stats = {
            'total_requests': len(deals),
            'pending_requests': len([d for d in deals if d.deal_status == 0]),
            'approved_requests': len([d for d in deals if d.deal_status == 1]),
            'rejected_requests': len([d for d in deals if d.deal_status == 3]),
            'cancelled_requests': len([d for d in deals if d.deal_status == 2])
        }
        
        return stats
