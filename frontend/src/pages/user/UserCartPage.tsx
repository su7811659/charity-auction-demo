import React, { useEffect, useState, useCallback } from "react";
import { Row, Col, Typography, Spin, Empty, Button } from "antd";
import { getLikedProducts, unlikeProduct } from "../../services/productService";
import { Product } from "../../types/productResponse";
import ProductCard from "../../components/ProductCard";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { HeartFilled } from "@ant-design/icons";

const { Title, Paragraph } = Typography;

const UserCartPage: React.FC = () => {
  const { t } = useTranslation();
  const [likedProducts, setLikedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 隨機文案列表
  const phrases = [
    t("那些一眼心動的，是你不肯放手的溫柔。"),
    t("收藏，不只是商品，更是一段曾經心動的故事。"),
    t("每一件喜歡的物品，都悄悄記下了你的偏愛。"),
    t("時間偷不走的，是你曾經為之一亮的眼神。"),
    t("願你珍藏的不只是物品，還有那一瞬的悸動。"),
    t("我們用一點點喜歡，偷偷標記生活中閃亮的角落。"),
  ];

  // 隨機選擇文案
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

  useEffect(() => {
    getLikedProducts(() => {
      console.error("取得收藏清單失敗");
      setLoading(false);
      return { items: [], total: 0 };
    }).then((res) => {
      setLikedProducts(res.items);
      setLoading(false);
    });
  }, []);

  // 優化的取消收藏回調函數
  const handleUnlike = useCallback((id: number) => {
    unlikeProduct(id, console.error).then(() => {
      setLikedProducts((prev) => prev.filter((p) => p.id !== id));
    });
  }, []);

  return (
    <div style={{ margin: "0 auto", padding: "40px 24px", maxWidth: 1200 }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 0.6,
          }}
          whileHover={{
            scale: 1.2,
            rotate: 15,
            transition: { type: "spring", stiffness: 300 },
          }}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "#1890ff",
            margin: "0 auto 8px",
          }}
        >
          <HeartFilled
            style={{
              color: "#fff",
              fontSize: "32px",
            }}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Title
            level={3}
            style={{
              fontWeight: "bold",
              marginBottom: "4px",
              textAlign: "center",
            }}
          >
            {t("我的收藏")}
          </Title>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Paragraph
            style={{
              color: "#666",
              fontSize: "16px",
              textAlign: "center",
              marginBottom: "32px",
            }}
          >
            {randomPhrase}
          </Paragraph>
        </motion.div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin size="large" />
        </div>
      ) : likedProducts.length === 0 ? (
        <motion.div
          style={{ textAlign: "center", padding: "40px 0" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: "#666", fontSize: "16px" }}>
                {t("你還沒有收藏任何商品")}
                <br />
                {t("不妨到商品頁面多多探索唷 ✨")}
              </span>
            }
          />
          <Button
            type="primary"
            style={{ marginTop: "24px" }}
            onClick={() => (window.location.href = "/products")}
          >
            {t("去探索商品")}
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              background: "#fff",
              borderRadius: "18px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              padding: "12px 16px 16px 16px", // 將上方padding從24px改為12px
            }}
          >
            <Row gutter={[24, 24]}>
              <AnimatePresence mode="popLayout">
                {likedProducts.map((product) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                    <motion.div
                      layout
                      transition={{
                        layout: { duration: 0.4, ease: "easeInOut" },
                        duration: 0.3,
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <ProductCard
                        product={product}
                        showUnlike={true}
                        liked={true}
                        onUnlike={handleUnlike}
                      />
                    </motion.div>
                  </Col>
                ))}
              </AnimatePresence>
            </Row>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default UserCartPage;