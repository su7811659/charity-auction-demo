import React, { useState, useContext, useRef } from "react";
import {
  Modal,
  Input,
  Button,
  Typography,
  Space,
  message,
  Divider,
} from "antd";
import { AuthContext } from "../context/AuthContext";
import RobotAvatarWithDialog, { RobotSentence } from "./RobotAvatarWithDialog";
import axios from "axios";
import { LoginOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const { Title, Paragraph } = Typography;

const AuthDialog: React.FC = () => {
  const { showAuthDialog, setShowAuthDialog } = useContext(AuthContext);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [devEmail, setDevEmail] = useState("demo@bidforgood.com");

  const shapeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const positionMap = useRef<Record<number, { x: number; y: number }>>({});

  const handleClose = () => setShowAuthDialog(false);

  const handleDevLogin = async () => {
    if (!devEmail) {
      message.warning(t("請輸入 email"));
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post("/api/auth/dev-login", { email: devEmail });
      const token = response.data.token;
      localStorage.setItem("jwt", token);
      message.success(t("登入成功，正在進入 Demo～"));
      handleClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
      message.error(t("登入失敗，請再試一次"));
    } finally {
      setLoading(false);
    }
  };

  const robotLines: RobotSentence[] = [
    { content: t("嗨～點一下就能用 Demo 帳號進來逛逛喔 🤖"), type: "normal" },
    { content: t("沒登入我不能幫你看商品欸😢"), type: "silent" },
    { content: t("登入後我就可以派上用場了！"), type: "normal" },
  ];

  const shapes = [
    { top: 10, left: 20, bg: "#D8B4FE", shape: "circle" },
    { top: 30, right: 30, bg: "#99F6E4", shape: "circle" },
    { bottom: 20, left: 50, bg: "#FECACA", shape: "circle" },
    { bottom: 30, right: 40, bg: "#BFDBFE", shape: "circle" },
    { top: 20, left: 80, bg: "#FDE68A", shape: "square" },
    { bottom: 10, right: 10, bg: "#C4B5FD", shape: "rounded" },
    { top: 50, right: 80, bg: "#A5F3FC", shape: "triangle" },
    { bottom: 50, left: 80, bg: "#F0ABFC", shape: "hexagon" },
  ];

  const handleShapeClick = (index: number) => {
    const el = shapeRefs.current[index];
    if (!el) return;

    el.style.animation = "none";
    void el.offsetWidth;

    const angle = Math.random() * 360;
    const distance = 80 + Math.random() * 40; // 更大的移動距離
    const dx = Math.cos((angle * Math.PI) / 180) * distance;
    const dy = Math.sin((angle * Math.PI) / 180) * distance;

    const prev = positionMap.current[index] || { x: 0, y: 0 };
    const newX = prev.x + dx;
    const newY = prev.y + dy;
    positionMap.current[index] = { x: newX, y: newY };

    el.style.transition = "transform 1.2s ease-out";
    el.style.transform = `translate(${newX}px, ${newY}px)`;
  };

  return (
    <Modal
      open={showAuthDialog}
      onCancel={handleClose}
      footer={null}
      closable={false}
      centered
      maskClosable={false}
    >
      <div
        style={{
          position: "relative",
          textAlign: "center",
          justifyItems: "center",
          padding: "32px 24px 16px",
          borderRadius: 24,
          background: "linear-gradient(135deg, #ffe4f0 0%, #ffffff 85%, #e0f2ff 100%)",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
          transition: "transform 0.3s ease",
          overflow: "hidden",
        }}
        className="auth-dialog-hover"
      >
        {shapes.map((ball, index) => {
          const size = 40 + Math.floor(Math.random() * 21);
          return (
            <div
              key={index}
              ref={(el) => { shapeRefs.current[index] = el; }}
              onClick={() => handleShapeClick(index)}
              className={`shape-${ball.shape} floating-shape`}
              style={{
                position: "absolute",
                width: size,
                height: size,
                backgroundColor: ball.bg,
                top: ball.top,
                bottom: ball.bottom,
                left: ball.left,
                right: ball.right,
                opacity: 0.15,
              }}
            />
          );
        })}

        <RobotAvatarWithDialog
          sentences={robotLines}
          placement="bottom"
          size={72}
          disableTickle={true}
        />

        <Title level={4} style={{ marginTop: 16 }}>{t("歡迎來到 BidForGood 公益市集 Demo 👋")}</Title>
        <Divider style={{ margin: "16px auto", width: "60px" }} />
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          {t("這是一個作品集展示用的 Demo。點下方按鈕即可用 Demo 帳號進入，無需註冊。")}
        </Paragraph>

        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Button
            type="primary"
            size="large"
            block
            onClick={handleDevLogin}
            loading={loading}
            className="login-button-hover"
            icon={<LoginOutlined />}
          >
            {t("以 Demo 帳號進入")}
          </Button>

          <Input
            placeholder={t("或自訂 email 進入（例如 you@bidforgood.com）")}
            value={devEmail}
            onChange={(e) => setDevEmail(e.target.value)}
            onPressEnter={handleDevLogin}
            disabled={loading}
          />
        </Space>
      </div>

      <style>{`
        .auth-dialog-hover:hover {
          transform: scale(1.03);
        }

        .login-button-hover {
          transition: transform 0.3s ease;
        }

        .login-button-hover:hover {
          transform: scale(1.05);
        }

        .floating-shape {
          transition: transform 1.2s ease-out;
          cursor: pointer;
        }

        .shape-circle {
          border-radius: 50%;
        }

        .shape-square {
          border-radius: 0;
        }

        .shape-rounded {
          border-radius: 8px;
        }

        .shape-triangle {
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        }

        .shape-hexagon {
          clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
        }
      `}</style>
    </Modal>
  );
};

export default AuthDialog;
