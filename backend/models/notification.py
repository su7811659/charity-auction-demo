"""
通知記錄 SQLAlchemy 模型
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from database import Base


class UserNotification(Base):
    """用戶通知記錄表"""
    __tablename__ = 'user_notifications'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # 通知類型和內容
    notification_type = Column(String(50), nullable=False, comment='通知類型：online_deal, achievement, system等')
    notification_subtype = Column(String(50), nullable=False, comment='通知子類型：received_request, request_approved, request_rejected等')
    
    # 相關資源ID（如線上交易ID、商品ID等）
    related_resource_type = Column(String(50), nullable=True, comment='相關資源類型：online_deal, product等')
    related_resource_id = Column(Integer, nullable=True, comment='相關資源ID')
    
    # 通知內容
    title = Column(String(200), nullable=False, comment='通知標題')
    message = Column(Text, nullable=False, comment='通知內容')
    extra_data = Column(Text, nullable=True, comment='額外數據（JSON格式）')
    
    # 狀態追蹤
    is_read = Column(Boolean, default=False, nullable=False, comment='是否已讀')
    read_at = Column(DateTime, nullable=True, comment='已讀時間')
    notification_shown = Column(Boolean, default=False, nullable=False, comment='是否已顯示過通知')
    shown_at = Column(DateTime, nullable=True, comment='通知顯示時間')
    
    # 時間戳
    created_at = Column(DateTime, default=func.now(), comment='創建時間')
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment='更新時間')
    
    def __repr__(self):
        return f"<UserNotification(user_id={self.user_id}, type={self.notification_type}:{self.notification_subtype}, read={self.is_read})>"
