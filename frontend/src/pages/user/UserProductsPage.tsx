import React, { useState, useEffect } from "react";
import {
  Table,
  Modal,
  Button,
  Spin,
  Tag,
  Row,
  Col,
  Card,
  message,
  Typography,
} from "antd";
import { AppstoreFilled, ShoppingFilled } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  getMyProducts,
  getMyPurchasedProducts,
} from "../../services/userService";
import type {
  Product,
  ProductForBuyer,
} from "../../types/productResponse";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getCurrentUserEmail } from "../../utils/authUtils";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Paragraph } = Typography;

const cardStyle: React.CSSProperties = {
  backgroundColor: '#F5F5F5',
  padding: 16,
  borderRadius: 8,
  minHeight: 64,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 4
};

const UserProductsPage = () => {
  const { t } = useTranslation();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<ProductForBuyer[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | ProductForBuyer | null>(null);
  const [selectedTab, setSelectedTab] = useState<"seller" | "buyer">("seller");

  // Type guard to safely check for description property
  const hasDescription = (p: unknown): p is { description: string } => {
    return !!p && typeof p === 'object' && 'description' in (p as any);
  };

  const showDetail = (product: Product | ProductForBuyer) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const renderCondition = (condition: number) => {
    switch (condition) {
      case 1:
        return t("全新");
      case 2:
        return t("九成新");
      case 3:
        return t("五成新");
      case 4:
        return t("低於五成新");
      default:
        return t("未知狀態");
    }
  };

  const renderStatus = (product: Product) => {
    if (product.is_approve) return <Tag color="green">{t("審核通過")}</Tag>;
    if (product.is_rejected) return <Tag color="red">{t("否決")}</Tag>;
    return <Tag color="gold">{t("審核中")}</Tag>;
  };

  const renderProductStatus = (status: number) => {
    const statusMap = [
      { text: t("尚未到貨"), color: "default" },
      { text: t("已到貨待成交"), color: "processing" },
      { text: t("已成交"), color: "success" },
    ];
    const { text, color } = statusMap[status] || { text: t("未知"), color: "default" };
    return <Tag color={color}>{text}</Tag>;
  };

  const totalDonation = myProducts.reduce((acc, p) => acc + (p.donation_amount ?? 0), 0);
  const totalIncome = myProducts
    .filter(p => p.product_status === 2 && !p.is_online_deal) // 只計算現場成交的收入
    .reduce((acc, p) => acc + (p.seller_income ?? 0), 0);
  const onlineDonationOwed = myProducts
    .filter(p => p.product_status === 2 && p.is_online_deal) // 線上成交需追繳的捐贈款
    .reduce((acc, p) => acc + (p.donation_amount ?? 0), 0);
  const totalSpent = purchasedProducts.reduce((acc, p) => acc + (p.price ?? 0), 0);
  
  // 計算最終結算：我的總收入 - 線上交易需追繳的捐贈款
  const finalBalance = totalIncome - onlineDonationOwed;

  // 捐贈里程碑訊息 - 隱藏級距版（幽默暖心）
  const getDonationMessage = (amount: number): string => {
    const step = 300;
    const tier = Math.floor(amount / step);
    const next = (tier + 1) * step;
    const gap = Math.max(next - amount, 0);

    if (amount === 0) {
      return t("還沒開始？世界正在等你第一件商品登場！✨");
    }
    if (amount % step === 0 && amount !== 0) {
      return t("哇～捐款金額剛好踩到一個漂亮整數！不愧是「數字美學大師」👏");
    }
    if (gap <= 50) {
      return t("快衝破新紀錄啦！只差 {{gap}} 元，感覺再上一件商品就能看到奇蹟～🔥", { gap: gap.toLocaleString() });
    }
    return t("目前累積 {{amount}} 元💖，已經超帥了！再多上傳一點點，愛心能量就更澎湃～", { amount: amount.toLocaleString() });
  };


  const donationMessage = getDonationMessage(totalDonation);

  const handleExport = () => {
    const soldProducts = myProducts.filter((p) => p.product_status === 2);

    // 計算彙總數據
    const totalSellerIncome = soldProducts
      .filter(p => !p.is_online_deal) // 只計算現場成交的收入
      .reduce((acc, p) => acc + (p.seller_income ?? 0), 0);
    const totalOnlineDonationOwed = soldProducts
      .filter(p => p.is_online_deal) // 線上成交需追繳的捐贈款
      .reduce((acc, p) => acc + (p.donation_amount ?? 0), 0);
    const finalBalance = totalSellerIncome - totalOnlineDonationOwed;

    // 以 AOA 方式輸出，三個空白欄用空字串代表（不會出現欄位名稱）。
    const header = [
      t("商品編號"),
      t("商品名稱"),
      t("商品售價"),
      t("捐贈比例"),
      t("捐贈金額"),
      t("賣家收入"),
      t("買家"),
      t("成交狀態"),
      "", // 空白欄1
      "", // 空白欄2
      "", // 空白欄3
      t("賣家總收入"),
      t("線上成交追繳捐贈款"),
      t("最終結算"),
    ];

    const summaryRow = [
      t("彙總"), // 商品編號欄放彙總標記
      "",
      "",
      "",
      totalDonation,
      "",
      "",
      "",
      "", "", "", // 三個空白欄
      totalSellerIncome,
      totalOnlineDonationOwed,
      finalBalance,
    ];

    const rows = soldProducts.map((p) => [
      p.id,
      p.product_name,
      p.price,
      `${p.donation_ratio}%`,
      p.donation_amount ?? 0,
      p.seller_income ?? 0,
      p.buyer_name ?? "-",
      p.is_online_deal ? t("線上成交") : t("現場成交"),
      "", "", "", // 三個空白欄
      "", // 賣家總收入（只在彙總列顯示）
      "", // 線上成交追繳捐贈款（只在彙總列顯示）
      "", // 最終結算（只在彙總列顯示）
    ]);

    const aoa = [header, summaryRow, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("成交明細"));
    
    // 使用用戶 email 作為文件名（多層 fallback）
    const tokenEmail = getCurrentUserEmail() || '';
    let storedEmail = '';
    try {
      storedEmail = (JSON.parse(localStorage.getItem('user') || '{}')?.email) || '';
    } catch {}
    const directEmail = localStorage.getItem('user_email') || '';
    const userEmail = tokenEmail || storedEmail || directEmail || 'unknown';
    const fileName = `${userEmail}_${t("商品成交明細")}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    message.success(t("已下載 Excel 成交明細"));
  };

  const sellerColumns: ColumnsType<Product> = [
    { title: t("商品編號"), dataIndex: "id", align: "center" },
    { title: t("商品名稱"), dataIndex: "product_name", align: "center" },
    { title: t("商品定價"), dataIndex: "price", align: "center", render: (v) => `$${v}` },
    { title: t("賣家暱稱"), dataIndex: "seller_nickname", align: "center" },
    {
      title: t("商品狀態"),
      dataIndex: "product_status",
      render: renderProductStatus,
      align: "center"
    },
    {
      title: t("成交狀態"),
      align: "center",
      render: (_, record) => {
        if (record.product_status !== 2) {
          return <Tag color="default">-</Tag>;
        } else if (record.is_online_deal) {
          return <Tag color="blue">{t("線上成交")}</Tag>;
        } else {
          return <Tag color="green">{t("現場成交")}</Tag>;
        }
      }
    },
    {
      title: t("上傳時間"),
      dataIndex: "created_at",
      align: "center",
      render: (time) => dayjs.utc(time).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm"),
    },
    { title: t("審核狀態"), align: "center", render: (_, p) => renderStatus(p) },
    { title: t("收入"), dataIndex: "seller_income", align: "center", render: (v) => (v != null ? `$${v}` : "-") },
    { title: t("捐贈比例"), dataIndex: "donation_ratio", align: "center", render: (r) => `${r}%` },
    { title: t("捐贈金額"), dataIndex: "donation_amount", align: "center", render: (v) => (v != null ? `$${v}` : "-") },
    {
      title: t("詳情"),
      align: "center",
      render: (_, record) => (
        <Button type="link" onClick={() => showDetail(record)}>{t("查看")}</Button>
      ),
    },
  ];

  const buyerColumns: ColumnsType<ProductForBuyer> = [
    { title: t("商品名稱"), dataIndex: "product_name", align: "center" },
    { title: t("賣家暱稱"), dataIndex: "seller_nickname", align: "center" },
    {
      title: t("賣家Email"),
      dataIndex: "seller_name",
      align: "center",
      render: (email) => (
        <span style={{ 
          fontFamily: 'monospace', 
          fontSize: '12px',
          color: '#666',
          background: '#f5f5f5',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {email}
        </span>
      )
    },
    {
      title: t("購買時間"),
      dataIndex: "created_at",
      align: "center",
      render: (time) => dayjs.utc(time).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm"),
    },
    { title: t("價格"), dataIndex: "price", render: (v) => `$${v}`, align: "center" },
    { title: t("留言數"), dataIndex: "comment_count", align: "center" },
    {
      title: t("詳情"),
      align: "center",
      render: (_, record) => (
        <Button type="link" onClick={() => showDetail(record)}>{t("查看")}</Button>
      ),
    },
  ];

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [res1, res2] = await Promise.all([getMyProducts(), getMyPurchasedProducts()]);
        setMyProducts(res1.items);
        setPurchasedProducts(res2.items);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  // 已經內聯到render部分，不需要這些常量了

  // 新增隨機副標題列表
  const subtitles = [
    t("讓每個商品都找到最適合的主人"),
    t("用心經營，打造專屬的小商店"),
    t("這裡記錄著你的買賣故事"),
    t("管理商品，創造價值"),
    t("每筆交易都是一段美好的緣份"),
    t("用愛心串起買賣雙方的橋樑"),
  ];

  // 隨機選擇副標題
  const randomSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];

  return (
    <>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <style>
        {`
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .toggle-switch {
            display: grid;
            grid-template-columns: 1fr 1fr;
            background: #f0f2f5;
            border-radius: 9999px;
            padding: 4px;
            position: relative;
            width: 100%;
            max-width: 420px;
            margin: 0 auto;
            box-shadow: none; /* 移除可能造成黑色外框感的陰影 */
          }
          .toggle-option {
            padding: 12px 16px;
            font-size: 15px;
            font-weight: 600;
            border: none !important;
            background: transparent !important;
            color: #666;
            cursor: pointer;
            transition: color 0.25s ease, transform 0.2s ease;
            position: relative;
            z-index: 2;
            white-space: nowrap;
            outline: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border-radius: 9999px;
            user-select: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
          }
          .toggle-option.active {
            color: #1890ff;
          }
          .toggle-option:focus,
          .toggle-option:active {
            background: transparent !important;
            box-shadow: none !important;
          }
          .toggle-slider {
            position: absolute;
            top: 4px;
            left: 4px;
            height: calc(100% - 8px);
            width: calc(50% - 4px);
            background: #ffffff;
            border-radius: 9999px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.10); /* 還原滑塊陰影 */
            border: none;
            outline: none;
            transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 1;
          }
          /* 此頁面僅移除 按鈕 與 切換區 的焦點外框 */
          .ant-btn:focus,
          .ant-btn:focus-visible,
          .ant-btn:active,
          .ant-btn:focus-within {
            outline: none !important;
            box-shadow: none !important;
          }
          .toggle-option:hover:not(.active) {
            color: #40a9ff;
            transform: scale(1.02);
            background: transparent !important;
          }
          .stat-card {
            padding: 24px;
            border-radius: 16px;
            color: white;
            animation: fadeInUp 0.8s ease;
            position: relative;
            overflow: hidden;
          }
          .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.1);
            border-radius: 16px;
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .stat-card:hover::before {
            opacity: 1;
          }
          .stat-card.donation {
            background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
          }
          .stat-card.income {
            background: linear-gradient(135deg, #4cd964, #5ee077);
          }
          .stat-card.spent {
            background: linear-gradient(135deg, #5b7fff, #6e90ff);
          }
          tr {
            transition: all 0.3s ease;
          }
          tr:hover {
            background-color: #f0f7ff !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .ant-table-thead > tr > th {
            background: #fafafa !important; /* 移除漸層，改為扁平色 */
            font-weight: 600;
            color: #595959;
            border-bottom: 1px solid #f0f0f0;
          }
          .ant-table-tbody > tr > td {
            border-bottom: 1px solid #f1f3f4;
            padding: 16px 12px;
          }
        `}
      </style>

      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 0.6
          }}
          whileHover={{ 
            scale: 1.2,
            rotate: 15,
            transition: { type: "spring", stiffness: 300 }
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
          <AppstoreFilled
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
            {t("我的商品管理")}
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
            {randomSubtitle}
          </Paragraph>
        </motion.div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <motion.div 
            className="toggle-switch"
            style={{ textAlign: "center", marginBottom: 32 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <motion.div
              className="toggle-slider"
              animate={{
                transform: selectedTab === "seller" ? "translateX(0%)" : "translateX(100%)"
              }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            />
            <motion.button
              className={`toggle-option ${selectedTab === "seller" ? "active" : ""}`}
              onClick={() => setSelectedTab("seller")}
              whileHover={{ scale: selectedTab !== "seller" ? 1.02 : 1 }}
              whileTap={{ scale: 0.98 }}
            >
              <AppstoreFilled style={{ fontSize: 16 }} />
              {t("我上架的商品")}
            </motion.button>
            <motion.button
              className={`toggle-option ${selectedTab === "buyer" ? "active" : ""}`}
              onClick={() => setSelectedTab("buyer")}
              whileHover={{ scale: selectedTab !== "buyer" ? 1.02 : 1 }}
              whileTap={{ scale: 0.98 }}
            >
              <ShoppingFilled style={{ fontSize: 16 }} />
              {t("我購買的商品")}
            </motion.button>
          </motion.div>

          <AnimatePresence mode="wait">
            {selectedTab === "seller" ? (
              <motion.div
                key="seller"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
              {/* 商品表格放在最上面 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", position: 'relative', marginBottom: 24 }}
              >
                <Table
                  rowKey="id"
                  dataSource={myProducts}
                  columns={sellerColumns}
                  size="middle"
                  pagination={{ pageSize: 5 }}
                  scroll={{ x: 'max-content' }}
                  onRow={(record) => ({
                    onClick: () => showDetail(record),
                    style: { cursor: 'pointer' }
                  })}
                />
              </motion.div>

              {/* 下載按鈕 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                style={{ textAlign: 'center', marginBottom: 32 }}
              >
                <Button
                  type="primary"
                  onClick={handleExport}
                  size="large"
                  style={{
                    padding: "12px 24px",
                    fontSize: "16px",
                    fontWeight: "600",
                    borderRadius: "8px"
                  }}
                >
                  {t("📊 下載成交明細")}
                </Button>
              </motion.div>

              {/* 統計資料移到最下面 - 簡化設計 */}
              {/* 捐贈總額 */}
              <Row style={{ marginBottom: 20 }}>
                <Col span={24}>
                  <Card 
                    style={{
                      textAlign: "center",
                      backgroundColor: "#f8f9fa",
                      border: "1px solid #eef1f4",
                      borderRadius: 12,
                      boxShadow: '0 6px 16px rgba(0,0,0,0.06)'
                    }}
                  >
                    <div style={{ fontSize: "18px", color: "#6c757d", marginBottom: "8px" }}>
                      {t("我的捐贈總額")}
                    </div>
                    <div style={{ fontSize: "36px", fontWeight: 800, color: "#495057", letterSpacing: 0.5 }}>
                      ${totalDonation.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "14px", color: "#6c757d", marginTop: "8px" }}>
                      {donationMessage}
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* 詳細結算 */}
              <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                <Col xs={24} sm={12} md={8}>
                  <Card style={{ textAlign: "center", borderRadius: 12, boxShadow: '0 6px 16px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "8px" }}>
                      {t("💰 現場成交收入")}
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: 800, color: "#28a745", letterSpacing: 0.5 }}>
                      ${totalIncome.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "4px" }}>
                      {t("系統代收金額")}
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} sm={12} md={8}>
                  <Card style={{ textAlign: "center", borderRadius: 12, boxShadow: '0 6px 16px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "8px" }}>
                      {t("📱 線上成交應繳款")}
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: 800, color: "#dc3545", letterSpacing: 0.5 }}>
                      ${onlineDonationOwed.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "4px" }}>
                      {t("需追繳捐贈款")}
                    </div>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card style={{ textAlign: "center", borderRadius: 12, boxShadow: '0 6px 16px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "8px" }}>
                      {finalBalance >= 0 ? t("🎉 ESG將給您") : t("⚠️ ESG將向您追繳")}
                    </div>
                    <div style={{ 
                      fontSize: "26px", 
                      fontWeight: 800,
                      color: finalBalance >= 0 ? "#28a745" : "#dc3545",
                      letterSpacing: 0.5
                    }}>
                      ${Math.abs(finalBalance).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "4px" }}>
                      {t("最終結算金額")}
                    </div>
                  </Card>
                </Col>
              </Row>
            </motion.div>
          ) : (
            <motion.div
              key="buyer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* 購買商品表格放在最上面 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", marginBottom: 32 }}
              >
                <Table
                  rowKey="id"
                  dataSource={purchasedProducts}
                  columns={buyerColumns}
                  size="middle"
                  pagination={{ pageSize: 5 }}
                  scroll={{ x: 'max-content' }}
                  onRow={(record) => ({ onClick: () => showDetail(record), style: { cursor: 'pointer' } })}
                />
              </motion.div>

              {/* 統計資料移到下面 - 總花費呈現優化 */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={24}>
                  <Card style={{ textAlign: "center", borderRadius: 12, boxShadow: '0 6px 16px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 14, color: "#6c757d", marginBottom: 8 }}>{t("總花費")}</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: "#495057", letterSpacing: 0.5 }}>
                      ${totalSpent.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: "#6c757d", marginTop: 6 }}>
                      {t("已購買 {{count}} 件", { count: purchasedProducts.length })}
                      {purchasedProducts.length > 0 && (
                        <>
                          {t("，平均每件 $")}
                          {Math.round(totalSpent / purchasedProducts.length).toLocaleString()}
                        </>
                      )}
                    </div>
                  </Card>
                </Col>
              </Row>
            </motion.div>
          )}
        </AnimatePresence>
        </>
      )}

      <Modal
        open={modalOpen}
        title={null}
        onCancel={() => setModalOpen(false)}
        footer={
          <Button 
            onClick={() => setModalOpen(false)}
            type="primary"
            size="large"
            style={{
              paddingLeft: 32,
              paddingRight: 32
            }}
          >
            {t("關閉")}
          </Button>
        }
        width={1000}
        style={{ top: 20 }}
        bodyStyle={{ 
          maxHeight: 'calc(100vh - 150px)',
          overflowY: 'auto', 
          padding: 0,
          marginRight: -24,
          paddingRight: 24
        }}
      >
        {selectedProduct && (
          <div style={{ padding: "32px 40px" }}>
            {/* 標題區 */}
            <div style={{ 
              borderBottom: '1px solid #f0f0f0',
              marginBottom: 32,
              paddingBottom: 24
            }}>
              <Title level={4} style={{ margin: 0 }}>{t("商品詳情")}</Title>
            </div>

            <Row gutter={[32, 32]}>
              {/* 左側圖片區 */}
              <Col span={8}>
                <div style={{ 
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  {selectedProduct.image_url ? (
                    <img
                      src={selectedProduct.image_url}
                      alt={t("商品圖片")}
                      style={{ 
                        width: '100%',
                        height: '300px',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{ 
                      width: '100%',
                      height: '300px',
                      background: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999'
                    }}>
                      {t("無商品圖片")}
                    </div>
                  )}
                </div>
              </Col>

              {/* 右側信息區 */}
              <Col span={16}>
                {/* 基本信息區 */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ 
                    fontSize: 28,
                    fontWeight: 'bold',
                    marginBottom: 8
                  }}>
                    {selectedProduct.product_name}
                  </div>
                  <div style={{ 
                    fontSize: 24,
                    color: '#1890ff',
                    fontWeight: 'bold'
                  }}>
                    ${selectedProduct.price}
                  </div>
                </div>

                {/* 狀態信息區 */}
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <div style={{
                      ...cardStyle,
                      backgroundColor: '#f8f9fa',
                      borderRadius: 12
                    }}>
                      <div style={{ color: '#666', marginBottom: 4 }}>{t("商品狀況")}</div>
                      <div style={{ fontSize: 16 }}>{renderCondition(selectedProduct.condition)}</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{
                      ...cardStyle,
                      backgroundColor: '#f8f9fa',
                      borderRadius: 12
                    }}>
                      <div style={{ color: '#666', marginBottom: 4 }}>{t("商品狀態")}</div>
                      <div>{renderProductStatus(selectedProduct.product_status)}</div>
                    </div>
                  </Col>
                </Row>

                {/* 互動數據區 */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col span={8}>
                    <div style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
                      borderRadius: 12,
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                        {selectedProduct.comment_count}
                      </div>
                      <div style={{ color: '#666' }}>{t("留言數")}</div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
                      borderRadius: 12,
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f57c00' }}>
                        {selectedProduct.like_count}
                      </div>
                      <div style={{ color: '#666' }}>{t("按讚數")}</div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
                      borderRadius: 12,
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#43a047' }}>
                        {dayjs.utc(selectedProduct.created_at).tz("Asia/Taipei").format("YYYY-MM-DD")}
                      </div>
                      <div style={{ color: '#666' }}>{t("上傳日期")}</div>
                    </div>
                  </Col>
                </Row>

                {/* 賣家資訊區 */}
                {selectedTab === 'seller' && (
                  <>
                    <div style={{ 
                      margin: '24px 0 16px',
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      {t("交易資訊")}
                    </div>
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <div style={{
                          ...cardStyle,
                          backgroundColor: '#E8F5E9',
                          borderRadius: 12
                        }}>
                          <div style={{ color: '#2E7D32' }}>{t("收入")}</div>
                          <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                            ${(selectedProduct as Product).seller_income ?? '-'}
                          </div>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{
                          ...cardStyle,
                          backgroundColor: '#FFF3E0',
                          borderRadius: 12
                        }}>
                          <div style={{ color: '#EF6C00' }}>{t("捐贈金額")}</div>
                          <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                            ${(selectedProduct as Product).donation_amount ?? '-'}
                          </div>
                        </div>
                      </Col>
                      <Col span={24}>
                        <div style={{
                          ...cardStyle,
                          backgroundColor: '#f8f9fa',
                          borderRadius: 12,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ color: '#666' }}>{t("捐贈比例")}</div>
                            <div style={{ fontSize: 16 }}>{(selectedProduct as Product).donation_ratio}%</div>
                          </div>
                          <div>
                            <div style={{ color: '#666' }}>{t("審核狀態")}</div>
                            <div>{renderStatus(selectedProduct as Product)}</div>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </>
                )}

                {/* 商品描述區 */}
                {hasDescription(selectedProduct) && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ 
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: '#333',
                      marginBottom: 12
                    }}>
                      {t("商品描述")}
                    </div>
                    <div style={{ 
                      background: '#f8f9fa',
                      padding: 20,
                      borderRadius: 12,
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: '#666'
                    }}>
                      {selectedProduct.description}
                    </div>
                  </div>
                )}
            </Col>
          </Row>
          </div>
        )}
      </Modal>
    </div>
    </>
  );
};

export default UserProductsPage;
