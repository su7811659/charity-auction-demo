# 🥗 BidForGood — Charity Marketplace (Demo)

**English** · [繁體中文](./README.zh-TW.md)

A full-stack **charity marketplace / second-hand bazaar** demo. Members list unused items, browse and interact (likes, comments, reactions), an **AI assistant** helps with semantic search and item appraisal, and proceeds are directed to charity. An admin back office handles item review, an achievement system, and event analytics.

> This is a **portfolio demo**. It runs in **Demo Mode** by default — no API keys required and no paid APIs are called.

🔗 **Live demo:** https://charity-auction-demo.vercel.app
🔑 **Demo login:** click **"Enter as demo user"**, or use `demo@bidforgood.com` / `demo1234` (admin token: `demo-admin`)

---

## ✨ Features

- 🛍️ **Marketplace** — list, browse, filter and view item details
- 🤖 **AI assistant** — semantic search, item "appraisal" rating and playful copywriting (canned responses in Demo Mode)
- 💬 **Social** — likes, comments, emoji reactions, notifications
- 🏆 **Achievements** — gamified badges and a platinum trophy
- 📊 **Event summary** — donation stats, leaderboards, data visualization
- 🔐 **Admin back office** — item review and system settings

## 🧱 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 · TypeScript · Vite · Ant Design · Redux Toolkit · React Query |
| Backend | Python · FastAPI · SQLAlchemy · Alembic · SQLite |
| AI | OpenAI API · LangChain · FAISS (vector semantic search) |

---

## 🚀 Run Locally

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# (optional) seed 50 demo products + interactions
cd scripts && python quick_seed.py && cd ..

python main.py        # serves on http://127.0.0.1:8000
```

### Frontend
```bash
cd frontend
npm install            # .npmrc already adds --legacy-peer-deps
npm run dev            # serves on http://127.0.0.1:5173
```

Open the frontend and click **"Enter as demo user"** to start browsing.

## 🔑 Demo Accounts

| Purpose | Account | Password |
|---------|---------|----------|
| Regular user | `demo@bidforgood.com` | `demo1234` |
| Admin token | — | `demo-admin` |

> You can also type any email in the login box to enter as that identity (Demo Mode uses passwordless login).

## 🤖 Demo Mode vs. Full AI

By default `OPENAI_API_KEY` is empty → **Demo Mode**: all AI features (semantic search, item appraisal, copy rewriting, event summaries) return **built-in sample responses**, so the demo never calls OpenAI or incurs cost.

To enable full AI: set `OPENAI_API_KEY=sk-...` in `backend/.env`.

---

## ☁️ Deployment

Frontend and backend are deployed separately:

- **Backend → Render**: the repo includes `render.yaml` (Blueprint). You may optionally set `OPENAI_API_KEY` in the dashboard.
- **Frontend → Vercel**: set Root Directory to `frontend`. `frontend/vercel.json` contains the API rewrite — replace `bidforgood-api.onrender.com` with your Render backend URL if it differs.

> On free tiers, the backend cold-starts after idling (~30–50s on first hit). Recording a short Loom walkthrough as a fallback is recommended.

## 📌 Known Limitations (Demo)

- AI features return sample responses unless a real API key is set.
- The "feedback mailbox" only writes to Google Sheets when credentials are configured; otherwise it is skipped.
- The free backend's disk is ephemeral; on restart the database is re-initialized with fresh demo data.
