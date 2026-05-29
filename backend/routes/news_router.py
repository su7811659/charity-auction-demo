"""
市集新聞路由器
"""

from fastapi import APIRouter, HTTPException
from services.news_service import get_daily_news, clear_news_cache

router = APIRouter()

@router.get("/daily")
async def get_daily_market_news():
    """
    獲取每日市集新聞
    
    Returns:
        dict: 包含新聞資料的響應
    """
    try:
        result = await get_daily_news()
        
        if result["success"]:
            return {
                "success": True,
                "data": result["data"],
                "message": "成功獲取每日市集新聞"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"生成新聞失敗: {result['error']}"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"系統錯誤: {str(e)}"
        )

@router.delete("/cache")
async def clear_cache():
    """
    清除新聞緩存
    
    Returns:
        dict: 清除緩存結果
    """
    try:
        result = await clear_news_cache()
        
        if result["success"]:
            return {
                "success": True,
                "message": f"成功清除 {result['cleared_count']} 條緩存記錄",
                "data": {
                    "cleared_count": result["cleared_count"]
                }
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"清除緩存失敗: {result['error']}"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"系統錯誤: {str(e)}"
        )

@router.get("/test-data")
async def test_data_collection():
    """
    測試資料收集功能 (開發用)
    """
    try:
        from services.news_service import collect_yesterday_data
        import sqlite3
        import os
        
        # 連接資料庫
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database.db')
        conn = sqlite3.connect(db_path)
        
        # 收集資料
        data = collect_yesterday_data(conn)
        conn.close()
        
        return {
            "success": True,
            "data": data,
            "message": "測試資料收集成功"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"測試失敗: {str(e)}"
        )
