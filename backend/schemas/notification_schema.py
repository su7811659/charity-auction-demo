"""
通知 Schema 定義
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class NotificationCreate(BaseModel):
    """創建通知的請求模型"""
    notification_type: str  # online_deal, achievement, system
    notification_subtype: str  # received_request, request_approved, etc.
    related_resource_type: Optional[str] = None
    related_resource_id: Optional[int] = None
    title: str
    message: str
    extra_data: Optional[Dict[str, Any]] = None


class NotificationResponse(BaseModel):
    """通知響應模型"""
    id: int
    user_id: int
    notification_type: str
    notification_subtype: str
    related_resource_type: Optional[str] = None
    related_resource_id: Optional[int] = None
    title: str
    message: str
    extra_data: Optional[Dict[str, Any]] = None
    is_read: bool
    read_at: Optional[datetime] = None
    notification_shown: bool
    shown_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationMarkReadRequest(BaseModel):
    """標記已讀請求"""
    notification_ids: list[int]


class UnreadNotificationCountResponse(BaseModel):
    """未讀通知數量響應"""
    total_unread: int
    unread_by_type: Dict[str, int]
