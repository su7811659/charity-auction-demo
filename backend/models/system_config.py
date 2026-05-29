"""
系統配置 SQLAlchemy 模型
"""

from sqlalchemy import Column, Integer, DateTime, Boolean, Text
from sqlalchemy.sql import func
from database import Base


class SystemConfig(Base):
    """系統配置表"""
    __tablename__ = 'system_config'
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 商品上傳時間控制
    upload_start_date = Column(DateTime, nullable=True, comment='商品上傳開始時間')
    upload_end_date = Column(DateTime, nullable=True, comment='商品上傳結束時間')
    upload_enabled = Column(Boolean, default=True, comment='是否啟用上傳')
    
    # 總結頁面控制
    summary_visible = Column(Boolean, default=False, comment='總結頁面是否可見')
    summary_show_start_date = Column(DateTime, nullable=True, comment='總結頁面顯示開始時間')
    summary_show_end_date = Column(DateTime, nullable=True, comment='總結頁面顯示結束時間')
    
    # AI 總結相關
    ai_summary_content = Column(Text, nullable=True, comment='AI 生成的總結內容')
    ai_summary_last_generated = Column(DateTime, nullable=True, comment='AI 總結最後生成時間')
    
    # 線上交易配置
    online_deal_enabled = Column(Boolean, default=False, comment='線上交易功能開關')
    online_deal_available = Column(Boolean, default=False, comment='用戶申請開放開關')
    max_concurrent_deals_per_user = Column(Integer, default=2, comment='每人最多同時參與交易數')
    online_deal_begin_date = Column(DateTime, nullable=True, comment='線上交易開始時間')
    online_deal_end_date = Column(DateTime, nullable=True, comment='線上交易結束時間')
    
    # 通知系統配置
    notification_system_enabled = Column(Boolean, default=False, comment='通知系統開關')
    notification_cutoff_time = Column(DateTime, nullable=True, comment='通知系統啟用時間，此時間之前的狀態變更不會產生通知')
    
    # 系統基本信息
    system_name = Column(Text, nullable=True, comment='系統名稱')
    system_description = Column(Text, nullable=True, comment='系統描述')
    
    # 時間戳
    created_at = Column(DateTime, default=func.now(), comment='創建時間')
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment='更新時間')
