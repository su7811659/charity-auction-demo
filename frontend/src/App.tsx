import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import UserLayout from "./layouts/UserLayout";
import AdminLayout from "./layouts/AdminLayout";
import ProductList from "./pages/ProductList";
import ProductSubmit from "./pages/ProductSubmit";
import ProductDetail from "./pages/ProductDetail";
import About from "./pages/About";
import Summary from "./pages/Summary";
import LoginPage from "./pages/LoginPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import ProductManagementPage from "./pages/ProductManagementPage";
import DonationManagementPage from "./pages/DonationManagementPage";
import SsoLoginPage from "./pages/SsoLoginPage";
import UserDashboardLayout from "./layouts/UserDashboardLayout";
import UserProfilePage from "./pages/user/UserProfilePage";
import UserProductsPage from "./pages/user/UserProductsPage";
import UserCartPage from "./pages/user/UserCartPage";
import UserFeedbackPage from "./pages/user/UserFeedbackPage";
import UserOnlineDealsPage from "./pages/user/UserOnlineDealsPage";

import { useEffect } from "react";
import useSystemTheme from "./hooks/useSystemTheme";
import { ConfigProvider } from "antd";
import theme from "antd/es/theme";
import UploadSuccess from "./pages/UploadSuccess";
import SystemConfigPage from "./pages/SystemConfigPage";
import { AuthProvider } from "./context/AuthContext";
import AuthDialog from "./components/AuthDialog";

import axiosInstance from './utils/axiosInstance';
import { useDispatch } from "react-redux";
import { setUserProfile } from "./store/userSlice";
import { getMyProfile } from "./services/userService";
import { useAchievementListener } from "./hooks/useAchievementListener";
import useGlobalNotificationManager from "./hooks/useGlobalNotificationManager";


function App() {
  const dispatch = useDispatch();
  const { startListening, stopListening } = useAchievementListener();
  const { startGlobalNotificationChecker, stopGlobalNotificationChecker, manualCheck } = useGlobalNotificationManager();

  const systemTheme = useSystemTheme();
  useEffect(() => {
    console.log("system theme:", systemTheme);
    document.body.setAttribute("data-theme", systemTheme);
  }, [systemTheme]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const jwt = localStorage.getItem("jwt");
        if (!jwt) return;
  
        await axiosInstance.get("/api/me", {
          headers: { Authorization: `Bearer ${jwt}` },
        });
  
        const profile = await getMyProfile();
        dispatch(setUserProfile(profile));
        
        // 用戶登入後暫停全域通知管理器，改為手動檢查模式
        // startGlobalNotificationChecker(); // 停用自動檢查
        
        // 暴露到 window 物件以便調試
        (window as any).globalNotificationManager = {
          manualCheck,
          startGlobalNotificationChecker,
          stopGlobalNotificationChecker
        };
        
        // 暫時停用成就監聽器
        // startListening(); // 暫時註解掉
      } catch {
        console.warn("未登入或 token 過期");
      }
    };
  
    fetchUser();

    // 清理函數
    return () => {
      stopListening();
      stopGlobalNotificationChecker();
    };
  }, [dispatch, startListening, stopListening]);

  return (
    <ConfigProvider
      theme={{
        algorithm: systemTheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          fontFamily: "'Noto Sans TC', 'Inter', sans-serif",
        },
      }}
    >
      {/* 使用 AntApp 組件來提供通知上下文 */}
      <div className="ant-app">
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/sso-login" element={<SsoLoginPage />} />

              {/* 🔹 套用 `UserLayout`，讓 `ProductList`、`ProductSubmit`、`Donations` 在 `Outlet` 顯示 */}
              <Route path="/" element={<UserLayout />}>
                <Route index element={<ProductList />} />
                <Route path="upload" element={<ProductSubmit />} />
                <Route path="upload-success" element={<UploadSuccess />} />
                <Route path="product/:id" element={<ProductDetail />} />
                <Route path="about" element={<About />} />
                <Route path="summary" element={<Summary />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="user" element={<UserDashboardLayout />}>
                  <Route path="profile" element={<UserProfilePage />} />
                  <Route path="products" element={<UserProductsPage />} />
                  <Route path="cart" element={<UserCartPage />} />
                  <Route path="online-deals" element={<UserOnlineDealsPage />} />
                  <Route path="feedback" element={<UserFeedbackPage />} />
                </Route>
              </Route>

              {/* 🔹 管理者後台 */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="pending" element={<PendingApprovalPage />} />
                <Route path="products" element={<ProductManagementPage />} />
                <Route path="donations" element={<DonationManagementPage />} />
                <Route path="system-config" element={<SystemConfigPage />} />
              </Route>
            </Routes>

            <AuthDialog />
          </Router>
        </AuthProvider>
      </div>
    </ConfigProvider>
  );
}

export default App;
