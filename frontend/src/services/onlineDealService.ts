import axiosInstance from '../utils/axiosInstance';

export interface OnlineDealRequest {
  product_id: number;
  buyer_comment?: string;
}

export interface OnlineDealResponse {
  id: number;
  product_id: number;
  buyer_email: string;
  seller_email: string;
  buyer_comment?: string;
  deal_status: number;
  created_time: string;
  modify_time: string;
}

export interface OnlineDealWithProduct extends OnlineDealResponse {
  product_name: string;
  product_price: number;
  product_image_url: string;
  seller_name?: string;
  seller_nickname?: string;
  seller_avatar_url?: string;
  buyer_avatar_url?: string;
  status_text?: string;
}

export interface OnlineDealStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  cancelled_requests: number;
  max_concurrent_deals: number;
  available_slots: number;
  online_deal_available: boolean;
}

export interface OnlineDealSystemStatus {
  online_deal_available: boolean;
  max_concurrent_deals: number;
}

export interface ProductRequestStatus {
  has_request: boolean;
  request_id: number | null;
  status: number | null;
  status_text: string | null;
}

class OnlineDealService {
  /**
   * 發送線上交易請求
   */
  async createRequest(data: OnlineDealRequest): Promise<{ id: number; message: string; product_name: string; seller_name: string }> {
    const response = await axiosInstance.post('/api/online-deals/requests', data);
    return response.data;
  }

  /**
   * 取得我發出的交易請求
   */
  async getMyRequests(): Promise<OnlineDealWithProduct[]> {
    const response = await axiosInstance.get('/api/online-deals/my-requests');
    return response.data;
  }

  /**
   * 取得我收到的交易請求（作為賣家）
   */
  async getReceivedRequests(): Promise<OnlineDealWithProduct[]> {
    const response = await axiosInstance.get('/api/online-deals/my-received');
    return response.data;
  }

  /**
   * 同意交易請求（賣家）
   */
  async approveRequest(dealId: number): Promise<{ id: number; message: string; buyer_email: string }> {
    const response = await axiosInstance.post(`/api/online-deals/requests/${dealId}/approve`);
    return response.data;
  }

  /**
   * 拒絕交易請求（賣家）
   */
  async rejectRequest(dealId: number): Promise<{ id: number; message: string; buyer_email: string }> {
    const response = await axiosInstance.post(`/api/online-deals/requests/${dealId}/reject`);
    return response.data;
  }

  /**
   * 取消交易請求（買家）
   */
  async cancelRequest(dealId: number): Promise<{ id: number; message: string }> {
    const response = await axiosInstance.post(`/api/online-deals/requests/${dealId}/cancel`);
    return response.data;
  }

  /**
   * 取得我的交易統計
   */
  async getMyStats(): Promise<OnlineDealStats> {
    const response = await axiosInstance.get('/api/online-deals/my-stats');
    return response.data;
  }

  /**
   * 取得商品的交易請求列表（賣家查看）
   */
  async getProductRequests(productId: number): Promise<OnlineDealWithProduct[]> {
    const response = await axiosInstance.get(`/api/online-deals/products/${productId}/requests`);
    return response.data;
  }

  /**
   * 取得線上交易系統狀態
   */
  async getSystemStatus(): Promise<OnlineDealSystemStatus> {
    const response = await axiosInstance.get('/api/online-deals/status');
    return response.data;
  }

  /**
   * 取得線上交易公開配置（無需認證）
   */
  async getPublicConfig(): Promise<{ online_deal_enabled: boolean; online_deal_available: boolean }> {
    const response = await axiosInstance.get('/api/online-deals/config');
    return response.data;
  }

  /**
   * 檢查用戶對特定商品的請求狀態
   */
  async getProductRequestStatus(productId: number): Promise<ProductRequestStatus> {
    const response = await axiosInstance.get(`/api/online-deals/products/${productId}/request-status`);
    return response.data;
  }

  /**
   * 取得狀態文字
   */
  getStatusText(status: number): string {
    const statusMap: Record<number, string> = {
      0: "等待處理",
      1: "已同意",
      2: "已取消",
      3: "已拒絕"
    };
    return statusMap[status] || "未知狀態";
  }

  /**
   * 取得狀態顏色
   */
  getStatusColor(status: number): string {
    const colorMap: Record<number, string> = {
      0: "processing", // 藍色
      1: "success",    // 綠色
      2: "default",    // 灰色
      3: "error"       // 紅色
    };
    return colorMap[status] || "default";
  }
}

const onlineDealService = new OnlineDealService();
export default onlineDealService;
