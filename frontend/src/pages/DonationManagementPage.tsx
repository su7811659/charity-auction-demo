import React from "react";
import { Typography, Card, Row, Col, Alert } from "antd";
import { ExclamationCircleOutlined, DollarCircleOutlined, FileExcelOutlined } from "@ant-design/icons";
import SellerProductList from "./SellerProductList";

const { Title, Text } = Typography;

const DonationManagementPage: React.FC = () => {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <DollarCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          捐贈管理系統
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          管理和追蹤所有用戶的捐贈金額，監控須追繳的捐贈款項
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Alert
            message="金流處理說明"
            description={
              <div>
                <p><strong>賣家收益：</strong>非線上交易商品的賣家實際收益（價格 - 捐贈金額）</p>
                <p><strong>須追繳金額：</strong>線上交易商品的捐贈金額（賣家直接收取全額，需向賣家追繳捐贈額）</p>
                <p><strong>線上交易：</strong>賣家與買家直接交易，賣家收取全額但需向管理員繳納捐贈額</p>
                <p><strong>非線上交易：</strong>管理員處理金流，捐贈額已從賣家收益中扣除</p>
              </div>
            }
            type="info"
            showIcon
            icon={<ExclamationCircleOutlined />}
          />
        </Col>
      </Row>

      <Card
        title={
          <span>
            <FileExcelOutlined style={{ marginRight: 8 }} />
            捐贈資料查詢與報表
          </span>
        }
        style={{ backgroundColor: '#fafafa' }}
      >
        <SellerProductList />
      </Card>
    </div>
  );
};

export default DonationManagementPage;
