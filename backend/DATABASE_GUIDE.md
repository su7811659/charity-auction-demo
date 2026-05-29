# 🗄️ 資料庫管理指南

## 🚀 快速解決方案

如果你遇到資料庫問題（如 `git pull` 後啟動失敗），請使用以下命令：

```bash
# 進入 backend 目錄
cd backend

# 智能啟動（推薦）- 會自動檢查和修復
./quick_start.sh

# 或者強制重置資料庫
./quick_start.sh reset
```

## 📋 常見情況

### 情況 1: Git pull 後啟動失敗

```bash
cd backend
./quick_start.sh  # 智能啟動會自動處理
```

### 情況 2: 資料庫完全損壞

```bash
cd backend
python scripts/db_manager.py reset  # 重置資料庫
```

### 情況 3: 想要備份當前資料庫

```bash
cd backend
python scripts/db_manager.py backup  # 創建備份
```

### 情況 4: 恢復之前的備份

```bash
cd backend
python scripts/db_manager.py restore  # 會列出可用備份供選擇
```

## 🛠️ 詳細工具說明

### 1. 智能啟動腳本 (`smart_start.py`)

會自動：
- 檢查資料庫狀態
- 執行必要的 migration
- 在需要時備份舊資料庫
- 啟動 FastAPI 服務器

```bash
python smart_start.py           # 智能啟動
python smart_start.py --force   # 強制重置
python smart_start.py --check   # 只檢查不啟動
```

### 2. 資料庫管理器 (`scripts/db_manager.py`)

完整的資料庫管理工具：

```bash
python scripts/db_manager.py backup          # 備份資料庫
python scripts/db_manager.py reset           # 重置到最新 schema
python scripts/db_manager.py restore <file>  # 恢復備份
python scripts/db_manager.py check           # 檢查狀態
python scripts/db_manager.py migrate         # 手動執行 migration
python scripts/db_manager.py list            # 列出所有備份
```

### 3. 快速啟動腳本 (`quick_start.sh`)

一鍵式解決方案：

```bash
./quick_start.sh        # 智能啟動
./quick_start.sh reset  # 強制重置
./quick_start.sh check  # 只檢查
```

## 🔄 工作流程建議

### 日常開發

1. **每次 git pull 後**：
   ```bash
   cd backend
   ./quick_start.sh
   ```

2. **如果啟動失敗**：
   ```bash
   ./quick_start.sh reset
   ```

### 開發新功能

1. **修改資料庫前先備份**：
   ```bash
   python scripts/db_manager.py backup my_feature_backup
   ```

2. **創建 migration**：
   ```bash
   alembic revision --autogenerate -m "Add new feature"
   ```

3. **測試 migration**：
   ```bash
   python scripts/db_manager.py migrate
   ```

## 🚨 緊急情況處理

### 資料庫完全損壞

```bash
cd backend
python scripts/db_manager.py list     # 查看可用備份
python scripts/db_manager.py restore  # 恢復最近的備份
```

### Migration 衝突

```bash
cd backend
./quick_start.sh reset  # 重置到最新狀態
```

### 需要回到特定版本

```bash
cd backend
python scripts/db_manager.py backup current_state  # 先備份當前狀態
python scripts/db_manager.py restore <specific_backup>  # 恢復特定備份
```

## 🎯 最佳實踐

1. **每天工作前**：檢查是否有資料庫更新
2. **重要修改前**：創建備份
3. **遇到問題時**：先嘗試智能啟動
4. **團隊協作**：及時同步資料庫變更

## 📞 故障排除

如果所有方法都失敗了：

1. 檢查 `backend/logs/` 中的錯誤日誌
2. 確認虛擬環境正確激活
3. 檢查 `requirements.txt` 中的依賴是否都已安裝
4. 聯絡團隊成員確認最新的資料庫狀態

## 🔧 手動處理（僅限緊急情況）

```bash
# 完全清除並重建
cd backend
rm database.db  # 刪除舊資料庫
alembic upgrade head  # 重建最新 schema
python scripts/init_system_config.py  # 添加初始資料
```

---

**記住：遇到資料庫問題時，優先使用 `./quick_start.sh`，它會自動處理大部分情況！**
