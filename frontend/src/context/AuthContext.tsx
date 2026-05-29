import React, { createContext, useContext, useEffect, useState } from 'react';
import { registerLogoutHandler } from '../utils/authUtils';
import axios from 'axios';

interface AuthContextType {
  email: string | null;
  isAuthenticated: boolean;
  logout: () => void;
  showAuthDialog: boolean;
  setShowAuthDialog: (value: boolean) => void;
}

export const AuthContext = createContext<AuthContextType>({
  email: null,
  isAuthenticated: false,
  logout: () => {},
  showAuthDialog: false,
  setShowAuthDialog: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [email, setEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // 新增初始化狀態

  const logout = () => {
    localStorage.removeItem('jwt');
    setEmail(null);
    setIsAuthenticated(false);
    // 只有不是 SSO 相關頁面時才顯示 AuthDialog
    if (!isSsoRelatedPage()) {
      setShowAuthDialog(true);
    }
  };

  // 檢查是否為 SSO 相關頁面或來自 SSO 重定向
  const isSsoRelatedPage = () => {
    const pathname = window.location.pathname;
    const search = window.location.search;
    
    // 如果是 SSO 登入頁面
    if (pathname.includes('/sso-login')) {
      return true;
    }
    
    // 如果 URL 中包含 SSO 相關參數，代表可能是從 SSO 重定向而來
    if (search.includes('HTTP_COOKIE') || search.includes('key=')) {
      return true;
    }
    
    // 檢查 document.referrer 是否來自 SSO 系統（更精確的檢查）
    if (document.referrer && 
        (document.referrer.includes('公司入口.example.com'))) {
      return true;
    }
    
    return false;
  };

  const validateToken = async () => {
    const token = localStorage.getItem('jwt');
    
    if (!token) {
      setIsInitializing(false); // 完成初始化
      const isSsoPage = isSsoRelatedPage();
      console.log('No token found. isSsoRelatedPage:', isSsoPage);
      console.log('Current pathname:', window.location.pathname);
      console.log('Current search:', window.location.search);
      console.log('Document referrer:', document.referrer);
      
      // 如果不是 SSO 相關頁面，且沒有 token，應該顯示 AuthDialog
      if (!isSsoPage) {
        console.log('Setting showAuthDialog to true');
        setShowAuthDialog(true);
      } else {
        console.log('SSO related page detected, not showing AuthDialog');
      }
      return;
    }

    try {
      const res = await axios.get('/api/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setEmail(res.data.email);
      setIsAuthenticated(true);
      setShowAuthDialog(false); // 確保關閉 AuthDialog
      setIsInitializing(false); // 完成初始化
    } catch (err) {
      console.error('JWT 驗證失敗', err);
      setIsInitializing(false); // 完成初始化
      logout();
    }
  };

  useEffect(() => {
    registerLogoutHandler(logout);
    validateToken();
  }, []);

  return (
    <AuthContext.Provider value={{ email, isAuthenticated, logout, showAuthDialog: showAuthDialog && !isInitializing, setShowAuthDialog }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
