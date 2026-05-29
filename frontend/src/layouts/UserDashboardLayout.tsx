import React, { useState, useEffect, useRef } from "react";
import {
  UserOutlined,
  AppstoreOutlined,
  HeartFilled,
  MessageFilled,
  CloudFilled,
} from "@ant-design/icons";
import { Layout, Menu, theme, Skeleton  } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { RootState } from "../store/store";
import { useSelector } from 'react-redux';
import useScroll from "../hooks/useScroll";
import ScrollToTopButton from "../components/ScrollToTopButton";

const { Sider, Content } = Layout;

const UserDashboardLayout: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAtBottom, scrollToTop } = useScroll({
    container: containerRef,
    thresholdBottom: 50,
  });
  const [collapsed, setCollapsed] = useState(false);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const avatarLetter = userProfile?.email?.charAt(0).toUpperCase() ?? "?";
  const emailLocalPart = userProfile?.email?.split("@")[0] ?? "";
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // 載入系統配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // 使用公開的系統狀態 API
        const response = await fetch('/api/system/status');
        if (response.ok) {
          const status = await response.json();
          setSystemConfig({
            online_deal_enabled: status.online_deal_enabled,
            online_deal_available: status.online_deal_available,
            online_deal_begin_date: status.online_deal_begin_date,
            online_deal_end_date: status.online_deal_end_date
          });
        } else {
          throw new Error('Failed to fetch status');
        }
      } catch (error) {
        console.error('載入系統配置失敗:', error);
        // 如果載入失敗，設為 null 以隱藏線上交易選單
        setSystemConfig(null);
      }
    };
    
    // 只有當用戶已登入時才載入配置
    if (userProfile?.email) {
      fetchConfig();
    }
  }, [userProfile?.email]); // 當用戶變更時重新載入配置

  // 動態生成選單項目
  const getMenuItems = () => {
    const baseItems = [
      {
        key: "profile",
        icon: <UserOutlined />,
        label: "我的資料設定",
        path: "/user/profile",
      },
      {
        key: "products",
        icon: <AppstoreOutlined />,
        label: "我的商品管理",
        path: "/user/products",
      },
      {
        key: "cart",
        icon: <HeartFilled />,
        label: "我的收藏",
        path: "/user/cart",
      },
    ];

    // 只有當系統功能啟用且在開放時間範圍內才顯示線上交易選單
    if (systemConfig?.online_deal_enabled) {
      // 檢查是否在議價開放時間範圍內
      let showOnlineDeals = true;
      if (systemConfig.online_deal_begin_date && systemConfig.online_deal_end_date) {
        const now = new Date();
        const start = new Date(systemConfig.online_deal_begin_date);
        const end = new Date(systemConfig.online_deal_end_date);
        showOnlineDeals = now >= start && now <= end;
      }
      
      if (showOnlineDeals) {
        baseItems.push({
          key: "online-deals",
          icon: <CloudFilled />,
          label: "線上交易",
          path: "/user/online-deals",
        });
      }
    }

    baseItems.push({
      key: "feedback",
      icon: <MessageFilled />,
      label: "回饋信箱",
      path: "/user/feedback",
    });

    return baseItems;
  };

  const menuItems = getMenuItems();
  const selectedKey = menuItems.find((item) =>
    location.pathname.startsWith(item.path)
  )?.key;

  return (
    <Layout
      style={{
        height: "100%", // 必須由外層 UserLayout 限定 calc(100vh - 160px)
        background: "transparent",
      }}
    >
      <motion.div
        initial={{ x: -220, opacity: 1 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "tween", duration: 0.4 }}
      >
      <Sider
        width={220}
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        style={{
          background: "#001529",
          height: "100%",
        }}
      >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 16px 16px 23px",
          color: "#fff",
        }}
      >
        {userProfile?.avatar_url ? (
          <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
            {!avatarLoaded && (
              <Skeleton.Avatar
                active
                size={40}
                shape="circle"
                style={{ position: "absolute", top: 0, left: 0 }}
              />
            )}
            <img
              src={userProfile.avatar_url}
              alt="avatar"
              onLoad={() => setAvatarLoaded(true)}
              onError={() => setAvatarLoaded(true)} // 若載入失敗也要解除 loading
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                objectFit: "cover",
                display: avatarLoaded ? "block" : "none",
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "#888",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: 16,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {avatarLetter}
          </div>
        )}

        {!collapsed && (
          <span style={{ fontSize: 16, fontWeight: 500 }}>{emailLocalPart}</span>
        )}
      </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey || "profile"]}
          onClick={({ key }) => {
            const target = menuItems.find((item) => item.key === key);
            if (target) navigate(target.path);
          }}
          items={menuItems}
        />
      </Sider>
      </motion.div>
      <Content
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          overflow: "auto",
          padding: 24,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}
      >
        <Outlet />
        <ScrollToTopButton isAtBottom={isAtBottom} scrollToTop={scrollToTop} />
      </Content>
    </Layout>
  );
};

export default UserDashboardLayout;
