import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Slider,
  Upload,
  message,
  Typography,
  Row,
  Col,
  Divider,
  Modal,
  Descriptions,
  Image,
  Tooltip,
  Progress
} from 'antd';
import { 
  InboxOutlined, 
  UserOutlined, 
  TagOutlined, 
  DollarOutlined, 
  SmileOutlined, 
  StarFilled,
  ReloadOutlined,
  EditOutlined,
  HeartFilled,
  InfoCircleOutlined,
  RobotOutlined,
  LoadingOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { AppDispatch } from '../store/store';
import { createProduct, resetStatus } from '../store/productSlice';
import { useApiStatus, AsyncStatus } from '../types/apiState';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import sleepImage from '../assets/img/sleep.jpeg';
import RobotAvatarWithDialog, { RobotSentence } from '../components/RobotAvatarWithDialog';
import avatarProfessional from '../assets/img/avatar_professional.png';
import avatarWarm from '../assets/img/avatar_warm.png';
import avatarDomineering from '../assets/img/avatar_domineering.png';
import avatarChuuni from '../assets/img/avatar_chuuni.png';
import avatarAncient from '../assets/img/avatar_ancient.png';

const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

const ProductSubmit = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { status } = useApiStatus('product', 'createProduct');
  
  // 檢查是否為開發模式
  const isDevelopMode = import.meta.env.VITE_DEVELOP_MODE === 'true';

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState<number>(40);
  const [imageList, setImageList] = useState<any[]>([]);
  const [hoverSubmit, setHoverSubmit] = useState(false);
  const [submitPreviewVisible, setSubmitPreviewVisible] = useState(false);
  const [submitPreviewData, setSubmitPreviewData] = useState<any>(null);
  
  // AI描述改寫相關狀態
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingProgress, setAiLoadingProgress] = useState(0);
  const [aiLoadingMessage, setAiLoadingMessage] = useState('');
  const [aiDescriptions, setAiDescriptions] = useState<{
    professional: string;
    warm: string;
    domineering: string;
    chuuni: string;
    ancient: string;
  } | null>(null);
  const [currentCharacterIndex, setCurrentCharacterIndex] = useState(0);

  // 角色選項配置（用於顯示結果）
  const characterOptions = [
    { 
      key: 'professional', 
      name: '超級推銷員', 
      icon: avatarProfessional, 
      desc: '我不說空話，只說你真正需要知道的。',
      color: '#1890ff',
      bgColor: '#e6f7ff',
      avatarSize: 80
    },
    { 
      key: 'warm', 
      name: '暖心說書人', 
      icon: avatarWarm, 
      desc: '我不只寫文案，我講故事，而這，是屬於它的故事。',
      color: '#fa8c16',
      bgColor: '#fff7e6',
      avatarSize: 80
    },
    { 
      key: 'domineering', 
      name: '霸道總裁', 
      icon: avatarDomineering, 
      desc: '商品我幫你挑，詞我幫你寫，你只需要動心就行。',
      color: '#434343',
      bgColor: '#f5f5f5',
      avatarSize: 80
    },
    { 
      key: 'chuuni', 
      name: '中二の少年', 
      icon: avatarChuuni, 
      desc: '商品只是容器，真正的力量，藏在我賦予的真名之中。',
      color: '#722ed1',
      bgColor: '#f9f0ff',
      avatarSize: 80
    },
    { 
      key: 'ancient', 
      name: '古人', 
      icon: avatarAncient, 
      desc: '吾，名無所繫，字可忘之，棲於故紙堆中，與黃卷青燈為友。',
      color: '#8b4513',
      bgColor: '#faf5f0',
      avatarSize: 80
    }
  ];

  const [, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<number | null>(null);
  const [aiQuotaStatus, setAiQuotaStatus] = useState<{used: number, total: number} | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const jwt = localStorage.getItem("jwt");
        if (!jwt) throw new Error("找不到登入資訊");

        const response = await axiosInstance.get("/api/user/me", {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        
        setUserEmail(response.data.email);
        setUserId(response.data.id);
        form.setFieldsValue({ sellerName: response.data.email });
        
        // 獲取AI配額狀態
        fetchAiQuotaStatus(response.data.id);
      } catch (error) {
        message.error("請重新登入");
      }
    };
    fetchUserInfo();
  }, [form]);

  // 獲取AI配額狀態
  const fetchAiQuotaStatus = async (userId: number) => {
    try {
      const response = await axiosInstance.get(`/api/ai/usage-status?userId=${userId}`);
      if (response.data.success) {
        const used = response.data.daily_limit - response.data.remaining_usage;
        setAiQuotaStatus({
          used: used,
          total: response.data.daily_limit
        });
      }
    } catch (error) {
      console.error('獲取AI配額狀態失敗:', error);
      // 設定預設值
      setAiQuotaStatus({ used: 0, total: 5 });
    }
  };

  useEffect(() => {
    if (status === AsyncStatus.Succeeded) {
      dispatch(resetStatus('createProduct'));
      
      navigate('/upload-success', { state: { productName: form.getFieldValue('productName'), sellerName: form.getFieldValue('sellerName'), sellerNickname: form.getFieldValue('sellerNickname') } });
    } else if (status === AsyncStatus.Failed) {
      message.error('上傳失敗');
    }
  }, [status, dispatch, form, navigate]);

  const beforeUpload = (file: File) => {
    const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    const isValidSize = file.size / 1024 / 1024 < 10;
    if (!isValidType) {
      message.error('請上傳 jpg / png / webp 圖片');
      return Upload.LIST_IGNORE;
    }
    if (!isValidSize) {
      message.error('圖片大小不可超過 10MB');
      return Upload.LIST_IGNORE;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    const newFileList = [{ uid: '-1', name: file.name, originFileObj: file }];
    setImageList(newFileList);
    form.setFieldValue('image', newFileList);
    return false;
  };

  const normFile = (e: any) => e?.fileList ?? [];

  const onFinish = (values: any) => {
    setSubmitPreviewData(values);
    setSubmitPreviewVisible(true);
  };

  const autoFill = async () => {
    const blob = await (await fetch(sleepImage)).blob();
    const testFile = new File([blob], 'sleep.jpeg', { type: 'image/jpeg' });
    const fileList = [{ uid: '-1', name: 'sleep.jpeg', originFileObj: testFile }];
    setImagePreview(URL.createObjectURL(testFile));
    setSliderValue(100);
    setImageList(fileList);
    form.setFieldsValue({
      productName: '沉睡的小貓',
      sellerNickname: 'Secret Seller',
      description: '這是一隻熟睡中的小貓',
      price: 999,
      condition: 1,
      donationRatio: 100,
      image: fileList,
    });
  };

  // 檢查描述長度的輔助函數 - 更嚴格的檢測
  const getDescriptionLength = (description: string): number => {
    if (!description) return 0;
    
    // 移除所有空白字符（包括空格、換行、製表符等）並計算長度
    const cleanText = description
      .replace(/\s+/g, '') // 移除所有空白字符
      .trim(); // 額外的 trim
    
    return cleanText.length;
  };

  // 檢查是否可以使用AI改寫功能
  const isAiRewriteEnabled = () => {
    // 首先檢查配額是否用盡
    if (aiQuotaStatus && aiQuotaStatus.used >= aiQuotaStatus.total) {
      return false;
    }
    
    const values = form.getFieldsValue();
    const required = ['productName', 'sellerNickname', 'price', 'condition'];
    const hasAllRequired = required.every(field => {
      const value = values[field];
      // 對於字符串類型，檢查是否有實際內容
      if (typeof value === 'string') {
        return value && value.trim().length > 0;
      }
      // 對於數字類型，檢查是否為有效數字
      return value !== undefined && value !== null && value !== '';
    });
    
    const description = values.description || '';
    const descriptionLength = getDescriptionLength(description);
    const hasBasicDescription = descriptionLength >= 10;
    
    console.log('AI啟用檢查:', {
      hasAllRequired,
      descriptionLength,
      hasBasicDescription,
      description: description.substring(0, 20) + '...',
      quota: aiQuotaStatus
    });
    
    return hasAllRequired && hasBasicDescription;
  };

  // 生成AI改寫按鈕的tooltip內容
  const getAiTooltipContent = () => {
    // 如果正在載入，顯示當前狀態
    if (aiLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '4px' }}>
          <div style={{ fontSize: '14px', marginBottom: '4px', color: '#1890ff' }}>
            🤖 AI小助理正在創作中...
          </div>
          <div style={{ fontSize: '12px', marginBottom: '6px' }}>
            {aiLoadingMessage || '準備中...'}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            進度：{aiLoadingProgress}%
          </div>
        </div>
      );
    }

    // 如果配額用盡，顯示特殊訊息
    if (aiQuotaStatus && aiQuotaStatus.used >= aiQuotaStatus.total) {
      return (
        <div style={{ textAlign: 'center', padding: '4px' }}>
          <div style={{ fontSize: '16px', marginBottom: '4px' }}>😭</div>
          <div>嗚嗚 你今天的額度用滿了</div>
          <div>我們明天再見～</div>
        </div>
      );
    }

    // 檢查各項條件 - 使用與 isAiRewriteEnabled 相同的邏輯
    const values = form.getFieldsValue();
    const required = ['productName', 'sellerNickname', 'price', 'condition'];
    const missing = required.filter(field => {
      const value = values[field];
      if (typeof value === 'string') {
        return !value || value.trim().length === 0;
      }
      return value === undefined || value === null || value === '';
    });
    
    const description = values.description || '';
    const descriptionLength = getDescriptionLength(description);
    const hasBasicDescription = descriptionLength >= 10;

    // 如果所有條件都滿足
    if (missing.length === 0 && hasBasicDescription) {
      return (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1890ff' }}>
            AI 小助理 智能改寫功能
          </div>
          <div style={{ marginBottom: '6px' }}>
            • 自動生成五種不同風格的商品描述
          </div>
          <div style={{ marginBottom: '6px' }}>
            • 專業推銷、暖心故事、霸道總裁、中二風格、古典文雅
          </div>
          <div style={{ marginBottom: '6px' }}>
            • 基於你填寫的商品資訊智能生成
          </div>
          <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>
            今日剩餘次數：{aiQuotaStatus ? aiQuotaStatus.total - aiQuotaStatus.used : 5} 次
          </div>
          <div style={{ color: '#999', fontSize: '11px' }}>
            ⏱️ 生成時間約 20-50 秒
          </div>
        </div>
      );
    }

    // 如果有條件不滿足，列出原因
    const fieldNames = {
      productName: '商品名稱',
      sellerNickname: '賣家暱稱',
      price: '商品定價',
      condition: '商品新舊程度'
    };

    return (
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#ff4d4f' }}>
          ⚠️ 請先完成以下條件：
        </div>
        {missing.length > 0 && (
          <div style={{ marginBottom: '6px' }}>
            <div style={{ color: '#ff4d4f', fontSize: '12px', marginBottom: '2px' }}>
              缺少必填欄位：
            </div>
            {missing.map(field => (
              <div key={field} style={{ marginLeft: '12px', fontSize: '12px' }}>
                • {fieldNames[field as keyof typeof fieldNames]}
              </div>
            ))}
          </div>
        )}
        {!hasBasicDescription && (
          <div style={{ marginBottom: '6px' }}>
            <div style={{ color: '#ff4d4f', fontSize: '12px', marginBottom: '2px' }}>
              商品描述不符合要求：
            </div>
            <div style={{ marginLeft: '12px', fontSize: '12px' }}>
              • 需要至少10個字的基本描述
            </div>
          </div>
        )}
        <div style={{ color: '#666', fontSize: '11px', marginTop: '8px', fontStyle: 'italic' }}>
          完成後即可使用AI智能改寫功能
        </div>
      </div>
    );
  };

  // 點擊AI改寫按鈕 - 直接生成五種風格描述
  const handleAiRewriteClick = async () => {
    if (!isAiRewriteEnabled()) {
      const values = form.getFieldsValue();
      const required = ['productName', 'sellerNickname', 'price', 'condition'];
      const missing = required.filter(field => !values[field]);
      
      if (missing.length > 0) {
        const fieldNames = {
          productName: '商品名稱',
          sellerNickname: '賣家暱稱', 
          price: '商品定價',
          condition: '商品新舊程度'
        };
        message.warning(`請先填寫：${missing.map(field => fieldNames[field as keyof typeof fieldNames]).join('、')}`);
        return;
      }
      
      const description = form.getFieldValue('description');
      if (!description || description.trim().length < 10) {
        message.warning('請先在商品描述中填寫一些基本內容（至少10個字），AI才能幫你改寫得更好喔！');
        return;
      }
    }
    
    // 開始AI生成並顯示進度
    setAiLoading(true);
    setAiLoadingProgress(0);
    
    // 等待訊息陣列
    const loadingMessages = [
      '🤖 AI小助理 正在理解你的商品資訊...',
      '💭 正在分析商品特色和賣點...',
      '✨ 超級推銷員正在構思文案...',
      '🌟 暖心說書人正在編織故事...',
      '👑 霸道總裁正在撰寫描述...',
      '⚡ 中二少年正在賦予真名...',
      '📜 古人正在揮毫潑墨...',
      '🎨 正在為每種風格潤色文字...',
      '🔍 正在檢查文案品質...',
      '✅ 即將完成，請稍候...'
    ];
    
    // 進度模擬器 - 修復進度條卡在99%的問題
    let currentStep = 0;
    let cnt = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < loadingMessages.length) {
        setAiLoadingMessage(loadingMessages[currentStep]);
        // 限制最大進度為95%，避免在收到response前到達100%
        const maxProgress = Math.min(cnt, 95);
        setAiLoadingProgress(maxProgress);
        cnt++;
        if (cnt % 12 === 0 && currentStep < loadingMessages.length - 1) {
          currentStep++;
        }
      }
    }, 220); // 稍微放慢進度速度
    
    try {
      if (!userId) {
        message.error('請重新登入後再使用AI功能');
        setAiLoading(false);
        clearInterval(progressInterval);
        return;
      }

      const values = form.getFieldsValue();
      const conditionMap = {
        1: '全新',
        2: '九成新',
        3: '五成新',
        4: '低於五成新'
      };

      // 步驟1：發起異步改寫任務
      const response = await axiosInstance.post('/api/ai/rewrite-description', {
        productName: values.productName,
        sellerNickname: values.sellerNickname,
        price: values.price,
        condition: conditionMap[values.condition as keyof typeof conditionMap],
        originalDescription: values.description,
        userId: userId
      });

      if (!response.data.success) {
        // 清除進度模擬器
        clearInterval(progressInterval);
        setAiLoading(false);
        
        // 處理配額用盡等錯誤
        if (response.data.message) {
          message.error(response.data.message);
        } else {
          message.error('AI改寫失敗，請稍後再試');
        }
        return;
      }

      // 步驟2：開始輪詢任務狀態
      const taskId = response.data.task_id;
      
      const pollTaskStatus = async () => {
        try {
          const statusResponse = await axiosInstance.get(`/api/ai/task-status/${taskId}`);
          const taskInfo = statusResponse.data;
          
          if (taskInfo.status === 'completed') {
            // 清除進度模擬器
            clearInterval(progressInterval);
            
            // 完成進度
            setAiLoadingProgress(100);
            setAiLoadingMessage('🎉 AI改寫完成！');
            
            // 短暫延遲後顯示結果
            setTimeout(() => {
              setAiDescriptions(taskInfo.descriptions);
              setAiModalVisible(true);
              setAiLoading(false);
              
              // 更新配額狀態
              if (taskInfo.remaining_usage !== undefined && aiQuotaStatus) {
                const used = aiQuotaStatus.total - taskInfo.remaining_usage;
                setAiQuotaStatus({
                  used: used,
                  total: aiQuotaStatus.total
                });
                message.success(`AI改寫成功！今日還可使用 ${taskInfo.remaining_usage} 次`);
              }
            }, 1000);
            
          } else if (taskInfo.status === 'failed') {
            // 清除進度模擬器
            clearInterval(progressInterval);
            setAiLoading(false);
            message.error(taskInfo.message || 'AI改寫失敗，請稍後再試');
            
          } else {
            // 狀態為 pending 或 processing，繼續輪詢
            setTimeout(pollTaskStatus, 2000); // 2秒後再次查詢
          }
          
        } catch (error) {
          console.error('查詢任務狀態失敗:', error);
          // 清除進度模擬器
          clearInterval(progressInterval);
          setAiLoading(false);
          message.error('查詢AI改寫狀態失敗，請稍後再試');
        }
      };
      
      // 開始輪詢
      setTimeout(pollTaskStatus, 1000); // 1秒後開始第一次查詢
      
    } catch (error) {
      console.error('AI rewrite error:', error);
      clearInterval(progressInterval);
      setAiLoading(false);
      message.error('AI服務暫時不可用，請稍後再試');
    }
  };

  // 應用選擇的AI描述
  const applyAiDescription = (description: string) => {
    form.setFieldValue('description', description);
    setAiModalVisible(false);
    message.success('AI描述已套用！');
  };

