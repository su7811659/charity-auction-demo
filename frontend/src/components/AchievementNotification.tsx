/**
 * 成就解鎖通知組件
 * 用於顯示成就解鎖的彈窗通知
 */

import React from 'react';
import { TrophyOutlined } from '@ant-design/icons';
import { markAchievementNotificationShown } from '../services/achievementService';
import { clearSessionNotificationCache } from '../hooks/useAchievementChecker';

/**
 * 重新排列所有現有通知的位置
 */
const rearrangeNotifications = () => {
  const notifications = document.querySelectorAll('.custom-achievement-notification');
  const baseBottom = 24;
  const notificationHeight = 120;
  const notificationGap = 16;
  
  notifications.forEach((notification, index) => {
    const bottomPosition = baseBottom + (index * (notificationHeight + notificationGap));
    (notification as HTMLElement).style.bottom = `${bottomPosition}px`;
    (notification as HTMLElement).style.zIndex = `${99999 + index}`;
  });
  
  console.log('🔄 重新排列通知位置，當前通知數量:', notifications.length);
};

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

interface AchievementNotificationProps {
  achievement: Achievement;
  onClose?: () => void;
}

const AchievementNotification: React.FC<AchievementNotificationProps> = ({ 
  achievement
}) => {
  console.log('🎨 AchievementNotification 組件渲染，數據:', achievement);
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(255, 215, 0, 0.3)',
        border: '2px solid #FFD700',
        minWidth: '300px',
        maxWidth: '400px'
      }}
    >
      <div
        style={{
          marginRight: '16px',
          fontSize: '32px',
          color: '#B8860B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {achievement.icon ? (
          <img 
            src={achievement.icon} 
            alt="成就圖標" 
            style={{ 
              width: '48px', 
              height: '48px',
              objectFit: 'contain'
            }}
            onError={(e) => {
              console.error('❌ 成就圖片載入失敗:', achievement.icon);
              e.currentTarget.style.display = 'none';
            }}
            onLoad={() => {
              console.log('✅ 成就圖片載入成功:', achievement.icon);
            }}
          />
        ) : (
          <TrophyOutlined style={{ fontSize: '48px' }} />
        )}
      </div>
      
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '16px',
            color: '#8B4513',
            marginBottom: '4px'
          }}
        >
          🎉 成就解鎖！
        </div>
        
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '14px',
            color: '#B8860B',
            marginBottom: '2px'
          }}
        >
          {achievement.name}
        </div>
        
        <div
          style={{
            fontSize: '12px',
            color: '#8B4513',
            opacity: 0.9
          }}
        >
          {achievement.description}
        </div>
      </div>
    </div>
  );
};

/**
 * 顯示成就解鎖通知 - 使用原生 DOM 實現，支援多個通知同時顯示
 */
