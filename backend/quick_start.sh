#!/bin/bash
# 團隊快速啟動腳本 - 解決資料庫同步問題
# 
# 使用方法：
#   ./quick_start.sh        # 智能啟動
#   ./quick_start.sh reset  # 強制重置資料庫後啟動
#   ./quick_start.sh check  # 只檢查資料庫狀態

set -e  # 遇到錯誤立即退出

echo "🚀 BidForGood 公益市集系統 - 智能啟動"
echo "=================================="

# 檢查是否在 backend 目錄
if [ ! -f "main.py" ]; then
    echo "❌ 請在 backend 目錄下執行此腳本"
    exit 1
fi

# 檢查 Python 虛擬環境
if [ ! -d "env" ] && [ ! -d "venv" ]; then
    echo "⚠️  未找到虛擬環境，正在創建..."
    python3 -m venv env
    echo "✅ 虛擬環境已創建"
fi

# 激活虛擬環境
if [ -d "env" ]; then
    source env/bin/activate
    echo "✅ 虛擬環境 (env) 已激活"
elif [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ 虛擬環境 (venv) 已激活"
fi

# 安裝依賴
echo "📦 檢查依賴..."
pip install -r requirements.txt > /dev/null 2>&1
echo "✅ 依賴檢查完成"

# 根據參數執行不同操作
case "${1:-smart}" in
    "reset")
        echo "🔄 強制重置模式"
        python smart_start.py --force
        ;;
    "check")
        echo "🔍 檢查模式"
        python smart_start.py --check
        ;;
    "quick")
        echo "⚡ 快速啟動模式（跳過自動修復）"
        python smart_start.py --quick
        ;;
    "smart"|"")
        echo "🧠 智能啟動模式（包含自動修復）"
        python smart_start.py
        ;;
    *)
        echo "❌ 未知參數: $1"
        echo "使用方法: $0 [smart|quick|reset|check]"
        echo "  smart  - 智能啟動，包含完整的環境檢查和自動修復"
        echo "  quick  - 快速啟動，跳過自動修復檢查"
        echo "  reset  - 強制重置資料庫後啟動"
        echo "  check  - 只檢查環境和資料庫狀態"
        exit 1
        ;;
esac
