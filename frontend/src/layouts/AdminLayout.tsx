import React, { useState, useEffect } from "react";
import { Layout, Menu, Button, message } from "antd";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShoppingCartOutlined,
  HeartOutlined,
  ClockCircleOutlined,
  HomeOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import ScrollToTopButton from "../components/ScrollToTopButton";
import useScroll from "../hooks/useScroll";
import { useTranslation } from "react-i18next";

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC = () => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAtBottom, scrollToTop } = useScroll();

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token !== "demo-admin") {
      navigate("/login");
    }
  }, []);


  return (
    <Layout style={{ minHeight: "100vh", width: "100%" }}>
      {/* Sider */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={200}
        style={{ background: "#001529" }}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={[
              {
                key: "/admin/pending",
                icon: <ClockCircleOutlined />,
                label: <Link to="/admin/pending">{t("商品審核")}</Link>,
              },
              {
                key: "/admin/products",
                icon: <ShoppingCartOutlined />,
                label: <Link to="/admin/products">{t("商品管理")}</Link>,
              },
              {
                key: "/admin/donations",
                icon: <HeartOutlined />,
                label: <Link to="/admin/donations">{t("個人捐贈管理")}</Link>,
              },
              {
                key: "/admin/system-config",
                icon: <SettingOutlined />,
                label: <Link to="/admin/system-config">{t("系統配置")}</Link>,
              },
            ]}
          />
          <div style={{ marginTop: "auto" }}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={location.pathname === "/" ? ["/"] : []}
              items={[
                {
                  key: "/",
                  icon: <HomeOutlined />,
                  label: <Link to="/">{t("回使用者首頁")}</Link>,
                },
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: t("登出"),
                  onClick: () => {
                    localStorage.removeItem("adminToken");
                    message.success(t("已登出"));
                    navigate("/login");
                  },
                },
              ]}
            />
          </div>
        </div>
      </Sider>

      {/* 右側 Layout（一定要有 flex: 1） */}
      <Layout style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header style={{ padding: 0, background: "#fff" }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: "16px", width: 64, height: 64 }}
          />
        </Header>
        <Content
          style={{
            flex: 1,
            margin: "24px 16px",
            padding: 24,
            background: "#fff",
            borderRadius: 8,
            minHeight: 0, // 防止內容莫名被壓縮
          }}
        >
          <div style={{ width: "100%", background: "#eee", minHeight: 300 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>

      <ScrollToTopButton isAtBottom={isAtBottom} scrollToTop={scrollToTop} />
    </Layout>
  );
};

export default AdminLayout;