export const showAchievementNotification = (achievement: Achievement) => {
  console.log('🎯 開始顯示成就通知 (原生實現):', achievement);
  console.log('🔍 當前環境:', {
    userAgent: navigator.userAgent,
    visibilityState: document.visibilityState,
    timestamp: new Date().toISOString(),
    windowInnerWidth: window.innerWidth,
    windowInnerHeight: window.innerHeight
  });
  
  // 檢查是否已經有相同的成就通知正在顯示
  const existingSameNotification = document.querySelector(`[data-achievement-id="${achievement.id}"]`);
  if (existingSameNotification) {
    console.log('⚠️ 相同成就通知已存在，跳過重複顯示:', achievement.id);
    return;
  }
  
  // 創建通知容器 (不清除現有通知，支援多個通知同時存在)
  const notification = document.createElement('div');
  notification.className = 'custom-achievement-notification';
  notification.setAttribute('data-achievement-id', achievement.id);
  
  // 計算通知位置 (根據現有通知數量堆疊)
  const existingNotifications = document.querySelectorAll('.custom-achievement-notification');
  const notificationIndex = existingNotifications.length;
  const baseBottom = 24;
  const notificationHeight = 120;
  const notificationGap = 16;
  const bottomPosition = baseBottom + (notificationIndex * (notificationHeight + notificationGap));
  
  notification.style.cssText = `
    position: fixed;
    bottom: ${bottomPosition}px;
    right: 24px;
    width: 400px;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    border: 2px solid #dee2e6;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: ${99999 + notificationIndex};
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;
    animation: slideInFromRight 0.5s ease-out forwards;
    font-family: 'Noto Sans TC', 'Inter', sans-serif;
    transform: translateX(100%);
    opacity: 0;
  `;
  
  // 添加動畫樣式
  if (!document.querySelector('#achievement-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'achievement-notification-styles';
    style.textContent = `
      @keyframes slideInFromRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutToRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      .custom-achievement-notification:hover {
        transform: translateX(-4px) !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2) !important;
        transition: all 0.3s ease !important;
      }
      
      .custom-achievement-notification {
        transition: bottom 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // 創建圖標容器
  const iconContainer = document.createElement('div');
  iconContainer.style.cssText = `
    flex-shrink: 0;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // 創建圖標
  if (achievement.icon) {
    const img = document.createElement('img');
    img.src = achievement.icon;
    img.alt = '成就圖標';
    img.style.cssText = `
      width: 72px;
      height: 72px;
      object-fit: contain;
    `;
    img.onload = () => console.log('✅ 成就圖片載入成功:', achievement.icon);
    img.onerror = () => {
      console.error('❌ 成就圖片載入失敗:', achievement.icon);
      iconContainer.innerHTML = '🏆';
      iconContainer.style.fontSize = '64px';
    };
    iconContainer.appendChild(img);
  } else {
    iconContainer.innerHTML = '🏆';
    iconContainer.style.fontSize = '64px';
  }
  
  // 創建內容容器
  const contentContainer = document.createElement('div');
  contentContainer.style.cssText = `
    flex: 1;
    color: #495057;
  `;
  
  // 創建標題
  const title = document.createElement('div');
  title.textContent = '🎉 成就解鎖！';
  title.style.cssText = `
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 8px;
    color: #28a745;
  `;
  
  // 創建成就名稱
  const name = document.createElement('div');
  name.textContent = achievement.name;
  name.style.cssText = `
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 4px;
    color: #343a40;
  `;
  
  // 創建描述
  const description = document.createElement('div');
  description.textContent = achievement.description;
  description.style.cssText = `
    font-size: 14px;
    color: #6c757d;
    opacity: 0.9;
    margin-bottom: 8px;
  `;
  
  // 創建提示文字
  const hint = document.createElement('div');
  hint.textContent = '💡 點擊關閉通知 • 可到個人資料頁面查看所有成就';
  hint.style.cssText = `
    font-size: 12px;
    color: #6c757d;
    opacity: 0.7;
    font-style: italic;
  `;
  
  // 組裝內容
  contentContainer.appendChild(title);
  contentContainer.appendChild(name);
  contentContainer.appendChild(description);
  contentContainer.appendChild(hint);
  
  // 組裝通知
  notification.appendChild(iconContainer);
  notification.appendChild(contentContainer);
  
  // 點擊事件處理
  const handleClick = async () => {
    console.log('🖱️ 成就通知被點擊！開始標記為已通知:', achievement.id);
    
    try {
      // 添加關閉動畫
      notification.style.animation = 'slideOutToRight 0.3s ease-in forwards';
      
      // 標記為已通知
      const success = await markAchievementNotificationShown(achievement.id);
      if (success) {
        console.log('✅ 成就通知已標記為已顯示:', achievement.id);
      } else {
        console.error('❌ 標記成就通知失敗 (API 回傳 false):', achievement.id);
      }
      
      // 清除session快取，允許下次檢查時再次顯示（如果後端仍認為需要通知）
      clearSessionNotificationCache(achievement.id);
      
      // 延遲移除元素，讓動畫完成
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
          // 重新排列剩餘的通知
          rearrangeNotifications();
        }
        console.log('🔄 通知已關閉:', achievement.id);
      }, 300);
      
    } catch (error) {
      console.error('❌ 標記成就通知發生錯誤:', error);
      // 即使標記失敗也關閉通知，避免卡住
      clearSessionNotificationCache(achievement.id);
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
        // 重新排列剩餘的通知
        rearrangeNotifications();
      }
    }
  };
  
  notification.addEventListener('click', handleClick);
  
  // 添加到頁面
  document.body.appendChild(notification);
  
  console.log('✅ 自定義成就通知已創建並添加到頁面');
  
  // 驗證通知確實顯示
  setTimeout(() => {
    const customNotifications = document.querySelectorAll('.custom-achievement-notification');
    console.log('🔍 檢查自定義通知數量:', customNotifications.length);
    console.log('🔍 自定義通知元素:', customNotifications);
    
    if (customNotifications.length === 0) {
      console.error('❌ 自定義通知創建失敗！');
    } else {
      console.log('✅ 自定義通知創建成功！');
    }
  }, 100);
  
  // 自動移除通知（12秒後，如果用戶沒有點擊）
  setTimeout(() => {
    if (notification.parentNode) {
      console.log('⏰ 通知自動過期，開始移除');
      notification.style.animation = 'slideOutToRight 0.3s ease-in forwards';
      
      // 自動過期時不清除session快取，這樣下次檢查時仍會被跳過
      // 除非用戶主動點擊關閉，否則認為用戶沒有看到通知
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
          // 重新排列剩餘的通知
          rearrangeNotifications();
        }
      }, 300);
    }
  }, 12000);
};

/**
 * 嘗試靜默請求瀏覽器通知權限（僅在首次訪問時）
 */
export const requestNotificationPermissionSilently = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    // 只在默認狀態時靜默請求，避免重複彈窗
    console.log('🔔 靜默請求瀏覽器通知權限...');
    return Notification.requestPermission().then(permission => {
      console.log('🔔 通知權限結果:', permission);
      return permission;
    }).catch(error => {
      console.log('� 通知權限請求失敗:', error);
      return 'denied';
    });
  }
  return Promise.resolve(Notification.permission || 'unsupported');
};

export default AchievementNotification;
