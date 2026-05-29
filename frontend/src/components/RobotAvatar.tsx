// components/RobotAvatar.tsx
import React from "react";

interface RobotAvatarProps {
  image: string;
  size?: number;               // 機器人外框大小（預設 64）
  imageSize?: number;          // gif 圖片實際大小（預設 size - 4）
  offsetX?: number;            // 相對父層水平位移（預設 -30）
  offsetY?: number;            // 相對父層垂直位移（預設 -30）
  backgroundColor?: string;    // 背景圓形底色（預設 #F0F0F0）
  zIndex?: number;             // 層級控制（預設 1）
  hoverScale?: number; // 新增：hover 時放大倍率（預設 1.08）
}

const RobotAvatar: React.FC<RobotAvatarProps> = ({
  image,
  size = 64,
  imageSize,
  offsetX = -30,
  offsetY = -30,
  backgroundColor = "#F0F0F0",
  zIndex = 1,
  hoverScale = 1.08,
}) => {
  const actualImageSize = imageSize || size - 4;

  return (
    <div
      style={{
        position: "absolute",
        top: offsetY,
        left: offsetX,
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex,
        transition: "transform 0.3s ease-in-out",
        willChange: "transform",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = `scale(${hoverScale})`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <img
        src={image}
        alt="robot status"
        style={{
          width: actualImageSize,
          height: actualImageSize,
          transform: "translate(0, -3px)",
          imageRendering: "auto",   // 可試試 "crisp-edges" 或 "pixelated" 看需求
          filter: "blur(0)",        // 🔸強制不要套模糊（有些 GPU 會套）
          willChange: "transform",  // 🔸也對 img 本身做優化提示
          backfaceVisibility: "hidden", // 🔸防止重繪閃爍
        }}
      />
    </div>
  );
};

export default RobotAvatar;