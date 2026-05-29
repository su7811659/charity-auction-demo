from sqlalchemy import Column, Integer, DateTime, ForeignKey, Date
from datetime import datetime, date

# Import the shared base from database.py
from database import Base

class AIUsage(Base):
    __tablename__ = "ai_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    usage_date = Column(Date, default=date.today, nullable=False)
    rewrite_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<AIUsage(user_id={self.user_id}, date={self.usage_date}, count={self.rewrite_count})>"
