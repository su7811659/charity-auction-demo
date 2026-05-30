import { useState } from "react";
import { GlobalOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

/** 導覽列上的語系切換鈕（EN / 中文）— 邊框膠囊樣式，含 hover 效果。 */
const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();
  const [hover, setHover] = useState(false);
  const isZh = i18n.language === "zh";

  const toggle = () => {
    const next = isZh ? "en" : "zh";
    i18n.changeLanguage(next);
    try {
      localStorage.setItem("lang", next);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Switch language"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 32,
        padding: "0 14px",
        borderRadius: 16,
        border: `1px solid ${hover ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)"}`,
        background: hover ? "rgba(255,255,255,0.16)" : "transparent",
        color: "#fff",
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1,
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      <GlobalOutlined style={{ fontSize: 14 }} />
      <span>{isZh ? "EN" : "中文"}</span>
    </button>
  );
};

export default LanguageToggle;
