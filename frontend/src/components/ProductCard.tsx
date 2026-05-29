// ✅ 完整 ProductCard.tsx (僅差在 showUnlike/liked/onUnlike)
import React, { useState, useMemo, useCallback } from "react";
import { Card, Typography, Tooltip, Tag, Divider } from "antd";
import { HeartFilled, HeartOutlined, MessageOutlined, EyeOutlined } from "@ant-design/icons";
import { Product } from "../types/productResponse";
import AiRating03 from "../assets/img/ai_tag_03.svg";
import AiRating04 from "../assets/img/ai_tag_04.svg";
import AiRating05 from "../assets/img/ai_tag_05.svg";
import GoodIcon from "../assets/img/good.png";
import LazyImage from "./LazyImage";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";


const { Title } = Typography;

// 移到組件外部的靜態數據
const AI_RATING_IMAGES = {
  3: AiRating03,
  4: AiRating04,
  5: AiRating05,
} as const;

const getAiRatingImage = (rating: number) => {
  return AI_RATING_IMAGES[rating as keyof typeof AI_RATING_IMAGES];
};

const SOLD_MESSAGES = [
  i18n.t("我被 {name} 抱回家了！"),
  i18n.t("恭喜 {name} 入手成功！"),
  i18n.t("我的命定之人是 {name}！"),
  i18n.t("再見啦～它跟 {name} 走了！"),
  i18n.t("這寶貝屬於 {name}"),
  i18n.t("「已被收編（by {name}）！」"),
  i18n.t("來不及囉，{name} 搶先！"),
  i18n.t("此物已歸 {name} 所有！"),
  i18n.t("{name}：「我先買先贏！」"),
  i18n.t("被眼尖的 {name} 搶走啦！")
] as const;

interface ProductCardProps {
  product: Product;
  showUnlike?: boolean;
  liked?: boolean;
  likedProductsLoaded?: boolean; // 新增載入狀態
  onLike?: (id: number) => void
  onUnlike?: (id: number) => void;
  priority?: boolean; // 新增優先載入標記
}

