#!/usr/bin/env python3
"""
智能啟動腳本 - 自動處理資料庫同步問題

這個腳本會：
1. 檢查資料庫是否需要 migration
2. 自動備份舊資料庫
3. 執行必要的 migration
4. 啟動 FastAPI 服務器

使用方法：
    python smart_start.py           # 智能啟動
    python smart_start.py --force   # 強制重置資料庫
    python smart_start.py --check   # 只檢查不啟動
"""

import os
import sys
import argparse
from pathlib import Path

# 添加當前目錄到 Python 路徑
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    from scripts.db_manager import DatabaseManager
    from scripts.auto_fix import AutoFixer
    from utils.logger import Logger
    import uvicorn
    from config import settings
except ImportError as e:
    print(f"❌ 導入錯誤: {e}")
    print("請確保在 backend 目錄下執行此腳本")
    sys.exit(1)

logger = Logger.get_logger("smart_start")

class SmartStarter:
    def __init__(self):
        self.db_manager = DatabaseManager()
        self.auto_fixer = AutoFixer()
    
    def check_and_fix_all_issues(self, force_reset=False):
        """檢查並修復所有問題"""
        print("🚀 智能啟動檢查...")
        
        # 首先執行自動修復
        print("🔧 執行環境自動修復...")
        if not self.auto_fixer.run_full_check():
            print("⚠️  部分問題無法自動修復，但會嘗試繼續啟動")
        
        return self.check_and_fix_database(force_reset)
    
    def check_and_fix_database(self, force_reset=False):
        """檢查並修復資料庫問題"""
        print("🚀 智能啟動檢查...")
        
        if force_reset:
            print("🔄 強制重置模式")
            return self.db_manager.reset_database()
        
        # 檢查資料庫狀態
        status_ok = self.db_manager.check_database_status()
        
        if status_ok:
            print("✅ 資料庫狀態正常，可以啟動服務")
            return True
        
        print("⚠️  發現資料庫問題，開始自動修復...")
        
        # 嘗試執行 migration
        print("🔧 嘗試執行 migration...")
        if self.db_manager.run_migrations():
            print("✅ Migration 成功")
            return True
        
        # Migration 失敗，提供選項
        print("❌ Migration 失敗，可能是 schema 衝突")
        print("\n選項:")
        print("1. 重置資料庫 (推薦，會備份舊資料)")
        print("2. 取消啟動，手動處理")
        
        while True:
            choice = input("請選擇 (1/2): ").strip()
            if choice == "1":
                return self.db_manager.reset_database()
            elif choice == "2":
                print("❌ 取消啟動")
                return False
            else:
                print("請輸入 1 或 2")
    
    def start_server(self):
        """啟動 FastAPI 服務器"""
        print("🚀 啟動 FastAPI 服務器...")
        try:
            uvicorn.run(
                "main:app", 
                host=settings.HOST, 
                port=settings.PORT, 
                reload=True
            )
        except Exception as e:
            logger.error(f"服務器啟動失敗: {e}")
            return False
        return True

def main():
    parser = argparse.ArgumentParser(description="智能啟動 FastAPI 服務器")
    parser.add_argument("--force", action="store_true", help="強制重置資料庫")
    parser.add_argument("--check", action="store_true", help="只檢查資料庫狀態，不啟動服務器")
    parser.add_argument("--quick", action="store_true", help="快速啟動，跳過自動修復檢查")
    
    args = parser.parse_args()
    
    starter = SmartStarter()
    
    # 檢查和修復資料庫
    if args.quick:
        success = starter.check_and_fix_database(force_reset=args.force)
    else:
        success = starter.check_and_fix_all_issues(force_reset=args.force)
    
    if not success:
        print("❌ 無法解決資料庫問題，請手動檢查")
        sys.exit(1)
    
    if args.check:
        print("✅ 資料庫檢查完成")
        return
    
    # 啟動服務器
    starter.start_server()

if __name__ == "__main__":
    main()
