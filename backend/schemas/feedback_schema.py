"""
回饋信箱 Pydantic Schema
用於 Google Sheets 儲存的回饋資料驗證
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class FeedbackRequest(BaseModel):
    """回饋提交請求模型"""
    name: str = Field(..., description="用戶姓名")
    feedback: str = Field(..., min_length=1, description="回饋內容")
    feedbackType: str = Field(default="其他", description="回饋類型")
    email: str = Field(default="", description="用戶email")
    
    class Config:
        # 允許使用別名
        populate_by_name = True  # ✅ 取代 allow_population_by_field_name
        # JSON 範例
        json_schema_extra = {
            "example": {
                "name": "張小明",
                "feedback": "網站很好用，但希望能增加搜尋功能",
                "feedbackType": "功能建議", 
                "email": "user@example.com"
            }
        }


class FeedbackResponse(BaseModel):
    """回饋記錄響應模型"""
    feedback_id: int = Field(..., description="回饋編號")
    timestamp: str = Field(..., description="提交時間")
    name: str = Field(..., description="用戶姓名")
    feedback_type: str = Field(..., description="回饋類型")
    feedback: str = Field(..., description="回饋內容")
    developer_reply: Optional[str] = Field(default="", description="開發者回覆")
    
    class Config:
        json_schema_extra = {
            "example": {
                "feedback_id": 1,
                "timestamp": "2025-08-12 14:30:00",
                "name": "張小明",
                "feedback_type": "功能建議",
                "feedback": "網站很好用，但希望能增加搜尋功能",
                "developer_reply": "感謝建議！我們會在下個版本加入搜尋功能。"
            }
        }


class FeedbackListResponse(BaseModel):
    """回饋列表響應模型"""
    feedbacks: list[FeedbackResponse]
    total: int
    source: str = Field(description="資料來源：Google Sheets 或 本地儲存")
    message: str
