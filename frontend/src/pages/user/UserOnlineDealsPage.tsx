import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, message, Modal, Statistic, Row, Col, Space, Typography, Empty, Alert, Avatar, Tooltip } from 'antd';
import { ShoppingCartOutlined, ShopOutlined, CheckOutlined, DeleteOutlined, InfoCircleOutlined, CloudFilled, QuestionCircleOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import onlineDealService, { OnlineDealWithProduct, OnlineDealStats } from '../../services/onlineDealService';
import systemConfigService from '../../services/systemConfigService';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import useGlobalNotificationManager from '../../hooks/useGlobalNotificationManager';
import { useOnlineDealNotificationChecker } from '../../hooks/useOnlineDealNotificationChecker';

// 初始化 dayjs 插件
dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text, Paragraph } = Typography;

// 隨機副標題文案
const subtitles = [
  // 有趣
  i18n.t("線上交易大亂鬥，誰的留言最能打動賣家？"),
  i18n.t("別只逛逛，線上交易才是真正的前戲！"),
  i18n.t("一鍵送出請求，線上交易比你想像更刺激！"),

  // 專業
  i18n.t("線上交易流程數位化，管理更高效透明"),
  i18n.t("即時追蹤線上交易進度，確保結算有依據"),
  i18n.t("線上交易全紀錄，方便 ESG 後續對帳"),

  // 文青
  i18n.t("線上交易，是物品新旅程的起點"),
  i18n.t("讓物件透過線上交易找到下一位知己"),
  i18n.t("線上交易，不只是轉手，更是緣分的橋樑"),

  // 搞笑
  i18n.t("線上交易就是現代相親，能不能成交全靠緣"),
  i18n.t("小心！線上交易會讓你的購物額度瞬間蒸發"),
  i18n.t("線上交易讓你提前過過癮，現場還能再搶一波！"),

  i18n.t("記得先瞄一眼下面的活動規則，少走冤枉路！"),
  i18n.t("交易前先看規則，保證少踩坑多成交。"),
  i18n.t("聰明人都會先讀規則，你也不例外吧？"),
  i18n.t("別急著下手，活動規則藏著關鍵小細節。"),
  i18n.t("規則說明在下面，先看完再出手更安心。"),
  i18n.t("線上交易很簡單，前提是你先懂規則。"),
  i18n.t("看規則 ≠ 麻煩，而是少掉很多麻煩。"),
  i18n.t("下面的活動規則說明，就是你成功交易的秘訣！"),
];

