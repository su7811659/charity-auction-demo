# 🥗 BidForGood — 公益市集平台 (Demo)

[English](./README.md) · **繁體中文**

一個全端的**公益義賣 / 二手市集**平台 Demo：使用者上架閒置物品、瀏覽與互動（按讚、留言、表情回應），系統以 **AI 小助理**協助語意搜尋與商品鑑定，並把義賣所得導向公益。後台提供商品審核、成就系統與活動數據總結。

> 這是一個**作品集展示用**的 Demo 專案，預設以 **Demo 模式**執行（不需任何金鑰、不會呼叫付費 API）。

🔗 **線上 Demo：** https://charity-auction-demo.vercel.app
🔑 **Demo 登入：** 點「以 Demo 帳號進入」，或用 `demo@bidforgood.com` / `demo1234`（後台 token：`demo-admin`）

---

## ✨ 功能亮點

- 🛍️ **商品市集**：上架、瀏覽、分類、商品詳情
- 🤖 **AI 小助理**：語意搜尋、商品「鑑定」評級與幽默文案（Demo 模式為示範回應）
- 💬 **社群互動**：按讚、留言、表情回應、通知
- 🏆 **成就系統**：遊戲化徽章與白金獎盃
- 📊 **活動總結**：捐款統計、排行榜、數據視覺化
- 🔐 **後台管理**：商品審核、系統設定

## 🧱 技術棧

| 層 | 技術 |
|----|------|
| 前端 | React 19 · TypeScript · Vite · Ant Design · Redux Toolkit · React Query |
| 後端 | Python · FastAPI · SQLAlchemy · Alembic · SQLite |
| AI | OpenAI API · LangChain · FAISS（向量語意搜尋）|

---

## 🚀 本機快速開始

### 後端
```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# （可選）灌入 50 筆示範商品與互動
cd scripts && python quick_seed.py && cd ..

python main.py        # 啟動於 http://127.0.0.1:8000
```

### 前端
```bash
cd frontend
npm install            # 已設定 .npmrc 自動帶 --legacy-peer-deps
npm run dev            # 啟動於 http://127.0.0.1:5173
```

開啟前端後，點「**以 Demo 帳號進入**」即可開始逛。

## 🔑 Demo 帳號

| 用途 | 帳號 | 密碼 |
|------|------|------|
| 一般使用者 | `demo@bidforgood.com` | `demo1234` |
| 管理後台 token | — | `demo-admin` |

> 也可在登入框輸入任意 email 直接以該身份進入（Demo 模式為免密碼登入）。

## 🤖 Demo 模式 vs. 完整 AI

預設 `OPENAI_API_KEY` 留空 → **Demo 模式**：所有 AI 功能（語意搜尋、商品鑑定、文案改寫、活動總結）會回傳**內建的示範回應**，不呼叫 OpenAI、不產生費用。

要啟用完整 AI：在 `backend/.env` 設定 `OPENAI_API_KEY=sk-...` 即可。

---

## ☁️ 部署

採前後端分離部署：

- **後端 → Render**：repo 內含 `render.yaml`（Blueprint）。建立後在環境變數可選擇性填入 `OPENAI_API_KEY`。
- **前端 → Vercel**：Root Directory 設為 `frontend`。`frontend/vercel.json` 內含 API 反向代理設定，如後端網址不同請替換 `bidforgood-api.onrender.com`。

> 免費方案的後端首次喚醒會有數十秒冷啟動，屬正常現象；建議另外錄一段 Loom 操作影片作為展示備援。

## 📌 已知限制（Demo）

- AI 相關功能為示範回應（除非設定真實金鑰）。
- 「回饋信箱」需 Google Sheets 憑證才會實際寫入，未設定時會略過。
- 免費後端磁碟為暫存性，重啟後資料會重新以示範資料初始化。
