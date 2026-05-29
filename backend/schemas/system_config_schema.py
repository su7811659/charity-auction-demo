"""
系統配置 Pydantic Schema
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SystemConfigBase(BaseModel):
    """系統配置基礎模型"""
    upload_start_date: Optional[datetime] = None
    upload_end_date: Optional[datetime] = None
    upload_enabled: bool = True
    summary_visible: bool = False
    summary_show_start_date: Optional[datetime] = None
    summary_show_end_date: Optional[datetime] = None
    ai_summary_content: Optional[str] = None
    ai_summary_last_generated: Optional[datetime] = None
    # 線上交易配置
    online_deal_enabled: bool = False
    online_deal_available: bool = False
    max_concurrent_deals_per_user: int = 2
    online_deal_begin_date: Optional[datetime] = None
    online_deal_end_date: Optional[datetime] = None


class SystemConfigCreate(SystemConfigBase):
    """創建系統配置"""
    pass


class SystemConfigUpdate(BaseModel):
    """更新系統配置"""
    upload_start_date: Optional[datetime] = None
    upload_end_date: Optional[datetime] = None
    upload_enabled: Optional[bool] = None
    summary_visible: Optional[bool] = None
    summary_show_start_date: Optional[datetime] = None
    summary_show_end_date: Optional[datetime] = None
    # 線上交易配置
    online_deal_enabled: Optional[bool] = None
    online_deal_available: Optional[bool] = None
    max_concurrent_deals_per_user: Optional[int] = None
    online_deal_begin_date: Optional[datetime] = None
    online_deal_end_date: Optional[datetime] = None


class SystemConfigResponse(SystemConfigBase):
    """系統配置響應模型"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
