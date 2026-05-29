"""
成就系統 API 路由
提供成就查詢、進度追蹤、統計等功能的 REST API
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime

from database import get_db
from services.achievement_service_simple import AchievementService
from schemas.achievement_schema import (
    UserAchievementResponse, 
    AchievementProgressResponse,
    AchievementNotificationResponse,
    AchievementProgressUpdate
)
from routes.auth_router import get_current_user
from schemas.user_schema import UserProfile, User
from achievement_config.achievements import ACHIEVEMENT_CONFIG
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/achievements", tags=["achievements"])

@router.get("/")
async def get_user_achievements(
    current_user_email: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    獲取當前用戶的所有成就狀態
    """
    try:
        # 通過 email 查找用戶
        user = db.query(User).filter(User.email == current_user_email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )
        
        achievement_service = AchievementService()
        achievements = achievement_service.get_user_achievements(db, user.id)
        
        return achievements
    except Exception as e:
        logger.error(f"獲取用戶成就失敗 - 用戶: {current_user_email}, 錯誤: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"獲取成就失敗: {str(e)}"
        )

@router.get("/progress", response_model=List[AchievementProgressResponse])
async def get_achievement_progress(
    current_user_email: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    獲取當前用戶的成就進度詳情
    """
    try:
        # 通過 email 查找用戶
        user = db.query(User).filter(User.email == current_user_email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )
        
        achievement_service = AchievementService()
        achievements = achievement_service.get_user_achievements(db, user.id)
        
        # 轉換為 AchievementProgressResponse 格式
        progress = []
        for achievement in achievements:
            progress.append(AchievementProgressResponse(
                achievement_id=achievement['id'],
                achievement_name=achievement['name'],
                current_progress=achievement['progress'],
                target_progress=achievement['target'],
                is_unlocked=achievement['is_unlocked'],
                progress_percentage=min(100, (achievement['progress'] / achievement['target']) * 100) if achievement['target'] > 0 else 0
            ))
        
        return progress
    except Exception as e:
        logger.error(f"獲取成就進度失敗 - 用戶: {current_user_email}, 錯誤: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"獲取成就進度失敗: {str(e)}"
        )

@router.post("/check")
async def check_achievements(
    current_user_email: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    手動觸發成就檢查，返回新解鎖的成就
    """
    try:
        logger.info(f"🔍 /check 端點被呼叫 - 用戶: {current_user_email}")
        
        # 通過 email 查找用戶
        user = db.query(User).filter(User.email == current_user_email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )
        
        logger.info(f"🎯 準備更新用戶 {user.id} 的成就進度...")
        achievement_service = AchievementService()
        newly_unlocked = achievement_service.update_user_progress(db, user.id)
        logger.info(f"📊 成就進度更新結果: {newly_unlocked}")
        
        # 如果有新解鎖的成就，回傳詳細資訊
        notifications = []
        newly_unlocked_ids = []
        
        for achievement_data in newly_unlocked:
            if achievement_data.get('newly_unlocked', False):
                achievement_id = achievement_data['achievement_id']
                newly_unlocked_ids.append(achievement_id)
                logger.info(f"🎉 發現新解鎖成就: {achievement_id}")
                
                if achievement_id in ACHIEVEMENT_CONFIG:
                    config = ACHIEVEMENT_CONFIG[achievement_id]
                    notifications.append(AchievementNotificationResponse(
                        achievement_id=achievement_id,
                        achievement_name=config['name'],
                        unlocked_at=datetime.utcnow()
                    ))
        
        logger.info(f"✅ /check 完成 - 新解鎖: {newly_unlocked_ids}")
        return {
            "success": True,
            "newly_unlocked": newly_unlocked_ids,
            "notifications": notifications,
            "message": f"檢查完成，解鎖了 {len(newly_unlocked_ids)} 個新成就" if newly_unlocked_ids else "沒有新的成就解鎖"
        }
    except Exception as e:
        logger.error(f"檢查成就失敗 - 用戶: {current_user_email}, 錯誤: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"檢查成就失敗: {str(e)}"
        )

@router.post("/trigger/{trigger_type}")
async def trigger_achievement_check(
    trigger_type: str,
    current_user_email: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    根據特定類型觸發成就檢查
    """
    try:
        # 通過 email 查找用戶
        user = db.query(User).filter(User.email == current_user_email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )
        
        achievement_service = AchievementService()
        
        # 根據觸發類型決定要檢查的成就
        achievement_id = None
        if trigger_type == 'upload':
            achievement_id = 'first_upload'
        elif trigger_type == 'profile_change':
            achievement_id = 'profile_change'
        elif trigger_type == 'purchase_request':
            achievement_id = 'first_purchase_request'
        
        notifications = []
        newly_unlocked = []
        
        if achievement_id:
            result = achievement_service.trigger_achievement(db, user.id, achievement_id)
            if result.get('newly_unlocked', False):
                newly_unlocked.append(achievement_id)
                if achievement_id in ACHIEVEMENT_CONFIG:
                    config = ACHIEVEMENT_CONFIG[achievement_id]
                    notifications.append({
                        "achievement_id": achievement_id,
                        "achievement_name": config['name'],
                        "achievement_description": config['description']
                    })
        
        return {
            "success": True,
            "trigger_type": trigger_type,
            "newly_unlocked": newly_unlocked,
            "notifications": notifications
        }
    except Exception as e:
        logger.error(f"觸發成就檢查失敗 - 用戶: {current_user_email}, 觸發類型: {trigger_type}, 錯誤: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"觸發成就檢查失敗: {str(e)}"
        )

@router.get("/config")
async def get_achievement_config():
    """
    獲取成就配置資訊（前端用於同步成就定義）
    """
    try:
        return {
            "success": True,
            "achievements": ACHIEVEMENT_CONFIG,
            "total_count": len(ACHIEVEMENT_CONFIG)
        }
    except Exception as e:
        logger.error(f"獲取成就配置失敗: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"獲取成就配置失敗: {str(e)}"
        )

@router.get("/stats")
async def get_achievement_statistics(
    current_user_email: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    獲取成就統計資料（管理員功能或個人統計）
    """
    try:
        # 通過 email 查找用戶
        user = db.query(User).filter(User.email == current_user_email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )
        
        achievement_service = AchievementService()
        user_achievements = achievement_service.get_user_achievements(db, user.id)
        
        # 計算統計資料
        total_achievements = len(ACHIEVEMENT_CONFIG)
        unlocked_achievements = sum(1 for achievement in user_achievements if achievement['is_unlocked'])
        completion_rate = (unlocked_achievements / total_achievements) * 100 if total_achievements > 0 else 0
        
        stats = {
            "total_achievements": total_achievements,
            "unlocked_achievements": unlocked_achievements,
            "completion_rate": round(completion_rate, 2),
            "user_id": user.id,
            "user_email": user.email
        }
        
        return {
            "success": True,
            "statistics": stats
        }
    except Exception as e:
        logger.error(f"獲取成就統計失敗 - 用戶: {current_user_email}, 錯誤: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"獲取成就統計失敗: {str(e)}"
        )

@router.post("/{achievement_id}/mark-shown")
async def mark_achievement_notification_shown(
    achievement_id: str,
    current_user_email: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    標記成就通知已顯示
    """
    try:
        # 通過 email 查找用戶
        user = db.query(User).filter(User.email == current_user_email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )
        
        achievement_service = AchievementService()
        success = achievement_service.mark_notification_shown(db, user.id, achievement_id)
        
        return {
            "success": success,
            "message": "通知狀態已更新" if success else "更新失敗"
        }
    except Exception as e:
        logger.error(f"標記成就通知失敗 - 用戶: {current_user_email}, 成就ID: {achievement_id}, 錯誤: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"標記通知失敗: {str(e)}"
        )

@router.post("/unlock/{achievement_id}")
async def unlock_achievement_manually(
    achievement_id: str,
    current_user_email: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    手動解鎖成就（管理員功能或測試用）
    """
    try:
        # 通過 email 查找用戶
        user = db.query(User).filter(User.email == current_user_email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )
        
        achievement_service = AchievementService()
        result = achievement_service.trigger_achievement(db, user.id, achievement_id)
        
        if result.get("success", False):
            return {
                "success": True,
                "message": result.get("message", f"成就 {achievement_id} 處理完成"),
                "achievement_id": achievement_id,
                "newly_unlocked": result.get("newly_unlocked", False)
            }
        else:
            return {
                "success": False,
                "message": result.get("message", f"處理成就 {achievement_id} 失敗"),
                "achievement_id": achievement_id
            }
    except Exception as e:
        logger.error(f"手動解鎖成就失敗 - 用戶: {current_user_email}, 成就ID: {achievement_id}, 錯誤: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"手動解鎖成就失敗: {str(e)}"
        )

# 下面是一些輔助的 webhook 路由，用於其他服務觸發成就檢查

@router.post("/webhook/upload")
async def achievement_webhook_upload(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    商品上傳後的成就檢查 webhook
    """
    try:
        achievement_service = AchievementService(db)
        newly_unlocked = achievement_service.trigger_achievement_check(user_id, 'upload')
        return {
            "success": True,
            "user_id": user_id,
            "newly_unlocked": newly_unlocked
        }
    except Exception as e:
        logger.error(f"上傳成就檢查失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/webhook/comment")
async def achievement_webhook_comment(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    留言後的成就檢查 webhook
    """
    try:
        achievement_service = AchievementService(db)
        newly_unlocked = achievement_service.trigger_achievement_check(user_id, 'comment')
        return {
            "success": True,
            "user_id": user_id,
            "newly_unlocked": newly_unlocked
        }
    except Exception as e:
        logger.error(f"留言成就檢查失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/webhook/like")
async def achievement_webhook_like(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    點讚後的成就檢查 webhook
    """
    try:
        achievement_service = AchievementService(db)
        newly_unlocked = achievement_service.trigger_achievement_check(user_id, 'like')
        return {
            "success": True,
            "user_id": user_id,
            "newly_unlocked": newly_unlocked
        }
    except Exception as e:
        logger.error(f"點讚成就檢查失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/webhook/robot-tickle")
async def achievement_webhook_robot_tickle(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    機器人搔癢後的成就檢查 webhook
    """
    try:
        achievement_service = AchievementService(db)
        newly_unlocked = achievement_service.trigger_achievement_check(user_id, 'robot_tickle')
        return {
            "success": True,
            "user_id": user_id,
            "newly_unlocked": newly_unlocked
        }
    except Exception as e:
        logger.error(f"機器人搔癢成就檢查失敗 - 用戶ID: {user_id}, 錯誤: {str(e)}")
        return {"success": False, "error": str(e)}
