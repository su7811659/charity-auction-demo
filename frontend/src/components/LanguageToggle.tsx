import { Button } from "antd";
import { GlobalOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

/** 小巧的語系切換鈕（EN / 中文），放在導覽列不佔版面。 */
const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();
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
    <Button
      type="text"
      size="small"
      icon={<GlobalOutlined />}
      onClick={toggle}
      aria-label="Switch language"
      style={{ color: "#fff", whiteSpace: "nowrap", flexShrink: 0 }}
    >
      {isZh ? "EN" : "中文"}
    </Button>
  );
};

export default LanguageToggle;
