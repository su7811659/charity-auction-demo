"""
系統配置服務 - 管理系統全局設定
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models.system_config import SystemConfig


class SystemConfigService:
    """系統配置管理服務類（單例表：僅第一筆）"""

    @staticmethod
    def get_current_config(db: Session) -> SystemConfig | None:
        return db.query(SystemConfig).first()

    @staticmethod
    def get_or_create(db: Session) -> SystemConfig:
        config = db.query(SystemConfig).first()
        if not config:
            config = SystemConfig()
            db.add(config)
            db.commit()
            db.refresh(config)
        return config

    @staticmethod
    def is_upload_allowed(db: Session) -> bool:
        config = SystemConfigService.get_or_create(db)
        # 檢查是否啟用上傳
        if not config.upload_enabled:
            return False
        # 若未設定起迄，視為不限制
        if not config.upload_start_date or not config.upload_end_date:
            return True
        now = datetime.now(timezone.utc)
        start_dt = SystemConfigService._ensure_tz(config.upload_start_date)
        end_dt = SystemConfigService._ensure_tz(config.upload_end_date)
        return start_dt <= now <= end_dt

    @staticmethod
    def is_summary_visible(db: Session) -> bool:
        config = SystemConfigService.get_or_create(db)
        if not config.summary_visible:
            return False
        # 檢查總結顯示時間範圍
        if config.summary_show_start_date and config.summary_show_end_date:
            now = datetime.now(timezone.utc)
            start_dt = SystemConfigService._ensure_tz(config.summary_show_start_date)
            end_dt = SystemConfigService._ensure_tz(config.summary_show_end_date)
            return start_dt <= now <= end_dt
        return True

    @staticmethod
    def update_config(
        db: Session,
        upload_start_date=None,
        upload_end_date=None,
        upload_enabled=None,
        summary_visible=None,
        summary_show_start_date=None,
        summary_show_end_date=None,
        online_deal_enabled=None,
        online_deal_available=None,
        max_concurrent_deals_per_user=None,
        online_deal_begin_date=None,
        online_deal_end_date=None,
    ) -> SystemConfig:
        config = SystemConfigService.get_or_create(db)
        if upload_start_date is not None:
            config.upload_start_date = upload_start_date
        if upload_end_date is not None:
            config.upload_end_date = upload_end_date
        if upload_enabled is not None:
            config.upload_enabled = upload_enabled
        if summary_visible is not None:
            config.summary_visible = summary_visible
        if summary_show_start_date is not None:
            config.summary_show_start_date = summary_show_start_date
        if summary_show_end_date is not None:
            config.summary_show_end_date = summary_show_end_date
        if online_deal_enabled is not None:
            config.online_deal_enabled = online_deal_enabled
        if online_deal_available is not None:
            config.online_deal_available = online_deal_available
        if max_concurrent_deals_per_user is not None:
            config.max_concurrent_deals_per_user = max_concurrent_deals_per_user
        if online_deal_begin_date is not None:
            config.online_deal_begin_date = online_deal_begin_date
        if online_deal_end_date is not None:
            config.online_deal_end_date = online_deal_end_date
        config.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def update_ai_summary(db: Session, content: str) -> SystemConfig:
        config = SystemConfigService.get_or_create(db)
        config.ai_summary_content = content
        config.ai_summary_last_generated = datetime.utcnow()
        config.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def clear_ai_summary(db: Session) -> SystemConfig:
        config = SystemConfigService.get_or_create(db)
        config.ai_summary_content = None
        config.ai_summary_last_generated = None
        config.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def _ensure_tz(dt):
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
