import { useEffect, useState, useRef, useTransition } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { getProduct, likeProduct, unlikeProduct } from "../services/productService";
import { motion, AnimatePresence } from "framer-motion";
import { Row, Col, Image as AntdImage, Typography, Tabs, Tag, Card, Divider, Button, Modal, Input, message, Tooltip, Skeleton } from "antd";
import { HeartOutlined, HeartFilled, SmileOutlined, DownOutlined, UpOutlined, InfoCircleOutlined, RobotOutlined, ShoppingCartOutlined, HourglassFilled, EditOutlined, BulbOutlined, QuestionCircleOutlined, EyeOutlined } from "@ant-design/icons";
import onlineDealService from "../services/onlineDealService";
import systemConfigService from "../services/systemConfigService";

import AiRating03 from "../assets/img/ai_tag_03.svg";
import AiRating04 from "../assets/img/ai_tag_04.svg";
import AiRating05 from "../assets/img/ai_tag_05.svg";
import RobotTalking from "../assets/img/robot_talking.gif";
import RobotInit from "../assets/img/robot_init.gif";
import RobotSilent from "../assets/img/robot_silent.gif";
import RobotSilentTalking from "../assets/img/robot_silent_talking.gif";
import goodTag from "../assets/img/good_tag.png";
import { optimizeCloudinaryUrl } from '../utils/optimizeCloudinaryUrl';
import { typewriter } from "../utils/typewriter";
import RobotAvatarWithDialog from "../components/RobotAvatarWithDialog";
import ChatMessageBox from "../components/ChatMessageBox";
import { useAchievementChecker } from "../hooks/useAchievementChecker";
import axios from "axios";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const conditionMap: Record<number, string> = {
  1: i18n.t("全新"),
  2: i18n.t("九成新"),
  3: i18n.t("五成新"),
  4: i18n.t("低於五成新"),
};

const ratingMap: Record<number, string> = {
  1: i18n.t("普通"),
  2: i18n.t("精良"),
  3: i18n.t("史詩"),
  4: i18n.t("傳說"),
  5: i18n.t("神話"),
};

const statusMap: Record<number, { label: string; color: string }> = {
  0: { label: i18n.t("尚未到貨"), color: "default" },
  1: { label: i18n.t("已到貨"), color: "green" },
  2: { label: i18n.t("已售出"), color: "red" },
};

const getAiRatingImage = (rating: number): string | undefined => {
  switch (rating) {
    case 3:
      return AiRating03;
    case 4:
      return AiRating04;
    case 5:
      return AiRating05;
    default:
      return undefined;
  }
};

const aiRatingColorMap: Record<number, string> = {
  1: '#bfbfbf',
  2: '#1890ff',
  3: '#722ed1',
  4: '#52c41a',
  5: '#fa541c',
};

const ProductDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState(false);
  const [, setComments] = useState<any[]>([]);
  const [aiComment, setAiComment] = useState<string>("");
  const [aiFitOwner, setAiFitOwner] = useState<string>("");
  // 已移除未使用的 aiLoading 狀態
  const [aiImage, setAiImage] = useState<string>(RobotInit);
  const [aiShown, setAiShown] = useState(false);
  const [showSkipButton, setShowSkipButton] = useState(false); // 新增：是否顯示閉嘴按鈕
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);
  const descriptionRef = useRef<HTMLDivElement>(null);
  
  // 線上交易請求相關狀態
  const [dealRequestModalVisible, setDealRequestModalVisible] = useState(false);
  const [dealRequestComment, setDealRequestComment] = useState("");
  const [dealRequestLoading, setDealRequestLoading] = useState(false);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [productRequestStatus, setProductRequestStatus] = useState<any>(null);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [, startTransition] = useTransition();
  
  // 成就檢查 hook
  const { checkAndShowAchievements } = useAchievementChecker();
  
  // 內容載入狀態 - 一旦載入就不再變回 loading
  const [contentLoaded, setContentLoaded] = useState(false);

  useEffect(() => {
    const preloadImages = [
      RobotInit,
      RobotTalking,
      RobotSilent,
      RobotSilentTalking,
    ];
    preloadImages.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  const fetchComments = async () => {
    if (!id) return;
    try {
      const res = await axios.get(`/api/products/${id}/comments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        }
      });
      setComments(res.data);
    } catch (e) {
      setComments([]);
    }
  };

  useEffect(() => {
    if (!id) return;
    const productId = parseInt(id);
    setLoading(true);
    getProduct(productId, (err) => {
      console.error("載入商品失敗", err);
    }).then((data) => {
      setProduct(data);
      setLoading(false);
      setContentLoaded(true); // 標記內容已載入
      const img = new window.Image();
      img.src = optimizeCloudinaryUrl(data.image_url);
    });
    fetchComments();
  }, [id]);

  // 載入用戶交易狀態（需要登入）
  useEffect(() => {
    if (!id) return;
    const productId = parseInt(id);
    
    const fetchUserData = async () => {
      if (!userProfile?.email) {
        // 如果沒有登入，設置默認值以避免無限載入
        setUserStats({ available_slots: 0, max_concurrent_deals: 0, pending_requests: 0 });
        setProductRequestStatus({ has_request: false, request_id: null, status: null, status_text: null });
        return;
      }
      
      try {
        // 載入用戶統計
        const stats = await onlineDealService.getMyStats();
        // 使用 transition 降低首次渲染時的狀態更新優先級，避免整頁閃爍
        startTransition(() => {
          setUserStats(stats);
        });

        // 載入商品請求狀態
        const requestStatus = await onlineDealService.getProductRequestStatus(productId);
        startTransition(() => {
          setProductRequestStatus(requestStatus);
        });
      } catch (error) {
        console.error('載入用戶交易資料失敗:', error);
        // 載入失敗時設置默認值
        startTransition(() => {
          setUserStats({ available_slots: 0, max_concurrent_deals: 0, pending_requests: 0 });
          setProductRequestStatus({ has_request: false, request_id: null, status: null, status_text: null });
        });
      }
    };

    fetchUserData();
  }, [id, userProfile?.email]);

  // 載入系統配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // 使用系統狀態服務獲取配置（公開 API）
        const status = await systemConfigService.getSystemStatus();
        setSystemConfig({
          online_deal_enabled: status.online_deal_enabled,
          online_deal_available: status.online_deal_available,
          online_deal_begin_date: status.online_deal_begin_date,
          online_deal_end_date: status.online_deal_end_date
        });
      } catch (error) {
        console.error('載入系統配置失敗:', error);
        // 如果載入失敗，設置一個默認配置以避免按鈕一直處於載入狀態
        setSystemConfig({
          online_deal_enabled: false,
          online_deal_available: false,
          online_deal_begin_date: null,
          online_deal_end_date: null
        });
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!product || !descriptionRef.current) return;
    
    // 重置展開狀態，確保每次檢測都是收合狀態
    setIsDescriptionExpanded(false);
    
    // 使用 requestAnimationFrame 確保 DOM 完全渲染後再檢測
    const checkHeight = () => {
      requestAnimationFrame(() => {
        const el = descriptionRef.current;
        if (!el) return;
        
        // 確保元素是收合狀態下檢測
        const isOverflow = el.scrollHeight > el.clientHeight;
        setShowExpandButton(isOverflow);
        
        console.log('Height check:', {
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          isOverflow,
          productId: product.id
        });
      });
    };
    
    // 等待圖片載入完成後再檢測高度
    const img = new Image();
    img.onload = () => {
      // 圖片載入完成後延遲檢測
      setTimeout(checkHeight, 150);
    };
    img.onerror = () => {
      // 即使圖片載入失敗也要檢測
      setTimeout(checkHeight, 150);
    };
    
    if (product.image_url) {
      img.src = optimizeCloudinaryUrl(product.image_url);
    } else {
      // 如果沒有圖片，直接檢測
      setTimeout(checkHeight, 150);
    }
    
    // 備用檢測，防止圖片載入事件沒有觸發
    const fallbackTimer = setTimeout(checkHeight, 300);
    
    return () => {
      clearTimeout(fallbackTimer);
      img.onload = null;
      img.onerror = null;
    };
  }, [product]); // 移除 isDescriptionExpanded 依賴，避免展開時重複檢測
  
  // 當內容載入完成時，額外檢測一次展開按鈕
  useEffect(() => {
    if (!contentLoaded || !product || !descriptionRef.current) return;
    
    // 頁面完全載入後的額外檢測
    const finalCheck = () => {
      const el = descriptionRef.current;
      if (!el) return;
      
      const isOverflow = el.scrollHeight > el.clientHeight;
      setShowExpandButton(isOverflow);
      
      console.log('Final height check after content loaded:', {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        isOverflow,
        productId: product.id
      });
    };
    
    // 使用多個時機點來確保檢測
    requestAnimationFrame(() => {
      setTimeout(finalCheck, 100);
      setTimeout(finalCheck, 300);
      setTimeout(finalCheck, 500);
    });
  }, [contentLoaded, product]);
  

  const handleLike = async () => {
    if (!id) return;
    setLikeLoading(true);
    const productId = parseInt(id);
    await likeProduct(productId, () => { });
    getProduct(productId, () => { }, false).then((data) => {
      setProduct(data);
      setLikeLoading(false);
    });
  };

  const handleUnlike = async () => {
    if (!id) return;
    setLikeLoading(true);
    const productId = parseInt(id);
    await unlikeProduct(productId, () => { });
    getProduct(productId, () => { }, false).then((data) => {
      setProduct(data);
      setLikeLoading(false);
    });
  };

  // 用來儲存當前的取消函數
  const [currentCancelFunction, setCurrentCancelFunction] = useState<(() => void) | null>(null);

  const handleAITabClick = async () => {
    if (!product || aiShown) return;
    
    setAiShown(true);
    setShowSkipButton(true);
    setAiImage(RobotTalking);
    
    let isCancelled = false;
    
    // 已移除 setAiLoading(true);
    await typewriter(
      product.ai_comment || t("這件商品還沒被 AI 評鑑。"),
      setAiComment,
      setAiImage,
      RobotTalking,
      RobotInit,
      25,
      false,
      false,
      (cancel) => setCurrentCancelFunction(() => () => {
        isCancelled = true;
        cancel();
      })
    );
    
    // 檢查是否被取消
    if (isCancelled) {
      return;
    }
    
    await typewriter(
      product.ai_fit_owner || t("不限對象，皆可服用"),
      setAiFitOwner,
      setAiImage,
      RobotTalking,
      RobotInit,
      25,
      false,
      false,
      (cancel) => setCurrentCancelFunction(() => () => {
        isCancelled = true;
        cancel();
      })
    );
    
    setAiImage(RobotInit);
    setShowSkipButton(false);
    setCurrentCancelFunction(null);
    // 已移除 setAiLoading(false);
  };

  // 處理"閉嘴"按鈕：跳過打字機效果，直接顯示所有內容
  const handleSkipTyping = () => {
    if (!product) return;
    
    // 如果有正在進行的打字動畫，先取消它
    if (currentCancelFunction) {
      currentCancelFunction();
    }
    
    setShowSkipButton(false);
    setAiComment(product.ai_comment || t("這件商品還沒被 AI 評鑑。"));
    setAiFitOwner(product.ai_fit_owner || t("不限對象，皆可服用"));
    setAiImage(RobotInit);
    setCurrentCancelFunction(null);
  };

  // 處理線上交易請求
  const handleDealRequest = async () => {
    
    if (!product?.id) return;

    // 如果已經有請求，詢問是否要取消
    if (productRequestStatus?.has_request) {
      setCancelConfirmVisible(true);
      return;
    }
    
    setDealRequestModalVisible(true);
  };

  // 確認取消請求
  const handleCancelRequest = async () => {
    if (!productRequestStatus?.request_id) return;
    
    try {
      setDealRequestLoading(true);
      setCancelConfirmVisible(false);
      
      await onlineDealService.cancelRequest(productRequestStatus.request_id);
      message.success(t('已取消購買請求'));
      
      // 重新載入請求狀態和用戶統計
      const [newStatus, newStats] = await Promise.all([
        onlineDealService.getProductRequestStatus(product.id),
        onlineDealService.getMyStats()
      ]);
      startTransition(() => {
        setProductRequestStatus(newStatus);
        setUserStats(newStats);
      });
    } catch (error: any) {
      console.error('取消請求失敗:', error);
      message.error(error.response?.data?.detail || t("取消請求失敗"));
    } finally {
      setDealRequestLoading(false);
    }
  };

  // 處理新的交易請求
  const handleNewDealRequest = async () => {
    if (!product?.id) return;
    
    // 必填驗證
    if (!dealRequestComment.trim()) {
      message.error(t('請填寫給賣家的割愛小紙條'));
      return;
    }
    
    setDealRequestLoading(true);
    try {
      const result = await onlineDealService.createRequest({
        product_id: product.id,
        buyer_comment: dealRequestComment.trim()
      });
      
      message.success(`${t('交易請求已發送！')}${result.message}`);
      setDealRequestModalVisible(false);
      setDealRequestComment("");
      
      // 重新載入請求狀態和用戶統計
      const [newStatus, newStats] = await Promise.all([
        onlineDealService.getProductRequestStatus(product.id),
        onlineDealService.getMyStats()
      ]);
      startTransition(() => {
        setProductRequestStatus(newStatus);
        setUserStats(newStats);
      });

      // 檢查是否有新的成就解鎖
      setTimeout(() => {
        checkAndShowAchievements();
      }, 1000); // 延遲1秒讓後端處理完成
    } catch (error: any) {
      message.error(error.response?.data?.detail || t("發送交易請求失敗"));
    } finally {
      setDealRequestLoading(false);
    }
  };

  // 檢查是否可以顯示線上議價申請按鈕
  const canShowDealRequestButton = () => {
    // 已售出才不顯示
    if (product.product_status === 2) {
      return false;
    }
    
    // 如果系統配置已載入且線上交易總開關完全關閉，則不顯示按鈕
    if (systemConfig && !systemConfig.online_deal_enabled) {
      return false;
    }
    
    // 檢查是否在議價開放時間範圍內
    if (systemConfig && systemConfig.online_deal_begin_date && systemConfig.online_deal_end_date) {
      const now = new Date();
      const start = new Date(systemConfig.online_deal_begin_date);
      const end = new Date(systemConfig.online_deal_end_date);
      if (now < start || now > end) {
        return false; // 不在時間範圍內，不顯示按鈕
      }
    }
    
    return true;
  };

  // 檢查按鈕的狀態和提示文字
  const getDealButtonConfig = () => {
    // 未登入或使用者資料尚未就緒：顯示禁用按鈕以避免出現/消失
    if (!userProfile?.email) {
      return {
        disabled: true,
        tooltip: t("請先登入後使用線上交易"),
        text: t("發送購買請求"),
        onClick: null
      };
    }

    // 系統設定載入中：顯示禁用占位按鈕，避免首次渲染沒有按鈕導致閃爍
    if (!systemConfig) {
      return {
        disabled: true,
        tooltip: t("正在載入…"),
        text: t("發送購買請求"),
        onClick: null
      };
    }

    // 系統關閉或不開放申請：顯示禁用按鈕
    if (!systemConfig.online_deal_enabled || !systemConfig.online_deal_available) {
      return {
        disabled: true,
        tooltip: t("目前未開放線上交易"),
        text: t("發送購買請求"),
        onClick: null
      };
    }

    // 不在時間區間內：顯示禁用按鈕
    if (systemConfig.online_deal_begin_date && systemConfig.online_deal_end_date) {
      const now = new Date();
      const start = new Date(systemConfig.online_deal_begin_date);
      const end = new Date(systemConfig.online_deal_end_date);
      if (now < start || now > end) {
        return {
          disabled: true,
          tooltip: t("不在開放申請時間內"),
          text: t("發送購買請求"),
          onClick: null
        };
      }
    }

    // 如果是自己的商品
    if (product.seller_name === userProfile?.email) {
      return {
        disabled: true,
        tooltip: t("這是你自己的商品！不能對它交易"),
        text: t("發送購買請求"),
        onClick: null
      };
    }

    // 用戶數據或商品請求狀態尚未載入：顯示禁用按鈕
    if (!userStats || productRequestStatus === null) {
      return {
        disabled: true,
        tooltip: t("正在載入用戶資料…"),
        text: t("發送購買請求"),
        onClick: null
      };
    }

    // 如果已經發送過請求
    if (productRequestStatus?.has_request) {
      return {
        disabled: false,
        tooltip: t("你已經送出過購買請求的商品"),
        text: `${productRequestStatus.status_text || t('已發送請求')}`,
        onClick: handleDealRequest
      };
    }

    // 如果額度用完了（但要確保數據已載入且額度確實為0）
    if (userStats.available_slots === 0 && userStats.max_concurrent_deals > 0) {
      return {
        disabled: true,
        tooltip: t("你的線上交易額度已達上限（{{count}}），請前往個人中心的線上交易頁面進行確認", { count: userStats.max_concurrent_deals }),
        text: t("發送購買請求"),
        onClick: null
      };
    }

    // 正常狀態
    return {
      disabled: false,
      tooltip: null,
      text: t("發送購買請求"),
      onClick: showDealRequestModal
    };
  };

  const showDealRequestModal = () => {
    setDealRequestModalVisible(true);
  };

  const isError = !loading && !product;
  const status = product ? statusMap[product.product_status] : undefined;
  
  // 使用 contentLoaded 來避免已載入內容重新變成 skeleton
  const showSkeleton = !contentLoaded;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {isError && (
        <div style={{ padding: 24 }}>
          <Text type="danger">{t("找不到此商品。")}</Text>
        </div>
      )}
      <Row gutter={32} style={{ justifyContent: "center", gap: 16 }}>
        <Col span={10} style={{ maxWidth: "25vw" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            style={{
              position: "relative",
              borderRadius: 8,
              border: "2px solid #f0f0f0",
              textAlign: "center",
              overflow: "hidden",
              transition: "transform 0.3s ease"
            }}
            onMouseEnter={(e) => {
              const img = e.currentTarget.querySelector("img") as HTMLImageElement;
              if (img) img.style.transform = "scale(1.08)";

              // Badge hover effect - 添加放大效果
              const badge = e.currentTarget.querySelector('.ai-rating-badge') as HTMLElement;
              if (badge) {
                badge.style.transform = 'scale(1.25)';
              }
            }}
            onMouseLeave={(e) => {
              const img = e.currentTarget.querySelector("img") as HTMLImageElement;
              if (img) img.style.transform = "scale(1)";

              // Badge leave effect
              const badge = e.currentTarget.querySelector('.ai-rating-badge') as HTMLElement;
              if (badge) {
                badge.style.transform = 'scale(1)';
              }
            }}
          >
            {showSkeleton ? (
              <div style={{
                width: '100%',
                aspectRatio: '1 / 1',
                background: '#f5f5f5'
              }} />
            ) : (
              <AntdImage preview={false} src={optimizeCloudinaryUrl(product!.image_url)} alt={product!.product_name} width="100%" style={{ borderRadius: 8, transition: "transform 0.3s ease", transformOrigin: "center" }} />
            )}
            {!showSkeleton && getAiRatingImage(product!.ai_rating ?? 0) && (
              <img
                src={getAiRatingImage(product!.ai_rating ?? 0)}
                alt={`AI Rating ${product!.ai_rating}`}
                className="ai-rating-badge"
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '10px',
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: '2px solid #e6f7ff',
                  padding: 2,
                  transition: 'transform 0.3s ease',
                  zIndex: 1
                }}
              />
            )}
          </motion.div>
        </Col>
        <Col span={14}>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
          <Tabs 
            defaultActiveKey="info" 
            size="large" 
            onTabClick={(key) => {
              if (key === 'ai') {
                handleAITabClick();
              }
            }}
            style={{ 
              minHeight: 500  // 增加整体最小高度
            }}
          >
            <Tabs.TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <InfoCircleOutlined />
                  {t("商品資訊")}
                </span>
              } 
              key="info"
              style={{
                minHeight: 450, // 设置内容区域最小高度
                height: '100%',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 標題區 */}
                <div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: 12 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <AnimatePresence mode="wait">
                      {showSkeleton ? (
                        <motion.div
                          key="loading-title"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.4 }}
                        >
                          <Skeleton.Input active style={{ width: 280, height: 36 }} />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="product-title"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.4 }}
                        >
                          <Title level={2} style={{ 
                            margin: 0, 
                            fontWeight: 800, 
                            letterSpacing: 1, 
                            lineHeight: 1.2 
                          }}>
                            {product!.product_name}
                          </Title>
                        </motion.div>
                      )}
                      </AnimatePresence>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        {showSkeleton ? (
                          <>
                            <Skeleton.Button active style={{ width: 90, height: 28 }} />
                            <Skeleton.Button active style={{ width: 90, height: 28 }} />
                          </>
                        ) : (
                          <>
                            <Tag 
                              color={status!.color} 
                              style={{
                                fontSize: 14,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                fontWeight: 600,
                                borderRadius: 6,
                                padding: '0 12px',
                                cursor: 'default',
                                transition: 'all 0.3s ease',
                                transform: 'translateY(0)',
                              }}
                              className="hover-float"
                            >
                              {status!.label}
                            </Tag>
                            <Tag 
                              color="success"
                              style={{
                                fontSize: 14,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                fontWeight: 600,
                                borderRadius: 6,
                                padding: '0 12px',
                                cursor: 'default',
                                transition: 'all 0.3s ease',
                                transform: 'translateY(0)',
                              }}
                              className="hover-float"
                            >
                              {conditionMap[product!.condition]}
                            </Tag>
                            {product!.donation_ratio >= 60 && (
                              <Tooltip 
                                title={t("[大善人印章] 這個印章是該商品公益捐贈比例達 60% 以上的象徵，ESG小組予以高度的敬意而蓋上的")}
                                placement="right"
                              >
                                <Tag 
                                  style={{
                                    fontSize: 14,
                                    height: 28,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 500,
                                    borderRadius: 6,
                                    padding: '0 8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    transform: 'translateY(0)',
                                    background: 'linear-gradient(135deg, #f5f5dc, #fff8dc)',
                                    color: '#8b4513',
                                    border: '1px solid #d4af37',
                                    boxShadow: '0 2px 12px rgba(212, 175, 55, 0.2)',
                                    backdropFilter: 'blur(8px)',
                                  }}
                                  className="hover-float"
                                >
                                  <img 
                                    src={goodTag} 
                                    alt={t("大善人標章")}
                                    style={{ 
                                      height: 26,
                                      width: 'auto',
                                      objectFit: 'contain',
                                      display: 'block',
                                      transform: 'translateY(2px)'
                                    }} 
                                  />
                                </Tag>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {showSkeleton ? (
                    <Skeleton.Input active style={{ width: 180, height: 20 }} />
                  ) : (
                    <Text type="secondary" style={{ fontSize: 14 }}>{t("商品編號：")}{product!.id}</Text>
                  )}
                </div>

                {/* 賣家說明 */}
                <div 
                  style={{
                    padding: "24px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: 12,
                    marginTop: 24,
                    transition: 'all 0.3s ease',
                    cursor: 'default',
                  }}
                  className="hover-shadow"
                >
                  {showSkeleton ? (
                    <Skeleton.Input active style={{ width: 260, height: 24, marginBottom: 16 }} />
                  ) : (
                    <Text strong style={{ 
                      fontSize: 16, 
                      display: 'block', 
                      marginBottom: 16,
                      color: '#1890ff'
                    }}>
                      <SmileOutlined style={{ marginRight: 8 }} />
                      {product!.seller_nickname} {t("說：")}
                    </Text>
                  )}

                  <div style={{ position: 'relative' }}>
                    {showSkeleton ? (
                      <div style={{ padding: 20 }}>
                        <Skeleton active paragraph={{ rows: 4 }} title={false} />
                      </div>
                    ) : (
                      <div
                        ref={descriptionRef}
                        style={{
                          whiteSpace: 'pre-wrap',
                          color: '#333',
                          fontSize: 15,
                          lineHeight: 1.8,
                          margin: 0,
                          padding: "20px",
                          backgroundColor: "#fff",
                          borderRadius: 8,
                          border: "1px solid #e8e8e8",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                          transition: 'all 0.3s ease',
                          maxHeight: isDescriptionExpanded ? 'none' : '220px',
                          overflow: 'hidden',
                        }}
                        className="hover-border"
                      >
                        {product!.description}
                      </div>
                    )}

                    {showExpandButton && !isDescriptionExpanded && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '80px',
                          background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          padding: '20px',
                        }}
                      >
                        <Button 
                          type="link"
                          onClick={() => setIsDescriptionExpanded(true)}
                          icon={<DownOutlined />}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 14,
                            color: '#1890ff',
                            background: '#fff',
                            borderRadius: 16,
                            padding: '4px 12px',
                            boxShadow: '0 2px 8px rgba(24,144,255,0.1)',
                          }}
                        >
                          {t("展開完整內容")}
                        </Button>
                      </div>
                    )}

                    {showExpandButton && isDescriptionExpanded && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          marginTop: 16,
                        }}
                      >
                        <Button 
                          type="link"
                          onClick={() => setIsDescriptionExpanded(false)}
                          icon={<UpOutlined />}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 14,
                            color: '#1890ff',
                            background: '#fff',
                            borderRadius: 16,
                            padding: '4px 12px',
                            boxShadow: '0 2px 8px rgba(24,144,255,0.1)',
                          }}
                        >
                          {t("收合內容")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 價格和收藏區 */}
                <div 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 24,
                    padding: "20px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: 12,
                    transition: 'all 0.3s ease',
                    cursor: 'default',
                  }}
                  className="hover-shadow"
                >
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                  className="hover-price"
                  >
                    <Text style={{ fontSize: 14, color: '#666' }}>{t("商品價格")}</Text>
                    {showSkeleton ? (
                      <Skeleton.Input active style={{ width: 160, height: 32 }} />
                    ) : (
                      <span style={{ 
                        fontSize: 28,
                        fontWeight: 700,
                        color: '#1890ff',
                        letterSpacing: 1,
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 4,
                        transition: 'all 0.3s ease',
                      }}>
                        <small style={{ fontSize: 16 }}>NT$</small>
                        {product!.price}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* 線上交易請求按鈕 - 商品還沒售出且不是自己的商品時顯示 */}
                    <AnimatePresence mode="wait">
                    {showSkeleton ? (
                      <motion.div
                        key="loading-button"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Skeleton.Button active style={{ width: 160, height: 36, borderRadius: 8 }} />
                      </motion.div>
                    ) : canShowDealRequestButton() ? (
                      <motion.div
                        key="deal-button"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                      >
                        {(() => {
                          const buttonConfig = getDealButtonConfig();
                          
                          const buttonElement = (
                            <Button
                              type={productRequestStatus?.has_request ? "primary" : "primary"}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (buttonConfig.onClick) {
                                  buttonConfig.onClick();
                                }
                              }}
                              disabled={buttonConfig.disabled}
                              loading={dealRequestLoading}
                              icon={productRequestStatus?.has_request ? <HourglassFilled /> : <ShoppingCartOutlined />}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                height: 36,
                                minWidth: 140,
                                borderRadius: 8,
                                border: 'none',
                                backgroundColor: productRequestStatus?.has_request ? '#52c41a' : undefined,
                                borderColor: productRequestStatus?.has_request ? '#52c41a' : undefined,
                                color: productRequestStatus?.has_request ? '#fff' : undefined,
                                boxShadow: buttonConfig.disabled ? 'none' : 
                                  (productRequestStatus?.has_request ? '0 2px 8px rgba(82,196,26,0.2)' : '0 2px 8px rgba(24,144,255,0.2)'),
                                outline: 'none',
                                transition: 'all 0.3s ease',
                                WebkitTapHighlightColor: 'transparent',
                                cursor: buttonConfig.disabled ? 'not-allowed' : 'pointer',
                                transform: 'translateY(0)',
                                opacity: buttonConfig.disabled ? 0.6 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (productRequestStatus?.has_request && !buttonConfig.disabled) {
                                  e.currentTarget.style.backgroundColor = '#73d13d';
                                  e.currentTarget.style.borderColor = '#73d13d';
                                  e.currentTarget.style.color = '#fff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (productRequestStatus?.has_request && !buttonConfig.disabled) {
                                  e.currentTarget.style.backgroundColor = '#52c41a';
                                  e.currentTarget.style.borderColor = '#52c41a';
                                  e.currentTarget.style.color = '#fff';
                                }
                              }}
                              className={buttonConfig.disabled ? '' : 'hover-float-button'}
                            >
                              {buttonConfig.text}
                            </Button>
                          );

                          return buttonConfig.tooltip ? (
                            <Tooltip title={buttonConfig.tooltip} placement="top">
                              <span style={{ display: 'inline-block' }}>
                                {buttonElement}
                              </span>
                            </Tooltip>
                          ) : buttonElement;
                        })()}
                      </motion.div>
                    ) : null}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                    {showSkeleton ? (
                      <motion.div
                        key="loading-like"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Skeleton.Button active style={{ width: 120, height: 36, borderRadius: 8 }} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="like-button"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                      <Button
                        type={product!.liked ? "primary" : "default"}
                        danger={product!.liked}
                        onClick={product!.liked ? handleUnlike : handleLike}
                        loading={likeLoading}
                        icon={product!.liked ? <HeartFilled /> : <HeartOutlined />}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          height: 36,
                          borderRadius: 8,
                          border: 'none',
                          boxShadow: product!.liked ? 'none' : '0 2px 0 rgba(0,0,0,0.02)',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          WebkitTapHighlightColor: 'transparent',
                          cursor: 'pointer',
                          transform: 'translateY(0)',
                        }}
                        className="hover-float-button"
                      >
                        {product!.liked ? t('取消收藏') : t('加入收藏')}
                      </Button>
                      </motion.div>
                    )}
                    </AnimatePresence>
                    
                    <AnimatePresence mode="wait">
                    {showSkeleton ? (
                      <motion.div
                        key="loading-count"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Skeleton.Input active style={{ width: 100, height: 20 }} />
                      </motion.div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <motion.span
                          key="like-count"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                          style={{ 
                            color: '#666', 
                            fontSize: 14,
                            transition: 'all 0.3s ease',
                          }}
                          className="hover-count"
                        >
                          <HeartFilled style={{ marginRight: 4, color: '#ff7875' }} />
                          {product!.like_count || 0} {t("人收藏")}
                        </motion.span>
                        
                        <motion.span
                          key="view-count"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3, delay: 0.3 }}
                          style={{ 
                            color: '#666', 
                            fontSize: 14,
                            transition: 'all 0.3s ease',
                          }}
                          className="hover-count"
                        >
                          <EyeOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                          {product!.view_count || 0} {t("次瀏覽")}
                        </motion.span>
                      </div>
                    )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RobotOutlined />
                  {t("AI 鑑定報告")}
                </span>
              } 
              key="ai"
              style={{
                minHeight: 450, // 与商品信息区域保持一致
                height: '100%',
                position: 'relative'
              }}
            >
              <Card 
                title={<>
                  <span style={{ fontWeight: 600, marginRight: 8, marginLeft: 10 }}>{t("等級：")}</span>
                  <span style={{ color: aiRatingColorMap[(product?.ai_rating || 1)], fontWeight: 700 }}>
                    {ratingMap[(product?.ai_rating || 1)]}
                  </span>
                  {product?.ai_rating_reason && (
                    <Tooltip title={product.ai_rating_reason} placement="right" color="#000000bf">
                      <QuestionCircleOutlined style={{ marginLeft: 8, color: aiRatingColorMap[(product?.ai_rating || 1)], cursor: 'pointer' }} />
                    </Tooltip>
                  )}
                </>} 
                style={{ 
                  marginTop: 16,
                  height: 'calc(100% - 32px)', // 考虑到 marginTop 的 16px
                  display: 'flex',
                  flexDirection: 'column'
                }}
                bodyStyle={{
                  flex: 1,
                  overflow: 'auto'
                }}
              >
                <div style={{ position: "absolute", top: -30, left: -30, zIndex: 2 }}>
                  <RobotAvatarWithDialog
                    idleImage={RobotInit}
                    talkingImage={RobotTalking}
                    silentImage={RobotSilent}
                    silentTalkingImage={RobotSilentTalking}
                    sentences={[
                      { content: t("你想買 {{name}} 就直說！但點我也不會幫你付錢哈哈哈", { name: product?.product_name || '' }) },
                      { content: t("{{name}} 適合你，但我不適合被騷擾。😤", { name: product?.product_name || '' }) },
                      { content: t("別一直點我，除非你想點進我心裡。❤️") },
                      { content: t("你每點一下，我都記在心裡一行 log。🫶") },
                      { content: t("想點我沒關係，但先點亮我們的未來。") },
                      { content: t("這邊不是抽獎入口啦！") },
                      { content: t("你有點成癮症喔，要看醫生嗎？") },
                      { content: t("這不是遊戲機，不要一直 try 看我會不會有隱藏彩蛋。") },
                      { content: t("你這樣點我，是會爆炸你知道嗎？💥"), type: "silent" },
                      { content: t("我不是彩蛋，我是被踩底線。"), type: "silent" },
                      { content: t("一直點，很讓人點點點 ^_^"), type: "silent" },
                      { content: t("你以為我會變身？我只會心寒。"), type: "silent" },
                      { content: t("再點，我有點生氣。👊👊👊"), type: "silent" },
                      { content: t("人類，一天點我五次以上會被我列入黑名單。"), type: "silent" },
                      { content: t("我不是點心，不要一直點我。"), type: "silent" },
                      { content: t("我講話還不夠多？還想叫我出來？"), type: "silent" },
                      { content: t("再點我，收服務費喔。😤"), type: "silent" },
                      { content: t("這邊沒有折扣碼，只有我的無奈。"), type: "silent" },
                      { content: t("點一下叫好奇，點很多下叫霸凌。🥶"), type: "silent" },
                    ]}
                    imageOverride={aiImage}
                    setImageOverride={setAiImage}
                    size={64}
                    offsetX={-15}  // 改為負值，讓氣泡往左偏移
                    offsetY={0}
                    hoverScale={1.2}
                    placement="left"  // 改為 left
                  />
                </div>
                
                {/* 閉嘴按鈕 - 只在打字中顯示 */}
                {showSkipButton && (
                  <div style={{ 
                    position: 'absolute', 
                    top: 10, 
                    right: 10, 
                    zIndex: 10 
                  }}>
                    <Button
                      type="primary"
                      danger
                      size="small"
                      onClick={handleSkipTyping}
                      icon={<span style={{ fontSize: 12 }}>🤐</span>}
                      style={{
                        borderRadius: 6,
                        height: 32,
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        boxShadow: '0 2px 8px rgba(255, 77, 79, 0.3)',
                        border: 'none',
                        background: '#ff4d4f',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#ff7875';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ff4d4f';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {t("閉嘴")}
                    </Button>
                  </div>
                )}
                
                <Text strong>{t("鑑定報告：")}</Text>
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{aiComment}</Paragraph>
                <Divider />
                <Text strong>{t("適合買家：")}</Text>
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{aiFitOwner}</Paragraph>
              </Card>
            </Tabs.TabPane>
          </Tabs>
          </motion.div>
        </Col>
      </Row>

      <Divider style={{ margin: '32px 0' }} />

      {/* 簡潔的聊天樣式區域 */}
      {showSkeleton ? (
        <div style={{ padding: 20 }}>
          <Skeleton active paragraph={{ rows: 3 }} title={false} />
        </div>
      ) : (
        <ChatMessageBox
          productId={parseInt(id || '0')}
          productName={product!.product_name}
          onSendMessage={(_message: string) => {
            // 如果需要在這裡做額外處理，可以添加相關邏輯
          }}
        />
      )}

      {/* 線上交易請求模態對話框 */}
      <Modal
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
            padding: '8px 0',
            borderBottom: '1px solid #f0f0f0',
            marginBottom: 16 
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#1890ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 18,
              fontWeight: 'bold'
            }}>
              <ShoppingCartOutlined />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#262626' }}>{t("發送購買請求")}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{t("向賣家表達您的購買意願")}</div>
            </div>
          </div>
        }
        open={dealRequestModalVisible}
        onCancel={() => {
          setDealRequestModalVisible(false);
          setDealRequestComment("");
        }}
        onOk={handleNewDealRequest}
        confirmLoading={dealRequestLoading}
        okText={
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShoppingCartOutlined />
            {t("發送購買請求")}
          </span>
        }
        cancelText={t("取消")}
        width={680}
        centered
        maskClosable={false}
        destroyOnClose
        okButtonProps={{
          size: 'large',
          disabled: !dealRequestComment.trim(),
          style: {
            background: '#ffffff',
            border: '2px solid #1890ff',
            borderRadius: 8,
            height: 44,
            fontSize: 16,
            fontWeight: 600,
            color: '#1890ff',
            transition: 'all 0.3s ease',
          },
          onMouseEnter: (e) => {
            const button = e.currentTarget as HTMLButtonElement;
            if (!button.disabled) {
              button.style.background = '#1890ff';
              button.style.color = '#ffffff';
              button.style.borderColor = '#1890ff';
              button.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.3)';
            }
          },
          onMouseLeave: (e) => {
            const button = e.currentTarget as HTMLButtonElement;
            if (!button.disabled) {
              button.style.background = '#ffffff';
              button.style.color = '#1890ff';
              button.style.borderColor = '#1890ff';
              button.style.boxShadow = 'none';
            }
          }
        }}
        cancelButtonProps={{
          size: 'large',
          style: {
            borderRadius: 8,
            height: 44,
            fontSize: 16,
          }
        }}
      >
        {/* 商品預覽卡片 */}
        <div style={{ 
          marginBottom: 24,
          padding: 20,
          background: '#fafafa',
          borderRadius: 12,
          border: '1px solid #e8e8e8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <Row gutter={20} align="middle">
            <Col span={6}>
              {product?.image_url && (
                <div style={{ position: 'relative' }}>
                  <img 
                    src={optimizeCloudinaryUrl(product.image_url)} 
                    alt={product.product_name}
                    style={{ 
                      width: '100%', 
                      borderRadius: 10,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transition: 'transform 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#52c41a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 'bold',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}>
                    ✓
                  </div>
                </div>
              )}
            </Col>
            <Col span={18}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Text strong style={{ 
                  fontSize: 18, 
                  color: '#262626',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {product?.product_name}
                </Text>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <Text style={{ 
                    fontSize: 28, 
                    color: '#1890ff', 
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}>
                    NT$ {product?.price?.toLocaleString()}
                  </Text>
                  <Tag color="success" style={{ 
                    fontSize: 12, 
                    fontWeight: 600,
                    borderRadius: 4,
                    border: 'none'
                  }}>
                    {conditionMap[product?.condition || 1]}
                  </Tag>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {t("賣家：")}<Text strong style={{ color: '#595959' }}>{product?.seller_nickname}</Text>
                  </Text>
                </div>
              </div>
            </Col>
          </Row>
        </div>
        
        {/* 留言區域 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            marginBottom: 12 
          }}>
            <EditOutlined style={{ color: '#1890ff', fontSize: 16 }} />
            <Text strong style={{ fontSize: 16, color: '#262626' }}>
              {t("給賣家的割愛小紙條")}
            </Text>
            <Text type="danger" style={{ fontSize: 12 }}>{t("*必填")}</Text>
          </div>
          
          <TextArea
            placeholder={t("用一段真誠的話來打動 {{name}} ，成交就靠這裡了！", { name: product?.seller_nickname })}
            value={dealRequestComment}
            onChange={(e) => setDealRequestComment(e.target.value)}
            rows={4}
            maxLength={200}
            showCount
            required
            status={!dealRequestComment.trim() ? 'error' : undefined}
            style={{ 
              borderRadius: 8,
              border: '2px solid #f0f0f0',
              fontSize: 14,
              lineHeight: 1.6,
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#1890ff';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.1)';
            }}
            onBlur={(e) => {
              if (dealRequestComment.trim()) {
                e.currentTarget.style.borderColor = '#52c41a';
              } else {
                e.currentTarget.style.borderColor = '#ff4d4f';
              }
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          {!dealRequestComment.trim() && (
            <Text type="danger" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              {t("記得填寫給賣家的留言:)")}
            </Text>
          )}
        </div>
        
        {/* 提示信息 */}
        <div style={{ 
          padding: 16, 
          background: '#f6ffed', 
          borderRadius: 10, 
          border: '1px solid #d9f7be',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 4,
            height: '100%',
            background: '#52c41a'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingLeft: 8 }}>
            <BulbOutlined style={{ color: '#52c41a', fontSize: 20, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <Text strong style={{ color: '#389e0d', fontSize: 14, display: 'block', marginBottom: 4 }}>
                {t("購買流程說明")}
              </Text>
              <Text style={{ color: '#595959', fontSize: 13, lineHeight: 1.5 }}>
                {t("發送購買請求後，賣家會收到通知並查看您的留言。如果賣家同意交易，您將可以進行後續的聯絡與交易流程。")}
              </Text>
            </div>
          </div>
        </div>
      </Modal>

      {/* 取消購買請求確認對話框 */}
      <Modal
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
            padding: '8px 0' 
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#ff4d4f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 18,
              fontWeight: 'bold'
            }}>
              ⚠️
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#262626' }}>{t("取消購買請求")}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{t("確認要收回您的購買請求嗎？")}</div>
            </div>
          </div>
        }
        open={cancelConfirmVisible}
        onCancel={() => setCancelConfirmVisible(false)}
        onOk={handleCancelRequest}
        confirmLoading={dealRequestLoading}
        okText={
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HourglassFilled />
            {t("確認取消")}
          </span>
        }
        cancelText={t("不取消")}
        okType="danger"
        centered
        width={480}
        destroyOnClose
        okButtonProps={{
          size: 'large',
          style: {
            borderRadius: 8,
            height: 44,
            fontSize: 16,
            fontWeight: 600,
          }
        }}
        cancelButtonProps={{
          size: 'large',
          style: {
            borderRadius: 8,
            height: 44,
            fontSize: 16,
          }
        }}
      >
        <div style={{
          padding: '20px 0',
          textAlign: 'center'
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#fff2f0',
            border: '3px solid #ffccc7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 32
          }}>
            🤔
          </div>
          
          <Text style={{ 
            fontSize: 16, 
            color: '#595959',
            lineHeight: 1.6,
            display: 'block',
            marginBottom: 16
          }}>
            {t("您已經對此商品送出過購買請求")}
          </Text>
          
          <Text style={{ 
            fontSize: 14, 
            color: '#8c8c8c',
            lineHeight: 1.5
          }}>
            {t("取消後您可以重新發送新的購買請求，但之前的留言會遺失")}
          </Text>
        </div>
      </Modal>



    </motion.div>

  );
};

export default ProductDetail;