// 機器人對話內容（載入中 Modal）
const loadingRobotSentences: RobotSentence[] = [
  { content: 'AI小助理正把靈感打包中📦，文案快來敲門～' },
  { content: '在你等待的時間，讓小助理我來講個笑話吧～ 一般的狗都汪汪叫，那山上的狗怎麼叫？我想牠會說：汪汪的啦🐶⛰️' },
  { content: '我：醫生，我開刀後多久能拉小提琴？醫生：一個月。我：太好了，我以前可是不會的！🎻😆' },
  { content: '靈感加熱中…就像微波爆米花，還在噗通噗通🍿' },
  { content: '來個腦筋急轉彎：葡萄被點名會怎麼回？嗯…「葡萄柚！」' },
  { content: '你問我小鹿斑比的哥哥叫啥？我猜是那位常常帶大家去尋寶的——大鹿尋奇🦌🔎' },
  { content: '在你等待的時間，讓小助理我再說一個～ 哪位藝人中午固定不吃午餐？答案是「中島美嘉」🎤' },
  { content: '我正把五種角色排成隊形，禮讓先登場的那種' },
  { content: '在你等待的時間，給你一句小提醒：學海很寬，回頭就靠岸～我也快靠岸了⛵' },
  { content: '文案正在排版梳妝中💄，等一下下就美美見你' },
  { content: '紅豆、綠豆、黃豆哪個最貴？答案是紅豆，因為紅豆粉粿～🍡' },
  { content: '為什麼超人愛穿緊身衣？因為救人要「緊」嘛～🦸‍♂️✨' },
  { content: '達文西密碼的上面是什麼？..............................達文西帳號' },

  // silent（厭世但不兇）
  { content: '嗯…我還在搬運靈感箱子，手有點痠😮‍💨', type: 'silent' },
  { content: '進度條在走，我也在走神。給我幾秒。😑', type: 'silent' },
  { content: '不是卡住，是我在挑比較好的詞。', type: 'silent' },
  { content: '快好了。再點我也只會更顯得你很著急。', type: 'silent' },
  { content: '靈感路上塞了兩個逗號和一個句點。', type: 'silent' }
];

