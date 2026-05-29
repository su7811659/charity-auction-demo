/**
 * 成就監聽器 Hook
 * 用於監聽成就解鎖並顯示通知
 */

import { useEffect, useRef } from 'react';
import { showAchievementNotification } from '../components/AchievementNotification';
import axiosInstance from '../utils/axiosInstance';

// 成就定義（與後端保持一致）
const achievementDefinitions = [
  {
    id: 'first_upload',
    name: '等等！我還沒上傳啊',
    description: '完成 1 次的商品上傳',
    icon: '/src/assets/images/achievements/achive01.png'
  },
  {
    id: 'first_purchase_request',
    name: 'Shut Up And Take My Money',
    description: '送出一次商品購買請求',
    icon: '/src/assets/images/achievements/achive02.png'
  },
  {
    id: 'profile_change',
    name: '換臉一新',
    description: '成功更換過一次大頭貼',
    icon: '/src/assets/images/achievements/achive03.png'
  },
  {
    id: 'first_purchase',
    name: 'BuyGood便當',
    description: '成功購買一件商品',
    icon: '/src/assets/images/achievements/achive04.png'
  },
  {
    id: 'good_karma',
    name: '我積善意',
    description: '上傳 3 件捐贈比例達 60% 商品 或 購買 1 樣有善意循環光球的商品',
    icon: '/src/assets/images/achievements/achive05.png'
  },
  {
    id: 'five_comments',
    name: '五則天',
    description: '個人留言數達 5 則',
    icon: '/src/assets/images/achievements/achive06.png'
  },
  {
    id: 'seller_master',
    name: '賣客阿Sir',
    description: '成功售出你持有的 3 樣商品',
    icon: '/src/assets/images/achievements/achive07.png'
  },
  {
    id: 'five_likes',
    name: '五藏廟',
    description: '收藏商品達 5 項',
    icon: '/src/assets/images/achievements/achive08.png'
  },
  {
    id: 'feedback_master',
    name: '饋咖',
    description: '到回饋信箱進行 2 次回饋',
    icon: '/src/assets/images/achievements/achive09.png'
  },
  {
    id: 'ai_annoying',
    name: 'AI小助理的煩人精',
    description: '搔癢機器人 40 次',
    icon: '/src/assets/images/achievements/achive10.png'
  },
  {
    id: 'platinum_trophy',
    name: '白金獎盃',
    description: '全成就達成',
    icon: '/src/assets/images/achievements/achive11.png'
  }
];

/**
 * 檢查新成就的函數
 */
const checkForNewAchievements = async () => {
  try {
    console.log('🔍 正在檢查新成就...');
    
    const response = await axiosInstance.post('/api/achievements/check');
    
    if (response.data.success && response.data.newly_unlocked && response.data.newly_unlocked.length > 0) {
      console.log('🎉 發現新成就:', response.data.newly_unlocked);
      
      // 為每個新解鎖的成就顯示通知
      response.data.newly_unlocked.forEach((achievementId: string) => {
        const achievementDef = achievementDefinitions.find(def => def.id === achievementId);
        if (achievementDef) {
          console.log('📢 顯示成就通知:', achievementDef);
          showAchievementNotification(achievementDef);
        } else {
          console.warn('⚠️ 找不到成就定義:', achievementId);
        }
      });
      
      return response.data.newly_unlocked;
    } else {
      console.log('ℹ️ 沒有新的成就解鎖');
      return [];
    }
  } catch (error) {
    console.error('❌ 檢查成就時發生錯誤:', error);
    return [];
  }
};

/**
 * 成就監聽器 Hook
 */
export const useAchievementListener = () => {
  const intervalRef = useRef<number | null>(null);
  const isListeningRef = useRef(false);

  const startListening = () => {
    if (isListeningRef.current) {
      console.log('⚠️ 成就監聽器已經在運行中');
      return;
    }

    console.log('🚀 啟動成就監聽器');
    isListeningRef.current = true;

    // 立即檢查一次
    checkForNewAchievements();

    // 每10秒檢查一次新成就
    intervalRef.current = setInterval(() => {
      checkForNewAchievements();
    }, 10000);
  };

  const stopListening = () => {
    if (intervalRef.current) {
      console.log('🛑 停止成就監聽器');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      isListeningRef.current = false;
    }
  };

  const manualCheck = async () => {
    console.log('🔍 手動檢查成就');
    return await checkForNewAchievements();
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return {
    startListening,
    stopListening,
    manualCheck,
    isListening: isListeningRef.current
  };
};

export default useAchievementListener;
