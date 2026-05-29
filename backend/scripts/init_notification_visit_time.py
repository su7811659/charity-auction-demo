#!/usr/bin/env python3
"""
初始化通知訪問時間腳本

用於在部署通知功能到生產環境時，為現有用戶設置 last_online_deals_visit 的初始值
避免一次性顯示過多歷史通知
"""

import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

# 將父目錄加入路徑以便導入模組
sys.path.append(str(Path(__file__).parent.parent))

from database import get_db
from schemas.user_schema import User
from sqlalchemy.orm import Session

def init_notification_visit_time(target_date: datetime = None, user_email: str = None, update_all: bool = False):
    """
    為用戶設置通知訪問時間
    
    Args:
        target_date: 要設置的時間，如果為 None 則使用當前時間
        user_email: 指定用戶郵箱，如果為 None 則處理所有用戶
        update_all: 是否更新所有用戶（包括已有訪問時間的用戶）
    """
    db: Session = next(get_db())
    
    try:
        # 如果沒有指定時間，使用當前時間
        if target_date is None:
            target_date = datetime.now()
        
        # 根據參數決定查詢條件
        if user_email:
            # 指定用戶
            if update_all:
                users_to_update = db.query(User).filter(User.email == user_email).all()
                action_desc = f"指定用戶 {user_email}"
            else:
                users_to_update = db.query(User).filter(
                    User.email == user_email,
                    User.last_online_deals_visit.is_(None)
                ).all()
                action_desc = f"指定用戶 {user_email}（僅未設置訪問時間的）"
        else:
            # 所有用戶
            if update_all:
                users_to_update = db.query(User).all()
                action_desc = "所有用戶"
            else:
                users_to_update = db.query(User).filter(User.last_online_deals_visit.is_(None)).all()
                action_desc = "所有未設置訪問時間的用戶"
        
        print(f"📋 找到 {len(users_to_update)} 個需要更新的用戶 ({action_desc})")
        print(f"🕒 將設置訪問時間為: {target_date.strftime('%Y-%m-%d %H:%M:%S')}")
        
        if len(users_to_update) == 0:
            print("✅ 所有用戶都已設置訪問時間，無需更新")
            return
        
        # 確認是否繼續
        response = input("\n是否繼續執行？(y/N): ").strip().lower()
        if response != 'y':
            print("❌ 取消執行")
            return
        
        # 更新用戶
        updated_count = 0
        for user in users_to_update:
            old_time = user.last_online_deals_visit
            user.last_online_deals_visit = target_date
            updated_count += 1
            if old_time:
                print(f"✅ 更新用戶: {user.email} (原時間: {old_time.strftime('%Y-%m-%d %H:%M:%S')})")
            else:
                print(f"✅ 更新用戶: {user.email} (原時間: 無)")
        
        # 提交變更
        db.commit()
        print(f"\n🎉 成功更新 {updated_count} 個用戶的訪問時間")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 執行失敗: {e}")
        raise
    finally:
        db.close()

