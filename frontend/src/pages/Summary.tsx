import React, { useEffect, useState, useRef } from 'react';
import { Card, Row, Col, Typography, Statistic, Progress, Timeline, Tag, Space, List, Avatar, Image, Popover, Button, message } from 'antd';
import { CrownFilled, TrophyOutlined, HeartFilled, ShoppingOutlined, UserOutlined, DollarOutlined, CommentOutlined, RobotOutlined, StarFilled, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';
import { motion } from 'framer-motion';
import { getTopLikedProducts, getTopCommentedProducts, getTopViewedProducts, getProductStats, getTotalDonation, getTopDonor, getTimelineEvents, getAISummary, getLegendaryProductStats } from '../services/productService';
import { getTopTicklers, getEasterEggTopUsers, getTotalTickleStats, getTotalEasterEggStats, getPlatinumUsers } from '../services/userService';
import heartFaceIcon from '../assets/img/ic_heart_face.svg';
import robotSilentIcon from '../assets/img/robot_silent.gif';
import robotInitIcon from '../assets/img/robot_init.gif';
import aiTag03 from '../assets/img/ai_tag_03.svg';
import aiTag04 from '../assets/img/ai_tag_04.svg';
import aiTag05 from '../assets/img/ai_tag_05.svg';
import { useTranslation } from "react-i18next";

const { Title, Text, Paragraph } = Typography;

interface TopProduct {
  id: number;
  product_name: string;
  image_url: string;
  like_count: number;
  comment_count: number;
  view_count?: number; // 新增瀏覽次數
}

interface TopTickler {
  email: string;
  avatar_url?: string;
  robot_tickle_count: number;
}

interface EasterEggUser {
  email: string;
  avatar_url?: string;
  easter_egg_triggered_time: string;
}

interface PlatinumUser {
  id: number;
  email: string;
  nickname: string;
  avatar_url?: string;
  unlocked_at: string;
}

interface TopDonor {
  nickname: string;
  email: string;
  email_local: string;
  avatar_url?: string;
  total_donation: number;
}

interface FirstLegendaryProduct {
  id: number;
  product_name: string;
  image_url: string;
  ai_rating: number;
  seller_nickname: string;
  created_at: string;
  rating_tier: string; // "史詩級", "傳說級", "神話級"
}

interface LegendaryProductStats {
  epic_count: number;    // 史詩級 (3星) 總數
  legendary_count: number; // 傳說級 (4星) 總數
  mythical_count: number;  // 神話級 (5星) 總數
  first_epic?: FirstLegendaryProduct;
  first_legendary?: FirstLegendaryProduct;
  first_mythical?: FirstLegendaryProduct;
}

interface ProductStats {
  total_products: number;
  sold_products: number;
  total_participants: number;
  average_price: number;
}

interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  color: string;
  milestone_type: string;
}

