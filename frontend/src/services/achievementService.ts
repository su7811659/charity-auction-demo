/**
 * 成就系統 API 服務
 * 提供與後端成就系統的 API 通信功能
 */

import axiosInstance from '../utils/axiosInstance';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  target: number;
  progress: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
  notification_shown: boolean;
}

export interface AchievementProgressUpdate {
  achievement_id: string;
  progress: number;
  is_unlocked: boolean;
  newly_unlocked: boolean;
}

/**
 * 獲取用戶的所有成就
 */
export const getUserAchievements = async (): Promise<Achievement[]> => {
  try {
    const response = await axiosInstance.get('/api/achievements/');
    return response.data;
  } catch (error) {
    console.error('獲取用戶成就失敗:', error);
    throw error;
  }
};

/**
 * 更新用戶成就進度
 */
export const updateAchievementProgress = async (): Promise<AchievementProgressUpdate[]> => {
  try {
    const response = await axiosInstance.post('/api/achievements/update-progress');
    return response.data;
  } catch (error) {
    console.error('更新成就進度失敗:', error);
    throw error;
  }
};

/**
 * 標記成就通知已查看
 */
export const markAchievementNotificationShown = async (achievementId: string): Promise<boolean> => {
  try {
    const response = await axiosInstance.post(`/api/achievements/${achievementId}/mark-shown`);
    return response.data.success;
  } catch (error) {
    console.error('標記成就通知失敗:', error);
    return false;
  }
};

/**
 * 獲取成就統計信息
 */
export const getAchievementStats = async (): Promise<{
  total: number;
  unlocked: number;
  completion_rate: number;
}> => {
  try {
    const response = await axiosInstance.get('/api/achievements/stats');
    return response.data;
  } catch (error) {
    console.error('獲取成就統計失敗:', error);
    throw error;
  }
};

/**
 * 檢查是否有新解鎖的成就（用於顯示通知）
 */
export const checkForNewAchievements = async (): Promise<Achievement[]> => {
  try {
    // 🔄 首先觸發後端更新所有成就進度，確保數據一致性
    try {
      const checkResponse = await axiosInstance.post('/api/achievements/check');
      console.log('🔄 成就進度同步檢查完成:', checkResponse.data);
    } catch (syncError) {
      console.warn('⚠️ 成就進度同步失敗，但繼續載入現有數據:', syncError);
    }
    
    // 然後獲取用戶的所有成就狀態
    const achievements = await getUserAchievements();
    // 返回已解鎖但未顯示通知的成就
    const newAchievements = achievements.filter(achievement => 
      achievement.is_unlocked && !achievement.notification_shown
    );
    
    console.log('📋 檢查新成就結果:', {
      totalAchievements: achievements.length,
      unlockedAchievements: achievements.filter(a => a.is_unlocked).length,
      newAchievements: newAchievements.length,
      newAchievementIds: newAchievements.map(a => a.id)
    });
    
    return newAchievements;
  } catch (error) {
    console.error('檢查新成就失敗:', error);
    return [];
  }
};
