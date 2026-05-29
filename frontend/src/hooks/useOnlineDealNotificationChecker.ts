import { useState, useCallback } from 'react';
import { OnlineDealNotification, showOnlineDealNotification } from '../components/OnlineDealNotification';

// 用於記錄已顯示通知的Set
const shownNotificationsCache = new Set<string>();

export const useOnlineDealNotificationChecker = () => {
  const [notifications, setNotifications] = useState<OnlineDealNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const checkNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('jwt');
      if (!token) {
        return;
      }

      // 呼叫新的 API 端點
      const response = await fetch('/api/online-deals/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error(`API 呼叫失敗: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.notifications && data.notifications.length > 0) {
        // 轉換 API 回應格式為組件需要的格式
        const formattedNotifications = data.notifications.map((notification: any) => ({
          id: `${notification.type}_${notification.dealId}_${Date.now()}`,
          type: notification.type,
          title: notification.type === 'received_request' ? '收到新的購買請求！' : 
                 notification.type === 'request_approved' ? '購買請求已被同意！' : '購買請求已被拒絕',
          message: notification.message,
          productName: notification.productName,
          productImageUrl: notification.productImageUrl,
          otherParty: notification.otherPartyEmail?.split('@')[0] || '用戶',
          otherPartyAvatarUrl: notification.otherPartyAvatarUrl,
          buyerComment: notification.buyerComment || '',
          timestamp: notification.createdAt || notification.updatedAt || new Date().toISOString()
        }));

        // 過濾掉已經顯示過的通知
        const newNotifications = formattedNotifications.filter((notification: OnlineDealNotification) => {
          const cacheKey = `${notification.type}_${notification.message}_${notification.timestamp}`;
          return !shownNotificationsCache.has(cacheKey);
        });

        setNotifications(formattedNotifications);
        setIsVisible(formattedNotifications.length > 0);
        
        if (newNotifications.length > 0) {
          // 自動顯示通知並記錄到緩存
          newNotifications.forEach((notification: OnlineDealNotification, index: number) => {
            const cacheKey = `${notification.type}_${notification.message}_${notification.timestamp}`;
            shownNotificationsCache.add(cacheKey);
            
            setTimeout(() => {
              showOnlineDealNotification(notification);
            }, index * 1000); // 每個通知間隔1秒
          });
        }
      } else {
        setNotifications([]);
        setIsVisible(false);
      }
    } catch (error) {
      console.error('❌ 檢查通知失敗:', error);
      setNotifications([]);
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePageVisitTime = useCallback(async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) return;

      const response = await fetch('/api/online-deals/page-visit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // 頁面訪問時間已更新
      }
    } catch (error) {
      console.error('❌ 更新頁面訪問時間失敗:', error);
    }
  }, []);

  const hideNotification = useCallback(() => {
    setIsVisible(false);
    setNotifications([]);
  }, []);

  const manualCheck = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('jwt');
      if (!token) {
        return;
      }

      // 呼叫新的 API 端點
      const response = await fetch('/api/online-deals/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error(`API 呼叫失敗: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.notifications && data.notifications.length > 0) {
        // 轉換 API 回應格式為組件需要的格式
        const formattedNotifications = data.notifications.map((notification: any) => ({
          id: `${notification.type}_${notification.dealId}_${Date.now()}`,
          type: notification.type,
          title: notification.type === 'received_request' ? '收到新的購買請求！' : 
                 notification.type === 'request_approved' ? '購買請求已被同意！' : '購買請求已被拒絕',
          message: notification.message,
          productName: notification.productName,
          productImageUrl: notification.productImageUrl,
          otherParty: notification.otherPartyEmail?.split('@')[0] || '用戶',
          otherPartyAvatarUrl: notification.otherPartyAvatarUrl,
          buyerComment: notification.buyerComment || '',
          timestamp: notification.createdAt || notification.updatedAt || new Date().toISOString()
        }));

        setNotifications(formattedNotifications);
        setIsVisible(formattedNotifications.length > 0);
        
        // 手動檢查時總是顯示通知，忽略快取
        formattedNotifications.forEach((notification: OnlineDealNotification, index: number) => {
          setTimeout(() => {
            showOnlineDealNotification(notification);
          }, index * 1000); // 每個通知間隔1秒
        });
      } else {
        setNotifications([]);
        setIsVisible(false);
      }
    } catch (error) {
      console.error('❌ 手動檢查通知失敗:', error);
      setNotifications([]);
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    notifications,
    isLoading,
    isVisible,
    checkNotifications,
    updatePageVisitTime,
    hideNotification,
    manualCheck
  };
};
