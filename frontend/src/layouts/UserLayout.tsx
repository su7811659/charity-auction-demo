import { Layout } from "antd";
import { Outlet, useLocation, Link } from "react-router-dom";
import {
  ShoppingFilled,
  HeartFilled,
  KeyOutlined,
  CompassFilled,
  SmileFilled,
  CrownFilled,
} from "@ant-design/icons";

// Redux related
import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTotalDonation, fetchTopDonors } from "../store/productSlice";
import { RootState, AppDispatch } from "../store/store";
import logo from '@/assets/img/logo.svg';

import { NavigationMenu } from '../components/NavigationMenu';
import LanguageToggle from '../components/LanguageToggle';
import { useTranslation } from 'react-i18next';
import { TotalDonationCounter } from "../components/TotalDonationCounter";
import { TopDonorsPopover } from "../components/TopDonorsPopover";
import systemConfigService from "../services/systemConfigService";
import useScroll from "../hooks/useScroll";
import ScrollToTopButton from "../components/ScrollToTopButton";
import { useAuth } from "../context/AuthContext";
import useAchievementChecker from '../hooks/useAchievementChecker';
import { requestNotificationPermissionSilently } from '../components/AchievementNotification';

const { Header, Content, Footer } = Layout;

const ROUTES = {
  HOME: {
    path: "/",
    key: "1",
    icon: undefined,
    label: "商品列表" 
  },
  UPLOAD: { 
    path: "/upload",
    key: "2",
    icon: undefined,
    label: "上傳商品" 
  },
  ABOUT: {
    path: "/about",
    key: "3",
    icon: undefined,
    label: "活動指南" 
  },
  SUMMARY: {
    path: "/summary",
    key: "4",
    icon: undefined,
    label: "活動總結" 
  },
  USER: { 
    path: "/user/profile",
    key: "5",
    icon: undefined,
    label: "個人中心" 
  },
  LOGIN: { path: "/login", key: "6", icon: undefined,label: "管理者後台" },
};
const POLL_INTERVAL = 60000; // 降低到 30 秒，減少伺服器負載

