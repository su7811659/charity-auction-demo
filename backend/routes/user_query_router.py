from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from services.auth_service import get_current_user
from utils.user_query_logger import get_user_ai_query_history
from typing import Optional

router = APIRouter(prefix="/api/user", tags=["user"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/ai-query-history")
def get_ai_query_history(
    limit: Optional[int] = 50,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    獲取當前用戶的AI查詢歷史記錄
    
    Args:
        limit: 限制返回數量，默認50條
        
    Returns:
        用戶的AI查詢歷史列表
    """
    try:
        history = get_user_ai_query_history(current_user, limit)
        
        return {
            "success": True,
            "email": current_user,
            "total_queries": len(history),
            "history": history
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取查詢歷史失敗: {str(e)}")


@router.get("/ai-query-stats")
def get_ai_query_stats(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    獲取當前用戶的AI查詢統計信息
    """
    try:
        history = get_user_ai_query_history(current_user)
        
        # 統計分析
        total_queries = len(history)
        today_queries = 0
        recent_queries = []
        
        if history:
            from datetime import datetime, date
            today = date.today()
            
            for query in history:
                # 解析日期
                try:
                    query_date = datetime.strptime(query['timestamp'], '%Y-%m-%d %H:%M:%S').date()
                    if query_date == today:
                        today_queries += 1
                except:
                    pass
            
            # 取最近5次查詢
            recent_queries = history[:5]
        
        return {
            "success": True,
            "email": current_user,
            "stats": {
                "total_queries": total_queries,
                "today_queries": today_queries,
                "recent_queries": recent_queries
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取查詢統計失敗: {str(e)}")
