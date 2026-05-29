/**
 * 線上交易通知組件
 * 用於顯示交易狀態變更的全域通知
 */

import React from 'react';
import { useTranslation } from "react-i18next";
import { ShoppingCartOutlined, CheckCircleOutlined, CloseCircleOutlined, ShopOutlined } from '@ant-design/icons';
import i18n from "../i18n";

/**
 * 重新排列所有現有通知的位置
 */
const rearrangeOnlineDealNotifications = () => {
  const notifications = document.querySelectorAll('.custom-online-deal-notification');
  const baseBottom = 24;
  const notificationHeight = 120;
  const notificationGap = 16;
  
  notifications.forEach((notification, index) => {
    const bottomPosition = baseBottom + (index * (notificationHeight + notificationGap));
    (notification as HTMLElement).style.bottom = `${bottomPosition}px`;
    (notification as HTMLElement).style.zIndex = `${99998 + index}`;
  });
  
  console.log('🔄 重新排列線上交易通知位置，當前通知數量:', notifications.length);
};

interface OnlineDealNotificationData {
  id: string;
  type: 'received_request' | 'request_approved' | 'request_rejected';
  title: string;
  message: string;
  productName: string;
  productImageUrl?: string;
  otherParty: string; // 對方的名稱（買家或賣家）
  otherPartyAvatarUrl?: string;
  buyerComment?: string; // 買家評論
  timestamp: string;
}

export type OnlineDealNotification = OnlineDealNotificationData;

interface OnlineDealNotificationProps {
  notification: OnlineDealNotificationData;
  onClose?: () => void;
}

const OnlineDealNotification: React.FC<OnlineDealNotificationProps> = ({
  notification,
  onClose
}) => {
  const { t } = useTranslation();
  console.log('🔔 OnlineDealNotification 組件渲染，數據:', notification);
  
  const getIcon = () => {
    switch (notification.type) {
      case 'received_request':
        return <ShopOutlined style={{ fontSize: '32px', color: '#1890ff' }} />;
      case 'request_approved':
        return <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a' }} />;
      case 'request_rejected':
        return <CloseCircleOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />;
      default:
        return <ShoppingCartOutlined style={{ fontSize: '32px', color: '#1890ff' }} />;
    }
  };

  const getGradientColors = () => {
    switch (notification.type) {
      case 'received_request':
        return { primary: '#e6f7ff', secondary: '#bae7ff' };
      case 'request_approved':
        return { primary: '#f6ffed', secondary: '#d9f7be' };
      case 'request_rejected':
        return { primary: '#fff2f0', secondary: '#ffccc7' };
      default:
        return { primary: '#f0f0f0', secondary: '#d9d9d9' };
    }
  };

  const colors = getGradientColors();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        border: `2px solid ${colors.secondary}`,
        minWidth: '360px',
        maxWidth: '420px',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      onClick={onClose}
    >
      <div
        style={{
          marginRight: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {getIcon()}
      </div>
      
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '16px',
            color: '#262626',
            marginBottom: '4px'
          }}
        >
          🔔 {notification.title}
        </div>
        
        <div
          style={{
            fontSize: '14px',
            color: '#595959',
            marginBottom: '6px',
            lineHeight: '1.4'
          }}
        >
          {notification.message}
        </div>
        
        <div
          style={{
            fontSize: '12px',
            color: '#8c8c8c',
            opacity: 0.8
          }}
        >
          {t("商品：")}{notification.productName} • {notification.otherParty}
        </div>
        
        <div
          style={{
            fontSize: '11px',
            color: '#bfbfbf',
            marginTop: '4px',
            fontStyle: 'italic'
          }}
        >
          {t("💡 點擊關閉通知 • 前往線上交易頁面查看詳情")}
        </div>
      </div>
    </div>
  );
};

/**
 * 顯示線上交易通知 - 使用原生 DOM 實現，支援多個通知同時顯示
 */
