import React, { useState } from "react";
import { VerticalAlignTopOutlined } from "@ant-design/icons";

interface ScrollToTopButtonProps {
  isAtBottom: boolean;
  scrollToTop: () => void;
  disabled?: boolean;
}

const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({ isAtBottom, scrollToTop, disabled = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (disabled) {
    return null; // 如果禁用，直接不渲染按鈕
  }

  return (
    <button
      onClick={scrollToTop}
      onMouseEnter={(e) => {
        setIsHovered(true);
        e.currentTarget.style.backgroundColor = "#0f213e"; // 滑鼠進入時顏色加深
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        e.currentTarget.style.backgroundColor = "#0f213eb3"; // 滑鼠離開時恢復顏色
      }}
      style={{
        position: "fixed",
        bottom: 12,
        right: 16,
        backgroundColor: "#0f213eb3",
        color: "#fff",
        border: "none",
        borderRadius: "50%",
        width: 32,
        height: 32,
        display: "flex",
        opacity: isAtBottom || isHovered ? 1 : 0, // 滾動到底部或 hover 時顯示
        justifyContent: "center",
        alignItems: "center",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        cursor: "pointer",
        zIndex: 1000,
        transition: "opacity 0.3s ease, transform 0.1s ease",
        outline: "none",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.9)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      <VerticalAlignTopOutlined style={{ fontSize: "20px" }} />
    </button>
  );
};

export default ScrollToTopButton;
