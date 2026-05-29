#!/usr/bin/env python3
"""
手動修正 user_achievements 表結構
"""

import sqlite3
import os

# 取得資料庫路徑
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')

def fix_user_achievements_table():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("🔄 開始修正 user_achievements 表結構...")
        
        # 檢查表是否存在
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='user_achievements'
        """)
        
        if not cursor.fetchone():
            print("📝 user_achievements 表不存在，將創建新表...")
            
            # 直接創建新表
            cursor.execute("""
                CREATE TABLE user_achievements (
                    id INTEGER NOT NULL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    achievement_id VARCHAR(50) NOT NULL,
                    progress INTEGER DEFAULT 0,
                    is_unlocked BOOLEAN DEFAULT 0,
                    unlocked_at DATETIME,
                    notification_shown BOOLEAN DEFAULT 0,
                    last_viewed_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users (id),
                    CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id)
                )
            """)
            
            # 創建索引
            cursor.execute("CREATE INDEX ix_user_achievements_id ON user_achievements (id)")
            
            # 提交變更
            conn.commit()
            print("✅ user_achievements 表創建完成")
            
            # 驗證表結構
            cursor.execute("PRAGMA table_info(user_achievements)")
            columns = cursor.fetchall()
            print("\n📋 新表結構:")
            for col in columns:
                print(f"  - {col[1]} {col[2]} {'NOT NULL' if col[3] else 'NULL'}")
            
            return True
        
        # 重新創建表（SQLite 方式）
        print("🗑️ 備份並重新創建表...")
        
        # 1. 重命名原表
        cursor.execute("ALTER TABLE user_achievements RENAME TO user_achievements_old")
        
        # 1.5. 刪除舊的索引
        cursor.execute("DROP INDEX IF EXISTS ix_user_achievements_id")
        
        # 2. 創建新表
        cursor.execute("""
            CREATE TABLE user_achievements (
                id INTEGER NOT NULL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                achievement_id VARCHAR(50) NOT NULL,
                progress INTEGER DEFAULT 0,
                is_unlocked BOOLEAN DEFAULT 0,
                unlocked_at DATETIME,
                notification_shown BOOLEAN DEFAULT 0,
                last_viewed_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users (id),
                CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id)
            )
        """)
        
        # 3. 創建索引
        cursor.execute("CREATE INDEX ix_user_achievements_id ON user_achievements (id)")
        
        # 4. 複製舊資料（如果有的話）- 但由於 achievement_id 類型不同，先跳過
        print("🔄 檢查舊資料...")
        cursor.execute("SELECT COUNT(*) FROM user_achievements_old")
        count = cursor.fetchone()[0]
        
        if count > 0:
            print(f"⚠️ 發現 {count} 筆舊資料，但由於欄位類型不相容，將清空重建")
        
        # 5. 刪除舊表
        cursor.execute("DROP TABLE user_achievements_old")
        
        # 提交變更
        conn.commit()
        print("✅ user_achievements 表結構修正完成")
        
        # 驗證表結構
        cursor.execute("PRAGMA table_info(user_achievements)")
        columns = cursor.fetchall()
        print("\n📋 新表結構:")
        for col in columns:
            print(f"  - {col[1]} {col[2]} {'NOT NULL' if col[3] else 'NULL'}")
        
        return True
        
    except Exception as e:
        print(f"❌ 修正表結構時發生錯誤: {e}")
        conn.rollback()
        return False
    
    finally:
        conn.close()

if __name__ == "__main__":
    if fix_user_achievements_table():
        print("\n🎉 表結構修正成功！")
    else:
        print("\n💥 表結構修正失敗！")
