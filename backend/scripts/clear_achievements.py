#!/usr/bin/env python3
"""
清除用戶成就腳本

用於清除指定用戶或所有用戶的成就記錄，以便重新計算成就

使用方法：
    python scripts/clear_achievements.py --user-id 1        # 清除特定用戶的成就
    python scripts/clear_achievements.py --all              # 清除所有用戶的成就（危險操作）
    python scripts/clear_achievements.py --dry-run --all    # 預覽模式
"""

import os
import sys
import argparse
from pathlib import Path

# 添加父目錄到 Python 路徑
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

try:
    from database import SessionLocal
    from schemas.user_schema import User
    from models.achievement import UserAchievement
    from achievement_config.achievements import ACHIEVEMENT_CONFIG
    from utils.logger import Logger
except ImportError as e:
    print(f"❌ 導入錯誤: {e}")
    print("請確保在 backend 目錄下執行此腳本")
    sys.exit(1)

logger = Logger.get_logger("achievement_clear")

class AchievementCleaner:
    def __init__(self):
        self.db = SessionLocal()
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.db.close()
    
    def clear_user_achievements(self, user_id, dry_run=True):
        """清除特定用戶的所有成就記錄"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                print(f"❌ 用戶 {user_id} 不存在")
                return False
            
            # 查找該用戶的所有成就記錄
            achievements = self.db.query(UserAchievement).filter(
                UserAchievement.user_id == user_id
            ).all()
            
            print(f"👤 用戶: {user.email} (ID: {user_id})")
            print(f"🎯 找到 {len(achievements)} 個成就記錄")
            
            if achievements:
                print("📋 成就記錄詳情:")
                for achievement in achievements:
                    # 從配置中獲取target值
                    config = ACHIEVEMENT_CONFIG.get(achievement.achievement_id, {})
                    target = config.get('required_count', 1)
                    
                    status = "✅ 已解鎖" if achievement.is_unlocked else "⏳ 未解鎖"
                    notification_status = " 🔔 未通知" if achievement.is_unlocked and not achievement.notification_shown else ""
                    print(f"  - {achievement.achievement_id}: {status} ({achievement.progress}/{target}){notification_status}")
            
            if dry_run:
                print(f"🔍 預覽模式: 將會刪除 {len(achievements)} 個成就記錄")
                return True
            else:
                # 實際刪除
                deleted_count = self.db.query(UserAchievement).filter(
                    UserAchievement.user_id == user_id
                ).delete()
                
                self.db.commit()
                print(f"🗑️  已刪除 {deleted_count} 個成就記錄")
                logger.info(f"清除用戶 {user.email} (ID: {user_id}) 的 {deleted_count} 個成就記錄")
                return True
                
        except Exception as e:
            print(f"❌ 清除用戶 {user_id} 成就時發生錯誤: {e}")
            if not dry_run:
                self.db.rollback()
            return False
    
    def clear_all_achievements(self, dry_run=True):
        """清除所有用戶的成就記錄"""
        try:
            # 統計現有成就記錄
            total_achievements = self.db.query(UserAchievement).count()
            total_users = self.db.query(UserAchievement.user_id).distinct().count()
            
            print(f"📊 統計信息:")
            print(f"  總用戶數（有成就記錄）: {total_users}")
            print(f"  總成就記錄數: {total_achievements}")
            
            if total_achievements == 0:
                print("✅ 沒有成就記錄需要清除")
                return True
            
            # 顯示每個用戶的成就統計
            if dry_run:
                print("\n📋 各用戶成就統計:")
                user_achievement_stats = self.db.query(
                    UserAchievement.user_id,
                    self.db.func.count(UserAchievement.id).label('total'),
                    self.db.func.sum(self.db.case([(UserAchievement.is_unlocked == True, 1)], else_=0)).label('unlocked')
                ).group_by(UserAchievement.user_id).all()
                
                for stat in user_achievement_stats:
                    user = self.db.query(User).filter(User.id == stat.user_id).first()
                    email = user.email if user else f"未知用戶(ID: {stat.user_id})"
                    print(f"  {email}: {stat.unlocked}/{stat.total} 已解鎖")
            
            if dry_run:
                print(f"\n🔍 預覽模式: 將會刪除所有 {total_achievements} 個成就記錄")
                return True
            else:
                # 實際刪除
                deleted_count = self.db.query(UserAchievement).delete()
                self.db.commit()
                
                print(f"🗑️  已刪除所有 {deleted_count} 個成就記錄")
                logger.info(f"清除所有用戶的成就記錄，共 {deleted_count} 個")
                return True
                
        except Exception as e:
            print(f"❌ 清除所有成就時發生錯誤: {e}")
            if not dry_run:
                self.db.rollback()
            return False
    
    def get_achievement_statistics(self):
        """獲取成就統計信息"""
        try:
            total_users = self.db.query(User).count()
            users_with_achievements = self.db.query(UserAchievement.user_id).distinct().count()
            total_achievements = self.db.query(UserAchievement).count()
            unlocked_achievements = self.db.query(UserAchievement).filter(
                UserAchievement.is_unlocked == True
            ).count()
            
            print("📊 當前成就系統統計:")
            print(f"  總用戶數: {total_users}")
            print(f"  有成就記錄的用戶: {users_with_achievements}")
            print(f"  總成就記錄數: {total_achievements}")
            print(f"  已解鎖成就數: {unlocked_achievements}")
            
            if total_achievements > 0:
                unlock_rate = (unlocked_achievements / total_achievements) * 100
                print(f"  解鎖率: {unlock_rate:.1f}%")
            
            return {
                'total_users': total_users,
                'users_with_achievements': users_with_achievements,
                'total_achievements': total_achievements,
                'unlocked_achievements': unlocked_achievements
            }
            
        except Exception as e:
            print(f"❌ 獲取統計信息失敗: {e}")
            return None

def main():
    parser = argparse.ArgumentParser(description='清除用戶成就記錄')
    parser.add_argument('--user-id', type=int, help='清除特定用戶的成就')
    parser.add_argument('--all', action='store_true', help='清除所有用戶的成就（危險操作）')
    parser.add_argument('--dry-run', action='store_true', help='預覽模式，不實際刪除')
    parser.add_argument('--stats', action='store_true', help='只顯示統計信息')
    
    args = parser.parse_args()
    
    if not any([args.user_id, args.all, args.stats]):
        print("❌ 請指定操作：--user-id <ID> 或 --all 或 --stats")
        parser.print_help()
        return
    
    try:
        with AchievementCleaner() as cleaner:
            if args.stats:
                # 只顯示統計信息
                cleaner.get_achievement_statistics()
                return
            
            # 顯示當前統計
            print("=" * 60)
            cleaner.get_achievement_statistics()
            print("=" * 60)
            
            if args.user_id:
                # 清除特定用戶
                if not args.dry_run:
                    confirm = input(f"確定要清除用戶 {args.user_id} 的所有成就嗎？(yes/no): ")
                    if confirm.lower() not in ['yes', 'y']:
                        print("❌ 取消操作")
                        return
                
                success = cleaner.clear_user_achievements(args.user_id, args.dry_run)
                if success and not args.dry_run:
                    print("✅ 用戶成就清除完成")
                    
            elif args.all:
                # 清除所有用戶成就
                if not args.dry_run:
                    print("⚠️  這將清除所有用戶的成就記錄！")
                    confirm = input("確定要繼續嗎？輸入 'DELETE ALL' 確認: ")
                    if confirm != 'DELETE ALL':
                        print("❌ 取消操作")
                        return
                
                success = cleaner.clear_all_achievements(args.dry_run)
                if success and not args.dry_run:
                    print("✅ 所有用戶成就清除完成")
            
            # 顯示清除後的統計
            if not args.dry_run:
                print("\n" + "=" * 60)
                print("清除後的統計:")
                cleaner.get_achievement_statistics()
                
    except Exception as e:
        logger.error(f"腳本執行失敗: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
