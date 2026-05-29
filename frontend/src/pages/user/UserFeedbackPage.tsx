import React, { useState, useEffect } from 'react';
import { Card, Button, message, Form, Input, Tag, Spin, Typography, Switch, Space, Tooltip, Empty, Select } from 'antd';
import { MessageFilled, BulbOutlined, BgColorsOutlined, BugOutlined, SmileOutlined, QuestionCircleOutlined, CheckOutlined, CommentOutlined, ClockCircleOutlined, CheckCircleOutlined, EditOutlined, FileTextOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import axiosInstance from '../../utils/axiosInstance';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const UserFeedbackPage: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [selectedAnonymousName, setSelectedAnonymousName] = useState<string>('🕶️ 神秘好心人');
  const [selectedFeedbackType, setSelectedFeedbackType] = useState<string>('');
  const [messageApi, contextHolder] = message.useMessage();
  const [userFeedbacks, setUserFeedbacks] = useState<any[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const userProfile = useSelector((state: RootState) => state.user.profile);

  // 固定的隨機文案（只在組件初始化時設定一次）
  const [randomPhrase] = useState(() => {
    const phrases = [
      t("你的一句話，可能就是我們改變的起點。"),
      t("願每段回饋，都成為我們一起寫的使用者之書。"),
      t("謝謝你願意說，我們會好好聽。"),
      t("平台是我們的共筆，你的建議就是一筆溫柔的墨水。"),
      t("用回饋灌溉想像，讓這裡長出更多可能。"),
      t("你不是使用者，你是一起讓這裡變更好的共創者。"),
      t("偷偷說，我們其實超在乎你的想法。"),
      t("哎呀～你終於來講真心話了對吧？"),
      t("這裡沒有意見箱，只有我們豎起的耳朵🐰"),
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  });

  // 神秘公益稱號選項
  const anonymousNames = [
    '🕶️ 神秘好心人',
    '🌟 傳說中的低調好人',
    '👑 終極關懷大帝',
    '💗 默默行善的小姐姐',
    '😇 匿名小天使',
    '🌸 愛心覺羅的恩澤',
  ];

  // 回饋類型選項
  const feedbackTypes = [
    { value: 'feature', label: t('功能建議'), color: '#1890ff', icon: BulbOutlined },
    { value: 'style', label: t('樣式建議'), color: '#52c41a', icon: BgColorsOutlined },
    { value: 'bug', label: t('有BUG啦'), color: '#faad14', icon: BugOutlined },
    { value: 'experience', label: t('使用心得'), color: '#eb2f96', icon: SmileOutlined },
    { value: 'other', label: t('其他'), color: '#8c8c8c', icon: QuestionCircleOutlined },
  ];

  // 回饋類型映射（用於顯示從後端返回的類型）
  const feedbackTypeMap: Record<string, any> = {
    'feature': { label: t('功能建議'), color: '#1890ff', icon: BulbOutlined },
    'style': { label: t('樣式建議'), color: '#52c41a', icon: BgColorsOutlined },
    'bug': { label: t('有BUG啦'), color: '#faad14', icon: BugOutlined },
    'experience': { label: t('使用心得'), color: '#eb2f96', icon: SmileOutlined },
    'other': { label: t('其他'), color: '#8c8c8c', icon: QuestionCircleOutlined },
    '功能建議': { label: t('功能建議'), color: '#1890ff', icon: BulbOutlined },
    '樣式建議': { label: t('樣式建議'), color: '#52c41a', icon: BgColorsOutlined },
    '有BUG啦': { label: t('有BUG啦'), color: '#faad14', icon: BugOutlined },
    '使用心得': { label: t('使用心得'), color: '#eb2f96', icon: SmileOutlined },
    '其他': { label: t('其他'), color: '#8c8c8c', icon: QuestionCircleOutlined },
    '系統測試': { label: t('系統測試'), color: '#722ed1', icon: BugOutlined }
  };

  // 根據回饋類型顯示不同的 placeholder
  const getPlaceholderByType = (type: string) => {
    const placeholders = {
      'feature': t('💡 有什麼功能是你希望我們加上的嗎？不管多天馬行空都可以說說看～'),
      'style': t(' 哪些設計讓你有點小卡？像是顏色、排版、按鈕樣式，都歡迎建議！'),
      'bug': t('🐛 發現怪怪的地方了嗎？請幫我們記錄一下發生在哪、你做了什麼、出了什麼錯～'),
      'experience': t('😊 用起來感覺如何？也許是某次很暖的互動、或讓你會心一笑的小細節？'),
      'other': t('💭 想聊聊別的嗎？關於網站、活動，甚至只是想講個笑話也行！')
    };
    
    return placeholders[type as keyof typeof placeholders] || placeholders.other;
  };

  // 計算更深的顏色
  const getDarkerColor = (color: string) => {
    // 如果是 hex 顏色，轉換為更深的版本
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      // 讓顏色變深 20%
      const darkerR = Math.floor(r * 0.8);
      const darkerG = Math.floor(g * 0.8);
      const darkerB = Math.floor(b * 0.8);
      
      return `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
    }
    return color;
  };
  const FeedbackTypeRadio = ({ option, checked, onClick }: { 
    option: any, 
    checked: boolean, 
    onClick: () => void 
  }) => {
    const IconComponent = option.icon;
    
    return (
      <motion.div
        whileHover={{ 
          scale: 1.05,
          transition: { type: "spring", stiffness: 300 }
        }}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '8px',
          cursor: 'pointer',
          borderRadius: '8px',
          position: 'relative',
          marginRight: '16px',
          marginBottom: '16px',
        }}
        animate={{
          scale: checked ? 1.05 : 1,
          boxShadow: checked ? '0 4px 12px rgba(0,0,0,0.15)' : '0 0 0 transparent',
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
        onClick={onClick}
      >
        {checked && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500 }}
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              backgroundColor: option.color,
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
              border: '2px solid white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }}
          >
            <CheckOutlined style={{ color: 'white', fontSize: '10px' }} />
          </motion.div>
        )}
        
        <motion.div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: option.color,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '8px',
            border: checked ? `3px solid ${getDarkerColor(option.color)}` : '2px solid #fff',
            position: 'relative',
          }}
          animate={{
            scale: checked ? 1.1 : 1,
            boxShadow: checked ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20
          }}
        >
          <IconComponent style={{ color: 'white', fontSize: '24px' }} />
        </motion.div>
        
        <span style={{
          fontSize: '12px',
          textAlign: 'center',
          color: checked ? getDarkerColor(option.color) : '#666',
          fontWeight: checked ? 'bold' : 'normal'
        }}>
          {option.label}
        </span>
      </motion.div>
    );
  };

  // 生成個性化成功訊息
  const getSuccessMessage = () => {
    if (anonymous) {
      const messages = [
        t("感謝 {{name}} 的寶貴回饋！您的神秘力量將讓平台變得更美好 ✨", { name: selectedAnonymousName }),
        t("{{name}} 的意見已收到！您的匿名善行將造福更多人 🌟", { name: selectedAnonymousName }),
        t("收到來自 {{name}} 的珍貴建議！神秘英雄的聲音我們聽到了 🦸‍♀️", { name: selectedAnonymousName }),
        t("{{name}} 出手相助！您的回饋將成為改進的動力 ⚡", { name: selectedAnonymousName }),
        t("感謝 {{name}} 的無私分享！匿名天使的關愛溫暖人心 💫", { name: selectedAnonymousName })
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    } else {
      const userName = userProfile?.email?.split('@')[0] || '您';
      const messages = [
        t("感謝 {{name}} 的回饋！我們會認真處理您的意見並儘快回覆 💙", { name: userName }),
        t("{{name}}，您的建議已收到！我們將用心回應您的每個想法 🌈", { name: userName }),
        t("感謝 {{name}} 的寶貴意見！期待與您一起讓平台更棒 🚀", { name: userName }),
        t("{{name}}，您的聲音很重要！我們會仔細研究並回覆您 📝", { name: userName }),
        t("收到 {{name}} 的回饋了！您的參與讓我們持續進步 🌸", { name: userName })
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }
  };

  // 當用戶資料載入後，自動填入表單 (只影響姓名，不影響其他欄位)
  useEffect(() => {
    if (userProfile) {
      form.setFieldsValue({
        name: userProfile.email?.split('@')[0] || '',
      });
      // 載入用戶的回饋記錄
      fetchUserFeedbacks();
    }
  }, [userProfile, form]);

  // 監聽匿名模式變化，更新表單顯示
  useEffect(() => {
    if (userProfile) {
      // 切換到匿名模式時，如果還沒有選擇身份才設置預設值
      if (anonymous && selectedAnonymousName === '') {
        setSelectedAnonymousName('🕶️ 神秘好心人');
      }
    }
  }, [anonymous, userProfile, form, selectedAnonymousName]);

  // 獲取用戶回饋記錄
  const fetchUserFeedbacks = async () => {
    if (!userProfile?.email) return;
    
    setFeedbacksLoading(true);
    try {
      const response = await axiosInstance.get(`/api/feedback/user/${userProfile.email}`);
      setUserFeedbacks(response.data.feedbacks || []);
    } catch (error) {
      console.error('獲取回饋記錄失敗:', error);
      messageApi.error(t('無法載入回饋記錄'));
    } finally {
      setFeedbacksLoading(false);
    }
  };

    const onFinish = async (values: any) => {
    const submissionData = {
      ...values,
      name: anonymous ? selectedAnonymousName : (userProfile?.email?.split('@')[0] || values.name),
      feedbackType: selectedFeedbackType || values.feedbackType,
      email: anonymous ? '' : (userProfile?.email || '')  // 匿名模式時不送email
    };

    console.log('📤 準備提交的資料:', submissionData);
    console.log('🔐 匿名模式:', anonymous);
    console.log('🎭 選擇的身份:', selectedAnonymousName);

    setLoading(true);
    try {
      const response = await axiosInstance.post('/api/feedback/submit', submissionData);
      
      if (response.data.success) {
        // 顯示個性化成功訊息
        messageApi.success(getSuccessMessage());
        form.resetFields();
        setSelectedFeedbackType('');
        // 匿名模式下不重置身份選擇，讓用戶保持選擇的身份
        if (!anonymous) {
          setSelectedAnonymousName('🕶️ 神秘好心人'); // 只有非匿名模式才重置
        }
        
        if (userProfile?.email) {
          form.setFieldsValue({ name: userProfile.email.split('@')[0] || '' });
        }
        
        // 重新載入回饋記錄
        fetchUserFeedbacks();
      } else {
        messageApi.warning(t('回饋提交成功，但儲存時發生問題，我們已記錄您的意見。'));
      }
    } catch (error) {
      console.error('Submit feedback error:', error);
      messageApi.error(t('提交失敗，請稍後再試。'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <div style={{ margin: "0 auto", padding: "40px 24px", maxWidth: 800 }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 0.6,
          }}
          whileHover={{
            scale: 1.2,
            rotate: 15,
            transition: { type: "spring", stiffness: 300 },
          }}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "#1890ff",
            margin: "0 auto 8px",
          }}
        >
          <MessageFilled
            style={{
              color: "#fff",
              fontSize: "32px",
            }}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Title
            level={3}
            style={{
              fontWeight: "bold",
              marginBottom: "4px",
              textAlign: "center",
            }}
          >
            {t("回饋信箱")}
          </Title>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Paragraph
            style={{
              color: "#666",
              fontSize: "16px",
              textAlign: "center",
              marginBottom: "32px",
            }}
          >
            {randomPhrase}
          </Paragraph>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card 
          style={{ 
            borderRadius: "12px", 
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)" 
          }}
        >
          <Form 
            form={form}
            layout="vertical" 
            onFinish={onFinish}
            style={{ padding: "24px" }}
          >
            <Form.Item style={{ marginBottom: 16 }}>
              <Tooltip 
                title={
                  anonymous
                    ? (
                      <div>
                        <div><strong>{t("匿名提交")}</strong></div>
                        <div>{t("• 不顯示真實姓名")}</div>
                        <div style={{ color: '#faad14' }}>{t("• 無法收到開發者的回覆通知")}</div>
                        <div style={{ fontSize: '11px', marginTop: '4px', color: '#999' }}>
                          {t("建議使用實名模式以獲得個人化回覆")}
                        </div>
                      </div>
                    )
                    : (
                      <div>
                        <div><strong>{t("實名提交")}</strong></div>
                        <div>{t("• 以真實姓名提交回饋")}</div>
                        <div style={{ color: '#52c41a' }}>{t("• 可以收到開發者的個人化回覆")}</div>
                        <div style={{ fontSize: '11px', marginTop: '4px', color: '#999' }}>
                          {t("推薦使用，方便後續聯繫與回覆")}
                        </div>
                      </div>
                    )
                }
                placement="top"
                overlayStyle={{ maxWidth: 280 }}
              >
                <Space style={{ 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  background: anonymous 
                    ? '#667eea' 
                    : '#f8f9fa',
                  border: anonymous ? '1px solid #5a6fd8' : '1px solid #dee2e6',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <motion.div
                    animate={{ 
                      color: anonymous ? '#ffffff' : '#495057',
                      scale: anonymous ? 1.02 : 1 
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <span style={{ 
                      fontSize: 15, 
                      fontWeight: anonymous ? 600 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {anonymous ? '🙈 ' : '🙉 '}
                      {anonymous ? t('匿名模式') : t('實名模式')}
                    </span>
                  </motion.div>
                  <Switch 
                    checked={anonymous} 
                    onChange={setAnonymous}
                    checkedChildren={t("匿名")}
                    unCheckedChildren={t("實名")}
                    style={{
                      background: anonymous ? '#ffffff20' : '#00000020'
                    }}
                  />
                </Space>
              </Tooltip>
            </Form.Item>
            <Form.Item 
              label={
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: 700, 
                  color: '#000',
                  letterSpacing: '0.5px'
                }}>
                  {t("姓名")}
                </span>
              }
              name="name"
              style={{ marginBottom: 48 }} // 固定預留空間
            >
              {anonymous ? (
                <Select
                  value={selectedAnonymousName}
                  onChange={setSelectedAnonymousName}
                  size="large"
                  style={{ 
                    borderRadius: "8px",
                  }}
                  placeholder={t("選擇您的神秘身份")}
                >
                  {anonymousNames.map(name => (
                    <Option key={name} value={name}>
                      <span style={{ fontWeight: 'bold', color: '#667eea' }}>
                        {name}
                      </span>
                    </Option>
                  ))}
                </Select>
              ) : (
                <Input 
                  placeholder={userProfile?.email?.split('@')[0] || t("您的姓名")}
                  value={userProfile?.email?.split('@')[0] || ""}
                  size="large"
                  style={{ 
                    borderRadius: "8px",
                    background: 'white',
                    borderColor: '#d9d9d9',
                    color: '#000'
                  }}
                  disabled // 自動填入，不允許修改
                />
              )}
              
              <motion.div
                animate={{ 
                  opacity: anonymous ? 1 : 0,
                  y: anonymous ? 0 : -10
                }}
                transition={{ duration: 0.3 }}
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: '#667eea10',
                  border: '1px solid #667eea30',
                  fontSize: '12px',
                  color: '#667eea',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  visibility: anonymous ? 'visible' : 'hidden', // 保持空間但隱藏內容
                  height: '32px' // 固定高度
                }}
              >
                <span>🎭</span>
                <span>{t("已選擇身份：")}{selectedAnonymousName}</span>
              </motion.div>
            </Form.Item>

            <Form.Item 
              label={
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: 700, 
                  color: '#000',
                  letterSpacing: '0.5px'
                }}>
                  {t("回饋類型")}
                </span>
              }
              name="feedbackType"
              rules={[{ required: true, message: t('請選擇回饋類型') }]}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                {feedbackTypes.map(type => (
                  <FeedbackTypeRadio
                    key={type.value}
                    option={type}
                    checked={selectedFeedbackType === type.value}
                    onClick={() => {
                      setSelectedFeedbackType(type.value);
                      form.setFieldsValue({ feedbackType: type.value });
                    }}
                  />
                ))}
              </div>
            </Form.Item>
            
            <Form.Item 
              label={
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: 700, 
                  color: '#000',
                  letterSpacing: '0.5px'
                }}>
                  {t("回饋內容")}
                </span>
              }
              name="feedback"
              rules={[{ required: true, message: t('請輸入您的回饋內容') }]}
            >
              <TextArea
                rows={6}
                placeholder={selectedFeedbackType ? getPlaceholderByType(selectedFeedbackType) : t("請先選擇回饋類型，我們會提供相應的建議範例 😊")}
                style={{ borderRadius: "8px" }}
              />
            </Form.Item>
            
            <Form.Item style={{ marginBottom: 0, textAlign: "center" }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                size="large"
                style={{ 
                  borderRadius: "8px",
                  height: "48px",
                  fontSize: "16px",
                  fontWeight: "500",
                  minWidth: "120px"
                }}
              >
                {loading ? t('提交中...') : t('提交回饋')}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </motion.div>

      {/* 回饋歷史列表 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        style={{ marginTop: '40px' }}
      >
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileTextOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{t("我的回饋記錄")}</span>
              {userFeedbacks.length > 0 && (
                <Tag color="blue">{t("{{count}} 筆記錄", { count: userFeedbacks.length })}</Tag>
              )}
            </div>
          }
          style={{ 
            borderRadius: "12px", 
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)" 
          }}
        >
          {feedbacksLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px', color: '#666' }}>{t("載入回饋記錄中...")}</div>
            </div>
          ) : userFeedbacks.length === 0 ? (
            <Empty
              description={t("尚無回饋記錄")}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '40px' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '600px', overflowY: 'auto', padding: '8px' }}>
              {userFeedbacks.map((feedback, index) => {
                const typeConfig = feedbackTypeMap[feedback.feedback_type] || { label: feedback.feedback_type, color: '#8c8c8c', icon: QuestionCircleOutlined };
                const hasReply = feedback.developer_reply && feedback.developer_reply.trim() !== '';
                const TypeIcon = typeConfig.icon;
                
                return (
                  <motion.div
                    key={feedback.feedback_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ 
                      scale: 1.01,
                      transition: { type: "spring", stiffness: 400, damping: 25 }
                    }}
                    style={{ margin: '0 4px' }}  // 給 hover 效果留出空間
                  >
                    <Card
                      size="small"
                      style={{
                        borderRadius: '12px',
                        border: hasReply ? '1px solid #b7eb8f' : '1px solid #f0f0f0',
                        background: hasReply ? '#f6ffed' : '#fafafa',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      bodyStyle={{ padding: '20px' }}
                      hoverable
                    >
                      {/* 狀態指示條 */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '4px',
                        height: '100%',
                        background: hasReply ? '#52c41a' : '#faad14'
                      }} />

                      {/* 標題列 */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start', 
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <Tag color="geekblue" style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>
                            #{feedback.feedback_id}
                          </Tag>
                          <Tag 
                            color={typeConfig.color}
                            style={{ margin: 0, borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            {TypeIcon && <TypeIcon style={{ fontSize: '14px', marginRight: 2 }} />}
                            {typeConfig.label}
                          </Tag>
                          {hasReply && (
                            <Tag color="success" style={{ margin: 0, borderRadius: '12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircleOutlined style={{ fontSize: '10px' }} />
                              {t("已處理")}
                            </Tag>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            {feedback.timestamp}
                          </div>
                        </div>
                      </div>

                      {/* 回饋內容 */}
                      <div style={{ marginBottom: hasReply ? '20px' : '12px' }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#333', 
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <CommentOutlined style={{ color: '#1890ff' }} />
                          {t("我的回饋")}
                        </div>
                        <div style={{
                          background: '#fff',
                          border: '1px solid #e8e8e8',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          fontSize: '14px',
                          lineHeight: '1.6',
                          color: '#333',
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word',
                          maxHeight: '120px',
                          overflowY: 'auto'
                        }}>
                          {feedback.feedback}
                        </div>
                      </div>

                      {/* 開發者回覆 */}
                      {hasReply ? (
                        <div>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: '600', 
                            color: '#52c41a', 
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            {t("開發團隊回覆")}
                          </div>
                          <div style={{
                            background: '#fff',
                            border: '1px solid #b7eb8f',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            color: '#333',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            maxHeight: '120px',
                            overflowY: 'auto',
                            position: 'relative'
                          }}>
                            <div style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              fontSize: '10px',
                              color: '#52c41a',
                              background: '#f6ffed',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid #b7eb8f'
                            }}>
                              {t("官方回覆")}
                            </div>
                            <div style={{ paddingRight: '60px' }}>
                              {feedback.developer_reply}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: '600', 
                            color: '#d46b08', 
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <ClockCircleOutlined style={{ color: '#d46b08' }} />
                            {t("等待回覆")}
                          </div>
                          <div style={{
                            background: '#fff7e6',
                            border: '1px solid #ffd591',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            fontSize: '13px',
                            color: '#d46b08',
                            fontStyle: 'italic',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}>
                            <EditOutlined style={{ marginRight: '4px', color: '#d46b08' }} />
                            {t("開發團隊正在認真處理您的回饋，請耐心等候...")}
                          </div>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
    </>
  );
};

export default UserFeedbackPage;
