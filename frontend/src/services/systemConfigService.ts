import axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// 初始化 dayjs 插件
dayjs.extend(utc);
dayjs.extend(timezone);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface SystemConfig {
  id?: number;
  upload_start_date: string | null;
  upload_end_date: string | null;
  upload_enabled: boolean;
  summary_visible: boolean;
  summary_show_start_date: string | null;
  summary_show_end_date: string | null;
  ai_summary_content: string | null;
  ai_summary_last_generated: string | null;
  online_deal_enabled: boolean;
  online_deal_available: boolean;
  online_deal_begin_date: string | null;
  online_deal_end_date: string | null;
  max_concurrent_deals_per_user: number;
  created_at?: string;
  updated_at?: string;
}

export interface SystemConfigUpdate {
  upload_start_date?: string | null;
  upload_end_date?: string | null;
  upload_enabled?: boolean;
  summary_visible?: boolean;
  summary_show_start_date?: string | null;
  summary_show_end_date?: string | null;
}

export interface RegenerateSummaryResponse {
  message: string;
  ai_summary_content: string;
  generated_at: string;
}

class SystemConfigService {
  private getAuthHeaders() {
    const adminToken = localStorage.getItem('adminToken');
    return {
      'admin-token': adminToken,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 獲取當前系統配置
   */
  async getCurrentConfig(): Promise<SystemConfig> {
    try {
      const response = await axios.get(`${API_BASE_URL}/system/config`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('獲取系統配置失敗:', error);
      throw error;
    }
  }

  /**
   * 更新系統配置
   */
  async updateConfig(config: SystemConfigUpdate): Promise<SystemConfig> {
    try {
      const response = await axios.put(`${API_BASE_URL}/system/config`, config, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('更新系統配置失敗:', error);
      throw error;
    }
  }

  /**
   * 手動重新生成 AI 總結
   */
  async regenerateSummary(): Promise<RegenerateSummaryResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/system/regenerate-summary`, {}, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('重新生成總結失敗:', error);
      throw error;
    }
  }

  /**
   * 檢查是否允許上傳商品（包含時間檢查）
   */
  async isUploadAllowed(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/system/status`);
      return response.data.upload_allowed;
    } catch (error) {
      console.error('檢查上傳權限失敗:', error);
      return false;
    }
  }

  /**
   * 獲取系統狀態
   */
  async getSystemStatus(): Promise<{
    upload_allowed: boolean, 
    summary_visible: boolean,
    online_deal_enabled: boolean,
    online_deal_available: boolean,
    online_deal_begin_date: string | null,
    online_deal_end_date: string | null
  }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/system/status`);
      return response.data;
    } catch (error) {
      console.error('獲取系統狀態失敗:', error);
      return { 
        upload_allowed: false, 
        summary_visible: false,
        online_deal_enabled: false,
        online_deal_available: false,
        online_deal_begin_date: null,
        online_deal_end_date: null
      };
    }
  }

  /**
   * 格式化日期時間
   */
  formatDateTime(dateString: string | null): string {
    if (!dateString) return '未設定';
    return dayjs.utc(dateString).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
  }

  /**
   * 檢查是否為管理員（用於顯示配置管理介面）
   */
  isAdmin(): boolean {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.is_admin === true;
  }
}

export const systemConfigService = new SystemConfigService();
export default systemConfigService;
