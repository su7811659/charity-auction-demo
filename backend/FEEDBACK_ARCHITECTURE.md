# 回饋系統架構說明

## 📋 **設計決策：只使用 Google Sheets**

此專案的回饋系統採用 **Google Sheets** 作為唯一儲存方案，不使用傳統資料庫。

### ✅ **優點**
- **簡化部署**：無需設置額外的資料庫
- **即時查看**：開發團隊可直接在 Google Sheets 查看和回覆
- **成本效益**：Google Sheets API 有免費配額
- **易於管理**：非技術人員也能直接操作回饋資料

### 📁 **文件結構**

```
backend/
├── routes/feedback_router.py     # API 路由（主要邏輯）
├── schemas/feedback_schema.py    # Pydantic 資料驗證模型
└── models/                       # 🚫 不含 feedback.py（已刪除）
```

### 🔧 **技術實現**

- **資料驗證**：使用 `schemas/feedback_schema.py` 的 Pydantic 模型
- **API 端點**：在 `routes/feedback_router.py` 中實現
- **儲存方式**：直接寫入 Google Spreadsheet
- **備用方案**：本地 CSV 文件（當 Google Sheets 無法存取時）

### 📊 **Google Sheets 結構**

| 欄位 | 說明 |
|------|------|
| 時間 | 回饋提交時間 |
| 姓名 | 用戶姓名（或 email） |
| 回饋類型 | 功能建議、樣式建議、BUG報告等 |
| 回饋內容 | 用戶的詳細回饋 |
| 開發者回覆 | 開發團隊的回應（可在 Sheets 中直接編輯） |

### 🚀 **使用方式**

1. 用戶在前端提交回饋
2. 後端驗證資料格式
3. 寫入 Google Sheets
4. 開發團隊在 Sheets 中查看並回覆
5. 用戶可在前端查看回覆狀態
