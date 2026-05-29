/**
 * 認證相關的工具函數
 */

let logoutCallback: (() => void) | null = null;

/**
 * 註冊登出處理函式，供 axios 攔截器觸發用
 */
export const registerLogoutHandler = (cb: () => void) => {
  logoutCallback = cb;
};

/**
 * 觸發登出（例如 token 失效時呼叫）
 */
export const triggerLogout = () => {
  if (logoutCallback) {
    logoutCallback();
  } else {
    console.warn("尚未註冊 logout 處理函式");
  }
};

/**
 * 從 localStorage 中取得並解析 JWT token，返回用戶信息
 * @returns 用戶的 email，如果沒有找到或無法解析則返回空字符串
 */
export const getCurrentUserEmail = (): string => {
  try {
    // 嘗試從 localStorage 獲取 token
    const token = localStorage.getItem('jwt');
    
    // 如果沒有儲存 email 但有 token，解析 token
    if (token) {
      // JWT 格式為 header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Invalid JWT token format');
        return '';
      }
      
      // 解碼 payload
      const payload = JSON.parse(atob(parts[1]));
      
      // 從 payload 獲取 email (假設 JWT 中包含 email 字段)
      // 注意：實際字段名可能根據您的後端實現有所不同
      const userEmail = payload.sub;
      
      return userEmail;
    }
    
    return '';
  } catch (error) {
    console.error('Error parsing user token:', error);
    return '';
  }
};


