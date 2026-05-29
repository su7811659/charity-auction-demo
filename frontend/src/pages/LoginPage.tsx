import React, { useEffect, useState } from "react";
import { Button, Input, Form, Typography, Card, message, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import sessionService from "../services/sessionService";
import axios from "axios";

const { Title } = Typography;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [checkingLogin, setCheckingLogin] = useState(true); // 加入 loading 狀態

  useEffect(() => {
    const token = sessionService.getToken();
    if (token) {
      // ⏩ 已登入，自動跳轉
      navigate("/admin/pending", { replace: true });
    } else {
      // ❌ 未登入，顯示登入表單
      setCheckingLogin(false);
    }
  }, [navigate]);

  const onFinish = async (values: any) => {
    const { secret } = values;

    try {
      const res = await axios.post("/api/admin/login", { secret });
      sessionService.setToken(res.data.token);
      messageApi.success("登入成功！");
      navigate("/admin/pending");
    } catch (err: any) {
      messageApi.error("密碼錯誤！");
    }
  };

  if (checkingLogin) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f0f2f5",
        }}
      >
        <Card style={{ width: 360 }}>
          <Title level={3}>管理員登入</Title>
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item
              label="密碼"
              name="secret"
              rules={[{ required: true, message: "請輸入管理員密碼" }]}
            >
              <Input.Password placeholder="請輸入密碼" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                登入
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </>
  );
};

export default LoginPage;