const UserOnlineDealsPage: React.FC = () => {
  const { t } = useTranslation();
  const [myRequests, setMyRequests] = useState<OnlineDealWithProduct[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<OnlineDealWithProduct[]>([]);
  const [stats, setStats] = useState<OnlineDealStats | null>(null);
  const { manualCheck } = useGlobalNotificationManager();
  const { updatePageVisitTime, manualCheck: manualCheckNotifications } = useOnlineDealNotificationChecker();
  type OnlineDealUIConfig = {
    online_deal_enabled: boolean;
    online_deal_available: boolean;
    online_deal_begin_date?: string | null;
    online_deal_end_date?: string | null;
  } | null;
  const [systemConfig, setSystemConfig] = useState<OnlineDealUIConfig>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('my-requests');
  const [selectedRequest, setSelectedRequest] = useState<OnlineDealWithProduct | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'approve' | 'reject' | 'cancel' | 'view'>('view');
  const [rulesModalVisible, setRulesModalVisible] = useState(false);
  
  // 隨機選擇副標題
  const [randomSubtitle] = useState(() => 
    subtitles[Math.floor(Math.random() * subtitles.length)]
  );

  // 將收到的請求按商品分組
  const groupRequestsByProduct = (requests: OnlineDealWithProduct[]) => {
    const grouped = requests.reduce((groups, request) => {
      const productId = request.product_id;
      if (!groups[productId]) {
        groups[productId] = {
          product_id: productId,
          product_name: request.product_name,
          product_price: request.product_price,
          product_image_url: request.product_image_url,
          requests: []
        };
      }
      groups[productId].requests.push(request);
      return groups;
    }, {} as Record<number, {
      product_id: number;
      product_name: string;
      product_price: number;
      product_image_url: string;
      requests: OnlineDealWithProduct[];
    }>);

    // 將分組後的數據轉為數組，並對每個商品的請求按時間排序（最早的在前）
    return Object.values(grouped).map(group => ({
      ...group,
      requests: group.requests.sort((a, b) => 
        new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
      )
    }));
  };

  useEffect(() => {
    const initPage = async () => {
      // 更新用戶頁面訪問時間
      await updatePageVisitTime();
      
      // 進入頁面時檢查一次通知
      if (typeof manualCheckNotifications === 'function') {
        await manualCheckNotifications();
      }
      
      loadData();
      loadSystemConfig();
    };
    
    initPage();
  }, [updatePageVisitTime, manualCheckNotifications]);

  const loadSystemConfig = async () => {
    try {
      // 先取對所有使用者公開的線上交易狀態
      const publicCfg = await onlineDealService.getPublicConfig();

      // 若為管理員，再補齊開放時間等進階欄位（非管理員無此資訊也能正常顯示狀態）
      let adminCfg: any = null;
      try {
        if (systemConfigService.isAdmin()) {
          adminCfg = await systemConfigService.getCurrentConfig();
        }
      } catch (e) {
        // 忽略管理員配置讀取失敗，維持公開配置
      }

      setSystemConfig({
        online_deal_enabled: publicCfg.online_deal_enabled,
        online_deal_available: publicCfg.online_deal_available,
        online_deal_begin_date: adminCfg?.online_deal_begin_date ?? null,
        online_deal_end_date: adminCfg?.online_deal_end_date ?? null,
      });
    } catch (error) {
      console.error('載入線上交易公開配置失敗:', error);
      setSystemConfig(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [myRequestsData, receivedRequestsData, statsData] = await Promise.all([
        onlineDealService.getMyRequests(),
        onlineDealService.getReceivedRequests(),
        onlineDealService.getMyStats()
      ]);
      
      // 為每個請求添加狀態文字
      const myRequestsWithStatus = myRequestsData.map(req => ({
        ...req,
        status_text: onlineDealService.getStatusText(req.deal_status)
      }));
      
      const receivedRequestsWithStatus = receivedRequestsData.map(req => ({
        ...req,
        status_text: onlineDealService.getStatusText(req.deal_status)
      }));
      
      setMyRequests(myRequestsWithStatus);
      setReceivedRequests(receivedRequestsWithStatus);
      setStats(statsData);
    } catch (error) {
      message.error(t('載入資料失敗'));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'cancel', dealId: number) => {
    try {
      let result;
      switch (action) {
        case 'approve':
          result = await onlineDealService.approveRequest(dealId);
          message.success(t("已同意交易請求 - {{message}}", { message: result.message }));
          break;
        case 'reject':
          result = await onlineDealService.rejectRequest(dealId);
          message.success(t("已拒絕交易請求 - {{message}}", { message: result.message }));
          break;
        case 'cancel':
          result = await onlineDealService.cancelRequest(dealId);
          message.success(t("已取消交易請求 - {{message}}", { message: result.message }));
          break;
      }
      setModalVisible(false);
      setSelectedRequest(null);
      await loadData(); // 重新載入資料
      
      // 觸發手動通知檢查
      setTimeout(() => {
        manualCheck();
      }, 1000);
    } catch (error: any) {
      message.error(error.response?.data?.detail || t("{{action}}交易請求失敗", { action: action === 'approve' ? t('同意') : action === 'reject' ? t('拒絕') : t('取消') }));
    }
  };

  const showModal = (request: OnlineDealWithProduct, type: 'approve' | 'reject' | 'cancel' | 'view') => {
    setSelectedRequest(request);
    setModalType(type);
    setModalVisible(true);
  };

  // 我發出的請求表格欄位
  const myRequestColumns: ColumnsType<OnlineDealWithProduct> = [
    {
      title: t('商品名稱'),
      dataIndex: 'product_name',
      key: 'product_name',
      render: (text, record) => (
        <Space>
          {record.product_image_url && (
            <img 
              src={record.product_image_url} 
              alt={text} 
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: t('價格'),
      dataIndex: 'product_price',
      key: 'product_price',
      render: (price) => `NT$ ${price?.toLocaleString()}`,
    },
    {
      title: t('賣家'),
      dataIndex: 'seller_nickname',
      key: 'seller_nickname',
      render: (nickname, record) => nickname || record.seller_name || t('未知賣家'),
    },
    {
      title: t('狀態'),
      dataIndex: 'deal_status',
      key: 'status',
      render: (status) => (
        <Tag color={onlineDealService.getStatusColor(status)}>
          {onlineDealService.getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: t('申請時間'),
      dataIndex: 'created_time',
      key: 'created_time',
      render: (time) => dayjs.utc(time).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm'),
    },
    {
      title: t('操作'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<InfoCircleOutlined />}
            onClick={() => showModal(record, 'view')}
          >
            {t("詳情")}
          </Button>
          {record.deal_status === 0 && (
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => showModal(record, 'cancel')}
            >
              {t("取消")}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const getModalTitle = () => {
    switch (modalType) {
      case 'approve': return t('確認賣給這位買家');
      case 'reject': return t('拒絕交易請求');
      case 'cancel': return t('取消交易請求');
      case 'view': return t('交易請求詳情');
      default: return t('交易請求');
    }
  };

  const getModalContent = () => {
    if (!selectedRequest) return null;

    // 根據目前的 tab 決定當前視角（僅用於下方成交恭喜區塊）
    const isBuyerView = activeTab === "my-requests";

    const buyerLocalPart = selectedRequest.buyer_email?.split('@')[0] || 'Unknown User';
    const sellerLocalPart = selectedRequest.seller_name?.split('@')[0] || selectedRequest.seller_nickname || 'Unknown User';

    // 詳情頭像/名稱一律顯示「買家」資訊（符合需求：收到的請求要看買家；我發出的請求原本就正確）
    const displayUser = {
      localPart: buyerLocalPart,
      avatar_url: selectedRequest.buyer_avatar_url,
      role: "買家",
      color: "#1890ff"
    };

    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        {/* 用戶 Avatar 區域 */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          style={{ marginBottom: 24 }}
        >
          <Avatar 
            size={80}
            src={displayUser.avatar_url}
            style={{ 
              backgroundColor: displayUser.avatar_url ? 'transparent' : displayUser.color,
              border: `3px solid ${displayUser.color}20`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 32
            }}
          >
            {!displayUser.avatar_url && displayUser.localPart ? displayUser.localPart.charAt(0).toUpperCase() : '?'}
          </Avatar>
        </motion.div>

        {/* 用戶信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Title level={4} style={{ margin: '0 0 8px 0', color: displayUser.color }}>
            {displayUser.localPart}
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {t("申請時間：")}{dayjs.utc(selectedRequest.created_time).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm')}
          </Text>
        </motion.div>

        {/* 狀態標籤 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{ margin: '16px 0' }}
        >
          <Tag 
            color={onlineDealService.getStatusColor(selectedRequest.deal_status)}
            style={{ fontSize: 14, padding: '4px 12px', borderRadius: 20 }}
          >
            {selectedRequest.status_text}
          </Tag>
        </motion.div>

        {/* 求割愛發言區域 */}
        {selectedRequest.buyer_comment ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{ marginTop: 24 }}
          >
            <div style={{ 
              background: 'linear-gradient(135deg, #f6f9fc 0%, #e9f4ff 100%)',
              border: '1px solid #d9d9d9',
              borderRadius: 12,
              padding: 20,
              position: 'relative',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
              {/* 對話框箭頭 */}
              <div style={{
                position: 'absolute',
                top: -8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: '8px solid #f6f9fc'
              }} />
              
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ color: '#1890ff', fontSize: 16 }}>
                  {t("💬 割愛小紙條")}
                </Text>
              </div>
              
              <Paragraph 
                style={{ 
                  margin: 0, 
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: '#262626',
                  fontStyle: 'italic'
                }}
              >
                "{selectedRequest.buyer_comment}"
              </Paragraph>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{ marginTop: 24 }}
          >
            <div style={{ 
              background: '#fafafa',
              border: '1px dashed #d9d9d9',
              borderRadius: 12,
              padding: 20,
              color: '#999'
            }}>
              <Text type="secondary">
                {t("🤐 買家沒有留下任何訊息")}
              </Text>
            </div>
          </motion.div>
        )}

        {/* 賣家視角（我收到的請求）且已同意時，顯示底線與提示 */}
        {activeTab === 'received-requests' && selectedRequest.deal_status === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{ marginTop: 24 }}
          >
            <div style={{
              height: '1px',
              background: 'linear-gradient(to right, transparent, #d9d9d9, transparent)',
              margin: '24px 0'
            }} />
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 20, color: '#52c41a' }}>
                {t("恭喜！你們的商品成交了！")}
              </Text>
              <br/>
              <br/>
              <Text style={{ fontSize: 15, color: '#52c41a' }}>
                {t("記得用 MM 聯繫他然後進行商品交易的討論喔：）")}
              </Text>
            </div>
          </motion.div>
        )}

        {/* 成交後的恭喜區域 - 只在買家視角且已成交時顯示 */}
        {isBuyerView && selectedRequest.deal_status === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{ marginTop: 24 }}
          >
            {/* 分隔線 */}
            <div style={{ 
              height: '1px', 
              background: 'linear-gradient(to right, transparent, #d9d9d9, transparent)',
              margin: '24px 0'
            }} />
            
            {/* 恭喜訊息 */}
            <div style={{ marginBottom: 20 }}>
              <Title level={4} style={{ color: '#52c41a', margin: 0 }}>
                {t("🎉 恭喜你成功購買了他的商品")}
              </Title>
            </div>

            {/* 賣家資訊 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 16,
              marginBottom: 20
            }}>
              <Avatar 
                size={64}
                src={selectedRequest.seller_avatar_url}
                style={{ 
                  backgroundColor: selectedRequest.seller_avatar_url ? 'transparent' : '#52c41a',
                  border: '2px solid #52c41a',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 24
                }}
              >
                {!selectedRequest.seller_avatar_url && sellerLocalPart ? sellerLocalPart.charAt(0).toUpperCase() : '?'}
              </Avatar>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a' }}>
                  {sellerLocalPart}
                </div>
                <div style={{ fontSize: 14, color: '#666' }}>
                  {t("賣家")}
                </div>
              </div>
            </div>

            {/* 聯繫提示 */}
            <div style={{ 
              background: 'linear-gradient(135deg, #f6ffed 0%, #e6f7d4 100%)',
              border: '1px solid #b7eb8f',
              borderRadius: 12,
              padding: 16,
              color: '#52c41a'
            }}>
              <Text style={{ fontSize: 15, color: '#52c41a' }}>
                {t("📱 請透過 MM 聯繫他處理交易的事宜")}
              </Text>
            </div>
          </motion.div>
        )}

        {modalType !== 'view' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{ marginTop: 24 }}
          >
            <Alert
              type={modalType === 'approve' ? 'info' : 'warning'}
              message={
                modalType === 'approve' ?
                t('🤝 確定要將商品賣給這位買家嗎？交易完成後商品將下架。') :
                modalType === 'reject' ?
                t('❌ 確定要拒絕這個交易請求嗎？') :
                t('🚫 確定要取消這個交易請求嗎？')
              }
              showIcon={false}
              style={{ borderRadius: 8 }}
            />
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <motion.div 
      style={{ margin: "0 auto", padding: "40px 24px", maxWidth: 1200 }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.8,
        ease: "easeOut",
        staggerChildren: 0.1
      }}
    >
      <style>
        {`
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
            box-shadow: none;
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
            box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.10);
            border: none;
            outline: none;
            transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 1;
          }
          .toggle-option:hover:not(.active) {
            color: #40a9ff;
            transform: scale(1.02);
            background: transparent !important;
          }
        `}
      </style>
      {/* 標題區域 */}
      <motion.div 
        style={{ textAlign: "center", marginBottom: 40 }}
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
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
          <CloudFilled
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
            {t("線上交易管理")}
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
          
          {/* 規則說明按鈕 */}
          <Button 
            type="primary" 
            ghost 
            icon={<QuestionCircleOutlined />}
            onClick={() => setRulesModalVisible(true)}
            style={{ marginTop: 16 }}
          >
            {t("線上交易規則說明")}
          </Button>
        </motion.div>
      </motion.div>

      {/* 系統狀態顯示 */}
      {systemConfig && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 'bold', color: '#666' }}>
              {t("線上交易系統狀態：")}
            </span>
            <Tooltip
              title={(() => {
                if (!systemConfig.online_deal_enabled) {
                  return t("系統管理員已停用線上交易功能，您仍可管理現有的商品購買申請");
                }
                if (!systemConfig.online_deal_available) {
                  return t("目前暫停接受新的商品購買申請，現有申請可正常處理");
                }
                if (systemConfig.online_deal_begin_date && systemConfig.online_deal_end_date) {
                  const now = new Date();
                  const start = new Date(systemConfig.online_deal_begin_date);
                  const end = new Date(systemConfig.online_deal_end_date);
                  const inTimeRange = now >= start && now <= end;
                  if (!inTimeRange) {
                    return t("開放時間：{{start}} ~ {{end}}", { start: dayjs.utc(systemConfig.online_deal_begin_date).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm'), end: dayjs.utc(systemConfig.online_deal_end_date).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm') });
                  }
                }
                return t("用戶可以正常提出新的商品購買申請");
              })()}
              placement="bottom"
            >
              <Tag 
                color={(() => {
                  if (!systemConfig.online_deal_enabled) return "red";
                  if (!systemConfig.online_deal_available) return "orange";
                  if (systemConfig.online_deal_begin_date && systemConfig.online_deal_end_date) {
                    const now = new Date();
                    const start = new Date(systemConfig.online_deal_begin_date);
                    const end = new Date(systemConfig.online_deal_end_date);
                    const inTimeRange = now >= start && now <= end;
                    if (!inTimeRange) return "blue";
                  }
                  return "green";
                })()} 
                style={{ fontSize: 14, padding: '4px 12px', cursor: 'pointer' }}
              >
                {(() => {
                  if (!systemConfig.online_deal_enabled) {
                    return t("🔒 功能停用");
                  }
                  if (!systemConfig.online_deal_available) {
                    return t("⏸️ 暫停申請");
                  }
                  if (systemConfig.online_deal_begin_date && systemConfig.online_deal_end_date) {
                    const now = new Date();
                    const start = new Date(systemConfig.online_deal_begin_date);
                    const end = new Date(systemConfig.online_deal_end_date);
                    const inTimeRange = now >= start && now <= end;
                    if (!inTimeRange) {
                      if (now < start) {
                        return t("⏰ 尚未開放");
                      } else {
                        return t("⏰ 已結束");
                      }
                    }
                  }
                  return t("🚀 正常開放");
                })()}
              </Tag>
            </Tooltip>
          </div>
        </Card>
        </motion.div>
      )}
 
      {/* Tab 切換開關 */}
      <motion.div 
        className="toggle-switch"
        style={{ textAlign: "center", marginBottom: 32 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
      >
        <motion.div
          className="toggle-slider"
          animate={{
            transform: activeTab === "my-requests" ? "translateX(0%)" : "translateX(100%)"
          }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        />
        <motion.button
          className={`toggle-option ${activeTab === "my-requests" ? "active" : ""}`}
          onClick={() => setActiveTab("my-requests")}
          whileHover={{ scale: activeTab !== "my-requests" ? 1.02 : 1 }}
          whileTap={{ scale: 0.98 }}
        >
          <ShoppingCartOutlined style={{ fontSize: 16 }} />
          {t("我發出的請求 ({{count}})", { count: myRequests.length })}
        </motion.button>
        <motion.button
          className={`toggle-option ${activeTab === "received-requests" ? "active" : ""}`}
          onClick={() => setActiveTab("received-requests")}
          whileHover={{ scale: activeTab !== "received-requests" ? 1.02 : 1 }}
          whileTap={{ scale: 0.98 }}
        >
          <ShopOutlined style={{ fontSize: 16 }} />
          {t("我收到的請求 ({{count}})", { count: receivedRequests.length })}
        </motion.button>
      </motion.div>

      {/* 統計資訊 */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card 
            style={{ 
              marginBottom: 24,
              background: activeTab === 'my-requests' 
                ? 'linear-gradient(135deg, #f6f9fc 0%, #e9f4ff 100%)' 
                : 'linear-gradient(135deg, #f6ffed 0%, #e6f7d4 100%)',
              border: activeTab === 'my-requests'
                ? '1px solid #d9e5ff'
                : '1px solid #b7eb8f',
              borderRadius: 12,
              boxShadow: activeTab === 'my-requests'
                ? '0 4px 12px rgba(24, 144, 255, 0.08)'
                : '0 4px 12px rgba(82, 196, 26, 0.08)',
              transition: 'all 0.3s ease'
            }}
          >
          <AnimatePresence mode="wait">
            {activeTab === 'my-requests' ? (
              <motion.div
                key="my-requests-stats"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <Row gutter={[16, 16]} justify="space-around">
                  <Col>
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px 16px',
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      minWidth: 160
                    }}>
                      <Statistic
                        title={t("總共發送的請求數")}
                        value={stats.total_requests}
                        valueStyle={{ color: '#1890ff', fontSize: 28, fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col>
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px 16px',
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      minWidth: 160
                    }}>
                      <Statistic
                        title={t("等待處理的請求數")}
                        value={stats.pending_requests}
                        valueStyle={{ color: '#faad14', fontSize: 28, fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col>
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px 16px',
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      minWidth: 160
                    }}>
                      <Statistic
                        title={t("被同意的請求數")}
                        value={stats.approved_requests}
                        valueStyle={{ color: '#52c41a', fontSize: 28, fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col>
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px 16px',
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      minWidth: 160
                    }}>
                      <Statistic
                        title={t("被拒絕的請求數")}
                        value={stats.rejected_requests}
                        valueStyle={{ color: '#ff4d4f', fontSize: 28, fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col>
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px 16px',
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      minWidth: 160
                    }}>
                      <Statistic
                        title={t("請求額度(可用 / 上限)")}
                        value={stats.available_slots} 
                        suffix={`/ ${stats.max_concurrent_deals}`}
                        valueStyle={{ color: '#722ed1', fontSize: 28, fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                </Row>
              </motion.div>
            ) : (
              <motion.div
                key="received-requests-stats"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Row gutter={[16, 16]} justify="space-around">
                  <Col>
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px 16px',
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      minWidth: 160
                    }}>
                      <Statistic
                        title={t("收到請求的商品數")}
                        value={groupRequestsByProduct(receivedRequests).length}
                        valueStyle={{ color: '#1890ff', fontSize: 28, fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col>
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px 16px',
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      minWidth: 160
                    }}>
                      <Statistic
                        title={t("總收到的請求數")}
                        value={receivedRequests.length}
                        valueStyle={{ color: '#13c2c2', fontSize: 28, fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col>
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px 16px',
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      minWidth: 160
                    }}>
                      <Statistic
                        title={t("待處理的請求數")}
                        value={receivedRequests.filter(req => req.deal_status === 0).length}
                        valueStyle={{ color: '#faad14', fontSize: 28, fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col>
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px 16px',
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      minWidth: 160
                    }}>
                      <Statistic
                        title={t("已完成的請求數")}
                        value={receivedRequests.filter(req => req.deal_status === 1).length}
                        valueStyle={{ color: '#52c41a', fontSize: 28, fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                  <Col>
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px 16px',
                      background: '#fff',
                      borderRadius: 8,
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      minWidth: 160
                    }}>
                      <Statistic
                        title={t("已拒絕的請求數")}
                        value={receivedRequests.filter(req => req.deal_status === 3).length}
                        valueStyle={{ color: '#ff4d4f', fontSize: 28, fontWeight: 'bold' }}
                      />
                    </div>
                  </Col>
                </Row>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <Card>

        <AnimatePresence mode="wait">
          {activeTab === 'my-requests' ? (
            <motion.div
              key="my-requests"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Table
                columns={myRequestColumns}
                dataSource={myRequests}
                rowKey="id"
                loading={loading}
                locale={{
                  emptyText: <Empty description={t("尚無交易請求")} />
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="received-requests"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* 新的分組顯示UI */}
              {receivedRequests.length === 0 ? (
                <Empty description={t("尚無收到的請求")} />
              ) : (
                <div style={{ padding: 16 }}>
                  {groupRequestsByProduct(receivedRequests).map(productGroup => (
                    <Card 
                      key={productGroup.product_id}
                      style={{ marginBottom: 16 }}
                      hoverable
                    >
                      {/* 商品概覽 */}
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                        {productGroup.product_image_url && (
                          <img 
                            src={productGroup.product_image_url} 
                            alt={productGroup.product_name}
                            style={{ 
                              width: 60, 
                              height: 60, 
                              objectFit: 'cover', 
                              borderRadius: 8,
                              marginRight: 16
                            }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 'bold' }}>
                                {productGroup.product_name}
                              </h4>
                              <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: 14 }}>
                                {t("ID: {{id}} | 價格: NT$ {{price}}", { id: productGroup.product_id, price: productGroup.product_price?.toLocaleString() })}
                              </p>
                            </div>
                            <Tag color="blue" style={{ fontSize: 14 }}>
                              {t("{{count}} 個請求", { count: productGroup.requests.length })}
                            </Tag>
                          </div>
                        </div>
                      </div>

                      {/* 請求列表 */}
                      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                        {productGroup.requests.map(request => {
                          const buyerLocalPart = request.buyer_email?.split('@')[0] || 'Unknown User';
                          return (
                            <div 
                              key={request.id}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                padding: '12px 0',
                                borderBottom: '1px solid #f8f8f8'
                              }}
                            >
                              <Avatar 
                                src={request.buyer_avatar_url}
                                style={{ 
                                  backgroundColor: request.buyer_avatar_url ? 'transparent' : '#1890ff', 
                                  marginRight: 12,
                                  color: 'white',
                                  fontWeight: 'bold'
                                }}
                              >
                                {!request.buyer_avatar_url && buyerLocalPart ? buyerLocalPart.charAt(0).toUpperCase() : '?'}
                              </Avatar>
                              
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                  {buyerLocalPart}
                                </div>
                                <div style={{ 
                                  color: '#666', 
                                  fontSize: 12,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '200px'
                                }}>
                                  {request.buyer_comment ?
                                    `"${request.buyer_comment}"` :
                                    t('無特別留言')
                                  }
                                </div>
                              </div>

                              <div style={{ marginLeft: 12 }}>
                                <Tag color={onlineDealService.getStatusColor(request.deal_status)}>
                                  {onlineDealService.getStatusText(request.deal_status)}
                                </Tag>
                              </div>

                              <div style={{ marginLeft: 12 }}>
                                <Space>
                                  <Button 
                                    size="small"
                                    icon={<InfoCircleOutlined />}
                                    onClick={() => showModal(request, 'view')}
                                  >
                                    {t("詳細")}
                                  </Button>
                                  {request.deal_status === 0 && (
                                    <Button
                                      size="small"
                                      type="primary"
                                      icon={<CheckOutlined />}
                                      onClick={() => showModal(request, 'approve')}
                                    >
                                      {t("賣給他")}
                                    </Button>
                                  )}
                                </Space>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      </motion.div>

      {/* 操作確認對話框 */}
      <Modal
        title={getModalTitle()}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedRequest(null);
        }}
        footer={modalType === 'view' ? [
          <Button key="close" onClick={() => setModalVisible(false)}>
            {t("關閉")}
          </Button>
        ] : [
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            {t("取消")}
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger={modalType === 'reject' || modalType === 'cancel'}
            onClick={() => selectedRequest && handleAction(modalType, selectedRequest.id)}
          >
            {t("確定")}
          </Button>
        ]}
        width={480}
        centered
      >
        {getModalContent()}
      </Modal>

      {/* 規則說明 Modal */}
      <Modal
        title={
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ 
              textAlign: 'center', 
              fontSize: 22, 
              fontWeight: 'bold', 
              color: '#1890ff',
              background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {t("📋 線上交易小規則")}
          </motion.div>
        }
        open={rulesModalVisible}
        onCancel={() => setRulesModalVisible(false)}
        footer={[
          <motion.div
            key="footer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <Button 
              key="close" 
              type="primary" 
              size="large"
              onClick={() => setRulesModalVisible(false)}
              style={{
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
                fontWeight: 'bold'
              }}
            >
              {t("✅ 我了解了")}
            </Button>
          </motion.div>
        ]}
        width={720}
        centered
        style={{
          borderRadius: 16,
          overflow: 'hidden'
        }}
        bodyStyle={{
          padding: 0,
          background: 'linear-gradient(135deg, #fafbff 0%, #f0f8ff 100%)'
        }}
      >
        <div style={{ 
          maxHeight: '75vh', 
          overflowY: 'auto', 
          padding: '24px 32px',
          background: 'linear-gradient(135deg, #fafbff 0%, #f0f8ff 100%)'
        }}>
          {/* 為什麼要有線上交易 */}
          <motion.div 
            style={{ marginBottom: 32 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #fff7e6 0%, #fffbf0 100%)',
              border: '2px solid #ffd591',
              borderRadius: 16,
              padding: '24px',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(255, 213, 145, 0.2)'
            }}>
              <div style={{
                position: 'absolute',
                top: -12,
                left: 24,
                background: '#fa8c16',
                color: 'white',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(250, 140, 22, 0.3)'
              }}>
                {t("💡 核心理念")}
              </div>
              
              <h3 style={{ 
                color: '#fa8c16', 
                fontWeight: 'bold', 
                fontSize: 18, 
                marginBottom: 16,
                marginTop: 8
              }}>
                {t("為什麼要有線上交易？")}
              </h3>

              <div style={{ lineHeight: 1.8, color: '#262626' }}>
                <p style={{ fontSize: 16, marginBottom: 12, fontWeight: 500 }}>
                  {t("活動開始前，網站如果只是個「商品展示櫃」，是不是有點可惜？")}
                </p>
                <p style={{ fontSize: 16, marginBottom: 16, color: '#fa8c16', fontWeight: 600 }}>
                  {t("我們希望這段時間就能熱起來——")}
                </p>
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: 12,
                  padding: '16px 20px',
                  border: '1px solid #ffe7ba'
                }}>
                  <ul style={{ paddingLeft: 24, margin: 0 }}>
                    <li style={{ marginBottom: 8, fontSize: 15 }}>{t("有大件或多件商品的同事，可以先透過線上媒合賣掉一些，不必活動當天扛著一堆東西。")}</li>
                    <li style={{ marginBottom: 8, fontSize: 15 }}>{t("讓大家在正式活動前，就有機會互相交流、互動。")}</li>
                    <li style={{ fontSize: 15 }}>{t("最重要的，現場還是要保有「搶購」的驚喜，所以購買額度會有限制，避免當天變空城。")}</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 怎麼玩 */}
          <motion.div 
            style={{ marginBottom: 32 }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
              border: '2px solid #91d5ff',
              borderRadius: 16,
              padding: '24px',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(145, 213, 255, 0.2)'
            }}>
              <div style={{
                position: 'absolute',
                top: -12,
                left: 24,
                background: '#1890ff',
                color: 'white',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
              }}>
                {t("🛒 遊戲規則")}
              </div>

              <h3 style={{ 
                color: '#1890ff', 
                fontWeight: 'bold', 
                fontSize: 18, 
                marginBottom: 16,
                marginTop: 8
              }}>
                {t("怎麼玩？")}
              </h3>

              <div style={{ lineHeight: 1.8, color: '#262626' }}>
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 12,
                  padding: '20px',
                  marginBottom: 16,
                  border: '1px solid #bae7ff'
                }}>
                  <h4 style={{ 
                    color: '#1890ff', 
                    fontWeight: 'bold', 
                    marginBottom: 12,
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    {t("⏰ 線上交易時間")}
                  </h4>
                  <p style={{ margin: 0, fontSize: 15 }}>{t("功能一開放，就可以開始送出交易請求，一直到活動前一天的 23:59。")}</p>
                </div>
                
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 12,
                  padding: '20px',
                  marginBottom: 16,
                  border: '1px solid #bae7ff'
                }}>
                  <h4 style={{ 
                    color: '#1890ff', 
                    fontWeight: 'bold', 
                    marginBottom: 12,
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    {t("📝 送出購買請求")}
                  </h4>
                  <p style={{ marginBottom: 8, fontSize: 15 }}>{t("每位同事活動前最多能同時參與 ")}<span style={{ color: '#1890ff', fontWeight: 'bold' }}>{stats?.max_concurrent_deals || 2}</span>{t(" 件商品的請求。")}</p>
                  <p style={{ margin: 0, fontSize: 15, fontStyle: 'italic', color: '#1890ff' }}>{t("想買？就在你心儀商品的細節頁下留下一段你給賣家的「割愛小紙條」:)")}</p>
                </div>
                
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 12,
                  padding: '20px',
                  border: '1px solid #bae7ff'
                }}>
                  <h4 style={{ 
                    color: '#1890ff', 
                    fontWeight: 'bold', 
                    marginBottom: 12,
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    {t("🤝 成交方式")}
                  </h4>
                  <p style={{ marginBottom: 8, fontSize: 15 }}>{t("賣家從眾多留言中選擇要成交的買家。")}</p>
                  <p style={{ marginBottom: 8, fontSize: 15 }}>{t("一旦選定，系統會顯示彼此姓名，接下來就請透過公司 MM 聊聊細節，")}<span style={{ color: '#fa8c16', fontWeight: 'bold' }}>{t("(賣家要主動一點，畢竟是你同意這筆交易的!)")}</span></p>
                  <p style={{ margin: 0, fontSize: 15 }}>{t("決定付款方式和交貨時間（可以是活動當天，或雙方同意的時間）。")}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 購買請求額度 */}
          <motion.div 
            style={{ marginBottom: 32 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #f6ffed 0%, #f9fff6 100%)',
              border: '2px solid #b7eb8f',
              borderRadius: 16,
              padding: '24px',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(183, 235, 143, 0.2)'
            }}>
              <div style={{
                position: 'absolute',
                top: -12,
                left: 24,
                background: '#52c41a',
                color: 'white',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)'
              }}>
                {t("🎟 額度計算")}
              </div>

              <h3 style={{ 
                color: '#52c41a', 
                fontWeight: 'bold', 
                fontSize: 18, 
                marginBottom: 16,
                marginTop: 8
              }}>
                {t("購買請求額度怎麼算？")}
              </h3>

              <div style={{ 
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 12,
                padding: '20px',
                border: '1px solid #d9f7be'
              }}>
                <ul style={{ paddingLeft: 24, margin: 0, lineHeight: 1.8 }}>
                  <li style={{ marginBottom: 12, fontSize: 15 }}>
                    <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>{t("送出購買請求")}</span>{t(" → 請求額度暫時鎖定。")}
                  </li>
                  <li style={{ marginBottom: 12, fontSize: 15 }}>
                    <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{t("如果你撤回，或賣家選了別人")}</span>{t(" → 請求額度立刻釋回。")}
                  </li>
                  <li style={{ fontSize: 15 }}>
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{t("如果你被選中")}</span>{t(" → 恭喜！這次請求額度就算真的用掉了。")}
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* 賣家注意事項 */}
          <motion.div 
            style={{ marginBottom: 32 }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #fff0f6 0%, #fff2f8 100%)',
              border: '2px solid #ffadd2',
              borderRadius: 16,
              padding: '24px',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(255, 173, 210, 0.2)'
            }}>
              <div style={{
                position: 'absolute',
                top: -12,
                left: 24,
                background: '#eb2f96',
                color: 'white',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(235, 47, 150, 0.3)'
              }}>
                {t("👩‍💻 賣家須知")}
              </div>

              <h3 style={{ 
                color: '#eb2f96', 
                fontWeight: 'bold', 
                fontSize: 18, 
                marginBottom: 16,
                marginTop: 8
              }}>
                {t("賣家要注意")}
              </h3>

              <div style={{ 
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 12,
                padding: '20px',
                border: '1px solid #ffc2d4'
              }}>
                <ul style={{ paddingLeft: 24, margin: 0, lineHeight: 1.8 }}>
                  <li style={{ marginBottom: 12, fontSize: 15 }}>{t("記得常常上來看看，有沒有人對你的商品送出請求。")}</li>
                  <li style={{ fontSize: 15 }}>{t("盡早決定是否要成交，讓買家不用乾等。")}</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* 關於捐款 */}
          <motion.div 
            style={{ marginBottom: 32 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #f9f0ff 0%, #faf5ff 100%)',
              border: '2px solid #d3adf7',
              borderRadius: 16,
              padding: '24px',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(211, 173, 247, 0.2)'
            }}>
              <div style={{
                position: 'absolute',
                top: -12,
                left: 24,
                background: '#722ed1',
                color: 'white',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(114, 46, 209, 0.3)'
              }}>
                {t("💰 捐款機制")}
              </div>

              <h3 style={{ 
                color: '#722ed1', 
                fontWeight: 'bold', 
                fontSize: 18, 
                marginBottom: 16,
                marginTop: 8
              }}>
                {t("關於捐款")}
              </h3>

              <div style={{ 
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 12,
                padding: '20px',
                border: '1px solid #efdbff',
                lineHeight: 1.8,
                color: '#262626'
              }}>
                <p style={{ marginBottom: 12, fontSize: 15 }}>{t("每件商品上架時就已經設定了固定的捐款比例。")}</p>
                <p style={{ marginBottom: 16, fontSize: 15, color: '#fa8c16', fontWeight: 'bold' }}>
                  {t("注意，線上交易的金流完全是買家與賣家私下處理，不經過系統，但 ESG 小組會依系統媒合紀錄算出應捐金額。")}
                </p>
                <p style={{ marginBottom: 16, fontSize: 15 }}>{t("活動結束後一週內，ESG 小組會通知你結算，並把這筆應捐金額和你活動當天的實際收入相抵：")}</p>
                <div style={{ 
                  background: 'linear-gradient(135deg, #f0f5ff 0%, #f8faff 100%)',
                  borderRadius: 8,
                  padding: '16px',
                  border: '1px solid #adc6ff'
                }}>
                  <ul style={{ paddingLeft: 20, margin: 0 }}>
                    <li style={{ marginBottom: 8, fontSize: 15 }}>
                      {t("如果 ")}<span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{t("線上應捐 > 現場收入")}</span>{t(" → 活動後需要補差額。")}
                    </li>
                    <li style={{ fontSize: 15 }}>
                      {t("如果 ")}<span style={{ color: '#52c41a', fontWeight: 'bold' }}>{t("線上應捐 < 現場收入")}</span>{t(" → 活動後會把多出的收益撥還給你。")}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 額外提醒 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #fff7e6 0%, #fffbf0 100%)',
              border: '2px solid #ffd591',
              borderRadius: 16,
              padding: '24px',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(255, 213, 145, 0.3)'
            }}>
              <div style={{
                position: 'absolute',
                top: -12,
                left: 24,
                background: '#fa541c',
                color: 'white',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(250, 84, 28, 0.3)'
              }}>
                {t("📌 重要提醒")}
              </div>

              <div style={{ 
                marginTop: 8,
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 12,
                padding: '20px',
                border: '1px solid #ffe7ba'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12
                }}>
                  <div style={{
                    fontSize: 24,
                    lineHeight: 1
                  }}>
                    ⚠️
                  </div>
                  <div style={{
                    flex: 1,
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: '#262626'
                  }}>
                    {t("為了讓活動現場保持熱度，ESG 小組會依實際情況調整購買額度，甚至暫停或關閉線上交易功能，一切以保有活動的驚喜感為原則。")}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default UserOnlineDealsPage;
