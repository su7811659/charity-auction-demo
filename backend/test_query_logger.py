#!/usr/bin/env python3
"""
測試用戶AI查詢日誌功能
"""
import sys
import os

# 添加backend目錄到Python路徑
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

from utils.user_query_logger import log_user_ai_query, get_user_ai_query_history

def test_user_query_logging():
    """測試用戶查詢日誌功能"""
    
    # 測試email
    test_email = "test@example.com"
    
    # 測試查詢
    test_queries = [
        "我想要便宜的3C產品",
        "有沒有書籍類的商品",
        "尋找運動用品",
        "需要辦公文具"
    ]
    
    print("🧪 開始測試用戶AI查詢日誌功能...")
    
    # 測試日誌記錄
    print("\n📝 測試日誌記錄:")
    for i, query in enumerate(test_queries, 1):
        print(f"  {i}. 記錄查詢: {query}")
        log_user_ai_query(test_email, query)
    
    # 測試讀取歷史
    print(f"\n📖 測試讀取歷史 ({test_email}):")
    history = get_user_ai_query_history(test_email)
    
    if history:
        print(f"  ✅ 成功讀取 {len(history)} 條記錄:")
        for i, record in enumerate(history, 1):
            print(f"    {i}. [{record['timestamp']}] {record['query']}")
    else:
        print("  ❌ 沒有找到歷史記錄")
    
    # 測試限制數量
    print(f"\n🔢 測試限制讀取數量 (最近2條):")
    limited_history = get_user_ai_query_history(test_email, limit=2)
    
    if limited_history:
        print(f"  ✅ 成功讀取 {len(limited_history)} 條記錄:")
        for i, record in enumerate(limited_history, 1):
            print(f"    {i}. [{record['timestamp']}] {record['query']}")
    
    # 檢查文件路徑
    safe_email = test_email.replace('@', '_').replace('.', '_')
    log_file_path = os.path.join(backend_dir, "user", safe_email, "ai_query.txt")
    
    print(f"\n📁 檢查日誌文件:")
    print(f"  文件路徑: {log_file_path}")
    print(f"  文件存在: {os.path.exists(log_file_path)}")
    
    if os.path.exists(log_file_path):
        file_size = os.path.getsize(log_file_path)
        print(f"  文件大小: {file_size} 字節")
        
        # 顯示文件內容
        with open(log_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            print(f"  文件內容預覽:")
            for i, line in enumerate(content.split('\n')[:5], 1):
                if line.strip():
                    print(f"    {i}. {line}")
    
    print("\n✅ 測試完成！")

if __name__ == "__main__":
    test_user_query_logging()
