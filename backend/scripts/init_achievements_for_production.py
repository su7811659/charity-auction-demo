#!/usr/bin/env python3
"""
生產環境成就系統初始化腳本

用於將成就系統部署到已經運作的生產環境中，為所有現有用戶計算並解鎖應得的成就。

使用方法：
    python scripts/init_achievements_for_production.py --dry-run    # 預覽模式，不實際更新
    python scripts/init_achievements_for_production.py --execute   # 執行實際更新
    python scripts/init_achievements_for_production.py --user-id 1 # 只處理特定用戶
"""

import os
import sys
import argparse
from datetime import datetime
from pathlib import Path

# 添加父目錄到 Python 路徑
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

try:
    from database import SessionLocal, engine
    from schemas.user_schema import User
    from services.achievement_service_simple import AchievementService
    from utils.logger import Logger
    from sqlalchemy import text
except ImportError as e:
    print(f"❌ 導入錯誤: {e}")
    print("請確保在 backend 目錄下執行此腳本")
    sys.exit(1)

logger = Logger.get_logger("achievement_init")

class ProductionAchievementInitializer:
    def __init__(self):
        self.achievement_service = AchievementService()
        self.db = SessionLocal()
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.db.close()
    
    def get_all_users(self):
        """獲取所有用戶"""
        try:
            users = self.db.query(User).all()
            logger.info(f"找到 {len(users)} 個用戶")
            return users
        except Exception as e:
            logger.error(f"獲取用戶列表失敗: {e}")
            return []
    
    def get_user_statistics(self, user_id):
        """獲取用戶的統計信息，用於預覽"""
        try:
            # 商品上傳數
            upload_count_result = self.db.execute(
                text("SELECT COUNT(*) FROM products WHERE owner_id = :user_id"),
                {"user_id": user_id}
            ).fetchone()
            upload_count = upload_count_result[0] if upload_count_result else 0
            
            # 購買請求數
            purchase_request_result = self.db.execute(
                text("SELECT COUNT(*) FROM purchase_requests WHERE buyer_id = :user_id"),
                {"user_id": user_id}
            ).fetchone()
            purchase_request_count = purchase_request_result[0] if purchase_request_result else 0
            
            # 成功購買數
            purchase_count_result = self.db.execute(
                text("SELECT COUNT(*) FROM purchases WHERE buyer_id = :user_id"),
                {"user_id": user_id}
            ).fetchone()
            purchase_count = purchase_count_result[0] if purchase_count_result else 0
            
            # 評論數
            comment_count_result = self.db.execute(
                text("SELECT COUNT(*) FROM comments WHERE user_id = :user_id"),
                {"user_id": user_id}
            ).fetchone()
            comment_count = comment_count_result[0] if comment_count_result else 0
            
            # 收藏數
            like_count_result = self.db.execute(
                text("SELECT COUNT(*) FROM likes WHERE user_id = :user_id"),
                {"user_id": user_id}
            ).fetchone()
            like_count = like_count_result[0] if like_count_result else 0
            
            # 成功售出數
            sold_count_result = self.db.execute(
                text("""
                    SELECT COUNT(*) FROM purchases p 
                    JOIN products pr ON p.product_id = pr.id 
                    WHERE pr.owner_id = :user_id
                """),
                {"user_id": user_id}
            ).fetchone()
            sold_count = sold_count_result[0] if sold_count_result else 0
            
            # AI使用次數
            ai_usage_result = self.db.execute(
                text("SELECT COUNT(*) FROM ai_usage WHERE user_id = :user_id"),
                {"user_id": user_id}
            ).fetchone()
            ai_usage_count = ai_usage_result[0] if ai_usage_result else 0
            
            # 檢查是否有頭像變更記錄 (這個比較複雜，可能需要檢查用戶是否有自定義頭像)
            user = self.db.query(User).filter(User.id == user_id).first()
            has_avatar = user and user.avatar_url is not None and user.avatar_url != ""
            
            return {
                'upload_count': upload_count,
                'purchase_request_count': purchase_request_count,
                'purchase_count': purchase_count,
                'comment_count': comment_count,
                'like_count': like_count,
                'sold_count': sold_count,
                'ai_usage_count': ai_usage_count,
                'has_avatar': has_avatar,
                'email': user.email if user else 'unknown'
            }
        except Exception as e:
            logger.error(f"獲取用戶 {user_id} 統計信息失敗: {e}")
            return None
    
    def preview_user_achievements(self, user_id):
        """預覽用戶應該解鎖的成就"""
        stats = self.get_user_statistics(user_id)
        if not stats:
            return None, None
        
        # 預測可能解鎖的成就
        potential_achievements = []
        
        if stats['upload_count'] >= 1:
            potential_achievements.append('first_upload')
        
        if stats['purchase_request_count'] >= 1:
            potential_achievements.append('first_purchase_request')
        
        if stats['has_avatar']:
            potential_achievements.append('profile_change')
        
        if stats['purchase_count'] >= 1:
            potential_achievements.append('first_purchase')
        
        if stats['comment_count'] >= 5:
            potential_achievements.append('five_comments')
        
        if stats['sold_count'] >= 3:
            potential_achievements.append('seller_master')
        
        if stats['like_count'] >= 5:
            potential_achievements.append('five_likes')
        
        if stats['ai_usage_count'] >= 40:
            potential_achievements.append('ai_annoying')
        
        # good_karma 和 feedback_master 需要更複雜的邏輯，暫時跳過預測
        
        return stats, potential_achievements
    
    def initialize_user_achievements(self, user_id, dry_run=True):
        """為單個用戶初始化成就"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.warning(f"用戶 {user_id} 不存在")
                return None
            
            logger.info(f"處理用戶: {user.email} (ID: {user_id})")
            
            if dry_run:
                # 預覽模式
                stats, potential_achievements = self.preview_user_achievements(user_id)
                logger.info(f"  📊 統計信息: {stats}")
                logger.info(f"  🎯 預計解鎖成就: {potential_achievements}")
                return {
                    'user_id': user_id,
                    'email': user.email,
                    'stats': stats,
                    'potential_achievements': potential_achievements,
                    'executed': False
                }
            else:
                # 實際執行
                logger.info(f"  🔄 正在檢查成就...")
                newly_unlocked = self.achievement_service.update_user_progress(self.db, user_id)
                
                unlocked_achievements = []
                if newly_unlocked:
                    for update in newly_unlocked:
                        achievement_id = update.get('achievement_id', 'unknown')
                        is_unlocked = update.get('is_unlocked', False)
                        newly_unlocked_flag = update.get('newly_unlocked', False)
                        progress = update.get('progress', 0)
                        
                        if is_unlocked:
                            status = '🎉 新解鎖' if newly_unlocked_flag else '✅ 已解鎖'
                            logger.info(f"    - {achievement_id}: {status} (進度: {progress})")
                            unlocked_achievements.append({
                                'id': achievement_id,
                                'newly_unlocked': newly_unlocked_flag,
                                'progress': progress
                            })
                
                # 提交更改
                self.db.commit()
                logger.info(f"  ✅ 用戶 {user.email} 成就初始化完成，解鎖 {len(unlocked_achievements)} 個成就")
                
                return {
                    'user_id': user_id,
                    'email': user.email,
                    'unlocked_achievements': unlocked_achievements,
                    'executed': True
                }
                
        except Exception as e:
            logger.error(f"處理用戶 {user_id} 時發生錯誤: {e}")
            if not dry_run:
                self.db.rollback()
            return None
    
    def initialize_all_users(self, dry_run=True, specific_user_id=None):
        """為所有用戶或特定用戶初始化成就"""
        start_time = datetime.now()
        
        if specific_user_id:
            users = [self.db.query(User).filter(User.id == specific_user_id).first()]
            users = [u for u in users if u is not None]  # 過濾掉不存在的用戶
        else:
            users = self.get_all_users()
        
        if not users:
            logger.warning("沒有找到用戶")
            return
        
        logger.info(f"{'🔍 預覽模式' if dry_run else '⚡ 執行模式'}: 開始處理 {len(users)} 個用戶")
        logger.info("=" * 50)
        
        results = []
        success_count = 0
        
        for i, user in enumerate(users, 1):
            logger.info(f"[{i}/{len(users)}] 處理用戶: {user.email}")
            
            result = self.initialize_user_achievements(user.id, dry_run)
            if result:
                results.append(result)
                success_count += 1
            
            logger.info("-" * 30)
        
        # 統計報告
        end_time = datetime.now()
        duration = end_time - start_time
        
        logger.info("=" * 50)
        logger.info(f"🏁 處理完成！")
        logger.info(f"📊 總用戶數: {len(users)}")
        logger.info(f"✅ 成功處理: {success_count}")
        logger.info(f"❌ 失敗數量: {len(users) - success_count}")
        logger.info(f"⏱️  處理時間: {duration.total_seconds():.2f} 秒")
        
        if dry_run:
            logger.info("\n💡 這是預覽模式，沒有實際更新資料庫")
            logger.info("💡 使用 --execute 參數來執行實際更新")
            
            # 統計預計解鎖的成就
            total_potential = sum(len(r.get('potential_achievements', [])) for r in results)
            logger.info(f"📈 預計總共解鎖 {total_potential} 個成就")
        else:
            total_unlocked = sum(len(r.get('unlocked_achievements', [])) for r in results)
            logger.info(f"🎉 實際解鎖 {total_unlocked} 個成就")
        
        return results

def main():
    parser = argparse.ArgumentParser(description='生產環境成就系統初始化')
    parser.add_argument('--dry-run', action='store_true', help='預覽模式，不實際更新資料庫')
    parser.add_argument('--execute', action='store_true', help='執行實際更新')
    parser.add_argument('--user-id', type=int, help='只處理特定用戶ID')
    
    args = parser.parse_args()
    
    if not args.dry_run and not args.execute:
        print("❌ 請指定 --dry-run 或 --execute 模式")
        parser.print_help()
        return
    
    if args.dry_run and args.execute:
        print("❌ 不能同時使用 --dry-run 和 --execute")
        return
    
    # 確認執行模式
    if args.execute:
        print("⚠️  這將在生產環境中更新所有用戶的成就資料！")
        if not args.user_id:
            confirm = input("確定要繼續嗎？(yes/no): ")
            if confirm.lower() not in ['yes', 'y']:
                print("❌ 取消執行")
                return
    
    try:
        with ProductionAchievementInitializer() as initializer:
            initializer.initialize_all_users(
                dry_run=args.dry_run,
                specific_user_id=args.user_id
            )
    except Exception as e:
        logger.error(f"腳本執行失敗: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
