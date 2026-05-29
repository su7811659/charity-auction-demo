# repositories/ai_usage_repository.py

from sqlalchemy.orm import Session
from sqlalchemy import and_
from models.ai_usage import AIUsage
from datetime import date, datetime, timezone, timedelta
from typing import Optional


class AIUsageRepository:
    def __init__(self, db: Session):
        self.db = db

    def _get_taiwan_today(self) -> date:
        """獲取台灣時間的今日日期"""
        taiwan_tz = timezone(timedelta(hours=8))  # UTC+8
        taiwan_now = datetime.now(taiwan_tz)
        return taiwan_now.date()

    def get_daily_usage(self, user_id: int, usage_date: date = None) -> Optional[AIUsage]:
        if usage_date is None:
            usage_date = self._get_taiwan_today()
        
        return self.db.query(AIUsage).filter(
            and_(
                AIUsage.user_id == user_id,
                AIUsage.usage_date == usage_date
            )
        ).first()

    def increment_usage(self, user_id: int, usage_date: date = None) -> AIUsage:
        if usage_date is None:
            usage_date = self._get_taiwan_today()
        
        daily_usage = self.get_daily_usage(user_id, usage_date)
        
        if daily_usage:
            daily_usage.rewrite_count += 1
        else:
            daily_usage = AIUsage(
                user_id=user_id,
                usage_date=usage_date,
                rewrite_count=1
            )
            self.db.add(daily_usage)
        
        self.db.commit()
        self.db.refresh(daily_usage)
        return daily_usage

    def can_use_ai(self, user_id: int, daily_limit: int = 5) -> bool:
        daily_usage = self.get_daily_usage(user_id)
        
        if not daily_usage:
            return True
        
        return daily_usage.rewrite_count < daily_limit

    def get_remaining_usage(self, user_id: int, daily_limit: int = 5) -> int:
        daily_usage = self.get_daily_usage(user_id)
        
        if not daily_usage:
            return daily_limit
        
        remaining = daily_limit - daily_usage.rewrite_count
        return max(0, remaining)
