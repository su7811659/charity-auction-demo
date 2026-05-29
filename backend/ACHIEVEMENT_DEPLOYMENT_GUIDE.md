# 生產環境成就系統部署指南

## 概述

本指南說明如何安全地將成就系統部署到已經運作的生產環境中，並為現有用戶初始化他們應得的成就。

## 部署步驟

### 1. 備份現有資料庫

在執行任何更改之前，**務必備份現有的生產資料庫**：

```bash
# 使用資料庫管理腳本備份
cd backend
python scripts/db_manager.py backup production_before_achieveme# 2. 執行資料庫 migration
echo "📊 執行資料庫 migration..."
python scripts/db_manager.py migrate

# 3. 檢查現有成就狀態
echo "📊 檢查現有成就狀態..."
python scripts/clear_achievements.py --stats

# 4. 清除現有成就記錄（確保乾淨狀態）
echo "🗑️  清除現有成就記錄..."
python scripts/clear_achievements.py --all --dry-run
read -p "確認要清除所有成就記錄嗎？(yes/no): " clear_confirm
if [[ $clear_confirm == "yes" ]]; then
    python scripts/clear_achievements.py --all
else
    echo "❌ 跳過清除步驟"
fi

# 5. 預覽成就初始化
echo "🔍 預覽成就初始化..."
python scripts/init_achievements_for_production.py --dry-run

# 6. 確認繼續
read -p "確認要繼續執行實際初始化嗎？(yes/no): " confirm動複製資料庫文件
cp database.db backups/production_backup_$(date +%Y%m%d_%H%M%S).db
```

### 2. 執行資料庫 Migration

確保成就相關的資料表已經創建：

```bash
# 檢查當前 migration 狀態
python scripts/db_manager.py check

# 執行 migration 到最新版本
python scripts/db_manager.py migrate

# 或者使用 alembic 直接執行
alembic upgrade head
```

### 3. 檢查現有成就狀態

在執行初始化之前，先檢查當前的成就狀態：

```bash
# 查看成就系統統計
python scripts/clear_achievements.py --stats

# 檢查所有用戶成就狀態
python scripts/check_achievements.py --summary

# 檢查特定用戶
python scripts/check_achievements.py --user-id 1
```

### 4. 清除現有成就記錄（重要）

**如果這是首次部署成就系統到生產環境**，建議先清除任何可能存在的不完整成就記錄：

```bash
# 預覽將會清除的成就記錄
python scripts/clear_achievements.py --all --dry-run

# 清除特定用戶的成就記錄（用於測試）
python scripts/clear_achievements.py --user-id 1

# 清除所有用戶的成就記錄（謹慎使用）
python scripts/clear_achievements.py --all
```

⚠️ **注意**：這個步驟會刪除所有現有成就記錄，確保重新計算是從乾淨的狀態開始。

### 5. 預覽成就初始化

清除舊記錄後，使用預覽模式查看會產生什麼影響：

```bash
# 預覽所有用戶的成就狀態
python scripts/init_achievements_for_production.py --dry-run

# 預覽特定用戶
python scripts/init_achievements_for_production.py --dry-run --user-id 1
```

預覽模式會顯示：
- 每個用戶的統計信息
- 預計會解鎖的成就
- 不會實際修改資料庫

### 6. 執行成就初始化

確認預覽結果無誤後，執行實際的成就初始化：

```bash
# 為所有用戶初始化成就（謹慎使用）
python scripts/init_achievements_for_production.py --execute

# 先測試單個用戶
python scripts/init_achievements_for_production.py --execute --user-id 1

# 批量處理（建議先小批量測試）
for user_id in {1..10}; do
    python scripts/init_achievements_for_production.py --execute --user-id $user_id
done
```

### 7. 驗證結果

執行完成後，檢查成就系統是否正常工作：

```bash
# 檢查所有用戶的成就狀態
python scripts/check_achievements.py

# 檢查特定用戶
python scripts/check_achievements.py --user-id 1

# 只查看統計摘要
python scripts/check_achievements.py --summary
```

