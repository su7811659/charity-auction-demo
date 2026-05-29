#!/usr/bin/env python3
"""
快速成就檢查腳本

用於檢查特定用戶或所有用戶的成就狀態

使用方法：
    python scripts/check_achievements.py                    # 檢查所有用戶
    python scripts/check_achievements.py --user-id 1       # 檢查特定用戶
    python scripts/check_achievements.py --summary         # 只顯示統計摘要
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
    from services.achievement_service_simple import AchievementService
    from utils.logger import Logger
except ImportError as e:
    print(f"❌ 導入錯誤: {e}")
    print("請確保在 backend 目錄下執行此腳本")
    sys.exit(1)

logger = Logger.get_logger("achievement_check")

def check_user_achievements(user_id, db, achievement_service, show_details=True):
    """檢查單個用戶的成就狀態"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"❌ 用戶 {user_id} 不存在")
            return None
        
        achievements = achievement_service.get_user_achievements(db, user_id)
        unlocked_count = sum(1 for a in achievements if a['is_unlocked'])
        total_count = len(achievements)
        not_notified_count = sum(1 for a in achievements if a['is_unlocked'] and not a['notification_shown'])
        
        result = {
            'user_id': user_id,
            'email': user.email,
            'unlocked_count': unlocked_count,
            'total_count': total_count,
            'not_notified_count': not_notified_count,
            'achievements': achievements
        }
        
        if show_details:
            print(f"👤 用戶: {user.email} (ID: {user_id})")
            print(f"🏆 成就狀態: {unlocked_count}/{total_count} 已解鎖")
            
            if not_notified_count > 0:
                print(f"🔔 未通知成就: {not_notified_count} 個")
                print("   未通知的已解鎖成就:")
                for a in achievements:
                    if a['is_unlocked'] and not a['notification_shown']:
                        print(f"     - {a['id']}: {a['name']} (進度: {a['progress']}/{a['target']})")
            
            print("📋 所有成就狀態:")
            for a in achievements:
                status = "✅ 已解鎖" if a['is_unlocked'] else "⏳ 未解鎖"
                notification_status = "" if not a['is_unlocked'] else (" 🔔" if not a['notification_shown'] else " ✓")
                print(f"     {a['id']}: {status} ({a['progress']}/{a['target']}){notification_status}")
            
            print("-" * 60)
        
        return result
        
    except Exception as e:
        print(f"❌ 檢查用戶 {user_id} 時發生錯誤: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description='檢查用戶成就狀態')
    parser.add_argument('--user-id', type=int, help='檢查特定用戶ID')
    parser.add_argument('--summary', action='store_true', help='只顯示統計摘要')
    
    args = parser.parse_args()
    
    db = SessionLocal()
    achievement_service = AchievementService()
    
    try:
        if args.user_id:
            # 檢查特定用戶
            result = check_user_achievements(args.user_id, db, achievement_service, not args.summary)
            if result and args.summary:
                print(f"用戶 {result['email']}: {result['unlocked_count']}/{result['total_count']} 已解鎖，{result['not_notified_count']} 個未通知")
        else:
            # 檢查所有用戶
            users = db.query(User).all()
            print(f"🔍 檢查 {len(users)} 個用戶的成就狀態")
            print("=" * 60)
            
            total_users = len(users)
            total_unlocked = 0
            total_achievements = 0
            total_not_notified = 0
            
            for user in users:
                result = check_user_achievements(user.id, db, achievement_service, not args.summary)
                if result:
                    total_unlocked += result['unlocked_count']
                    total_achievements += result['total_count']
                    total_not_notified += result['not_notified_count']
            
            # 統計摘要
            print("=" * 60)
            print("📊 統計摘要:")
            print(f"👥 總用戶數: {total_users}")
            print(f"🏆 總成就數: {total_achievements}")
            print(f"✅ 已解鎖成就: {total_unlocked}")
            print(f"📈 解鎖率: {(total_unlocked/total_achievements*100):.1f}%" if total_achievements > 0 else "📈 解鎖率: 0%")
            print(f"🔔 未通知成就: {total_not_notified}")
            
    finally:
        db.close()

if __name__ == "__main__":
    main()
