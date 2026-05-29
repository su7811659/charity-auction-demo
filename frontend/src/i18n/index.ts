import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";

// 翻譯策略（retrofit 友善）：
// - key 直接用「原本的繁體中文字串」
// - 英文模式：查 en 對照表；查不到 → fallback 回中文 key（不會破版/空白）
// - 中文模式：resources.zh 為空，t(key) 直接回傳 key 本身（即原中文）
const saved =
  (typeof localStorage !== "undefined" && localStorage.getItem("lang")) || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: {} },
  },
  lng: saved === "zh" ? "zh" : "en",
  fallbackLng: "zh",
  keySeparator: false, // key 是整句中文，不用 . 當分隔
  nsSeparator: false, // key 可能含 : 以外字元，關閉 namespace 分隔
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;
