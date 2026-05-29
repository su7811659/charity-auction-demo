"""
線上交易 Pydantic Schema
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class OnlineDealBase(BaseModel):
    """線上交易基礎模型"""
    product_id: int
    buyer_email: str
    seller_email: str
    buyer_comment: Optional[str] = None


class OnlineDealCreate(BaseModel):
    """創建線上交易請求"""
    product_id: int
    buyer_comment: Optional[str] = None


class OnlineDealUpdate(BaseModel):
    """更新線上交易狀態"""
    deal_status: int  # 0=Waiting, 1=Approved, 2=Cancelled, 3=Rejected


class OnlineDealResponse(OnlineDealBase):
    """線上交易響應模型"""
    id: int
    deal_status: int
    created_time: datetime
    modify_time: datetime
    
    class Config:
        from_attributes = True


class OnlineDealWithProduct(OnlineDealResponse):
    """包含商品資訊的線上交易模型"""
    product_name: str
    product_price: float
    product_image_url: str
    
    class Config:
        from_attributes = True


# 統計相關模型
class OnlineDealStats(BaseModel):
    """線上交易統計"""
    total_requests: int
    pending_requests: int
    approved_requests: int
    rejected_requests: int
    cancelled_requests: int
