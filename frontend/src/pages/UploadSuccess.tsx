import {
    Button,
    Row,
    Col,
    Typography,
    Divider,
    Space,
  } from 'antd';
  import {
    CheckCircleFilled,
    ClockCircleOutlined,
    FileSearchOutlined,
    SmileOutlined,
    EditOutlined,
    FireOutlined,
    HeartFilled,
    HomeOutlined,
    UploadOutlined,
  } from '@ant-design/icons';
  import { useNavigate, useLocation } from 'react-router-dom';
  import { useTranslation } from "react-i18next";

  const { Title, Text } = Typography;

  const UploadSuccess = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const productName = location.state?.productName || t('商品');
    const sellerNickname = location.state?.sellerNickname || t('使用者暱稱');
    const sellerName = location.state?.sellerName || t('使用者');
  
    return (
      <div
        style={{
          background: '#f5f7fa',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px', // 避免視窗太小貼邊
          margin: '0 auto' 
        }}
      >
        <div
          style={{
            width: '100%',
            height: '73vh',
            marginTop: '1.5rem',
            padding: '32px 64px',
            background: '#fff',
            borderRadius: '12px 8px 8px 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            overflowY: 'scroll',
            scrollBehavior: 'smooth',
            animation: 'fadeIn 0.8s ease',
            scrollbarWidth: 'thin',
            scrollbarColor: 'whitesmoke transparent',
          }}
        >
        <div
        style={{
            textAlign: 'center',
            marginBottom: 48,
            animation: 'fadeIn 0.8s ease',
        }}
        >
        <CheckCircleFilled
            style={{
            fontSize: 72,
            color: '#52c41a',
            transform: 'scale(1)',
            animation: 'popIn 0.5s ease',
            }}
        />
        <Title level={2} style={{ marginTop: 16, fontWeight: 600 }}>
            🎉 {t('愛心發射成功！')}
        </Title>
        <div style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 16 }}>
            {t('尊貴的')} <span style={{ color: '#1890ff', fontWeight: 500 }}>{sellerNickname}</span>
            （{sellerName}）{t('您好')} 👋
            </Text>
        </div>
        <div style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 16 }}>
            {t('您的商品')} <strong style={{ color: '#fa541c' }}>{productName}</strong> {t('已成功上傳至我們的系統！')}
            </Text>
        </div>
        </div>

  
          <Row gutter={[32, 32]} wrap style={{ marginBottom: 24 }}>
            <Col xs={24} md={12}>
                <Title level={4} style={{ marginBottom: 16 }}>📌 {t('下一步')}</Title>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Text><ClockCircleOutlined style={{ color: '#faad14', marginRight: 8 }} /> {t('商品進入審核流程（預計 1~2 個工作天）')}</Text>
                <Text><FileSearchOutlined style={{ color: '#1890ff', marginRight: 8 }} /> {t('審核通過後會自動上架，無需再次操作')}</Text>
                <Text><SmileOutlined style={{ color: '#52c41a', marginRight: 8 }} /> {t('記得留意信件與活動通知，掌握商品動態')}</Text>
                </Space>
            </Col>

            <Col xs={24} md={12}>
                <Title level={4} style={{ marginBottom: 16 }}>🔔 {t('提醒事項')}</Title>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Text><EditOutlined style={{ color: '#ff4d4f', marginRight: 8 }} /> {t('商品上傳後不可修改，如需更動請聯絡 ESG 小組')}</Text>
                <Text><FireOutlined style={{ color: '#fa541c', marginRight: 8 }} /> {t('描述越完整，越能吸引目光提升成交機率')}</Text>
                <Text><HeartFilled style={{ color: '#eb2f96', marginRight: 8 }} /> {t('所得將依設定比例作為公益捐贈，謝謝您的愛心')}</Text>
                </Space>
            </Col>
            </Row>

  
          <Divider />
  
          <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button
            type="primary"
            icon={<HomeOutlined />}
            size="large"
            style={{
                marginRight: 16,
                paddingInline: 28,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            className="hover-scale"
            onClick={() => navigate('/')}
            >
            {t('返回商品列表')}
            </Button>

            <Button
            icon={<UploadOutlined />}
            size="large"
            style={{
                background: '#52c41a',
                color: '#fff',
                border: 'none',
                paddingInline: 28,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            className="hover-scale"
            onClick={() => navigate('/upload')}
            >
            {t('繼續上傳商品')}
            </Button>

          </div>
        </div>
      </div>
    );
  };
  
  export default UploadSuccess;
  