const UserLayout: React.FC = () => {
  // Removed unused destructured elements from theme.useToken()
  const { t } = useTranslation();

  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { isAtBottom, scrollToTop } = useScroll({ thresholdBottom: 50 });
  const { email } = useAuth(); // 獲取當前用戶 email
  const { checkAndShowAchievements } = useAchievementChecker(); // 全域成就檢查器
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [isUploadAllowed, setIsUploadAllowed] = useState(true); // 默認允許上傳
  const [systemStatusLoaded, setSystemStatusLoaded] = useState(false); // 新增加載狀態
  
  // 使用 ref 來追踪是否是首次掛載，避免重複檢查
  const isInitialMountRef = useRef(true);
  
  // 檢查是否為開發模式
  const isDevelopMode = import.meta.env.VITE_DEVELOP_MODE === 'true';
  
  // 檢查是否為特殊用戶（管理員）
  const isSpecialUser = () => {
    if (!email) return false;
    const specialEmails = ['demo@bidforgood.com', 'admin@bidforgood.com'];
    return specialEmails.some(specialEmail => email.toLowerCase().includes(specialEmail.toLowerCase()));
  };
  
  // 檢查是否應該顯示管理者後台入口
  const shouldShowAdminEntry = isDevelopMode || isSpecialUser();
  
  const isAutoScrollUpDisabled = location.pathname.startsWith("/user");

  const totalDonation = useSelector(
    (state: RootState) => state.product.totalDonation
  );
  const topDonors = useSelector(
    (state: RootState) => state.product.topDonors
  );

  const getSelectedKey = () => {
    const currentPath = location.pathname;
    if (currentPath.startsWith("/user")) {
      return ROUTES.USER.key;
    }
    const route = Object.values(ROUTES).find(route =>
      currentPath === route.path || currentPath.startsWith(route.path + "/")
    );
    return route?.key || ROUTES.HOME.key;
  };

  const menuRoutes = Object.values(ROUTES)
    .filter(route => {
      // 如果是管理者後台，根據條件決定是否顯示
      if (route.key === "6") { // LOGIN (管理者後台)
        return shouldShowAdminEntry;
      }
      
      // 如果系統狀態還沒加載完成，顯示默認選項
      if (!systemStatusLoaded) {
        // 在加載中時，顯示上傳選項（默認允許），隱藏總結選項（默認不可見）
        if (route.key === "4") { // SUMMARY - 默認隱藏
          return false;
        }
        return true; // 其他選項包括 UPLOAD 都顯示
      }
      
      // 如果是上傳商品頁面，根據系統配置決定是否顯示
      if (route.key === "2") { // UPLOAD
        console.log('上傳選項顯示狀態:', isUploadAllowed); // 添加調試日誌
        return isUploadAllowed;
      }
      // 如果是總結頁面，根據系統配置決定是否顯示
      if (route.key === "4") { // SUMMARY
        return isSummaryVisible;
      }
      return true;
    })
    .map(route => ({
    ...route,
    icon: (() => {
      const isSelected = route.key === getSelectedKey();
      const baseStyle = { fontSize: "large" };
      const defaultColor = "#aaa";
  
      switch (route.key) {
        case "1":
          return <ShoppingFilled style={{ ...baseStyle, color: isSelected ? "#f5a623" : defaultColor }} />;
        case "2":
          return <HeartFilled style={{ ...baseStyle, color: isSelected ? "#FF5151" : defaultColor }} />;
        case "3":
          return <CompassFilled style={{ ...baseStyle, color: isSelected ? "#7ed321" : defaultColor }} />;
        case "4":
          return <CrownFilled style={{ ...baseStyle, fontSize: "24px", color: isSelected ? "#FFD700" : defaultColor }} />;
        case "5":
          return <SmileFilled style={{ ...baseStyle, color: isSelected ? "#D3A4FF" : defaultColor }} />;
        case "6":
          return <KeyOutlined style={{ ...baseStyle, color: isSelected ? "#B15BFF" : defaultColor }} />;
        default:
          return route.icon; // fallback
      }
    })()
  }));

  const contentStyle: React.CSSProperties = (() => {
    switch (location.pathname) {
      case "/upload-success":
        return {
          background: "#f5f7fa",
          padding: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "calc(100vh - 65px - 90px)",
          overflow: "hidden",
        };
  
      case "/about":
      case "/summary":
        return {
          margin: "32px auto 0 auto",
          padding: "32px",
          minHeight: "calc(100vh - 120px)",
          borderRadius: 18,
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          maxWidth: 1000,
          width: "90%",
        };
  
      case "/":
      case "/upload":
      case "/login":
        return {
          margin: "24px auto 0 auto",
          padding: "8px",
          minHeight: "calc(100vh - 120px)",
          maxWidth: 1280,
          width: "98%",
        };
      case "/user":
      case "/user/cart":
      case "/user/profile":
      case "/user/products":
      case "/user/history":
      case "/user/feedback":
      case "/user/online-deals":
        return {
          padding: 0,
          height: "calc(100vh - 160px)",
          overflow: "hidden",
          background: "transparent",
          marginTop: "-1px",
        };
  
      default:
        return {
          margin: "32px auto 0 auto",
          padding: "32px 24px 24px 24px",
          minHeight: "calc(100vh - 120px)",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          maxWidth: 1280,
          width: "95%",
          transition: "background 0.3s",
        };
    }
  })();
  

  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchTotalDonation());
      dispatch(fetchTopDonors());
    };

    const checkSystemStatus = async () => {
      try {
        const status = await systemConfigService.getSystemStatus();
        console.log('系統狀態:', status); // 添加調試日誌
        setIsSummaryVisible(status.summary_visible);
        setIsUploadAllowed(status.upload_allowed);
        setSystemStatusLoaded(true); // 標記為已加載
      } catch (error) {
        console.error('檢查系統狀態失敗:', error);
        // 在網路錯誤時保持上傳功能可用，避免因 API 連接問題影響用戶體驗
        setIsSummaryVisible(false);
        setIsUploadAllowed(true); // 網路錯誤時默認允許上傳，確保功能可用性
        setSystemStatusLoaded(true); // 即使失敗也標記為已加載
      }
    };

    fetchData();
    checkSystemStatus();

    const timer = setInterval(() => {
      fetchData();
      checkSystemStatus();
    }, POLL_INTERVAL);
    
    return () => clearInterval(timer); // Cleanup on unmount
  }, [dispatch]);

  // 全域成就檢查 - 只在活躍分頁檢查，避免多分頁重複通知
  useEffect(() => {
    if (!email) return; // 沒登入就不檢查

    console.log('🔍 設置全域成就檢查系統...');

    // 首次登入時靜默請求通知權限
    requestNotificationPermissionSilently().then(permission => {
      console.log('🔔 通知權限狀態:', permission);
    });

    // 頁面載入時檢查一次
    const initialCheck = setTimeout(() => {
      console.log('🔍 執行初始成就檢查...');
      checkAndShowAchievements();
    }, 2000); // 延遲2秒讓頁面完全載入

    // 定期檢查成就 (每30秒) - 只在分頁可見時檢查
    const achievementTimer = setInterval(() => {
      // 檢查分頁是否可見
      if (document.visibilityState === 'visible') {
        console.log('🔍 執行定期成就檢查 (分頁可見)...');
        checkAndShowAchievements();
      } else {
        console.log('⏸️ 分頁不可見，跳過成就檢查');
      }
    }, 30000);

    // 監聽分頁可見性變化
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ 分頁變為可見，立即檢查成就...');
        // 分頁變為可見時立即檢查一次
        setTimeout(() => {
          checkAndShowAchievements();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(achievementTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [email]); // 移除 checkAndShowAchievements 依賴項避免無限重渲染

  // 路由變化時檢查成就
  useEffect(() => {
    if (!email) return;
    
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      console.log('🔍 跳過初次掛載的路由檢查，避免重複通知');
      return; // 跳過初次掛載時的檢查
    }
    
    console.log('🔍 路由變化，檢查成就...', location.pathname);
    
    // 路由變化後稍微延遲檢查，確保任何相關的API調用完成
    const routeChangeCheck = setTimeout(() => {
      checkAndShowAchievements();
    }, 1500);

    return () => clearTimeout(routeChangeCheck);
  }, [location.pathname, email]); // 移除 checkAndShowAchievements 依賴項

  return (
    <Layout style={{ minHeight: "100vh", width: "100%", background: "#f5f7fa" }}>
      <Header
        role="banner"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          width: "100%",
          height: "65px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          background: "#001529",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <img
              alt="logo"
              src={logo}
              style={{
                width: '100%',
                maxWidth: 265,
                height: 'auto',
                objectFit: "contain",
                display: "block",
                verticalAlign: 'middle',
                paddingRight: '25px',
              }}
            />
          </Link>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
          <NavigationMenu
            aria-label="主選單"
            routes={menuRoutes}
            selectedKey={getSelectedKey()}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%' }}>
          <TotalDonationCounter
            totalDonation={totalDonation}
            popoverContent={<TopDonorsPopover donors={topDonors} />}
          />
          <LanguageToggle />
        </div>
      </Header>
      {/* Divider below header for separation */}
      <div style={{ width: '100%', height: 1, background: '#f0f2f5', marginBottom: 0 }} />
      <Content style={contentStyle} >
        {/* Breadcrumb removed */}
        <Outlet />
      </Content>
      <Footer style={{
        textAlign: "center",
        background: "#f8fafd",
        fontSize: 14,
        color: "#888",
        borderTop: "1px solid #f0f0f0",
        marginTop: 32,
        padding: "18px 0 10px 0",
        display: location.pathname.startsWith("/user") ? "none" : undefined,
      }}>
        {t("公益二手平台")} ©{new Date().getFullYear()} Powered by BidForGood
      </Footer>
      
      <ScrollToTopButton
        isAtBottom={isAtBottom}
        scrollToTop={scrollToTop}
        disabled={isAutoScrollUpDisabled}
      />
    </Layout >
  );
};

export default UserLayout;