export const showOnlineDealNotification = (notification: OnlineDealNotificationData) => {
  // 檢查是否已經有相同的通知正在顯示
  const existingSameNotification = document.querySelector(`[data-deal-notification-id="${notification.id}"]`);
  if (existingSameNotification) {
    return;
  }

  // 創建通知容器
  const notificationElement = document.createElement('div');
  notificationElement.className = 'custom-online-deal-notification';
  notificationElement.setAttribute('data-deal-notification-id', notification.id);
  
  // 計算通知位置
  const existingNotifications = document.querySelectorAll('.custom-online-deal-notification');
  const notificationIndex = existingNotifications.length;
  const baseBottom = 24;
  const notificationHeight = 120;
  const notificationGap = 16;
  const bottomPosition = baseBottom + (notificationIndex * (notificationHeight + notificationGap));
  
  // 獲取顏色配置
  const getGradientColors = () => {
    switch (notification.type) {
      case 'received_request':
        return { primary: '#f0f9ff', secondary: '#e0f2fe', border: '#7dd3fc' };
      case 'request_approved':
        return { primary: '#f0fdf4', secondary: '#dcfce7', border: '#86efac' };
      case 'request_rejected':
        return { primary: '#fef2f2', secondary: '#fee2e2', border: '#fca5a5' };
      default:
        return { primary: '#f8fafc', secondary: '#f1f5f9', border: '#cbd5e1' };
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'received_request':
        return '🛒';
      case 'request_approved':
        return '✅';
      case 'request_rejected':
        return '❌';
      default:
        return '🔔';
    }
  };

  const colors = getGradientColors();
  
  notificationElement.style.cssText = `
    position: fixed;
    bottom: ${bottomPosition}px;
    right: 24px;
    width: 420px;
    background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
    z-index: ${99998 + notificationIndex};
    padding: 20px;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    cursor: pointer;
    animation: slideInFromRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    font-family: 'Noto Sans TC', 'Inter', sans-serif;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;

  // 添加動畫樣式
  if (!document.querySelector('#online-deal-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'online-deal-notification-styles';
    style.textContent = `
      @keyframes slideInFromRight {
        from {
          transform: translateX(calc(100% + 48px)) scale(0.9);
          opacity: 0;
        }
        to {
          transform: translateX(0) scale(1);
          opacity: 1;
        }
      }
      
      @keyframes slideOutToRight {
        from {
          transform: translateX(0) scale(1);
          opacity: 1;
        }
        to {
          transform: translateX(calc(100% + 48px)) scale(0.95);
          opacity: 0;
        }
      }
      
      .custom-online-deal-notification:hover {
        transform: translateX(-8px) scale(1.02) !important;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.12) !important;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
      }
      
      .custom-online-deal-notification {
        transition: bottom 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 創建圖片容器（商品圖片 + 用戶頭像）
  const imageContainer = document.createElement('div');
  imageContainer.style.cssText = `
    flex-shrink: 0;
    position: relative;
    width: 72px;
    height: 72px;
  `;

  // 創建商品圖片
  const productImage = document.createElement('div');
  if (notification.productImageUrl) {
    productImage.style.cssText = `
      width: 72px;
      height: 72px;
      border-radius: 12px;
      background-image: url('${notification.productImageUrl}');
      background-size: cover;
      background-position: center;
      background-color: #f5f5f5;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    `;
  } else {
    // 如果沒有商品圖片，顯示圖標
    productImage.style.cssText = `
      width: 72px;
      height: 72px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: #8c8c8c;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    `;
    productImage.textContent = getIcon();
  }

  // 創建用戶頭像（右下角小圓圈）
  const userAvatar = document.createElement('div');
  userAvatar.style.cssText = `
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    color: white;
  `;

  if (notification.otherPartyAvatarUrl) {
    userAvatar.style.backgroundImage = `url('${notification.otherPartyAvatarUrl}')`;
    userAvatar.style.backgroundSize = 'cover';
    userAvatar.style.backgroundPosition = 'center';
    userAvatar.style.backgroundColor = '#1890ff';
  } else {
    // 如果沒有頭像，顯示用戶名稱的首字母
    const firstLetter = notification.otherParty.charAt(0).toUpperCase();
    userAvatar.textContent = firstLetter;
    userAvatar.style.backgroundColor = '#1890ff';
  }

  imageContainer.appendChild(productImage);
  imageContainer.appendChild(userAvatar);

  // 創建內容容器
  const contentContainer = document.createElement('div');
  contentContainer.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
  `;

  // 創建標題
  const title = document.createElement('div');
  title.style.cssText = `
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 6px;
    color: #262626;
    line-height: 1.2;
  `;
  
  // 添加類型標誌
  const typeEmoji = getIcon();
  title.innerHTML = `<span style="margin-right: 8px;">${typeEmoji}</span>${notification.title}`;

  // 創建訊息
  const message = document.createElement('div');
  message.textContent = notification.message;
  message.style.cssText = `
    font-size: 14px;
    color: #595959;
    margin-bottom: 8px;
    line-height: 1.4;
  `;

  // 創建商品資訊
  const productInfo = document.createElement('div');
  productInfo.innerHTML = `
    <span style="color: #8c8c8c; font-size: 13px;">${i18n.t("商品：")}</span>
    <span style="color: #262626; font-weight: 500; font-size: 13px;">${notification.productName}</span>
  `;
  productInfo.style.cssText = `
    margin-bottom: 6px;
  `;

  // 創建用戶資訊
  const userInfo = document.createElement('div');
  userInfo.innerHTML = `
    <span style="color: #8c8c8c; font-size: 13px;">${i18n.t("來自：")}</span>
    <span style="color: #1890ff; font-weight: 500; font-size: 13px;">${notification.otherParty}</span>
  `;
  userInfo.style.cssText = `
    margin-bottom: 8px;
  `;

  // 創建提示文字
  const hint = document.createElement('div');
  hint.textContent = i18n.t("💡 點擊關閉 • 前往線上交易頁面查看詳情");
  hint.style.cssText = `
    font-size: 11px;
    color: #bfbfbf;
    font-style: italic;
    opacity: 0.8;
  `;

  // 組裝內容
  contentContainer.appendChild(title);
  contentContainer.appendChild(message);
  contentContainer.appendChild(productInfo);
  contentContainer.appendChild(userInfo);
  contentContainer.appendChild(hint);

  // 組裝通知
  notificationElement.appendChild(imageContainer);
  notificationElement.appendChild(contentContainer);

  // 點擊事件處理
  const handleClick = () => {
    // 添加關閉動畫
    notificationElement.style.animation = 'slideOutToRight 0.3s ease-in forwards';
    
    // 延遲移除元素，讓動畫完成
    setTimeout(() => {
      if (notificationElement.parentNode) {
        notificationElement.parentNode.removeChild(notificationElement);
        // 重新排列剩餘的通知
        rearrangeOnlineDealNotifications();
      }
    }, 300);
  };

  notificationElement.addEventListener('click', handleClick);

  // 添加到頁面
  document.body.appendChild(notificationElement);

  // 自動關閉通知（20秒後）
  setTimeout(() => {
    if (notificationElement.parentNode) {
      handleClick();
    }
  }, 20000);
};

/**
 * 清除所有線上交易通知
 */
export const clearAllOnlineDealNotifications = () => {
  const notifications = document.querySelectorAll('.custom-online-deal-notification');
  notifications.forEach(notification => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  });
};

export default OnlineDealNotification;
