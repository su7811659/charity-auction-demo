// 英文對照表：key = 原本的繁體中文字串，value = 英文。
// 查不到的 key 會自動 fallback 回中文（見 i18n/index.ts），因此可逐步擴充、不會破版。
export const en: Record<string, string> = {
  // ── 導覽列 Navigation ──
  "首頁": "Home",
  "上傳商品": "Sell an Item",
  "活動指南": "How It Works",
  "活動總結": "Event Summary",
  "個人中心": "My Account",
  "管理者後台": "Admin",

  // ── 頁尾 Footer ──
  "公益二手平台": "Charity Second-hand Marketplace",

  // ── 登入框 Auth dialog ──
  "歡迎來到 BidForGood 公益市集 Demo 👋": "Welcome to the BidForGood Charity Market Demo 👋",
  "這是一個作品集展示用的 Demo。點下方按鈕即可用 Demo 帳號進入，無需註冊。":
    "This is a portfolio demo. Click the button below to enter with a demo account — no sign-up required.",
  "以 Demo 帳號進入": "Enter as demo user",
  "或自訂 email 進入（例如 you@bidforgood.com）":
    "Or enter with a custom email (e.g. you@bidforgood.com)",
  "登入成功，正在進入 Demo～": "Logged in — entering the demo…",
  "登入失敗，請再試一次": "Login failed, please try again",
  "嗨～點一下就能用 Demo 帳號進來逛逛喔 🤖":
    "Hi! Tap to come in with a demo account and look around 🤖",
  "沒登入我不能幫你看商品欸😢": "I can't browse items for you until you log in 😢",
  "登入後我就可以派上用場了！": "Once you're logged in, I'm ready to help!",

  // ── 通用 Common ──
  "載入中...": "Loading...",
  "搜尋": "Search",
  "確定": "OK",
  "取消": "Cancel",
};