const Summary: React.FC = () => {
  const { t } = useTranslation();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [topLikedProducts, setTopLikedProducts] = useState<TopProduct[]>([]);
  const [topCommentedProducts, setTopCommentedProducts] = useState<TopProduct[]>([]);
  const [topViewedProducts, setTopViewedProducts] = useState<TopProduct[]>([]); // 新增
  const [topTicklers, setTopTicklers] = useState<TopTickler[]>([]);
  const [easterEggUsers, setEasterEggUsers] = useState<EasterEggUser[]>([]);
  const [platinumUsers, setPlatinumUsers] = useState<PlatinumUser[]>([]); // 新增
  const [topDonors, setTopDonors] = useState<TopDonor[]>([]);
  const [totalDonation, setTotalDonation] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [totalTickleStats, setTotalTickleStats] = useState<{ total_tickles: number; total_ticklers: number }>({ total_tickles: 0, total_ticklers: 0 });
  const [totalEasterEggStats, setTotalEasterEggStats] = useState<{ total_discoverers: number }>({ total_discoverers: 0 });
  const [legendaryProductStats, setLegendaryProductStats] = useState<LegendaryProductStats>({
    epic_count: 0,
    legendary_count: 0,
    mythical_count: 0
  });
  const [stats, setStats] = useState<ProductStats>({
    total_products: 0,
    sold_products: 0,
    total_participants: 0,
    average_price: 0,
  });

  // Bubble 對話框狀態和內容
  const [showHeartBubble, setShowHeartBubble] = useState(false);
  const [showRobotBubble, setShowRobotBubble] = useState(false);
  const heartBubbleText = t('愛心覺羅靜靜的看著你，彷彿在構思下次要出更難的彩蛋');
  const robotBubbleText = t('唉唷，看來我不能稱讚你們做得不戳了😮');

  useEffect(() => {
    // 添加動畫樣式到頁面
    const style = document.createElement('style');
    style.textContent = `
      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes sparkle {
        0%, 100% { opacity: 0.3; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.2); }
      }
      @keyframes crownGlow {
        from { 
          filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
          transform: scale(1);
        }
        to { 
          filter: drop-shadow(0 0 16px rgba(255, 215, 0, 0.9));
          transform: scale(1.05);
        }
      }
      @keyframes pulse {
        0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
        50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
        100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);

    const fetchStatistics = async () => {
      try {
        setLoading(true);
        
        // 並行獲取所有統計數據
        const [
          topLikedResult,
          topCommentedResult,
          topViewedResult,
          topTicklersResult,
          easterEggResult,
          platinumUsersResult,
          statsResult,
          totalDonationResult,
          topDonorsResult,
          totalTickleStatsResult,
          totalEasterEggStatsResult,
          legendaryStatsResult
        ] = await Promise.all([
          getTopLikedProducts(3, (error) => console.error('Failed to fetch top liked products:', error)),
          getTopCommentedProducts(3, (error) => console.error('Failed to fetch top commented products:', error)),
          getTopViewedProducts(3, (error) => console.error('Failed to fetch top viewed products:', error)),
          getTopTicklers(),
          getEasterEggTopUsers(),
          getPlatinumUsers(),
          getProductStats((error) => console.error('Failed to fetch product stats:', error)),
          getTotalDonation((error) => console.error('Failed to fetch total donation:', error)),
          getTopDonor((error) => console.error('Failed to fetch top donors:', error)),
          getTotalTickleStats(),
          getTotalEasterEggStats(),
          getLegendaryProductStats((error) => console.error('Failed to fetch legendary product stats:', error))
        ]);

        // 嘗試獲取時間軸數據（獨立處理，避免影響其他數據）
        try {
          const timelineResult = await getTimelineEvents((error) => console.error('Failed to fetch timeline events:', error));
          if (timelineResult?.events) {
            setTimelineEvents(timelineResult.events);
          }
        } catch (error) {
          console.error('Timeline API not available, using fallback data:', error);
        }

        // 嘗試獲取AI總結（獨立處理，避免影響其他數據）
        try {
          const aiSummaryResult = await getAISummary(false, (error) => console.error('Failed to fetch AI summary:', error));
          if (aiSummaryResult?.content) {
            setAiSummary(aiSummaryResult.content);
          }
        } catch (error) {
          console.error('AI Summary API not available:', error);
        }

        if (topLikedResult) setTopLikedProducts(topLikedResult);
        if (topCommentedResult) setTopCommentedProducts(topCommentedResult);
        if (topViewedResult) setTopViewedProducts(topViewedResult);
        if (topTicklersResult) setTopTicklers(topTicklersResult);
        if (easterEggResult) setEasterEggUsers(easterEggResult);
        if (platinumUsersResult) setPlatinumUsers(platinumUsersResult);
        if (statsResult) setStats(statsResult);
        if (totalDonationResult) setTotalDonation(totalDonationResult.total_donation_amount || 0);
        if (topDonorsResult) setTopDonors(topDonorsResult);
        if (totalTickleStatsResult) setTotalTickleStats(totalTickleStatsResult);
        if (totalEasterEggStatsResult) setTotalEasterEggStats(totalEasterEggStatsResult);
        if (legendaryStatsResult) setLegendaryProductStats(legendaryStatsResult);
        
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();

    return () => {
      // 清理動畫樣式
      document.head.removeChild(style);
    };
  }, []);

  // 載入像素字體
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'LanaPixel';
        src: url('/fonts/LanaPixel.ttf') format('truetype');
        font-display: swap;
      }
      
      /* Heart Popover Arrow 樣式 */
      .heart-popover .ant-popover-arrow {
        border-top-color: #333 !important;
        border-bottom-color: transparent !important;
      }
      
      .heart-popover .ant-popover-arrow::before {
        border-top-color: #333 !important;
        border-bottom-color: transparent !important;
      }
      
      .heart-popover .ant-popover-arrow::after {
        border-top-color: #f8f9fa !important;
        border-bottom-color: transparent !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const getEmailLocalPart = (email: string) => {
    return email.split('@')[0];
  };

  // 下載總結報告圖片的函數
  const downloadSummaryImage = async () => {
    if (!summaryRef.current) return;
    
    try {
      setIsDownloading(true);
      message.loading(t('正在生成總結報告圖片...'), 0);
      
      // 暫時隱藏下載按鈕
      const downloadButton = document.querySelector('[style*="position: fixed"]') as HTMLElement;
      const originalDisplay = downloadButton?.style.display || '';
      if (downloadButton) {
        downloadButton.style.display = 'none';
      }
      
      // 等待圖片加載完成
      const images = summaryRef.current.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map((img) => {
          return new Promise((resolve) => {
            if (img.complete) {
              resolve(img);
            } else {
              img.onload = () => resolve(img);
              img.onerror = () => resolve(img); // 即使加載失敗也繼續
            }
          });
        })
      );
      
      // 等待一點時間確保DOM和樣式完全更新
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 使用優化的 html2canvas 配置
      const canvas = await html2canvas(summaryRef.current, {
        backgroundColor: null, // 使用透明背景，避免顏色問題
        scale: 1.2, // 適中的scale
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: summaryRef.current.scrollWidth,
        height: summaryRef.current.scrollHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollX: 0,
        scrollY: 0,
        // 確保捕獲所有CSS樣式
        imageTimeout: 15000,
        // 處理跨域圖片
        proxy: undefined,
        onclone: (clonedDoc) => {
          // 確保所有樣式都被複製
          const originalStyles = document.head.querySelectorAll('style, link[rel="stylesheet"]');
          originalStyles.forEach((style) => {
            const clonedStyle = style.cloneNode(true);
            clonedDoc.head.appendChild(clonedStyle);
          });
          
          // 移除固定位置的元素
          const fixedElements = clonedDoc.querySelectorAll('[style*="position: fixed"]');
          fixedElements.forEach(el => el.remove());
          
          // 強制設定背景為白色，避免顏色問題
          const clonedBody = clonedDoc.body;
          if (clonedBody) {
            clonedBody.style.backgroundColor = '#ffffff';
          }
          
          // 找到主容器並設定白色背景
          const mainContainer = clonedDoc.querySelector('[style*="background: #f5f7fa"]');
          if (mainContainer) {
            (mainContainer as HTMLElement).style.background = '#ffffff';
          }
          
          // 確保圖片正確顯示
          const clonedImages = clonedDoc.querySelectorAll('img');
          clonedImages.forEach((img) => {
            img.style.maxWidth = 'none';
            img.style.maxHeight = 'none';
          });
        }
      });
      
      // 恢復下載按鈕顯示
      if (downloadButton) {
        downloadButton.style.display = originalDisplay;
      }
      
      // 檢查canvas是否成功生成
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas生成失敗');
      }
      
      // 將 canvas 轉換為 blob
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `BidForGood公益市集活動總結_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          message.destroy();
          message.success(t('總結報告圖片下載成功！'));
        } else {
          throw new Error('圖片生成失敗');
        }
      }, 'image/png', 0.95); // 提高質量到0.95
      
    } catch (error) {
      console.error('下載圖片失敗:', error);
      message.destroy();
      message.error(`${t('下載失敗：')}${error instanceof Error ? error.message : t('未知錯誤')}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // 像素字體樣式
  const pixelFontStyle = {
    fontFamily: "'LanaPixel', 'Courier New', monospace",
    fontSize: 14,
    lineHeight: 1.4,
    letterSpacing: '0.5px'
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    // 直接使用 timeZone 選項來處理台灣時間，不需要手動計算偏移
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Taipei'
    });
  };

  const soldPercentage = Math.round((stats.sold_products / stats.total_products) * 100) || 0;
  const targetAmount = 20000; // 目標金額
  const companyMatchAmount = Math.min(totalDonation || 0, targetAmount); // 公司倍倍捐款配對金額，上限20000
  const ivanSponsorAmount = Math.max((totalDonation || 0) - targetAmount, 0); // 執行長加碼金額
  const totalDonationAmount = companyMatchAmount + ivanSponsorAmount + (totalDonation || 0); // 總捐款金額（三項加總）
  const donationPercentage = Math.min(Math.round(((totalDonation || 0) / targetAmount) * 100), 100);
  const companyMatchPercentage = Math.round((companyMatchAmount / targetAmount) * 100);

  // 動態生成時間軸項目，如果API失敗則使用預設內容
  const timelineItems = timelineEvents.length > 0 ? 
    // 先按日期排序時間軸事件
    timelineEvents
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(event => ({
        color: event.color,
        children: (
          <div>
            <Text strong>{event.title}</Text>
            <br />
            <Text type="secondary">{event.date} - {event.description}</Text>
          </div>
        ),
      })) : [
    // 預設時間軸內容（如果API失敗時使用）
    {
      color: '#7ed321',
      children: (
        <div>
          <Text strong>{t("活動啟動")}</Text>
          <br />
          <Text type="secondary">{t("2025-08-26 - BidForGood 愛心市集正式上線開始")}</Text>
        </div>
      ),
    },
    {
      color: '#f5a623',
      children: (
        <div>
          <Text strong>{t("首個商品上架")}</Text>
          <br />
          <Text type="secondary">{t("第一件愛心商品成功上架，活動正式開跑！")}</Text>
        </div>
      ),
    },
    {
      color: '#FF5151',
      children: (
        <div>
          <Text strong>{t("熱銷商品出現")}</Text>
          <br />
          <Text type="secondary">{t("熱門商品開始湧現，參與者踴躍支持")}</Text>
        </div>
      ),
    },
    {
      color: '#52c41a',
      children: (
        <div>
          <Text strong>{t("捐款持續增長")}</Text>
          <br />
          <Text type="secondary">{t("愛心捐款不斷累積，目標逐步達成")}</Text>
        </div>
      ),
    },
    {
      color: '#eb2f96',
      children: (
        <div>
          <Text strong>{t("彩蛋發現者出現")}</Text>
          <br />
          <Text type="secondary">{t("有使用者發現了愛心覺羅的隱藏彩蛋")}</Text>
        </div>
      ),
    },
    {
      color: '#FFD700',
      children: (
        <div>
          <Text strong>{t("活動圓滿結束")}</Text>
          <br />
          <Text type="secondary">{t("2025-09-16 - BidForGood 愛心市集活動成功落幕")}</Text>
        </div>
      ),
    },
  ];

  return (
    <div ref={summaryRef} style={{ padding: '0 24px', background: '#f5f7fa' }}>
      {/* 下載按鈕 - 固定在右下角 */}
      <div style={{ 
        position: 'fixed', 
        bottom: '30px', 
        right: '30px', 
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(10px)'
      }}>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={downloadSummaryImage}
          loading={isDownloading}
          size="large"
          style={{
            background: 'linear-gradient(45deg, #1890ff, #52c41a)',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(24, 144, 255, 0.4)',
            height: '50px',
            padding: '0 20px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {t("下載總結報告圖")}
        </Button>
      </div>

      {/* 頁面標題 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <Title level={1} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: 16,
          marginBottom: 8,
          background: 'linear-gradient(45deg, #FFD700, #FFA500)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          <CrownFilled style={{ color: '#FFD700', fontSize: 36 }} />
          {t("BidForGood 公益市集活動總結")}
        </Title>
        <Paragraph style={{ fontSize: 16, color: '#666', maxWidth: 600, margin: '0 auto' }}>
          {t("感謝所有參與者的愛心奉獻，讓我們一起回顧這次活動的美好成果！")}
        </Paragraph>
      </motion.div>

      {/* 核心數據統計 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card hoverable style={{ textAlign: 'center', borderRadius: 12, border: '2px solid #FFD700' }}>
              <Statistic
                title={<Text style={{ color: '#666' }}>{t("總捐款金額")}</Text>}
                value={totalDonationAmount || 0}
                precision={0}
                prefix={<DollarOutlined style={{ color: '#FFD700' }} />}
                suffix={t("元")}
                valueStyle={{ color: '#FFD700', fontWeight: 'bold' }}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card hoverable style={{ textAlign: 'center', borderRadius: 12, border: '2px solid #7ed321' }}>
              <Statistic
                title={<Text style={{ color: '#666' }}>{t("商品總數")}</Text>}
                value={stats.total_products}
                prefix={<ShoppingOutlined style={{ color: '#7ed321' }} />}
                suffix={t("件")}
                valueStyle={{ color: '#7ed321', fontWeight: 'bold' }}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card hoverable style={{ textAlign: 'center', borderRadius: 12, border: '2px solid #FF5151' }}>
              <Statistic
                title={<Text style={{ color: '#666' }}>{t("已售出商品")}</Text>}
                value={stats.sold_products}
                prefix={<HeartFilled style={{ color: '#FF5151' }} />}
                suffix={t("件")}
                valueStyle={{ color: '#FF5151', fontWeight: 'bold' }}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card hoverable style={{ textAlign: 'center', borderRadius: 12, border: '2px solid #D3A4FF' }}>
              <Statistic
                title={<Text style={{ color: '#666' }}>{t("參與人數")}</Text>}
                value={stats.total_participants}
                prefix={<UserOutlined style={{ color: '#D3A4FF' }} />}
                suffix={t("人")}
                valueStyle={{ color: '#D3A4FF', fontWeight: 'bold' }}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* 大善人排行榜 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        style={{ marginBottom: 32 }}
      >
        <Card title={
          <Space>
            <TrophyOutlined style={{ color: '#FFD700' }} />
            {t("大善人排行榜")}
          </Space>
        } style={{ borderRadius: 12 }}>
          {(topDonors || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
              <TrophyOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <br />
              <Text type="secondary">{t("暫無捐款記錄")}</Text>
            </div>
          ) : (
            // 頒獎台樣式 - 只顯示前三名
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'flex-end',
              gap: '30px',
              padding: '40px 20px',
              minHeight: '350px'
            }}>
              {/* 第二名 */}
              {topDonors[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative'
                  }}
                >
                  {/* 第二名用戶資訊 */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: '15px'
                  }}>
                    <TrophyOutlined style={{ 
                      fontSize: '28px', 
                      color: '#C0C0C0',
                      marginBottom: '8px'
                    }} />
                    <Avatar 
                      size={56} 
                      src={topDonors[1].avatar_url}
                      style={{ 
                        backgroundColor: topDonors[1].avatar_url ? 'transparent' : '#595959',
                        border: '1px solid #d9d9d9',
                        marginBottom: '8px'
                      }}
                    >
                      {!topDonors[1].avatar_url && (topDonors[1].email_local?.charAt(0).toUpperCase() || topDonors[1].email?.charAt(0).toUpperCase() || 'A')}
                    </Avatar>
                    <Text strong style={{ fontSize: '14px', textAlign: 'center', color: '#333', marginBottom: '2px' }}>
                      {topDonors[1].nickname}
                    </Text>
                    <Text style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      @{topDonors[1].email_local || getEmailLocalPart(topDonors[1].email || '')}
                    </Text>
                    <Tag color="default" style={{ fontSize: '11px' }}>
                      NT$ {(topDonors[1].total_donation || 0).toLocaleString()}
                    </Tag>
                  </div>
                  
                  {/* 第二名獎台 */}
                  <div style={{
                    width: '100px',
                    height: '120px',
                    background: 'linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 50%, #A8A8A8 100%)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: '#fff',
                    borderRadius: '8px 8px 0 0',
                    boxShadow: '0 8px 16px rgba(192, 192, 192, 0.3), inset 0 2px 4px rgba(255,255,255,0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* 銀色光芒效果 */}
                    <div style={{
                      position: 'absolute',
                      top: '-50%',
                      left: '-50%',
                      width: '200%',
                      height: '200%',
                      background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent)',
                      animation: 'rotate 3s linear infinite'
                    }} />
                    <span style={{ position: 'relative', zIndex: 1, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>2</span>
                  </div>
                  {/* 第二名獎項名稱 */}
                  <div style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #F0F0F0 0%, #E0E0E0 100%)',
                    borderRadius: '20px',
                    border: '2px solid #C0C0C0',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}>
                    <Text strong style={{
                      fontSize: '14px',
                      color: '#666',
                      textAlign: 'center',
                      display: 'block',
                      letterSpacing: '1px'
                    }}>
                      {t("愛的Pro獎")}
                    </Text>
                  </div>
                </motion.div>
              )}

              {/* 第一名 */}
              {topDonors[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative'
                  }}
                >
                  {/* 第一名用戶資訊 */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: '15px'
                  }}>
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <CrownFilled style={{ 
                        fontSize: '36px', 
                        color: '#FFD700',
                        animation: 'crownGlow 2s ease-in-out infinite alternate',
                        filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))'
                      }} />
                      {/* 皇冠周圍的光環 */}
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '50px',
                        height: '50px',
                        border: '2px solid rgba(255, 215, 0, 0.3)',
                        borderRadius: '50%',
                        animation: 'pulse 2s ease-in-out infinite'
                      }} />
                    </div>
                    <Avatar 
                      size={72} 
                      src={topDonors[0].avatar_url}
                      style={{ 
                        backgroundColor: topDonors[0].avatar_url ? 'transparent' : '#595959',
                        border: '1px solid #d9d9d9',
                        marginBottom: '10px'
                      }}
                    >
                      {!topDonors[0].avatar_url && (topDonors[0].email_local?.charAt(0).toUpperCase() || topDonors[0].email?.charAt(0).toUpperCase() || 'A')}
                    </Avatar>
                    <Text strong style={{ fontSize: '16px', textAlign: 'center', color: '#333', marginBottom: '4px' }}>
                      {topDonors[0].nickname}
                    </Text>
                    <Text style={{ fontSize: '14px', color: '#666', marginBottom: '6px' }}>
                      @{topDonors[0].email_local || getEmailLocalPart(topDonors[0].email || '')}
                    </Text>
                    <Tag color="gold" style={{ fontSize: '12px' }}>
                      NT$ {(topDonors[0].total_donation || 0).toLocaleString()}
                    </Tag>
                  </div>
                  
                  {/* 第一名獎台 */}
                  <div style={{
                    width: '120px',
                    height: '160px',
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 30%, #FFA500 70%, #FF8C00 100%)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#fff',
                    borderRadius: '12px 12px 0 0',
                    boxShadow: '0 12px 24px rgba(255, 215, 0, 0.4), inset 0 4px 8px rgba(255,255,255,0.4)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* 金色粒子效果 */}
                    <div style={{
                      position: 'absolute',
                      top: '5px',
                      left: '10px',
                      fontSize: '12px',
                      animation: 'sparkle 2s ease-in-out infinite',
                      animationDelay: '0s'
                    }}>⭐</div>
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      right: '15px',
                      fontSize: '8px',
                      animation: 'sparkle 2s ease-in-out infinite',
                      animationDelay: '0.5s'
                    }}>✨</div>
                    <div style={{
                      position: 'absolute',
                      bottom: '30px',
                      left: '20px',
                      fontSize: '10px',
                      animation: 'sparkle 2s ease-in-out infinite',
                      animationDelay: '1s'
                    }}>💫</div>
                    <div style={{
                      position: 'absolute',
                      bottom: '15px',
                      right: '10px',
                      fontSize: '14px',
                      animation: 'sparkle 2s ease-in-out infinite',
                      animationDelay: '1.5s'
                    }}>🌟</div>
                    {/* 金色光芒旋轉效果 */}
                    <div style={{
                      position: 'absolute',
                      top: '-60%',
                      left: '-60%',
                      width: '220%',
                      height: '220%',
                      background: 'conic-gradient(from 0deg, transparent 70%, rgba(255,255,255,0.4) 80%, transparent 90%)',
                      animation: 'rotate 4s linear infinite'
                    }} />
                    <span style={{ position: 'relative', zIndex: 1, textShadow: '0 3px 6px rgba(0,0,0,0.4)' }}>1</span>
                  </div>
                  {/* 第一名獎項名稱 */}
                  <div style={{
                    marginTop: '16px',
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #FFF8DC 0%, #FFE55C 50%, #FFD700 100%)',
                    borderRadius: '25px',
                    border: '3px solid #FFD700',
                    boxShadow: '0 6px 12px rgba(255, 215, 0, 0.3), inset 0 2px 4px rgba(255,255,255,0.4)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* 金色光芒效果 */}
                    <div style={{
                      position: 'absolute',
                      top: '-50%',
                      left: '-50%',
                      width: '200%',
                      height: '200%',
                      background: 'conic-gradient(from 0deg, transparent 80%, rgba(255,255,255,0.3) 90%, transparent 100%)',
                      animation: 'rotate 6s linear infinite'
                    }} />
                    <Text strong style={{
                      fontSize: '16px',
                      color: '#B8860B',
                      textAlign: 'center',
                      display: 'block',
                      letterSpacing: '2px',
                      position: 'relative',
                      zIndex: 1,
                      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      {t("善的螺旋獎")}
                    </Text>
                  </div>
                </motion.div>
              )}

              {/* 第三名 */}
              {topDonors[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative'
                  }}
                >
                  {/* 第三名用戶資訊 */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: '15px'
                  }}>
                    <TrophyOutlined style={{ 
                      fontSize: '24px', 
                      color: '#CD7F32',
                      marginBottom: '8px'
                    }} />
                    <Avatar 
                      size={48} 
                      src={topDonors[2].avatar_url}
                      style={{ 
                        backgroundColor: topDonors[2].avatar_url ? 'transparent' : '#595959',
                        border: '1px solid #d9d9d9',
                        marginBottom: '6px'
                      }}
                    >
                      {!topDonors[2].avatar_url && (topDonors[2].email_local?.charAt(0).toUpperCase() || topDonors[2].email?.charAt(0).toUpperCase() || 'A')}
                    </Avatar>
                    <Text strong style={{ fontSize: '12px', textAlign: 'center', color: '#333', marginBottom: '2px' }}>
                      {topDonors[2].nickname}
                    </Text>
                    <Text style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                      @{topDonors[2].email_local || getEmailLocalPart(topDonors[2].email || '')}
                    </Text>
                    <Tag color="orange" style={{ fontSize: '10px' }}>
                      NT$ {(topDonors[2].total_donation || 0).toLocaleString()}
                    </Tag>
                  </div>
                  
                  {/* 第三名獎台 */}
                  <div style={{
                    width: '80px',
                    height: '100px',
                    background: 'linear-gradient(135deg, #E6A85C 0%, #CD7F32 50%, #B87333 100%)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#fff',
                    borderRadius: '6px 6px 0 0',
                    boxShadow: '0 6px 12px rgba(205, 127, 50, 0.3), inset 0 2px 4px rgba(255,255,255,0.2)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* 銅色光芒效果 */}
                    <div style={{
                      position: 'absolute',
                      top: '-30%',
                      left: '-30%',
                      width: '160%',
                      height: '160%',
                      background: 'conic-gradient(from 0deg, transparent, rgba(255,215,100,0.2), transparent)',
                      animation: 'rotate 5s linear infinite'
                    }} />
                    <span style={{ position: 'relative', zIndex: 1, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>3</span>
                  </div>
                  {/* 第三名獎項名稱 */}
                  <div style={{
                    marginTop: '10px',
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #F4E4BC 0%, #E6A85C 100%)',
                    borderRadius: '18px',
                    border: '2px solid #CD7F32',
                    boxShadow: '0 3px 6px rgba(205, 127, 50, 0.2)'
                  }}>
                    <Text strong style={{
                      fontSize: '12px',
                      color: '#8B4513',
                      textAlign: 'center',
                      display: 'block',
                      letterSpacing: '1px'
                    }}>
                      {t("仁的歐尼獎")}
                    </Text>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* 創世商品 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        style={{ marginBottom: 32 }}
      >
        <Card title={
          <Space>
            <StarFilled style={{ color: '#FFD700' }} />
            {t("創世商品")}
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'normal' }}>
              {t("(第一個獲得高等級評價的商品)")}
            </Text>
          </Space>
        } style={{ borderRadius: 12 }}>
          <Row gutter={[24, 24]}>
            {/* 史詩級 */}
            <Col xs={24} md={8}>
              <Card
                size="small"
                title={
                  <Space>
                    <img src={aiTag03} alt="史詩級" style={{ width: '24px', height: '24px' }} />
                    {t("史詩級")}
                  </Space>
                }
                style={{ 
                  height: '100%'
                }}
                bodyStyle={{ padding: '12px', display: 'flex', flexDirection: 'column', minHeight: '280px' }}
              >
                {legendaryProductStats.first_epic ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <Image
                        src={legendaryProductStats.first_epic.image_url}
                        alt={legendaryProductStats.first_epic.product_name}
                        preview={false}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          marginBottom: '8px'
                        }}
                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                        onClick={() => legendaryProductStats.first_epic && window.open(`/product/${legendaryProductStats.first_epic.id}`, '_blank')}
                      />
                      <div>
                        <Text strong style={{ fontSize: '14px' }}>
                          {legendaryProductStats.first_epic.product_name}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          by {legendaryProductStats.first_epic.seller_nickname}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {new Date(legendaryProductStats.first_epic.created_at).toLocaleDateString('zh-TW')}
                        </Text>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text type="secondary">{t("史詩的篇章仍未展開")}</Text>
                  </div>
                )}
                <div style={{ textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '8px', marginTop: 'auto' }}>
                  <Text style={{ fontSize: '12px', color: '#666' }}>
                    {t("全系統共")} {legendaryProductStats.epic_count} {t("個")}
                  </Text>
                </div>
              </Card>
            </Col>

            {/* 傳說級 */}
            <Col xs={24} md={8}>
              <Card
                size="small"
                title={
                  <Space>
                    <img src={aiTag04} alt="傳說級" style={{ width: '24px', height: '24px' }} />
                    {t("傳說級")}
                  </Space>
                }
                style={{ 
                  height: '100%'
                }}
                bodyStyle={{ padding: '12px', display: 'flex', flexDirection: 'column', minHeight: '280px' }}
              >
                {legendaryProductStats.first_legendary ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <Image
                        src={legendaryProductStats.first_legendary.image_url}
                        alt={legendaryProductStats.first_legendary.product_name}
                        preview={false}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          marginBottom: '8px'
                        }}
                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                        onClick={() => legendaryProductStats.first_legendary && window.open(`/product/${legendaryProductStats.first_legendary.id}`, '_blank')}
                      />
                      <div>
                        <Text strong style={{ fontSize: '14px' }}>
                          {legendaryProductStats.first_legendary.product_name}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          by {legendaryProductStats.first_legendary.seller_nickname}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {new Date(legendaryProductStats.first_legendary.created_at).toLocaleDateString('zh-TW')}
                        </Text>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text type="secondary">{t("傳說的低語尚在沉睡")}</Text>
                  </div>
                )}
                <div style={{ textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '8px', marginTop: 'auto' }}>
                  <Text style={{ fontSize: '12px', color: '#666' }}>
                    {t("全系統共")} {legendaryProductStats.legendary_count} {t("個")}
                  </Text>
                </div>
              </Card>
            </Col>

            {/* 神話級 */}
            <Col xs={24} md={8}>
              <Card
                size="small"
                title={
                  <Space>
                    <img src={aiTag05} alt="神話級" style={{ width: '24px', height: '24px' }} />
                    {t("神話級")}
                  </Space>
                }
                style={{ 
                  height: '100%'
                }}
                bodyStyle={{ padding: '12px', display: 'flex', flexDirection: 'column', minHeight: '280px' }}
              >
                {legendaryProductStats.first_mythical ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <Image
                        src={legendaryProductStats.first_mythical.image_url}
                        alt={legendaryProductStats.first_mythical.product_name}
                        preview={false}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          marginBottom: '8px'
                        }}
                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                        onClick={() => legendaryProductStats.first_mythical && window.open(`/product/${legendaryProductStats.first_mythical.id}`, '_blank')}
                      />
                      <div>
                        <Text strong style={{ fontSize: '14px' }}>
                          {legendaryProductStats.first_mythical.product_name}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          by {legendaryProductStats.first_mythical.seller_nickname}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {new Date(legendaryProductStats.first_mythical.created_at).toLocaleDateString('zh-TW')}
                        </Text>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text type="secondary">{t("神話的星辰靜候點燃")}</Text>
                  </div>
                )}
                <div style={{ textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '8px', marginTop: 'auto' }}>
                  <Text style={{ fontSize: '12px', color: '#666' }}>
                    {t("全系統共")} {legendaryProductStats.mythical_count} {t("個")}
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* 商品排行榜 - 三欄佈局 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} lg={8}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card 
              title={
                <Space>
                  <HeartFilled style={{ color: '#ff4d4f' }} />
                  {t("最熱門商品前三名")}
                </Space>
              }
              loading={loading}
              style={{ borderRadius: 12 }}
            >
              <List
                dataSource={topLikedProducts}
                renderItem={(product, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <div 
                          style={{ position: 'relative', cursor: 'pointer' }}
                          onClick={() => window.open(`/product/${product.id}`, '_blank')}
                        >
                          <Image
                            src={product.image_url}
                            alt={product.product_name}
                            width={50}
                            height={50}
                            style={{ borderRadius: '8px', objectFit: 'cover' }}
                            preview={false}
                          />
                          <div style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '-8px',
                            backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                            color: 'white',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {index + 1}
                          </div>
                        </div>
                      }
                      title={product.product_name}
                      description={
                        <Space>
                          <HeartFilled style={{ color: '#ff4d4f' }} />
                          <Text>{product.like_count} {t("個讚")}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card 
              title={
                <Space>
                  <CommentOutlined style={{ color: '#1890ff' }} />
                  {t("討論度最高的商品前三名")}
                </Space>
              }
              loading={loading}
              style={{ borderRadius: 12 }}
            >
              <List
                dataSource={topCommentedProducts}
                renderItem={(product, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <div 
                          style={{ position: 'relative', cursor: 'pointer' }}
                          onClick={() => window.open(`/product/${product.id}`, '_blank')}
                        >
                          <Image
                            src={product.image_url}
                            alt={product.product_name}
                            width={50}
                            height={50}
                            style={{ borderRadius: '8px', objectFit: 'cover' }}
                            preview={false}
                          />
                          <div style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '-8px',
                            backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                            color: 'white',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {index + 1}
                          </div>
                        </div>
                      }
                      title={product.product_name}
                      description={
                        <Space>
                          <CommentOutlined style={{ color: '#1890ff' }} />
                          <Text>{product.comment_count} {t("則留言")}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={8}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card 
              title={
                <Space>
                  <EyeOutlined style={{ color: '#52c41a' }} />
                  {t("點閱率最高的商品前三名")}
                </Space>
              }
              loading={loading}
              style={{ borderRadius: 12 }}
            >
              <List
                dataSource={topViewedProducts}
                renderItem={(product, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <div 
                          style={{ position: 'relative', cursor: 'pointer' }}
                          onClick={() => window.open(`/product/${product.id}`, '_blank')}
                        >
                          <Image
                            src={product.image_url}
                            alt={product.product_name}
                            width={50}
                            height={50}
                            style={{ borderRadius: '8px', objectFit: 'cover' }}
                            preview={false}
                          />
                          <div style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '-8px',
                            backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                            color: 'white',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {index + 1}
                          </div>
                        </div>
                      }
                      title={product.product_name}
                      description={
                        <Space>
                          <ShoppingOutlined style={{ color: '#52c41a' }} />
                          <Text>{product.view_count || 0} {t("次瀏覽")}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* 用戶排行榜 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card 
              title={
                <Space>
                  <Popover
                    content={
                      <div style={{ 
                        padding: '12px 16px', 
                        color: '#333',
                        fontWeight: 500,
                        width: 300,
                        ...pixelFontStyle,
                        background: '#f8f9fa',
                        border: '2px solid #333',
                        borderRadius: 8,
                        boxShadow: '0 0 0 2px #fff, 0 0 0 4px #333',
                        textAlign: 'center'
                      }}>
                        {heartBubbleText}
                      </div>
                    }
                    open={showHeartBubble}
                    onOpenChange={setShowHeartBubble}
                    placement="top"
                    trigger="click"
                    arrow={{
                      pointAtCenter: false,
                      arrowPointAtCenter: false,
                    }}
                    autoAdjustOverflow={false}
                    destroyTooltipOnHide={true}
                    fresh={true}
                    overlayStyle={{
                      marginTop: '-20px',
                    }}
                    overlayInnerStyle={{
                      background: 'transparent',
                      border: 'none',
                      boxShadow: 'none',
                      padding: 0
                    }}
                    overlayClassName="heart-popover"
                  >
                    <img 
                      src={heartFaceIcon} 
                      alt="heat face" 
                      style={{ 
                        width: '40px', 
                        height: '40px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    />
                  </Popover>
                  {t("愛心覺羅的彩蛋發掘者")}
                  <span style={{
                    fontSize: '12px', 
                    color: '#666', 
                    fontWeight: 'normal',
                    marginLeft: '8px'
                  }}>
                    {t("(共")} {totalEasterEggStats.total_discoverers} {t("人發現)")}
                  </span>
                </Space>
              }
              loading={loading}
              style={{ borderRadius: 12 }}
            >
              <List
                dataSource={easterEggUsers.slice(0, 5)}
                renderItem={(user, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <div style={{ position: 'relative' }}>
                          <Avatar 
                            src={user.avatar_url} 
                            style={{ border: '1px solid #d9d9d9', backgroundColor: '#595959' }}
                            size={40}
                          >
                            {!user.avatar_url && getEmailLocalPart(user.email).charAt(0).toUpperCase()}
                          </Avatar>
                          {index < 3 && (
                            <div style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-4px',
                              backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                              color: 'white',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 'bold'
                            }}>
                              {index + 1}
                            </div>
                          )}
                        </div>
                      }
                      title={getEmailLocalPart(user.email)}
                      description={
                        <Space>
                          <StarFilled style={{ color: '#FFD700' }} />
                          <Text>{t("發現於")} {formatDateTime(user.easter_egg_triggered_time)}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card 
              title={
                <Space>
                  <Popover
                    content={robotBubbleText}
                    open={showRobotBubble}
                    onOpenChange={setShowRobotBubble}
                    placement="top"
                    trigger="click"
                  >
                    <img 
                      src={robotSilentIcon} 
                      alt="robot silent" 
                      style={{ 
                        width: '50px', 
                        height: '50px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    />
                  </Popover>
                  {t("AI小助理的煩人精")}
                  <span style={{
                    fontSize: '12px', 
                    color: '#666', 
                    fontWeight: 'normal',
                    marginLeft: '8px'
                  }}>
                    {t("(總共被戳了")} {totalTickleStats.total_tickles} {t("次)")}
                  </span>
                </Space>
              }
              loading={loading}
              style={{ borderRadius: 12 }}
            >
              <List
                dataSource={topTicklers.slice(0, 5)}
                renderItem={(user, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <div style={{ position: 'relative' }}>
                          <Avatar 
                            src={user.avatar_url} 
                            style={{ border: '1px solid #d9d9d9', backgroundColor: '#595959' }}
                            size={40}
                          >
                            {!user.avatar_url && getEmailLocalPart(user.email).charAt(0).toUpperCase()}
                          </Avatar>
                          {index < 3 && (
                            <div style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-4px',
                              backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                              color: 'white',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 'bold'
                            }}>
                              {index + 1}
                            </div>
                          )}
                        </div>
                      }
                      title={getEmailLocalPart(user.email)}
                      description={
                        <Space>
                          <RobotOutlined style={{ color: '#722ed1' }} />
                          <Text>{t("搔癢了")} {user.robot_tickle_count} {t("次")}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* 破台市集的榮耀者 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        style={{ marginBottom: 32 }}
      >
        <Card 
          title={
            <Space>
              <CrownFilled style={{ color: '#FFD700' }} />
              {t("破台市集的榮耀者")}
              <span style={{
                fontSize: '12px', 
                color: '#666', 
                fontWeight: 'normal',
                marginLeft: '8px'
              }}>
                {t("(獲得「BidForGood公益市集白金獎盃」成就的使用者)")}
              </span>
            </Space>
          }
          loading={loading}
          style={{ borderRadius: 12 }}
        >
          {platinumUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <CrownFilled style={{ fontSize: 48, marginBottom: 16, color: '#ddd' }} />
              <br />
              <Text type="secondary">{t("尚無使用者獲得白金獎盃")}</Text>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              justifyContent: platinumUsers.length < 5 ? 'center' : 'space-between',
              alignItems: 'center',
              gap: '20px',
              padding: '20px 0',
              flexWrap: 'wrap'
            }}>
              {platinumUsers.slice(0, 5).map((user, index) => (
                <motion.div
                  key={user.email}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative'
                  }}
                >
                  {/* 皇冠裝飾 */}
                  <CrownFilled style={{ 
                    fontSize: '20px', 
                    color: '#FFD700',
                    marginBottom: '8px'
                  }} />
                  
                  {/* 用戶頭像 */}
                  <div style={{ position: 'relative' }}>
                    <Avatar 
                      src={user.avatar_url} 
                      style={{ 
                        border: '3px solid #FFD700',
                        backgroundColor: '#595959',
                        boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)'
                      }}
                      size={60}
                    >
                      {!user.avatar_url && getEmailLocalPart(user.email).charAt(0).toUpperCase()}
                    </Avatar>
                    
                    {/* 排名標示 - 只顯示前3名 */}
                    {index < 3 && (
                      <div style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        border: '2px solid white'
                      }}>
                        {index + 1}
                      </div>
                    )}
                  </div>
                  
                  {/* 用戶名稱 */}
                  <Text strong style={{ 
                    fontSize: '14px', 
                    textAlign: 'center', 
                    color: '#333', 
                    marginTop: '8px',
                    marginBottom: '4px'
                  }}>
                    {getEmailLocalPart(user.email)}
                  </Text>
                  
                  {/* 達成時間 */}
                  <Text style={{ 
                    fontSize: '11px', 
                    color: '#666',
                    textAlign: 'center',
                    lineHeight: 1.2
                  }}>
                    <TrophyOutlined style={{ marginRight: '4px' }} />
                    {formatDateTime(user.unlocked_at)}
                  </Text>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* 進度展示 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card title={t("銷售進度")} style={{ borderRadius: 12 }}>
              <Progress
                type="circle"
                percent={soldPercentage}
                strokeColor="#7ed321"
                format={(percent) => (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#7ed321' }}>{percent}%</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{t("已售出")}</div>
                  </div>
                )}
                size={150}
              />
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Text>{stats.sold_products} / {stats.total_products} {t("件商品已找到新主人")}</Text>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card title={t("捐款目標達成")} style={{ borderRadius: 12 }}>
              <Row gutter={[16, 16]}>
                {/* 總目標達成度 */}
                <Col xs={24} md={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Progress
                      type="circle"
                      percent={donationPercentage}
                      strokeColor="#FFD700"
                      format={(percent) => (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#FFD700' }}>{percent}%</div>
                          <div style={{ fontSize: 10, color: '#666' }}>{t("目標達成")}</div>
                        </div>
                      )}
                      size={100}
                    />
                    <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.2 }}>
                      <div><Text strong>{t("目標 NT$")} {targetAmount.toLocaleString()}</Text></div>
                      <div><Text>{t("已捐 NT$")} {(totalDonation || 0).toLocaleString()}</Text></div>
                    </div>
                  </div>
                </Col>
                
                {/* 公司配對金額 */}
                <Col xs={24} md={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Progress
                      type="circle"
                      percent={companyMatchPercentage}
                      strokeColor="#52c41a"
                      format={(percent) => (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#52c41a' }}>{percent}%</div>
                          <div style={{ fontSize: 10, color: '#666' }}>{t("配對達成")}</div>
                        </div>
                      )}
                      size={100}
                    />
                    <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.2 }}>
                      <div><Text>{t("公司配對")}</Text></div>
                      <div><Text>NT$ {companyMatchAmount.toLocaleString()}</Text></div>
                    </div>
                  </div>
                </Col>
                
                {/* 執行長額外加碼金額 */}
                <Col xs={24} md={8}>
                  <div style={{ textAlign: 'center' }}>
                    {ivanSponsorAmount > 0 ? (
                      <Progress
                        type="dashboard"
                        percent={Math.min(Math.round((ivanSponsorAmount / targetAmount) * 100), 100)}
                        strokeColor="#fa8c16"
                        format={(percent) => (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 'bold', color: '#fa8c16' }}>{percent}%</div>
                            <div style={{ fontSize: 10, color: '#666' }}>{t("額外贊助")}</div>
                          </div>
                        )}
                        size={100}
                      />
                    ) : (
                      <div style={{ 
                        width: 100, 
                        height: 100, 
                        borderRadius: '50%', 
                        border: '6px solid #f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#999' }}>0%</div>
                          <div style={{ fontSize: 10, color: '#999' }}>{t("未超標")}</div>
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.2 }}>
                      <div><Text>{t("執行長加碼")}</Text></div>
                      <div><Text>NT$ {ivanSponsorAmount.toLocaleString()}</Text></div>
                    </div>
                  </div>
                </Col>
              </Row>
              
              {/* 總金額顯示 */}
              <div style={{ textAlign: 'center', marginTop: 20, padding: '12px', backgroundColor: '#f9f9f9', borderRadius: 8 }}>
                <Text strong style={{ fontSize: 16 }}>
                  {t("總捐款金額 NT$")} {totalDonationAmount.toLocaleString()}
                </Text>
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* 活動時間軸 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        style={{ marginBottom: 32 }}
      >
        <Card title={t("活動歷程")} style={{ borderRadius: 12 }}>
          <Timeline
            mode="left"
            items={timelineItems}
          />
        </Card>
      </motion.div>

      {/* AI 總結書信 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        style={{ marginBottom: 32 }}
      >
        <Card 
          title={
            <Space>
              <RobotOutlined style={{ color: '#1890ff' }} />
              {t("AI 小助理的活動總結信")}
            </Space>
          }
          style={{ 
            borderRadius: 12,
            border: '2px solid #e6f7ff',
            boxShadow: '0 4px 12px rgba(24, 144, 255, 0.1)'
          }}
          bodyStyle={{
            background: 'linear-gradient(145deg, #fafbfc 0%, #f0f2f5 100%)',
            padding: '32px 40px'
          }}
        >
          {aiSummary ? (
            // 顯示AI生成的內容 - 書信格式
            <div style={{ 
              background: 'white',
              borderRadius: '8px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #e8e8e8',
              position: 'relative',
              fontFamily: "'Microsoft JhengHei', 'PingFang SC', sans-serif"
            }}>
              {/* 信紙背景線條效果 */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'repeating-linear-gradient(transparent, transparent 24px, #f0f0f0 24px, #f0f0f0 25px)',
                opacity: 0.3,
                pointerEvents: 'none'
              }} />
              
              {/* 左側裝訂線 - 已移除，因為會影響閱讀 */}
              
              {/* 信件內容 */}
              <div style={{ 
                position: 'relative',
                zIndex: 1,
                marginLeft: '20px'
              }}>
                {/* 信件抬頭 */}
                <div style={{
                  textAlign: 'right',
                  marginBottom: '24px',
                  color: '#666',
                  fontSize: '14px',
                  fontStyle: 'italic'
                }}>
                  {t("來自 AI 小助理的一封信")}
                </div>
                
                {/* 信件正文 */}
                <div style={{ 
                  color: '#333', 
                  fontSize: '16px', 
                  lineHeight: '1.8',
                  textAlign: 'left',
                  whiteSpace: 'pre-line',
                  letterSpacing: '0.5px'
                }}>
                  {aiSummary}
                </div>
                
                {/* 信件署名 */}
                <div style={{
                  textAlign: 'right',
                  marginTop: '32px',
                  color: '#666',
                  fontSize: '14px',
                  fontStyle: 'italic'
                }}>
                  <div>{t("此致")}</div>
                  <div style={{ marginTop: '8px' }}>{t("BidForGood 全體同仁")}</div>
                  <div style={{ marginTop: '16px', color: '#1890ff' }}>
                    <img 
                      src={robotInitIcon} 
                      alt="AI assistant" 
                      style={{ 
                        width: '40px', 
                        height: '40px',
                        marginRight: '8px',
                        verticalAlign: 'middle'
                      }}
                    />
                    {t("AI 小助理")}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px' }}>
                    2025/09/26
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // 預設內容（如果AI總結不可用）
            <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
              <RobotOutlined style={{ fontSize: 48, marginBottom: 16, color: '#bbb' }} />
              <div>{t("AI 小助理正在準備總結信件中...")}</div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default Summary;
