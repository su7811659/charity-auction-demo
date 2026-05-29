// TotalDonationCounter.tsx
import { useTranslation } from "react-i18next";
import { Tooltip, Popover } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { ReactNode, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface TotalDonationCounterProps {
  totalDonation: number;
  popoverContent: ReactNode;
}

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasLoadedInitialValue, setHasLoadedInitialValue] = useState(false);
  const prevValueRef = useRef(0);

  useEffect(() => {
    // 如果還沒載入過初始值且當前值大於0，直接設置不動畫
    if (!hasLoadedInitialValue && value > 0) {
      setDisplayValue(value);
      setHasLoadedInitialValue(true);
      prevValueRef.current = value;
      return;
    }

    // 如果已經載入過初始值，且值有變化，才觸發動畫
    if (hasLoadedInitialValue && prevValueRef.current !== value && prevValueRef.current > 0 && value > 0) {
      setIsAnimating(true);
      
      // 數字動畫效果
      const startValue = prevValueRef.current;
      const endValue = value;
      const duration = 1500; // 1.5秒動畫
      const frameRate = 60;
      const totalFrames = Math.round(duration / (1000 / frameRate));
      let currentFrame = 0;

      const animate = () => {
        currentFrame++;
        const progress = currentFrame / totalFrames;
        
        // 使用 easeOutCubic 緩動函數讓動畫更自然
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (endValue - startValue) * easeProgress);
        
        setDisplayValue(currentValue);

        if (currentFrame < totalFrames) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    }
    
    prevValueRef.current = value;
  }, [value, hasLoadedInitialValue]);

  // 如果還沒載入初始值，顯示載入狀態
  if (!hasLoadedInitialValue) {
    return (
      <span style={{ 
        fontSize: 32, 
        color: "#facc15", 
        fontWeight: "bold",
        display: "inline-block"
      }}>
        $--
      </span>
    );
  }

  return (
    <motion.span
      style={{ 
        fontSize: 32, 
        color: "#facc15", 
        fontWeight: "bold",
        display: "inline-block"
      }}
      animate={isAnimating ? {
        scale: [1, 1.05, 1],
        color: ["#facc15", "#ff6b35", "#facc15"]
      } : {}}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      ${displayValue.toLocaleString()}
    </motion.span>
  );
};

export const TotalDonationCounter: React.FC<TotalDonationCounterProps> = ({
  totalDonation,
  popoverContent
}) => {
  const { t } = useTranslation();
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "0.5rem", 
      color: "white", 
      marginLeft: 24, 
      fontSize: 14 
    }}>
      <div style={{ display: "flex", paddingRight: 4, gap: "0.35rem" }}>
        <span style={{ color: "#ccc", position: 'relative', top: -1 }}>{t("已累積")}</span>
        <Tooltip title={t("此金額為所有商品成交後的總捐贈金額")}>
          <InfoCircleOutlined style={{ color: "#69c0ff" }} />
        </Tooltip>
      </div>
      <Popover
        content={popoverContent}
        trigger="hover"
        placement="bottomRight"
        style={{ paddingRight: 4 }}
      >
        <div style={{ marginLeft: 4 }}>
          <AnimatedNumber value={totalDonation} />
        </div>
      </Popover>
    </div>
  );
};