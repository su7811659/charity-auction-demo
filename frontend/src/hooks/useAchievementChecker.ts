/**
 * 成就檢查 Hook
 * 用於在用戶操作後檢查和顯示成就通知
 */

import { useCallback } from 'react';
import { checkForNewAchievements } from '../services/achievementService';
import { showAchievementNotification } from '../components/AchievementNotification';

// 導入成就圖片映射
import achive01 from "../assets/img/achievement/achive_01.png";
import achive02 from "../assets/img/achievement/achive_02.png";
import achive03 from "../assets/img/achievement/achive_03.png";
import achive04 from "../assets/img/achievement/achive_04.png";
import achive05 from "../assets/img/achievement/achive_05.png";
import achive06 from "../assets/img/achievement/achive_06.png";
import achive07 from "../assets/img/achievement/achive_07.png";
import achive08 from "../assets/img/achievement/achive_08.png";
import achive09 from "../assets/img/achievement/achive_09.png";
import achive10 from "../assets/img/achievement/achive_10.png";
import achive11 from "../assets/img/achievement/achive_11.png";

const achievementIconMap: { [key: string]: string } = {
  'first_upload': achive01,
  'first_purchase_request': achive02,
  'profile_change': achive03,
  'first_purchase': achive04,
  'good_karma': achive05,
  'five_comments': achive06,
  'seller_master': achive07,
  'five_likes': achive08,
  'feedback_master': achive09,
  'ai_annoying': achive10,
  'platinum_trophy': achive11,
};

// Session級別的通知記錄，避免同一頁面session中重複顯示
const sessionNotificationCache = new Set<string>();

/**
 * 清除session快取中的特定成就記錄
 */
export const clearSessionNotificationCache = (achievementId: string) => {
  sessionNotificationCache.delete(achievementId);
  console.log('🗑️ 已從session快取中移除成就:', achievementId);
};

/**
 * 檢查session快取中是否已有該成就
 */
export const hasSessionNotificationCache = (achievementId: string): boolean => {
  return sessionNotificationCache.has(achievementId);
};

/**
 * 添加成就到session快取
 */
export const addToSessionNotificationCache = (achievementId: string) => {
  sessionNotificationCache.add(achievementId);
  console.log('📝 已記錄成就到session快取:', achievementId);
};

export const useAchievementChecker = () => {
  const checkAndShowAchievements = useCallback(async () => {
    try {
      console.log('🔍 檢查新成就...');
      
      // 檢查用戶是否已登入
      const jwt = localStorage.getItem('jwt');
      if (!jwt) {
        console.log('❌ 用戶未登入，跳過成就檢查');
        return;
      }
      
      const newAchievements = await checkForNewAchievements();
      console.log('📋 成就檢查結果:', newAchievements);
      
      if (newAchievements.length > 0) {
        console.log(`🎉 發現 ${newAchievements.length} 個新成就！`, newAchievements);
        
        // 逐一顯示每個新成就的通知，但要檢查session快取
        for (let i = 0; i < newAchievements.length; i++) {
          const achievement = newAchievements[i];
          
          // 檢查是否在本次session中已經顯示過此成就通知
          if (hasSessionNotificationCache(achievement.id)) {
            console.log(`⏭️ 成就 ${achievement.id} 在本次session中已顯示過，跳過通知`);
            continue;
          }
          
          const achievementWithIcon = {
            ...achievement,
            icon: achievementIconMap[achievement.id] || undefined
          };
          
          console.log('🎯 顯示成就通知:', achievementWithIcon);
          
          // 記錄到session快取中
          addToSessionNotificationCache(achievement.id);
          
          // 如果有多個成就，添加延遲讓通知依序出現，避免視覺混亂
          const delay = i * 800; // 每個通知間隔800毫秒
          
          setTimeout(() => {
            // 顯示通知（用戶點擊後才會標記為已顯示）
            showAchievementNotification(achievementWithIcon);
          }, delay);
        }
      } else {
        console.log('📝 沒有新成就');
      }
    } catch (error) {
      console.error('❌ 檢查成就失敗:', error);
    }
  }, []);

  return { checkAndShowAchievements };
};

export default useAchievementChecker;