### 8. 測試前端功能

1. 啟動前端應用
2. 登入用戶帳號
3. 檢查個人資料頁面的成就顯示
4. 執行一些操作（如上傳商品）測試新成就解鎖
5. 確認成就通知系統正常工作

## 注意事項

### 安全考量

1. **資料備份**：執行任何操作前都要備份資料庫
2. **小批量測試**：先在幾個測試用戶上驗證
3. **監控日誌**：注意查看錯誤日誌
4. **回滾準備**：準備好回滾方案

### 效能考量

1. **分批處理**：如果用戶數量很大，考慮分批處理
2. **低峰期執行**：選擇系統負載較低的時間
3. **監控資源**：注意資料庫連接數和 CPU 使用率

### 用戶體驗

1. **通知控制**：初始化時的成就不會觸發通知（避免通知轟炸）
2. **漸進顯示**：用戶下次登入時會看到已解鎖的成就
3. **正常觸發**：之後的新成就會正常觸發通知

## 常見問題處理

### 如果出現錯誤

1. **立即停止**腳本執行
2. **檢查日誌**了解錯誤原因
3. **從備份恢復**資料庫（如果必要）
4. **重新清除成就**記錄，修復問題後重新執行

```bash
# 從備份恢復資料庫
python scripts/db_manager.py restore production_before_achievements.db

# 重新清除成就記錄
python scripts/clear_achievements.py --all

# 修復問題後重新執行初始化
python scripts/init_achievements_for_production.py --execute
```

### 部分用戶失敗

如果只有部分用戶初始化失敗：

```bash
# 檢查哪些用戶還沒有成就記錄
python scripts/check_achievements.py --summary

# 清除失敗用戶的成就記錄並重新處理
python scripts/clear_achievements.py --user-id [失敗的用戶ID]
python scripts/init_achievements_for_production.py --execute --user-id [失敗的用戶ID]
```

### 重複執行安全性

腳本設計為可以安全重複執行：
- 不會重複解鎖同樣的成就
- 只會更新進度和解鎖新成就
- 不會重置已有的成就狀態

## 監控指標

部署完成後，建議監控以下指標：

1. **成就解鎖率**：檢查是否符合預期
2. **API 響應時間**：確保成就檢查不影響效能
3. **錯誤率**：監控成就相關的錯誤
4. **用戶反饋**：注意用戶對成就系統的反應

## 回滾方案

如果需要完全回滾：

```bash
# 恢復資料庫備份
python scripts/db_manager.py restore production_before_achievements.db

# 或者手動刪除成就相關的表（不推薦）
# 需要先停止應用服務
```

## 完整部署示例

```bash
#!/bin/bash
# 生產環境成就系統部署腳本

set -e  # 遇到錯誤立即退出

echo "🚀 開始部署成就系統到生產環境"

# 1. 備份資料庫
echo "📦 備份資料庫..."
python scripts/db_manager.py backup production_before_achievements_$(date +%Y%m%d_%H%M%S)

# 2. 執行 migration
echo "📊 執行資料庫 migration..."
python scripts/db_manager.py migrate

# 3. 預覽成就初始化
echo "🔍 預覽成就初始化..."
python scripts/init_achievements_for_production.py --dry-run

# 4. 確認繼續
read -p "確認要繼續執行實際初始化嗎？(yes/no): " confirm
if [[ $confirm != "yes" ]]; then
    echo "❌ 取消部署"
    exit 1
fi

# 7. 執行成就初始化
echo "⚡ 執行成就初始化..."
python scripts/init_achievements_for_production.py --execute

# 8. 驗證結果
echo "✅ 驗證結果..."
python scripts/check_achievements.py --summary

echo "🎉 成就系統部署完成！"
```

使用此腳本：

```bash
# 賦予執行權限
chmod +x deploy_achievements.sh

# 執行部署
./deploy_achievements.sh
```