def show_current_status(user_email: str = None):
    """顯示當前用戶的訪問時間狀態"""
    db: Session = next(get_db())
    
    try:
        if user_email:
            # 查看指定用戶
            user = db.query(User).filter(User.email == user_email).first()
            if not user:
                print(f"❌ 找不到用戶: {user_email}")
                return
            
            print(f"📊 用戶 {user_email} 的訪問時間狀態:")
            if user.last_online_deals_visit:
                print(f"   最後訪問時間: {user.last_online_deals_visit.strftime('%Y-%m-%d %H:%M:%S')}")
            else:
                print("   最後訪問時間: 未設置")
        else:
            # 統計所有用戶的訪問時間狀態
            total_users = db.query(User).count()
            users_with_visit_time = db.query(User).filter(User.last_online_deals_visit.isnot(None)).count()
            users_without_visit_time = total_users - users_with_visit_time
            
            print("📊 所有用戶訪問時間狀態:")
            print(f"   總用戶數: {total_users}")
            print(f"   已設置訪問時間: {users_with_visit_time}")
            print(f"   未設置訪問時間: {users_without_visit_time}")
            
            if users_without_visit_time > 0:
                print("\n📝 未設置訪問時間的用戶:")
                users_without = db.query(User).filter(User.last_online_deals_visit.is_(None)).all()
                for user in users_without:
                    print(f"   - {user.email}")
            
            if users_with_visit_time > 0:
                print("\n📝 已設置訪問時間的用戶:")
                users_with = db.query(User).filter(User.last_online_deals_visit.isnot(None)).all()
                for user in users_with:
                    print(f"   - {user.email}: {user.last_online_deals_visit.strftime('%Y-%m-%d %H:%M:%S')}")
                
    except Exception as e:
        print(f"❌ 查詢失敗: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 通知訪問時間初始化工具")
    print("=" * 50)
    
    # 顯示當前狀態
    show_current_status()
    
    print("\n操作模式:")
    print("A. 批量操作")
    print("B. 指定用戶操作")
    print("C. 僅查看狀態")
    
    try:
        mode = input("\n請選擇操作模式 (A/B/C): ").strip().upper()
        
        if mode == "A":
            # 批量操作
            print("\n批量操作選項:")
            print("1. 設置為當前時間（僅未設置的用戶）")
            print("2. 設置為 1 天前（僅未設置的用戶）")
            print("3. 設置為 3 天前（僅未設置的用戶）")
            print("4. 設置為 7 天前（僅未設置的用戶）")
            print("5. 設置為 N 小時前（僅未設置的用戶）")
            print("6. 自定義時間（僅未設置的用戶）")
            print("7. 強制更新所有用戶為當前時間")
            print("8. 強制更新所有用戶為 N 小時前")
            
            choice = input("\n請選擇選項 (1-8): ").strip()
            
            if choice == "1":
                init_notification_visit_time(datetime.now())
            elif choice == "2":
                init_notification_visit_time(datetime.now() - timedelta(days=1))
            elif choice == "3":
                init_notification_visit_time(datetime.now() - timedelta(days=3))
            elif choice == "4":
                init_notification_visit_time(datetime.now() - timedelta(days=7))
            elif choice == "5":
                try:
                    hours = int(input("請輸入小時數（例如：12 表示 12 小時前）: ").strip())
                    if hours < 0:
                        print("❌ 小時數不能為負數")
                    else:
                        target_time = datetime.now() - timedelta(hours=hours)
                        print(f"📅 將設置為 {hours} 小時前：{target_time.strftime('%Y-%m-%d %H:%M:%S')}")
                        init_notification_visit_time(target_time)
                except ValueError:
                    print("❌ 請輸入有效的數字")
            elif choice == "6":
                date_str = input("請輸入時間 (格式: YYYY-MM-DD HH:MM:SS): ").strip()
                try:
                    custom_date = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                    init_notification_visit_time(custom_date)
                except ValueError:
                    print("❌ 時間格式錯誤，請使用 YYYY-MM-DD HH:MM:SS 格式")
            elif choice == "7":
                print("⚠️  警告：這將強制更新所有用戶的訪問時間！")
                confirm = input("確定要繼續嗎？(yes/NO): ").strip().lower()
                if confirm == "yes":
                    init_notification_visit_time(datetime.now(), update_all=True)
                else:
                    print("❌ 取消操作")
            elif choice == "8":
                try:
                    hours = int(input("請輸入小時數（例如：12 表示 12 小時前）: ").strip())
                    if hours < 0:
                        print("❌ 小時數不能為負數")
                    else:
                        target_time = datetime.now() - timedelta(hours=hours)
                        print(f"📅 將強制更新所有用戶為 {hours} 小時前：{target_time.strftime('%Y-%m-%d %H:%M:%S')}")
                        print("⚠️  警告：這將強制更新所有用戶的訪問時間！")
                        confirm = input("確定要繼續嗎？(yes/NO): ").strip().lower()
                        if confirm == "yes":
                            init_notification_visit_time(target_time, update_all=True)
                        else:
                            print("❌ 取消操作")
                except ValueError:
                    print("❌ 請輸入有效的數字")
            else:
                print("❌ 無效選項")
                
        elif mode == "B":
            # 指定用戶操作
            user_email = input("\n請輸入用戶郵箱: ").strip()
            if not user_email:
                print("❌ 郵箱不能為空")
            else:
                print(f"\n指定用戶操作 ({user_email}):")
                print("1. 查看該用戶當前狀態")
                print("2. 設置為當前時間")
                print("3. 設置為 N 小時前")
                print("4. 自定義時間")
                print("5. 強制更新（無論是否已設置）")
                
                choice = input("\n請選擇選項 (1-5): ").strip()
                
                if choice == "1":
                    show_current_status(user_email)
                elif choice == "2":
                    init_notification_visit_time(datetime.now(), user_email)
                elif choice == "3":
                    try:
                        hours = int(input("請輸入小時數（例如：12 表示 12 小時前）: ").strip())
                        if hours < 0:
                            print("❌ 小時數不能為負數")
                        else:
                            target_time = datetime.now() - timedelta(hours=hours)
                            print(f"📅 將設置為 {hours} 小時前：{target_time.strftime('%Y-%m-%d %H:%M:%S')}")
                            init_notification_visit_time(target_time, user_email)
                    except ValueError:
                        print("❌ 請輸入有效的數字")
                elif choice == "4":
                    date_str = input("請輸入時間 (格式: YYYY-MM-DD HH:MM:SS): ").strip()
                    try:
                        custom_date = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                        init_notification_visit_time(custom_date, user_email)
                    except ValueError:
                        print("❌ 時間格式錯誤，請使用 YYYY-MM-DD HH:MM:SS 格式")
                elif choice == "5":
                    try:
                        hours = int(input("請輸入小時數（例如：12 表示 12 小時前，0 表示當前時間）: ").strip())
                        if hours < 0:
                            print("❌ 小時數不能為負數")
                        else:
                            target_time = datetime.now() - timedelta(hours=hours)
                            print(f"📅 將強制設置為 {hours} 小時前：{target_time.strftime('%Y-%m-%d %H:%M:%S')}")
                            init_notification_visit_time(target_time, user_email, update_all=True)
                    except ValueError:
                        print("❌ 請輸入有效的數字")
                else:
                    print("❌ 無效選項")
                    
        elif mode == "C":
            print("✅ 僅查看狀態，未做任何更新")
        else:
            print("❌ 無效模式")
            
    except KeyboardInterrupt:
        print("\n❌ 用戶取消操作")
    except Exception as e:
        print(f"❌ 執行錯誤: {e}")