const ProductCard: React.FC<ProductCardProps> = React.memo(({ 
  product, 
  showUnlike = false, 
  liked = false, 
  likedProductsLoaded = true, // 預設為已載入
  onUnlike, 
  onLike,
  priority = false // 預設非優先
}) => {
  const { t } = useTranslation();
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [donationBadgeHover, setDonationBadgeHover] = useState(false);

  // 使用 useMemo 來計算衍生值
  const isSold = useMemo(() => product.product_status === 2, [product.product_status]);
  const shouldShowAiRating = useMemo(() => (product.ai_rating ?? 0) >= 3, [product.ai_rating]);
  const shouldShowDonationBadge = useMemo(() => (product.donation_ratio ?? 0) >= 60, [product.donation_ratio]);
  const donationBadgeText = useMemo(() => {
    if (product.donation_ratio >= 60) return t("此物為捐贈比例達 60% 以上商品所產生的善意循環光球");
    return "";
  }, [product.donation_ratio]);
  
  const messageIdx = useMemo(() => 
    ((product.id || 0) + (product.ai_rating || 0) + (product.condition || 0)) % 10,
    [product.id, product.ai_rating, product.condition]
  );
  
  const { messageBefore, messageAfter, buyerName } = useMemo(() => {
    // 提取 email 的 local part（@ 前面的部分）
    const rawBuyerName = product.buyer_name || t("買家");
    const buyerName = rawBuyerName.includes("@") 
      ? rawBuyerName.split("@")[0] 
      : rawBuyerName;
    
    const [before, after] = SOLD_MESSAGES[messageIdx].split("{name}");
    return { messageBefore: before, messageAfter: after, buyerName };
  }, [product.buyer_name, messageIdx]);

  // 使用 useCallback 來優化事件處理函數
  const handleUnlike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    onUnlike?.(product.id);
  }, [onUnlike, product.id]);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(product.id);
  }, [onLike, product.id]);

  const handleCardClick = useCallback(() => {
    window.open(`/product/${product.id}`, '_blank');
  }, [product.id]);

  return (
    <>
      <style>
        {`
          @keyframes slowRotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .donation-badge-rotating {
            animation: slowRotate 10s linear infinite;
          }
        `}
      </style>
      <div style={{ transition: "transform 0.3s ease" }} className="card-hover-wrapper">
      <Card
        hoverable
        onClick={handleCardClick}
        style={{
          height: "365px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRadius: "14px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          border: "1px solid #f0f0f0",
          background: "#fff",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          cursor: "pointer",
        }}
        bodyStyle={{ padding: "4px 10px 6px 10px" }}
        cover={
          <div style={{
            position: "relative",
            borderRadius: "12px 12px 0 0",
            overflow: "hidden",
            background: "#f8f8f8",
            isolation: "isolate",
          }}>
            {isSold && (
              <div style={{
                position: "absolute",
                top: 105,
                left: -48,
                width: "400px",
                transform: "rotate(40deg)",
                fontWeight: 700,
                fontSize: 16,
                textAlign: "center",
                padding: "10px 0",
                zIndex: 2,
                letterSpacing: 1,
                backgroundImage: "repeating-linear-gradient(45deg, yellow 0 16px, #ffe600 16px 32px)",
                borderTop: "6px dashed black",
                borderBottom: "6px dashed black",
                borderRadius: "12px",
                lineHeight: "24px",
              }}>
                {messageBefore}<span style={{ color: "#d32f2f" }}>{buyerName}</span>{messageAfter}
              </div>
            )}

            <LazyImage
              alt={product.product_name}
              src={product.image_url}
              className="card-image"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              optimized={!priority} // 優先商品不優化URL，直接載入原圖
              showSkeleton={!priority} // 優先商品不顯示骨架屏
              style={{
                height: "240px",
                width: "100%",
                objectFit: "cover",
                borderRadius: "12px 12px 0 0",
                transition: "transform 0.3s ease",
                transformOrigin: "center",
                opacity: isSold ? 0.5 : 1,
              }}
            />

            {getAiRatingImage(product.ai_rating ?? 0) && (
              <img
                src={getAiRatingImage(product.ai_rating ?? 0)}
                alt={`AI Rating ${product.ai_rating}`}
                className="ai-rating-badge"
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  border: "2px solid #e6f7ff",
                  padding: 2,
                  transition: "transform 0.3s ease",
                  zIndex: 1,
                }}
              />
            )}

            {/* 大善人徽章 */}
            {shouldShowDonationBadge && (
              <Tooltip title={donationBadgeText} placement={shouldShowAiRating ? "left" : "top"}>
                <img
                  src={GoodIcon}
                  alt={donationBadgeText}
                  className={`donation-badge ${donationBadgeHover ? 'donation-badge-rotating' : ''}`}
                  onMouseEnter={() => setDonationBadgeHover(true)}
                  onMouseLeave={() => setDonationBadgeHover(false)}
                  style={{
                    position: "absolute",
                    top: shouldShowAiRating ? "70px" : "10px",
                    right: "10px",
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    padding: 4,
                    transition: "all 0.3s ease",
                    zIndex: 1,
                    cursor: "pointer",
                  }}
                />
              </Tooltip>
            )}

            {/* ❤️ 收藏按鈕 */}
            {showUnlike && (
              <Tooltip title={
                !likedProductsLoaded ? t("載入中...") :
                liked ? t("取消收藏") : t("加入收藏")
              }>
                {!likedProductsLoaded ? (
                  // 載入中狀態：顯示灰色愛心
                  <HeartOutlined
                    style={{
                      position: "absolute",
                      bottom: 8,
                      left: 8,
                      fontSize: 20,
                      color: "#ccc",
                      zIndex: 3,
                      background: "#fff",
                      borderRadius: "50%",
                      padding: 4,
                      boxShadow: "0 0 6px rgba(0,0,0,0.1)",
                      cursor: "not-allowed",
                      opacity: 0.6,
                    }}
                  />
                ) : liked ? (
                  <HeartFilled
                    onClick={(e) => {
                      handleUnlike(e);
                      setLikeAnimating(true);
                      setTimeout(() => setLikeAnimating(false), 300);
                    }}
                    style={{
                      position: "absolute",
                      bottom: 8,
                      left: 8,
                      fontSize: 20,
                      color: "#ff4d4f",
                      zIndex: 3,
                      background: "#fff",
                      borderRadius: "50%",
                      padding: 4,
                      boxShadow: "0 0 6px rgba(0,0,0,0.1)",
                      transition: "transform 0.2s ease, color 0.2s ease",
                      transform: likeAnimating ? "scale(1.4)" : "scale(1)",
                    }}
                  />
                ) : (
                  <HeartOutlined
                    onClick={(e) => {
                      handleLike(e);
                      setLikeAnimating(true);
                      setTimeout(() => setLikeAnimating(false), 300);
                    }}
                    style={{
                      position: "absolute",
                      bottom: 8,
                      left: 8,
                      fontSize: 20,
                      color: "#999",
                      zIndex: 3,
                      background: "#fff",
                      borderRadius: "50%",
                      padding: 4,
                      boxShadow: "0 0 6px rgba(0,0,0,0.1)",
                      transition: "transform 0.2s ease, color 0.2s ease",
                      transform: likeAnimating ? "scale(1.4)" : "scale(1)",
                    }}
                  />
                )}
              </Tooltip>
            )}
          </div>
        }
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(-4px) scale(1.03)";
          el.style.boxShadow = "0 8px 32px rgba(24,144,255,0.10)";
          const img = el.querySelector(".card-image") as HTMLElement;
          if (img) img.style.transform = "scale(1.08)";
          const aiBadge = el.querySelector(".ai-rating-badge") as HTMLElement;
          if (aiBadge) aiBadge.style.transform = "scale(1.25)";
          const donationBadge = el.querySelector(".donation-badge") as HTMLElement;
          if (donationBadge) {
            donationBadge.style.transform = "scale(1.15) rotate(10deg)";
            donationBadge.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
          }
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "scale(1)";
          el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)";
          const img = el.querySelector(".card-image") as HTMLElement;
          if (img) img.style.transform = "scale(1)";
          const aiBadge = el.querySelector(".ai-rating-badge") as HTMLElement;
          if (aiBadge) aiBadge.style.transform = "scale(1)";
          const donationBadge = el.querySelector(".donation-badge") as HTMLElement;
          if (donationBadge) {
            donationBadge.style.transform = "scale(1) rotate(0deg)";
            donationBadge.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
          }
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: isSold ? 0.5 : 1 }}>
          <Title level={4} style={{ fontSize: 16, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {product.product_name}
          </Title>
          <Tag color="blue" style={{ fontSize: 12 }}>{t("編號:")} {product.id}</Tag>
        </div>
        <div style={{
          color: "#666",
          fontSize: "13px",
          height: 24,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          opacity: isSold ? 0.5 : 1,
        }}>
          {product.ai_comment}
        </div>
        <Divider style={{ margin: "4px 0", opacity: isSold ? 0.5 : 1 }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 500, fontSize: 15, opacity: isSold ? 0.5 : 1 }}>
          <span style={{ color: "#1890ff", fontSize: 17, fontWeight: 700 }}>${product.price}</span>
          <span style={{ color: "#888", fontSize: 14 }}>{product.seller_nickname}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, opacity: isSold ? 0.5 : 1 }}>
          <span style={{ color: "#ff7875", display: "flex", alignItems: "center", gap: 3, fontSize: "12px" }}>
            <HeartOutlined /> {product.like_count || 0}
          </span>
          <span style={{ color: "#52c41a", display: "flex", alignItems: "center", gap: 3, fontSize: "12px" }}>
            <MessageOutlined /> {product.comment_count || 0}
          </span>
          <span style={{ color: "#1890ff", display: "flex", alignItems: "center", gap: 3, fontSize: "12px" }}>
            <EyeOutlined /> {product.view_count || 0}
          </span>
        </div>
      </Card>
    </div>
    </>
  );
});

// 添加 displayName 用於 React DevTools
ProductCard.displayName = 'ProductCard';

export default ProductCard;
