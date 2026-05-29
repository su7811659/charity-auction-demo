// TopDonorsPopover.tsx
import { motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Donor {
  nickname: string;
  total_donation: number;
}

interface TopDonorsPopoverProps {
  donors: Donor[];
}

export const TopDonorsPopover: React.FC<TopDonorsPopoverProps> = ({ donors }) => {
  const { t } = useTranslation();
  const MEDAL_EMOJIS = ["🥇", "🥈", "🥉"];
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // CSS 樣式字串用於自定義 scrollbar
  const scrollbarStyles = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  `;
  
  // Styles for different ranking positions
  const getRankStyle = (index: number, isHovered: boolean) => {
    const baseStyles = {
      transition: "all 0.25s cubic-bezier(0.23, 1, 0.32, 1)",
      transform: isHovered ? "scale(1.02) translateY(-1px)" : "scale(1)",
      borderRadius: "8px",
      margin: "0",
      willChange: "transform, box-shadow",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    };
    
    if (index === 0) return { 
      ...baseStyles,
      background: isHovered 
        ? "linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%)"
        : "linear-gradient(135deg, #fffbe6 0%, #fff2d3 100%)", 
      color: "#d48806", 
      fontWeight: 600,
      boxShadow: isHovered 
        ? "0 8px 25px rgba(212, 136, 6, 0.25), 0 3px 10px rgba(212, 136, 6, 0.15)" 
        : "0 2px 8px rgba(212, 136, 6, 0.1)"
    };
    if (index === 1) return { 
      ...baseStyles,
      background: isHovered 
        ? "linear-gradient(135deg, #e1f4ff 0%, #e6f7ff 100%)"
        : "linear-gradient(135deg, #e6f7ff 0%, #d4edff 100%)", 
      color: "#1890ff", 
      fontWeight: 600,
      boxShadow: isHovered 
        ? "0 8px 25px rgba(24, 144, 255, 0.25), 0 3px 10px rgba(24, 144, 255, 0.15)" 
        : "0 2px 8px rgba(24, 144, 255, 0.1)"
    };
    if (index === 2) return { 
      ...baseStyles,
      background: isHovered 
        ? "linear-gradient(135deg, #f4ebff 0%, #f9f0ff 100%)"
        : "linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)", 
      color: "#9254de", 
      fontWeight: 600,
      boxShadow: isHovered 
        ? "0 8px 25px rgba(146, 84, 222, 0.25), 0 3px 10px rgba(146, 84, 222, 0.15)" 
        : "0 2px 8px rgba(146, 84, 222, 0.1)"
    };
    return { 
      ...baseStyles,
      background: isHovered 
        ? "linear-gradient(135deg, #f0f0f0 0%, #f5f5f5 100%)"
        : "linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%)", 
      color: "#595959",
      fontWeight: index < 5 ? 600 : 500,
      boxShadow: isHovered 
        ? "0 6px 20px rgba(0, 0, 0, 0.15), 0 3px 8px rgba(0, 0, 0, 0.1)" 
        : "0 2px 6px rgba(0, 0, 0, 0.05)"
    };
  };

  return (
    <>
      <style>{scrollbarStyles}</style>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{ 
          minWidth: "300px", 
          maxHeight: "480px", // 增加高度以完整顯示 10 個項目
          overflowY: "auto",
          // 自定義 scrollbar 樣式 (Firefox)
          scrollbarWidth: "thin",
          scrollbarColor: "#d9d9d9 transparent"
        }}
        className="custom-scrollbar"
      >
      <motion.div
        style={{
          fontWeight: 600,
          marginBottom: 16,
          fontSize: 18,
          textAlign: "center",
          background: "linear-gradient(45deg, #1890ff, #722ed1)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "0.5px"
        }}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        🏆 {t("大善人排行榜")} 🏆
      </motion.div>

      {donors.length === 0 ? (
        <motion.div 
          style={{ 
            color: "#aaa", 
            textAlign: "center", 
            padding: "20px",
            fontSize: "14px"
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          🤗 {t("善心小缺席，等你來加入！")}
        </motion.div>
      ) : (
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "3px",
          transform: "translateZ(0)" // 啟用硬體加速
        }}>
          {donors.slice(0, 10).map((donor, index) => {
            const isHovered = hoveredIndex === index;
            const amount = `$${donor.total_donation.toLocaleString()}`;
            const prefix = index < 3 ? MEDAL_EMOJIS[index] : `${index + 1}.`;
            const style = getRankStyle(index, isHovered);

            return (
              <motion.div
                key={index}
                initial={{ 
                  opacity: 0, 
                  scale: 0.8,
                  filter: "blur(4px)"
                }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  filter: "blur(0px)"
                }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.12,
                  ease: [0.23, 1, 0.32, 1], // easeOutExpo 更有質感
                  opacity: { duration: 0.4, delay: index * 0.12 },
                  scale: { duration: 0.5, delay: index * 0.12 + 0.1 },
                  filter: { duration: 0.3, delay: index * 0.12 + 0.2 }
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  ...style,
                  padding: "8px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                {/* 微光效果 */}
                {isHovered && (
                  <motion.div
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{ x: "100%", opacity: [0, 1, 0] }}
                    transition={{ 
                      duration: 0.8, 
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                      pointerEvents: "none",
                      transform: "skewX(-20deg)"
                    }}
                  />
                )}
                
                {/* 左側：排名 + 暱稱 */}
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "6px",
                  flex: 1,
                  minWidth: 0 // 允許縮小
                }}>
                  <motion.span 
                    style={{ 
                      fontSize: index < 3 ? "16px" : "14px",
                      fontWeight: 700,
                      flexShrink: 0,
                      textShadow: "0 1px 2px rgba(0,0,0,0.1)"
                    }}
                    animate={{ 
                      scale: isHovered ? (index < 3 ? 1.1 : 1.05) : 1,
                      rotate: isHovered && index < 3 ? [0, -6, 6, 0] : 0
                    }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  >
                    {prefix}
                  </motion.span>
                  <span style={{ 
                    fontFamily: "'SF Pro Text', -apple-system, system-ui, sans-serif",
                    fontSize: index < 3 ? "14px" : "13px",
                    fontWeight: index < 3 ? 600 : 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    letterSpacing: "0.1px"
                  }}>
                    {donor.nickname}
                  </span>
                </div>
                
                {/* 右側：金額 */}
                <motion.span 
                  style={{ 
                    fontWeight: 600,
                    fontSize: index < 3 ? "13px" : "12px",
                    flexShrink: 0,
                    marginLeft: "8px"
                  }}
                  animate={{ 
                    scale: isHovered ? 1.05 : 1,
                    color: isHovered ? "#ff4d4f" : "inherit"
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {amount}
                </motion.span>

                {/* 頂級排名特效 */}
                {index < 3 && isHovered && (
                  <motion.div
                    initial={{ scale: 0, rotate: -90, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 0.25 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: "24px",
                      pointerEvents: "none",
                      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))"
                    }}
                  >
                    ⭐
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 底部裝飾 */}
      <motion.div
        style={{
          marginTop: "8px",
          padding: "6px",
          textAlign: "center",
          fontSize: "11px",
          color: "#999",
          borderTop: "1px solid #f0f0f0"
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        💝 {t("感謝每一份愛心捐贈")}
      </motion.div>
      </motion.div>
    </>
  );
};