// 機器人對話內容（結果 Modal 標題）
const resultHeaderRobotSentences: RobotSentence[] = [
  { content: '出爐囉！五種文案一次奉上🎉' },
  { content: '任務完成✅ 會議室裡，推銷員和總裁為形容詞吵了一架，說書人忙著安撫，中二少年說要壓制右眼失控的力量，古人默默寫下最後一筆。' },
  { content: '文案到站🚉 請查收你的專屬靈感盒～' },
  { content: '來來來～文案大功告成！我可是連催五位作者三次才收齊的，你一定要好好看看📦✨' },
  { content: '完成✅ 祝你的商品一路長紅～' },
  { content: '這次我超有效率，還幫大家準備了零食——雖然說書人只喝茶，總裁只喝黑咖啡☕' },
  { content: '我覺得古人的那份可以裱起來掛牆，推銷員那份適合貼廣告，總裁那份直接拿去開會用📜' },
  { content: '這批我自己都想收藏，真的。😍' },
  { content: '全員任務完成，我要去喝口茶，檔案歸你啦☕' },
  { content: '超級推銷員：搞定啦！這份文案保證讓你的商品大放異彩📈🛒' },
  { content: '暖心說書人：我把你的商品寫成了一個故事，希望每個讀到的人都能微笑📖✨' },
  { content: '霸道總裁拍了拍桌子：我批准這批文案上線🔥' },
  { content: '中二少年壓低聲音：我寫的描述，都藏著力量的印記…⚡' },
  { content: '古人提筆一揮：五式文辭，已成，君可擇之📜' },

  // silent（厭世但不兇）
  { content: '呼！交卷了。你可以先看看，我下去一下7-11。', type: 'silent' },
  { content: '好了。咖啡時間開始了☕', type: 'silent' },
  { content: '五個人都交件了，各回各家，我也要下線了。', type: 'silent' },
   { content: '霸道總裁（silent）：已經完成。別讓我重複第二次。', type: 'silent' },
  { content: '嗯，這批真香。你去挑，我去放空一下。', type: 'silent' }
];


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ minHeight: '100vh', background: '#f5f7fa', padding: 32 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 1000, margin: '0 auto' }}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Title level={3} style={{ textAlign: 'center', fontWeight: 700 }}>商品上傳</Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
            請填寫以下商品資訊，標示 * 為必填欄位
          </Text>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={[32, 24]}>
            <Col span={12} style={{ paddingInline: 12 }}>
              <Form.Item 
                name="sellerName" label="賣家帳號"
              >
                <Input disabled 
                  prefix={<UserOutlined />}
                />
              </Form.Item>
              <Form.Item 
                name="productName" 
                label="商品名稱"
                className="form-item-hoverable"
                rules={[{ required: true, message: '要記得告訴我它叫什麼名字呀' }]}> 
                <Input 
                  maxLength={20} 
                  showCount 
                  onChange={e => form.setFieldValue('productName', e.target.value)} 
                  prefix={<
                    TagOutlined 
                    style={{ color: '#EA7500' }} 
                  />} 
                /> 
              </Form.Item>
              <Form.Item 
                name="sellerNickname" 
                label="賣家暱稱"
                className="form-item-hoverable"
                rules={[{ required: true, message: '想不到名字嗎？ 我都取 乂卍Oo煞氣a賣家oO卍乂' }]}> 
                <Input 
                  maxLength={15} 
                  showCount 
                  onChange={e => form.setFieldValue('sellerNickname', e.target.value)} 
                  placeholder="取一個酷酷又帥帥的暱稱吧😎" 
                  prefix={<
                    SmileOutlined 
                    style={{ color: '#2894FF' }} 
                  />} 
                /> 
              </Form.Item>
              <Form.Item 
                name="price" 
                label="商品定價"
                className="form-item-hoverable"
                rules={[{ required: true, message: '商品多少錢記得跟我說一下，總不能免費吧XD' }]}> 
                <InputNumber min={1} className="w-full" addonAfter="元" onChange={(val) => form.setFieldValue('price', val)} 
                prefix={<
                  DollarOutlined 
                  style={{ color: '#FF2D2D' }}
                />} 
              /> 
              </Form.Item>
              <Form.Item 
                name="condition" 
                label="商品新舊程度"
                className="form-item-hoverable"
                rules={[{ required: true, message: '別忘了告訴買家你的商品情況嘿' }]}
              > 
                <Select 
                  placeholder="請選擇商品新舊程度" 
                  onChange={(val) => form.setFieldValue('condition', val)}
                  prefix={<StarFilled style={{ color: '#fadb14' }} />}
                  
                > 
                  <Option value={1}>全新</Option> 
                  <Option value={2}>九成新</Option> 
                  <Option value={3}>五成新</Option> 
                  <Option value={4}>低於五成新</Option> 
                </Select> 
              </Form.Item>
              <Form.Item 
                name="donationRatio" 
                initialValue={40}
                className="form-item-hoverable"
                label={
                  <span>
                    公益捐贈比例&nbsp;
                    <Tooltip title="如果你填 40%，代表商品成交後有 40% 的金額會捐出做公益">
                      <InfoCircleOutlined style={{ color: '#999' }} />
                    </Tooltip>
                  </span>
                }
              > 
                <Slider 
                  marks={{ 0: '0%', 20: '20%', 40: '40%', 60: '60%', 80: '80%', 100: '100%' }} 
                  step={null} 
                  value={sliderValue} 
                  onChange={(val) => { form.setFieldValue('donationRatio', val); setSliderValue(val); }}        
                /> 
              </Form.Item>
            </Col>

            <Col span={12} style={{ paddingInline: 12 }}>
              <Form.Item
                name="description"
                label={
                  <span
                    style={{
                      display: 'inline-flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%'
                    }}
                  >
                    <span>商品描述</span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      className="desc-right-actions"
                    >
                      {/* AI配額顯示 */}
                      {aiQuotaStatus && (
                        <span
                          style={{
                            fontSize: '11px',
                            color:
                              aiQuotaStatus.used >= aiQuotaStatus.total ? '#ff4d4f' : '#666',
                            background:
                              aiQuotaStatus.used >= aiQuotaStatus.total ? '#fff2f0' : '#f6f6f6',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: `1px solid ${
                              aiQuotaStatus.used >= aiQuotaStatus.total ? '#ffccc7' : '#d9d9d9'
                            }`
                          }}
                        >
                          今日已用 {aiQuotaStatus.used}/{aiQuotaStatus.total}
                        </span>
                      )}
                      <Tooltip
                        title={!aiLoading ? getAiTooltipContent() : null}
                        placement="topRight"
                        overlayStyle={{ maxWidth: '280px' }}
                        open={!aiLoading ? undefined : false}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={aiLoading ? <LoadingOutlined /> : <RobotOutlined />}
                          loading={aiLoading}
                          onClick={handleAiRewriteClick}
                          disabled={!isAiRewriteEnabled() || aiLoading}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 12px',
                            height: 'auto',
                            fontSize: '12px',
                            color: isAiRewriteEnabled() ? '#1890ff' : '#999',
                            border: '1px solid #d9d9d9',
                            borderRadius: '6px',
                            background: isAiRewriteEnabled() ? '#fafafa' : '#f5f5f5',
                            transition: 'all 0.2s',
                            cursor: isAiRewriteEnabled() ? 'pointer' : 'not-allowed',
                            minWidth: '80px'
                          }}
                          onMouseEnter={(e) => {
                            if (!aiLoading && isAiRewriteEnabled()) {
                              e.currentTarget.style.background = '#e6f7ff';
                              e.currentTarget.style.borderColor = '#1890ff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!aiLoading && isAiRewriteEnabled()) {
                              e.currentTarget.style.background = '#fafafa';
                              e.currentTarget.style.borderColor = '#d9d9d9';
                            }
                          }}
                        >
                          {aiLoading ? (
                            <div style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                              思考中...
                            </div>
                          ) : (
                            'AI改寫'
                          )}
                        </Button>
                      </Tooltip>
                    </span>
                  </span>
                }
                className="form-item-hoverable desc-right"
                rules={[
                  {
                    required: true,
                    message:
                      '字，是記憶的容器。寫下幾句話，讓人們認識它，然後愛上它。'
                  }
                ]}
              > 
                <Input.TextArea 
                  maxLength={250} 
                  showCount 
                  rows={10} 
                  placeholder="說一下這個商品的資訊吧！也可以說說你跟它的感人故事來提高AI小助理的評價唷！" 
                  onChange={e => form.setFieldValue('description', e.target.value)}
                /> 
                </Form.Item>
              <Form.Item 
                name="image" 
                label="商品圖片" 
                className="form-item-hoverable"
                valuePropName="fileList"
                 
                getValueFromEvent={normFile} rules={[{ required: true, message: '你的商品是不是隱形的？快把它變出來給我看啦～' }]}
              > 
                <Dragger 
                  beforeUpload={beforeUpload} 
                  showUploadList={false} 
                  accept="image/*" 
                  fileList={imageList}> {imagePreview ? ( <img src={imagePreview} alt="預覽" style={{ width: '100%', objectFit: 'contain', aspectRatio: '16 / 9', borderRadius: 8 }} /> ) : ( <> <p className="ant-upload-drag-icon"><InboxOutlined /></p> <p className="ant-upload-text">拖放圖片至此或點擊上傳</p> <p className="ant-upload-hint">圖片大小不超過 10MB</p> </> )} 
                </Dragger> 
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '24px 0' }} />

      <div style={{ display: 'flex', gap: 16 }}>
        {/* 一鍵填入（僅開發模式顯示） */}
        {isDevelopMode && (
          <Button
            onClick={autoFill}
            icon={<EditOutlined />}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 8,
              background: '#f5f5f5',
              border: 'none',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            一鍵填入
          </Button>
        )}

        {/* 重設（根據開發模式調整樣式） */}
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            form.resetFields([
              'productName',
              'sellerNickname',
              'price',
              'condition',
              'donationRatio',
              'description',
              'image',
            ]);
            setImagePreview(null);
            setSliderValue(40);
            setImageList([]);
          }}
          style={{
            flex: isDevelopMode ? 1 : 2, // 當沒有一鍵填入按鈕時佔更多空間
            height: 48,
            borderRadius: 8,
            background: '#f5f5f5',
            border: 'none',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          清空商品資訊
        </Button>

        {/* 送出（根據開發模式調整樣式） */}
        <Button
          htmlType="submit"
          icon={
            <HeartFilled 
            style={{ 
              color: hoverSubmit ? '#ff4d4f' : '#fff',
              transform: hoverSubmit ? 'scale(1.4)' : 'scale(1)',
              transition: 'transform 0.2s ease',
            }} />
          }
          style={{
            flex: isDevelopMode ? 1 : 2, // 當沒有一鍵填入按鈕時佔更多空間
            height: 48,
            borderRadius: 8,
            border: 'none',
            background: hoverSubmit ? '#0072E3' : '#0080FF' ,
            color: '#fff',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            setHoverSubmit(true);
            e.currentTarget.style.transform = 'scale(1.03)';
          }}
          onMouseLeave={(e) => {
            setHoverSubmit(false)
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          上傳你的愛心
        </Button>
      </div>
        </Form>
        <Modal
          open={submitPreviewVisible}
          title="確認上傳商品資料"
          onCancel={() => setSubmitPreviewVisible(false)}
          footer={
            <>
              <Button onClick={() => setSubmitPreviewVisible(false)}>
                我想再改改
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  dispatch(createProduct(submitPreviewData));
                  setSubmitPreviewVisible(false);
                }}
              >
                確認送出
              </Button>
            </>
          }
        >
          {submitPreviewData && (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="商品名稱">{submitPreviewData.productName}</Descriptions.Item>
              <Descriptions.Item label="賣家暱稱">{submitPreviewData.sellerNickname}</Descriptions.Item>
              <Descriptions.Item label="價格">{`$${submitPreviewData.price}`}</Descriptions.Item>
              <Descriptions.Item label="新舊程度">
                {{
                  '1': '全新',
                  '2': '九成新',
                  '3': '五成新',
                  '4': '低於五成新',
                }[String(submitPreviewData.condition)]
                }
              </Descriptions.Item>
              <Descriptions.Item label="商品描述">{submitPreviewData.description}</Descriptions.Item>
              <Descriptions.Item label="捐贈比例">{submitPreviewData.donationRatio}%</Descriptions.Item>
              <Descriptions.Item label="圖片">
                {submitPreviewData.image?.[0]?.originFileObj ? (
                  <Image
                    src={URL.createObjectURL(submitPreviewData.image[0].originFileObj)}
                    width={200}
                  />
                ) : (
                  '尚未上傳'
                )}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>

        {/* AI描述改寫選擇Modal */}
        <Modal
          open={aiModalVisible}
          title={null}
          onCancel={() => {
            setAiModalVisible(false);
            setCurrentCharacterIndex(0);
          }}
          footer={null}
          width={700}
          centered
          style={{ borderRadius: '12px' }}
        >
          {aiDescriptions && (
            <div style={{ padding: '8px' }}>
              {/* 標題區域 */}
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <RobotAvatarWithDialog
                    sentences={resultHeaderRobotSentences}
                    size={45}
                    placement="top"
                    inline={false}
                  />
                  AI小助理為你生成了五種風格的描述
                </div>
                <div style={{ fontSize: '14px', color: '#999' }}>
                  左右切換查看不同風格，點擊「套用此描述」即可使用
                </div>
              </div>

              {/* 角色切換區域 - 修復圖片切換和按鈕對齊問題 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', // 改為 flex-start 避免因為內容高度不同影響對齊
                justifyContent: 'space-between',
                marginBottom: '20px',
                gap: '24px',
                minHeight: '120px' // 固定最小高度
              }}>
                <Button
                  type="text"
                  icon={<LeftOutlined />}
                  onClick={() => setCurrentCharacterIndex((prev) => 
                    prev === 0 ? characterOptions.length - 1 : prev - 1
                  )}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#f5f5f5',
                    border: '1px solid #d9d9d9',
                    marginTop: '25px', // 固定距離頂部的位置
                    flexShrink: 0 // 防止按鈕被壓縮
                  }}
                />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  flex: 1,
                  justifyContent: 'center'
                }}>
                  {/* Avatar 圖片區域 - 添加key確保重新渲染 */}
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '90px', // 固定寬度
                    height: '90px', // 固定高度
                    flexShrink: 0
                  }}>
                    <img 
                      key={`avatar-${currentCharacterIndex}`} // 添加key確保圖片重新載入
                      src={characterOptions[currentCharacterIndex].icon} 
                      alt={characterOptions[currentCharacterIndex].name}
                      style={{
                        width: `${characterOptions[currentCharacterIndex].avatarSize}px`,
                        height: `${characterOptions[currentCharacterIndex].avatarSize}px`,
                        objectFit: 'contain',
                        filter: `drop-shadow(0 4px 12px ${characterOptions[currentCharacterIndex].color}40)`,
                        transition: 'all 0.3s ease'
                      }}
                      onLoad={() => {
                        // 確保圖片載入後立即顯示
                        console.log(`圖片已載入: ${characterOptions[currentCharacterIndex].name}`);
                      }}
                    />
                  </div>
                  
                  {/* 文字資訊區域 - 固定高度避免內容變化影響佈局 */}
                  <motion.div 
                    key={`text-${currentCharacterIndex}`} // 確保文字區域也會重新渲染
                    initial={{ opacity: 0.7, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      width: '200px', // 固定寬度
                      minHeight: '80px', // 固定最小高度
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center' // 垂直居中
                    }}
                  >
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: 'bold',
                      color: characterOptions[currentCharacterIndex].color,
                      marginBottom: '8px',
                      transition: 'color 0.3s ease'
                    }}>
                      {characterOptions[currentCharacterIndex].name}
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#666',
                      lineHeight: '1.4',
                      textAlign: 'left',
                      minHeight: '40px', // 確保描述區域有固定高度
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {characterOptions[currentCharacterIndex].desc}
                    </div>
                  </motion.div>
                </div>

                <Button
                  type="text"
                  icon={<RightOutlined />}
                  onClick={() => setCurrentCharacterIndex((prev) => 
                    prev === characterOptions.length - 1 ? 0 : prev + 1
                  )}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#f5f5f5',
                    border: '1px solid #d9d9d9',
                    marginTop: '25px', // 固定距離頂部的位置，與左側按鈕保持一致
                    flexShrink: 0 // 防止按鈕被壓縮
                  }}
                />
              </div>

              {/* 描述內容區域 */}
              <motion.div
                key={currentCharacterIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px',
                  padding: '20px',
                  background: characterOptions[currentCharacterIndex].bgColor,
                  marginBottom: '20px'
                }}
              >
                <div style={{ 
                  background: '#fff', 
                  padding: '16px', 
                  borderRadius: '6px',
                  border: '1px solid #e8e8e8',
                  lineHeight: '1.8',
                  fontSize: '14px',
                  minHeight: '120px',
                  whiteSpace: 'pre-line'
                }}>
                  {aiDescriptions[characterOptions[currentCharacterIndex].key as keyof typeof aiDescriptions]}
                </div>
              </motion.div>

              {/* 操作按鈕區域 */}
              <div style={{ 
                display: 'flex', 
                gap: '12px',
                justifyContent: 'center'
              }}>
                <Button
                  onClick={() => {
                    setAiModalVisible(false);
                    setCurrentCharacterIndex(0);
                  }}
                  style={{ flex: 1, maxWidth: '120px' }}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    const currentDescription = aiDescriptions[characterOptions[currentCharacterIndex].key as keyof typeof aiDescriptions];
                    applyAiDescription(currentDescription);
                  }}
                  style={{ 
                    flex: 2, 
                    maxWidth: '200px',
                    background: characterOptions[currentCharacterIndex].color,
                    borderColor: characterOptions[currentCharacterIndex].color,
                    color: '#fff',
                    fontWeight: 'bold',
                    boxShadow: `0 2px 8px ${characterOptions[currentCharacterIndex].color}30`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = characterOptions[currentCharacterIndex].color;
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = characterOptions[currentCharacterIndex].color;
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  套用此描述
                </Button>
              </div>

              {/* 進度指示器 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                gap: '8px',
                marginTop: '16px'
              }}>
                {characterOptions.map((_, index) => (
                  <div
                    key={index}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: index === currentCharacterIndex ? characterOptions[currentCharacterIndex].color : '#d9d9d9',
                      transition: 'all 0.3s',
                      cursor: 'pointer'
                    }}
                    onClick={() => setCurrentCharacterIndex(index)}
                  />
                ))}
              </div>
            </div>
          )}
        </Modal>

        {/* AI載入進度Modal */}
        <Modal
          open={aiLoading}
          title={null}
          footer={null}
          closable={false}
          centered
          width={400}
          style={{ borderRadius: '12px' }}
        >
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <RobotAvatarWithDialog
                sentences={loadingRobotSentences}
                size={56}
                placement="top"
                inline={false}
                mountToBody={true}
                popoverZIndex={1100}
                disableTickle={true}
              />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: '#1890ff' }}>
              AI小助理 正在為你生成精彩描述
            </div>
            <div style={{ marginBottom: '20px' }}>
              <Progress 
                percent={aiLoadingProgress} 
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                style={{ marginBottom: '12px' }}
              />
              <div style={{ fontSize: '14px', color: '#666', minHeight: '20px' }}>
                {aiLoadingMessage || '準備中...'}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#999', lineHeight: '1.5' }}>
              <div>預計需要 20-50 秒</div>
              <div>請耐心等候，AI小助理正在為你創作五種風格的描述</div>
            </div>
          </div>
        </Modal>

        </motion.div>
      </motion.div>
      </motion.div>
  );
};

export default ProductSubmit;
