import os
import re
from datetime import datetime, timezone, timedelta
from typing import Optional

def log_user_ai_query(user_email: str, query: str) -> None:
    """
    記錄用戶AI查詢到對應的日誌文件
    
    Args:
        user_email: 用戶email
        query: 查詢內容
    """
    try:
        # 清理email，移除不安全的文件名字符
        safe_email = re.sub(r'[^a-zA-Z0-9@._-]', '_', user_email)
        
        # 創建user目錄結構
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        user_base_dir = os.path.join(backend_dir, "user")
        user_email_dir = os.path.join(user_base_dir, safe_email)
        
        # 確保目錄存在
        os.makedirs(user_email_dir, exist_ok=True)
        
        # 日誌文件路徑
        log_file_path = os.path.join(user_email_dir, "ai_query.txt")
        
        # 獲取台灣時間 (UTC+8)
        taiwan_tz = timezone(timedelta(hours=8))
        current_time = datetime.now(taiwan_tz)
        timestamp = current_time.strftime('%Y-%m-%d %H:%M:%S')
        
        # 格式化日誌條目
        log_entry = f"[{timestamp}] {query}\n"
        
        # 追加到日誌文件
        with open(log_file_path, 'a', encoding='utf-8') as f:
            f.write(log_entry)
            
        print(f"✅ AI查詢已記錄: {user_email} - {query[:50]}...")
        
    except Exception as e:
        print(f"❌ 記錄AI查詢失敗: {e}")
        # 不拋出異常，避免影響主要功能


def get_user_ai_query_history(user_email: str, limit: Optional[int] = None) -> list:
    """
    獲取用戶AI查詢歷史記錄
    
    Args:
        user_email: 用戶email
        limit: 限制返回數量，None表示不限制
        
    Returns:
        查詢歷史列表，每個元素包含timestamp和query
    """
    try:
        safe_email = re.sub(r'[^a-zA-Z0-9@._-]', '_', user_email)
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        log_file_path = os.path.join(backend_dir, "user", safe_email, "ai_query.txt")
        
        if not os.path.exists(log_file_path):
            return []
        
        queries = []
        with open(log_file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # 解析日誌條目
        for line in lines:
            line = line.strip()
            if line and line.startswith('['):
                try:
                    # 解析格式: [2025-08-23 14:30:00] query content
                    close_bracket_idx = line.find(']')
                    if close_bracket_idx > 0:
                        timestamp_str = line[1:close_bracket_idx]
                        query_content = line[close_bracket_idx + 2:]  # +2 to skip '] '
                        
                        queries.append({
                            'timestamp': timestamp_str,
                            'query': query_content
                        })
                except Exception as e:
                    print(f"解析日誌行失敗: {line[:50]}... - {e}")
                    continue
        
        # 反轉列表，讓最新的查詢在前面
        queries.reverse()
        
        # 應用限制
        if limit:
            queries = queries[:limit]
            
        return queries
        
    except Exception as e:
        print(f"❌ 讀取AI查詢歷史失敗: {e}")
        return []
