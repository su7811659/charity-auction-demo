#!/usr/bin/env python3
"""
資料庫管理腳本 - 解決團隊開發中的資料庫同步問題

使用方法：
    python scripts/db_manager.py backup          # 備份當前資料庫
    python scripts/db_manager.py reset           # 重置資料庫到最新 schema
    python scripts/db_manager.py restore <file>  # 從備份恢復資料庫
    python scripts/db_manager.py check           # 檢查資料庫狀態
    python scripts/db_manager.py migrate         # 手動執行 migration
"""

import os
import sys
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

# 添加父目錄到 Python 路徑
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

try:
    from alembic.config import Config
    from alembic import command
    from alembic.script import ScriptDirectory
    from database import DATABASE_URL, engine, Base
    from utils.logger import Logger
except ImportError as e:
    print(f"❌ 導入錯誤: {e}")
    print("請確保在 backend 目錄下執行此腳本")
    sys.exit(1)

logger = Logger.get_logger("db_manager")

class DatabaseManager:
    def __init__(self):
        self.db_path = os.path.join(backend_dir, "database.db")
        self.backup_dir = os.path.join(backend_dir, "backups")
        self.alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
        
        # 確保備份目錄存在
        os.makedirs(self.backup_dir, exist_ok=True)
    
    def backup_database(self, custom_name=None):
        """備份當前資料庫"""
        if not os.path.exists(self.db_path):
            print("❌ 資料庫文件不存在，無法備份")
            return False
        
        if custom_name:
            backup_filename = f"{custom_name}.db"
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"database_backup_{timestamp}.db"
        
        backup_path = os.path.join(self.backup_dir, backup_filename)
        
        try:
            shutil.copy2(self.db_path, backup_path)
            print(f"✅ 資料庫已備份至: {backup_path}")
            return backup_path
        except Exception as e:
            print(f"❌ 備份失敗: {e}")
            return False
    
    def list_backups(self):
        """列出所有備份文件"""
        if not os.path.exists(self.backup_dir):
            print("📁 尚無備份文件")
            return []
        
        backups = [f for f in os.listdir(self.backup_dir) if f.endswith('.db')]
        backups.sort(reverse=True)  # 最新的在前面
        
        if not backups:
            print("📁 尚無備份文件")
            return []
        
        print("📋 可用的備份文件:")
        for i, backup in enumerate(backups, 1):
            backup_path = os.path.join(self.backup_dir, backup)
            size = os.path.getsize(backup_path) / 1024  # KB
            mtime = datetime.fromtimestamp(os.path.getmtime(backup_path))
            print(f"  {i}. {backup} ({size:.1f}KB, {mtime.strftime('%Y-%m-%d %H:%M:%S')})")
        
        return backups
    
    def restore_database(self, backup_file):
        """從備份恢復資料庫"""
        backup_path = os.path.join(self.backup_dir, backup_file)
        
        if not os.path.exists(backup_path):
            print(f"❌ 備份文件不存在: {backup_path}")
            return False
        
        try:
            # 備份當前資料庫
            if os.path.exists(self.db_path):
                current_backup = self.backup_database("before_restore")
                if current_backup:
                    print(f"💾 當前資料庫已備份為: {os.path.basename(current_backup)}")
            
            # 恢復備份
            shutil.copy2(backup_path, self.db_path)
            print(f"✅ 資料庫已從備份恢復: {backup_file}")
            return True
        except Exception as e:
            print(f"❌ 恢復失敗: {e}")
            return False
    
    def check_database_status(self):
        """檢查資料庫狀態"""
        print("🔍 檢查資料庫狀態...")
        
        # 檢查資料庫文件是否存在
        if not os.path.exists(self.db_path):
            print("❌ 資料庫文件不存在")
            return False
        
        # 檢查資料庫連接
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            conn.close()
            
            print(f"✅ 資料庫連接正常，共有 {len(tables)} 個表格")
            if tables:
                print("📋 現有表格:")
                for table in tables:
                    print(f"  - {table[0]}")
        except Exception as e:
            print(f"❌ 資料庫連接失敗: {e}")
            return False
        
        # 檢查 Alembic migration 狀態
        try:
            from alembic.runtime.migration import MigrationContext
            
            script_dir = ScriptDirectory.from_config(self.alembic_cfg)
            with engine.begin() as connection:
                migration_ctx = MigrationContext.configure(connection)
                current_rev = migration_ctx.get_current_revision()
                head_rev = script_dir.get_current_head()
                
                print(f"📊 Migration 狀態:")
                print(f"  當前版本: {current_rev or 'None'}")
                print(f"  最新版本: {head_rev or 'None'}")
                
                if current_rev == head_rev:
                    print("✅ 資料庫 schema 是最新的")
                else:
                    print("⚠️  資料庫 schema 需要更新")
                    return False
        except Exception as e:
            print(f"⚠️  無法檢查 migration 狀態: {e}")
        
        return True
    
    def reset_database(self):
        """重置資料庫到最新 schema"""
        print("🔄 開始重置資料庫...")
        
        # 備份當前資料庫
        if os.path.exists(self.db_path):
            backup_path = self.backup_database("before_reset")
            if backup_path:
                print(f"💾 當前資料庫已備份")
        
        try:
            # 刪除舊資料庫
            if os.path.exists(self.db_path):
                os.remove(self.db_path)
                print("🗑️  舊資料庫已刪除")
            
            # 執行 migration 到最新版本
            print("📊 執行 migrations...")
            command.upgrade(self.alembic_cfg, "head")
            print("✅ 資料庫重置完成")
            
            # 執行種子資料 (如果需要)
            self.seed_initial_data()
            
            return True
        except Exception as e:
            print(f"❌ 重置失敗: {e}")
            return False
    
    def run_migrations(self):
        """手動執行 migrations"""
        try:
            print("📊 執行 migrations...")
            command.upgrade(self.alembic_cfg, "head")
            print("✅ Migrations 執行完成")
            return True
        except Exception as e:
            print(f"❌ Migration 失敗: {e}")
            return False
    
    def seed_initial_data(self):
        """添加初始資料"""
        try:
            from scripts.init_system_config import main as init_system_config
            init_system_config()
            print("🌱 初始資料已添加")
        except Exception as e:
            print(f"⚠️  初始資料添加失敗: {e}")

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    db_manager = DatabaseManager()
    command = sys.argv[1].lower()
    
    if command == "backup":
        custom_name = sys.argv[2] if len(sys.argv) > 2 else None
        db_manager.backup_database(custom_name)
    
    elif command == "reset":
        print("⚠️  這將重置資料庫，所有資料將被清除！")
        confirm = input("確定要繼續嗎？(yes/no): ")
        if confirm.lower() in ['yes', 'y']:
            db_manager.reset_database()
        else:
            print("❌ 取消重置")
    
    elif command == "restore":
        backups = db_manager.list_backups()
        if not backups:
            return
        
        if len(sys.argv) > 2:
            backup_file = sys.argv[2]
            if backup_file not in backups:
                print(f"❌ 備份文件不存在: {backup_file}")
                return
        else:
            try:
                choice = int(input("請選擇要恢復的備份 (輸入編號): "))
                if 1 <= choice <= len(backups):
                    backup_file = backups[choice - 1]
                else:
                    print("❌ 無效的選擇")
                    return
            except ValueError:
                print("❌ 請輸入有效的數字")
                return
        
        print(f"⚠️  這將恢復備份 {backup_file}，當前資料庫將被覆蓋！")
        confirm = input("確定要繼續嗎？(yes/no): ")
        if confirm.lower() in ['yes', 'y']:
            db_manager.restore_database(backup_file)
        else:
            print("❌ 取消恢復")
    
    elif command == "check":
        db_manager.check_database_status()
    
    elif command == "migrate":
        db_manager.run_migrations()
    
    elif command == "list":
        db_manager.list_backups()
    
    else:
        print(f"❌ 未知的命令: {command}")
        print(__doc__)

if __name__ == "__main__":
    main()
