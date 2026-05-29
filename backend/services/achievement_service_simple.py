"""
成就系統服務層 - 簡化版本
處理成就的業務邏輯，包括進度追蹤、條件檢查、自動解鎖等
"""

from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

from models.achievement import UserAchievement
from achievement_config.achievements import ACHIEVEMENT_CONFIG
import logging

logger = logging.getLogger(__name__)

class AchievementService:
    def __init__(self):
        """初始化成就服務"""
        pass
    
    def get_achievement_definitions(self) -> List[Dict]:
        """獲取所有成就定義"""
        # 將字典格式轉換為列表格式
        achievements = []
        for achievement_id, config in ACHIEVEMENT_CONFIG.items():
            achievement = {
                'id': achievement_id,
                'name': config['name'],
                'description': config['description'],
                'icon': config.get('icon', '🏆'),  # 預設圖標
                'type': config['type'],
                'target': config.get('required_count', 1),
                'category': config.get('category', 'general')
            }
            achievements.append(achievement)
        return achievements
    
    def get_user_achievements(self, db: Session, user_id: int) -> List[Dict]:
        """獲取用戶的所有成就"""
        try:
            # 獲取用戶已有的成就記錄
            user_achievements = db.query(UserAchievement).filter(
                UserAchievement.user_id == user_id
            ).all()
            
            # 轉換為字典格式
            achievement_dict = {ua.achievement_id: ua for ua in user_achievements}
            
            # 組合完整的成就列表（包含未解鎖的）
            result = []
            for achievement_id, achievement_config in ACHIEVEMENT_CONFIG.items():
                user_achievement = achievement_dict.get(achievement_id)
                
                result.append({
                    'id': achievement_id,
                    'name': achievement_config['name'],
                    'description': achievement_config['description'],
                    'icon': achievement_config.get('icon', '🏆'),
                    'type': achievement_config['type'],
                    'target': achievement_config.get('required_count', 1),
                    'progress': user_achievement.progress if user_achievement else 0,
                    'is_unlocked': user_achievement.is_unlocked if user_achievement else False,
                    'unlocked_at': user_achievement.unlocked_at if user_achievement else None,
                    'notification_shown': user_achievement.notification_shown if user_achievement else False
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting user achievements: {e}")
            return []
    
    def update_user_progress(self, db: Session, user_id: int) -> List[Dict]:
        """更新用戶的成就進度，包含數據一致性檢查"""
        try:
            updated_achievements = []
            
            # 為每個成就檢查進度
            for achievement_id, achievement_config in ACHIEVEMENT_CONFIG.items():
                
                # 獲取或創建成就記錄
                user_achievement = db.query(UserAchievement).filter(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement_id
                ).first()
                
                if not user_achievement:
                    # 創建新記錄
                    user_achievement = UserAchievement(
                        user_id=user_id,
                        achievement_id=achievement_id,
                        progress=0,
                        is_unlocked=False
                    )
                    db.add(user_achievement)
                    db.commit()
                    db.refresh(user_achievement)
                
                # 計算當前實際進度
                current_progress = self._calculate_simple_progress(db, user_id, achievement_config)
                
                # 🔧 數據一致性檢查：如果計算出的進度與記錄的不同，則更新
                if current_progress != user_achievement.progress:
                    logger.info(f"🔄 發現數據不一致 - 成就 {achievement_id}: 記錄={user_achievement.progress}, 實際={current_progress}")
                    user_achievement.progress = current_progress
                    
                    # 檢查是否解鎖
                    target = achievement_config.get('required_count', 1)
                    newly_unlocked = False
                    
                    if current_progress >= target and not user_achievement.is_unlocked:
                        user_achievement.is_unlocked = True
                        user_achievement.unlocked_at = datetime.utcnow()
                        user_achievement.notification_shown = False  # 需要顯示通知
                        newly_unlocked = True
                        logger.info(f"🎉 成就解鎖 - {achievement_id}: {current_progress}/{target}")
                    
                    db.commit()
                    updated_achievements.append({
                        'achievement_id': achievement_id,
                        'progress': current_progress,
                        'is_unlocked': user_achievement.is_unlocked,
                        'newly_unlocked': newly_unlocked,
                        'data_corrected': True  # 標記這是數據修正
                    })
                    
                else:
                    # 即使數據一致，也檢查是否應該解鎖但還沒解鎖
                    target = achievement_config.get('required_count', 1)
                    if current_progress >= target and not user_achievement.is_unlocked:
                        user_achievement.is_unlocked = True
                        user_achievement.unlocked_at = datetime.utcnow()
                        user_achievement.notification_shown = False
                        
                        db.commit()
                        updated_achievements.append({
                            'achievement_id': achievement_id,
                            'progress': current_progress,
                            'is_unlocked': True,
                            'newly_unlocked': True,
                            'data_corrected': False
                        })
                        logger.info(f"🎉 成就解鎖 - {achievement_id}: {current_progress}/{target}")
            
            return updated_achievements
            
        except Exception as e:
            logger.error(f"Error updating user progress: {e}")
            db.rollback()
            return []
    
    def _calculate_simple_progress(self, db: Session, user_id: int, achievement_config: Dict) -> int:
        """計算簡化的成就進度"""
        try:
            achievement_type = achievement_config['type']
            
            # 進度計算邏輯
            if achievement_type == 'upload':
                # 計算上傳數量 - 透過用戶email查詢products表的seller_name
                # 首先獲取用戶email
                user_email_result = db.execute(
                    text("SELECT email FROM users WHERE id = :user_id"),
                    {"user_id": user_id}
                ).scalar()
                
                if not user_email_result:
                    return 0
                
                # 使用email查詢上傳數量
                result = db.execute(
                    text("SELECT COUNT(*) FROM products WHERE seller_name = :email"),
                    {"email": user_email_result}
                ).scalar()
                return result or 0
                
            elif achievement_type == 'comment':
                # 計算留言數量 - 透過用戶email查詢comments表
                # 首先獲取用戶email
                user_email_result = db.execute(
                    text("SELECT email FROM users WHERE id = :user_id"),
                    {"user_id": user_id}
                ).scalar()
                
                if not user_email_result:
                    return 0
                
                # 使用email查詢留言數量
                result = db.execute(
                    text("SELECT COUNT(*) FROM comments WHERE email = :email"),
                    {"email": user_email_result}
                ).scalar()
                return result or 0
                
            elif achievement_type == 'like':
                # 計算收藏數量 - 透過用戶email查詢likes表
                # 首先獲取用戶email
                user_email_result = db.execute(
                    text("SELECT email FROM users WHERE id = :user_id"),
                    {"user_id": user_id}
                ).scalar()
                
                if not user_email_result:
                    return 0
                
                # 使用email查詢收藏數量
                result = db.execute(
                    text("SELECT COUNT(*) FROM likes WHERE email = :email"),
                    {"email": user_email_result}
                ).scalar()
                return result or 0
                
            elif achievement_type == 'sell':
                # 計算售出商品數量 - 檢查用戶上傳的商品中已成交的數量
                # 首先獲取用戶email
                user_email_result = db.execute(
                    text("SELECT email FROM users WHERE id = :user_id"),
                    {"user_id": user_id}
                ).scalar()
                
                if not user_email_result:
                    return 0
                
                # 使用email查詢售出數量 (product_status = 2 表示已成交)
                result = db.execute(
                    text("SELECT COUNT(*) FROM products WHERE seller_name = :email AND product_status = 2"),
                    {"email": user_email_result}
                ).scalar()
                return result or 0
                
            elif achievement_type == 'feedback':
                # 計算回饋數量 - 直接調用回饋系統獲取用戶提交的回饋數量
                # 首先獲取用戶email
                user_email_result = db.execute(
                    text("SELECT email FROM users WHERE id = :user_id"),
                    {"user_id": user_id}
                ).scalar()
                
                if not user_email_result:
                    return 0
                
                try:
                    # 直接調用回饋系統的功能來獲取用戶回饋數量
                    feedback_count = self._get_user_feedback_count(user_email_result)
                    return feedback_count
                    
                except Exception as e:
                    logger.warning(f"計算回饋數量失敗: {e}")
                    return 0
                
            elif achievement_type == 'robot_tickle':
                # 計算機器人搔癢次數
                result = db.execute(
                    text("SELECT robot_tickle_count FROM users WHERE id = :user_id"),
                    {"user_id": user_id}
                ).scalar()
                return result or 0
                
            elif achievement_type == 'profile_update':
                # 檢查是否更新過頭像
                result = db.execute(
                    text("SELECT avatar_url FROM users WHERE id = :user_id AND avatar_url IS NOT NULL"),
                    {"user_id": user_id}
                ).scalar()
                return 1 if result else 0
                
            elif achievement_type == 'purchase_request':
                # 計算購買請求數量 - 透過用戶email查詢online_deals表的buyer_email
                # 首先獲取用戶email
                user_email_result = db.execute(
                    text("SELECT email FROM users WHERE id = :user_id"),
                    {"user_id": user_id}
                ).scalar()
                
                if not user_email_result:
                    return 0
                
                # 計算發送的購買請求數量
                result = db.execute(
                    text("SELECT COUNT(*) FROM online_deals WHERE buyer_email = :email"),
                    {"email": user_email_result}
                ).scalar()
                return result or 0
                
            elif achievement_type == 'purchase':
                # 計算購買數量 - 透過用戶email查詢products表的buyer_name
                # 首先獲取用戶email
                user_email_result = db.execute(
                    text("SELECT email FROM users WHERE id = :user_id"),
                    {"user_id": user_id}
                ).scalar()
                
                if not user_email_result:
                    return 0
                
                # 使用email查詢購買數量
                result = db.execute(
                    text("SELECT COUNT(*) FROM products WHERE buyer_name = :email"),
                    {"email": user_email_result}
                ).scalar()
                return result or 0
                
            elif achievement_type == 'good_karma':
                # 計算善意循環相關進度
                # 條件1: 作為賣家上傳 3 件捐贈比例達 60% 以上的商品
                # 條件2: 作為買家購買 1 樣捐贈比例達 60% 以上的商品
                # 只要滿足其中一個條件就算達成
                
                # 首先獲取用戶email
                user_email_result = db.execute(
                    text("SELECT email FROM users WHERE id = :user_id"),
                    {"user_id": user_id}
                ).scalar()
                
                if not user_email_result:
                    return 0
                
                # 條件1: 檢查作為賣家上傳的捐贈比例 >= 60% 的商品數量
                seller_count = db.execute(
                    text("""SELECT COUNT(*) FROM products 
                           WHERE seller_name = :email AND donation_ratio >= 60"""),
                    {"email": user_email_result}
                ).scalar() or 0
                
                if seller_count >= 3:
                    return 1  # 條件1達成
                
                # 條件2: 檢查作為買家購買的捐贈比例 >= 60% 的商品數量
                buyer_count = db.execute(
                    text("""SELECT COUNT(*) FROM products 
                           WHERE buyer_name = :email AND donation_ratio >= 60 AND product_status = 2"""),
                    {"email": user_email_result}
                ).scalar() or 0
                
                if buyer_count >= 1:
                    return 1  # 條件2達成
                
                return 0  # 兩個條件都未達成
                
            elif achievement_type == 'meta':
                # 白金獎盃：計算已解鎖的其他成就數量
                result = db.execute(
                    text("""SELECT COUNT(*) FROM user_achievements 
                       WHERE user_id = :user_id AND is_unlocked = 1 
                       AND achievement_id != 'platinum_trophy'"""),
                    {"user_id": user_id}
                ).scalar()
                # 直接返回已解鎖的成就數量，讓前端能顯示正確的進度條
                return result or 0
                
            else:
                logger.warning(f"未知的成就類型: {achievement_type}")
                return 0
                
        except Exception as e:
            logger.error(f"計算成就進度失敗 - 成就ID: {achievement_config.get('id', 'unknown')}, 錯誤: {str(e)}")
            return 0
    
    def mark_notification_shown(self, db: Session, user_id: int, achievement_id: str) -> bool:
        """標記通知已顯示"""
        import traceback
        
        # 添加詳細日誌
        logger.info(f"🔔 mark_notification_shown 被呼叫: user_id={user_id}, achievement_id={achievement_id}")
        logger.info(f"📍 呼叫堆疊追蹤:")
        for line in traceback.format_stack():
            logger.info(f"  {line.strip()}")
        
        try:
            user_achievement = db.query(UserAchievement).filter(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement_id
            ).first()
            
            if user_achievement:
                logger.info(f"✅ 找到成就記錄，準備標記為已通知: {achievement_id}")
                user_achievement.notification_shown = True
                user_achievement.last_viewed_at = datetime.utcnow()
                db.commit()
                logger.info(f"💾 成就通知狀態已更新: {achievement_id} -> notification_shown=True")
                return True
            else:
                logger.warning(f"❌ 找不到成就記錄: user_id={user_id}, achievement_id={achievement_id}")
            
            return False
            
        except Exception as e:
            logger.error(f"Error marking notification shown: {e}")
            db.rollback()
            return False

    def trigger_achievement(self, db: Session, user_id: int, achievement_id: str) -> Dict:
        """觸發特定成就檢查"""
        try:
            if achievement_id not in ACHIEVEMENT_CONFIG:
                logger.warning(f"Unknown achievement: {achievement_id}")
                return {"success": False, "message": f"Unknown achievement: {achievement_id}"}
            
            # 獲取或創建成就記錄
            user_achievement = db.query(UserAchievement).filter(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement_id
            ).first()
            
            if not user_achievement:
                user_achievement = UserAchievement(
                    user_id=user_id,
                    achievement_id=achievement_id,
                    progress=0,
                    is_unlocked=False
                )
                db.add(user_achievement)
                db.commit()
                db.refresh(user_achievement)
            
            # 如果已經解鎖，直接返回
            if user_achievement.is_unlocked:
                return {"success": True, "message": "Achievement already unlocked", "newly_unlocked": False}
            
            achievement_config = ACHIEVEMENT_CONFIG[achievement_id]
            
            # 根據成就類型進行具體檢查
            if achievement_id == 'profile_change':
                # 頭像更換成就 - 只要觸發一次就解鎖
                user_achievement.progress = 1
                user_achievement.is_unlocked = True
                user_achievement.unlocked_at = datetime.utcnow()
                user_achievement.notification_shown = False
                
                db.commit()
                logger.info(f"Achievement '{achievement_id}' unlocked for user {user_id}")
                
                return {
                    "success": True,
                    "message": f"Achievement '{achievement_config['name']}' unlocked!",
                    "newly_unlocked": True,
                    "achievement": {
                        "id": achievement_id,
                        "name": achievement_config['name'],
                        "description": achievement_config['description']
                    }
                }
            
            elif achievement_id == 'first_purchase_request':
                # 首次購買請求成就 - 只要觸發一次就解鎖
                user_achievement.progress = 1
                user_achievement.is_unlocked = True
                user_achievement.unlocked_at = datetime.utcnow()
                user_achievement.notification_shown = False
                
                db.commit()
                logger.info(f"Achievement '{achievement_id}' unlocked for user {user_id}")
                
                return {
                    "success": True,
                    "message": f"Achievement '{achievement_config['name']}' unlocked!",
                    "newly_unlocked": True,
                    "achievement": {
                        "id": achievement_id,
                        "name": achievement_config['name'],
                        "description": achievement_config['description']
                    }
                }
            
            elif achievement_id == 'first_upload':
                # 首次商品上傳成就 - 只要觸發一次就解鎖
                user_achievement.progress = 1
                user_achievement.is_unlocked = True
                user_achievement.unlocked_at = datetime.utcnow()
                user_achievement.notification_shown = False
                
                db.commit()
                logger.info(f"Achievement '{achievement_id}' unlocked for user {user_id}")
                
                return {
                    "success": True,
                    "message": f"Achievement '{achievement_config['name']}' unlocked!",
                    "newly_unlocked": True,
                    "achievement": {
                        "id": achievement_id,
                        "name": achievement_config['name'],
                        "description": achievement_config['description']
                    }
                }
            
            # 其他成就類型的檢查邏輯可以在這裡添加
            
            return {"success": True, "message": "Achievement check completed", "newly_unlocked": False}
            
        except Exception as e:
            logger.error(f"Error triggering achievement {achievement_id}: {e}")
            db.rollback()
            return {"success": False, "message": f"Error: {e}"}
    
    def _get_user_feedback_count(self, user_email: str) -> int:
        """獲取用戶的回饋數量，直接調用回饋系統的邏輯"""
        try:
            import gspread
            from google.oauth2.service_account import Credentials
            from config import settings
            import os
            
            user_feedbacks_count = 0
            
            # 首先嘗試從 Google Sheets 讀取
            try:
                # 設定 Google Sheets API 權限範圍
                scope = [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/drive'
                ]
                
                # 載入憑證
                credentials_path = os.path.join(os.path.dirname(__file__), '..', 'google_credentials.json')
                
                if os.path.exists(credentials_path):
                    # 使用 Service Account 憑證
                    credentials = Credentials.from_service_account_file(
                        credentials_path,
                        scopes=scope
                    )
                    
                    # 建立 gspread 客戶端
                    client = gspread.authorize(credentials)
                    spreadsheet = client.open_by_key(settings.GOOGLE_SPREADSHEET_ID)
                    worksheet = spreadsheet.sheet1
                    
                    # 獲取所有資料
                    all_values = worksheet.get_all_values()
                    
                    if all_values and len(all_values) > 1:  # 確保有資料且不只有標題列
                        # 遍歷每一行資料（跳過標題列）
                        for row in all_values[1:]:
                            if len(row) >= 2:  # 至少要有時間和姓名
                                name_in_sheet = row[1]
                                
                                # 匹配條件：完全匹配email 或 匹配email的用戶名部分
                                user_name = user_email.split('@')[0] if '@' in user_email else user_email
                                
                                if (name_in_sheet == user_email or 
                                    name_in_sheet == user_name or
                                    (name_in_sheet != '匿名' and user_email.startswith(name_in_sheet))):
                                    user_feedbacks_count += 1
                    
                    logger.info(f"📊 從 Google Sheets 獲取用戶 {user_email} 的回饋數量: {user_feedbacks_count}")
                    return user_feedbacks_count
                    
            except Exception as sheets_error:
                logger.warning(f"從 Google Sheets 讀取回饋失敗: {sheets_error}")
                
                # 如果 Google Sheets 失敗，嘗試讀取本地檔案
                logs_dir = os.path.join(os.path.dirname(__file__), '..', 'feedback_logs')
                if os.path.exists(logs_dir):
                    log_files = [f for f in os.listdir(logs_dir) if f.endswith('.csv')]
                    
                    for log_file in log_files:
                        file_path = os.path.join(logs_dir, log_file)
                        try:
                            with open(file_path, "r", encoding="utf-8") as f:
                                lines = f.readlines()
                                for line in lines[1:]:  # 跳過標題列
                                    if line.strip():
                                        parts = line.strip().split(',', 4)
                                        if len(parts) >= 2:
                                            name_in_file = parts[1]
                                            user_name = user_email.split('@')[0] if '@' in user_email else user_email
                                            
                                            # 匹配條件：完全匹配email 或 匹配email的用戶名部分
                                            if (name_in_file == user_email or 
                                                name_in_file == user_name or
                                                (name_in_file != '匿名' and user_email.startswith(name_in_file))):
                                                user_feedbacks_count += 1
                        except Exception as e:
                            logger.warning(f"讀取回饋檔案 {log_file} 失敗: {e}")
                
                logger.info(f"📊 從本地檔案獲取用戶 {user_email} 的回饋數量: {user_feedbacks_count}")
                return user_feedbacks_count
            
        except Exception as e:
            logger.error(f"獲取用戶回饋數量失敗: {e}")
            return 0
