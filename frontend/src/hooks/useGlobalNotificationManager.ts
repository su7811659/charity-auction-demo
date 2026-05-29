/**
 * 全域通知管理器
 * 整合成就通知和線上交易通知的全域管理
 */

import { useEffect, useRef } from 'react';
import useAchievementChecker from './useAchievementChecker';
import { useOnlineDealNotificationChecker } from './useOnlineDealNotificationChecker';

const useGlobalNotificationManager = () => {
  const { checkAndShowAchievements } = useAchievementChecker();
  const { checkNotifications, manualCheck: dealManualCheck } = useOnlineDealNotificationChecker();
  const intervalRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);

  /**
   * 啟動全域通知檢查器
   */
  const startGlobalNotificationChecker = async () => {
    try {
      // 防止重複啟動
      if (isRunningRef.current) {
        return;
      }

      // 開始定期檢查
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      isRunningRef.current = true;

      // 立即執行一次檢查
      await checkNotifications();

      // 每30秒檢查一次線上交易狀態變更
      intervalRef.current = setInterval(async () => {
        try {
          // 檢查線上交易通知
          await checkNotifications();
          
          // 檢查成就通知
          await checkAndShowAchievements();
          
        } catch (error) {
          console.error('定期通知檢查失敗:', error);
        }
      }, 30000); // 30秒間隔
      
    } catch (error) {
      console.error('啟動全域通知檢查器失敗:', error);
    }
  };

  /**
   * 停止全域通知檢查器
   */
  const stopGlobalNotificationChecker = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      isRunningRef.current = false;
    }
  };

  /**
   * 手動觸發通知檢查
   */
  const manualCheck = async () => {
    try {
      await Promise.all([
        dealManualCheck(),
        checkAndShowAchievements()
      ]);
    } catch (error) {
      console.error('手動通知檢查失敗:', error);
    }
  };

  // 組件卸載時清理
  useEffect(() => {
    return () => {
      stopGlobalNotificationChecker();
    };
  }, []);

  return {
    startGlobalNotificationChecker,
    stopGlobalNotificationChecker,
    manualCheck
  };
};

export default useGlobalNotificationManager;
