#!/usr/bin/env python3
"""
初始化系統配置表
"""

import sys
import os

# 添加項目根目錄到 Python 路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from services.system_config_service import SystemConfigService


def init_system_config():
    """初始化系統配置"""
    db = SessionLocal()
    try:
        # 創建或獲取系統配置
        config = SystemConfigService.get_or_create(db)
        print(f"系統配置已初始化，ID: {config.id}")
        print(f"上傳啟用: {config.upload_enabled}")
        print(f"總結可見: {config.summary_visible}")
        print("初始化完成！")
    except Exception as e:
        print(f"初始化失敗: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    init_system_config()
