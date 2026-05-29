import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { updateMyProfile, uploadAvatar, getMyProfile } from "../../services/userService";
import { updateUserProfile } from "../../store/userSlice";
import { getUserAchievements, markAchievementNotificationShown, checkForNewAchievements } from "../../services/achievementService";
import { clearSessionNotificationCache } from "../../hooks/useAchievementChecker";
import { showAchievementNotification } from "../../components/AchievementNotification";
import axiosInstance from "../../utils/axiosInstance";
import {
  Button,
  Upload,
  Avatar,
  message,
  Typography,
  Modal,
  Slider,
  Space,
  Row,
  Col,
  Spin,
  Card,
  Progress,
  Image as AntImage,
  Select,
} from "antd";
import { UploadOutlined, UserOutlined, CheckOutlined, RobotOutlined, SettingOutlined, ShoppingCartOutlined, ClockCircleOutlined, CheckCircleOutlined, TrophyOutlined, PushpinOutlined, RocketOutlined, RiseOutlined, FallOutlined, HeartOutlined, CommentOutlined, EyeOutlined, SortAscendingOutlined } from "@ant-design/icons";
import AvatarEditor from "react-avatar-editor";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import EasterEggGame from "../../components/EasterEggGame";
import icHeartFace from "../../assets/img/ic_heart_face.svg";

// 導入成就圖片
import achive01 from "../../assets/img/achievement/achive_01.png";
import achive01Shadow from "../../assets/img/achievement/achive_01_shadow.png";
import achive02 from "../../assets/img/achievement/achive_02.png";
import achive02Shadow from "../../assets/img/achievement/achive_02_shadow.png";
import achive03 from "../../assets/img/achievement/achive_03.png";
import achive03Shadow from "../../assets/img/achievement/achive_03_shadow.png";
import achive04 from "../../assets/img/achievement/achive_04.png";
import achive04Shadow from "../../assets/img/achievement/achive_04_shadow.png";
import achive05 from "../../assets/img/achievement/achive_05.png";
import achive05Shadow from "../../assets/img/achievement/achive_05_shadow.png";
import achive06 from "../../assets/img/achievement/achive_06.png";
import achive06Shadow from "../../assets/img/achievement/achive_06_shadow.png";
import achive07 from "../../assets/img/achievement/achive_07.png";
import achive07Shadow from "../../assets/img/achievement/achive_07_shadow.png";
import achive08 from "../../assets/img/achievement/achive_08.png";
import achive08Shadow from "../../assets/img/achievement/achive_08_shadow.png";
import achive09 from "../../assets/img/achievement/achive_09.png";
import achive09Shadow from "../../assets/img/achievement/achive_09_shadow.png";
import achive10 from "../../assets/img/achievement/achive_10.png";
import achive10Shadow from "../../assets/img/achievement/achive_10_shadow.png";
import achive11 from "../../assets/img/achievement/achive_11.png";
import achive11Shadow from "../../assets/img/achievement/achive_11_shadow.png";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Paragraph, Text } = Typography;

// 成就系統定義
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  shadowIcon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

// 根據商品狀態獲取顏色配置
const getProductStatusColors = (status: string | number | null | undefined) => {
  switch (status) {
    case 0:
      return {
        background: 'linear-gradient(135deg, #fff7e6, #ffd591)',
        color: '#d46b08',
        border: '#ffec3d',
        shadow: 'rgba(255, 193, 7, 0.2)'
      };
    case 1:
      return {
        background: 'linear-gradient(135deg, #f6ffed, #b7eb8f)',
        color: '#389e0d',
        border: '#52c41a',
        shadow: 'rgba(82, 196, 26, 0.2)'
      };
    case 2:
      return {
        background: 'linear-gradient(135deg, #e6f7ff, #91d5ff)',
        color: '#0958d9',
        border: '#1890ff',
        shadow: 'rgba(24, 144, 255, 0.2)'
      };
    case 3:
    case 'unsold':
      return {
        background: 'linear-gradient(135deg, #fff2f0, #ffccc7)',
        color: '#cf1322',
        border: '#ff4d4f',
        shadow: 'rgba(255, 77, 79, 0.2)'
      };
    case 4:
    default:
      return {
        background: 'linear-gradient(135deg, #f5f5f5, #d9d9d9)',
        color: '#595959',
        border: '#bfbfbf',
        shadow: 'rgba(0, 0, 0, 0.1)'
      };
  }
};

// 排序方式整數到字串的映射
const sortOrderIntToString = (sortOrder: number | string | null | undefined): string | null => {
  if (typeof sortOrder === 'string') return sortOrder; // 向後兼容
  
  switch (sortOrder) {
    case 0: return 'id';
    case 1: return 'id_desc';
    case 2: return 'price_asc';
    case 3: return 'price_desc';
    case 4: return 'like_count_desc';
    case 5: return 'comment_count_desc';
    case 6: return 'view_count_desc';
    default: return null;
  }
};

// 根據排序方式獲取顏色配置
const getSortOrderColors = (sortOrder: string | number | null | undefined) => {
  const stringValue = typeof sortOrder === 'number' ? sortOrderIntToString(sortOrder) : sortOrder;
  
  switch (stringValue) {
    case 'id':
      return {
        background: 'linear-gradient(135deg, #e6f7ff, #91d5ff)',
        color: '#0958d9',
        border: '#1890ff',
        shadow: 'rgba(24, 144, 255, 0.2)'
      };
    case 'id_desc':
      return {
        background: 'linear-gradient(135deg, #f6ffed, #b7eb8f)',
        color: '#389e0d',
        border: '#52c41a',
        shadow: 'rgba(82, 196, 26, 0.2)'
      };
    case 'price_asc':
      return {
        background: 'linear-gradient(135deg, #fff7e6, #ffd591)',
        color: '#d46b08',
        border: '#faad14',
        shadow: 'rgba(255, 193, 7, 0.2)'
      };
    case 'price_desc':
      return {
        background: 'linear-gradient(135deg, #fff2f0, #ffccc7)',
        color: '#cf1322',
        border: '#f5222d',
        shadow: 'rgba(245, 34, 45, 0.2)'
      };
    case 'like_count_desc':
      return {
        background: 'linear-gradient(135deg, #f9f0ff, #efdbff)',
        color: '#722ed1',
        border: '#eb2f96',
        shadow: 'rgba(235, 47, 150, 0.2)'
      };
    case 'comment_count_desc':
      return {
        background: 'linear-gradient(135deg, #f3e5f5, #e1bee7)',
        color: '#7b1fa2',
        border: '#ce93d8',
        shadow: 'rgba(156, 39, 176, 0.2)'
      };
    case 'view_count_desc':
      return {
        background: 'linear-gradient(135deg, #e6fffb, #87e8de)',
        color: '#006d75',
        border: '#13c2c2',
        shadow: 'rgba(19, 194, 194, 0.2)'
      };
    default:
      return {
        background: 'linear-gradient(135deg, #f5f5f5, #d9d9d9)',
        color: '#595959',
        border: '#bfbfbf',
        shadow: 'rgba(0, 0, 0, 0.1)'
      };
  }
};

// 成就列表定義
const achievementDefinitions = [
  {
    id: 'first_upload',
    name: i18n.t('等等！我還沒上傳啊'),
    description: i18n.t('完成 1 次的商品上傳'),
    icon: achive01,
    shadowIcon: achive01Shadow,
    defaultTarget: 1
  },
  {
    id: 'first_purchase_request',
    name: 'Shut Up And Take My Money',
    description: i18n.t('送出一次商品購買請求'),
    icon: achive02,
    shadowIcon: achive02Shadow,
    defaultTarget: 1
  },
  {
    id: 'profile_change',
    name: i18n.t('換臉一新'),
    description: i18n.t('成功更換過一次大頭貼'),
    icon: achive03,
    shadowIcon: achive03Shadow,
    defaultTarget: 1
  },
  {
    id: 'first_purchase',
    name: i18n.t('BuyGood便當'),
    description: i18n.t('成功購買一件商品'),
    icon: achive04,
    shadowIcon: achive04Shadow,
    defaultTarget: 1
  },
  {
    id: 'good_karma',
    name: i18n.t('我積善意'),
    description: i18n.t('上傳 3 件捐贈比例達 60% 商品 或 購買 1 樣有善意循環光球的商品'),
    icon: achive05,
    shadowIcon: achive05Shadow,
    defaultTarget: 1
  },
  {
    id: 'five_comments',
    name: i18n.t('五則天'),
    description: i18n.t('個人留言數達 5 則'),
    icon: achive06,
    shadowIcon: achive06Shadow,
    defaultTarget: 5
  },
  {
    id: 'seller_master',
    name: i18n.t('賣客阿Sir'),
    description: i18n.t('成功售出你持有的 3 樣商品'),
    icon: achive07,
    shadowIcon: achive07Shadow,
    defaultTarget: 3
  },
  {
    id: 'five_likes',
    name: i18n.t('五藏廟'),
    description: i18n.t('收藏商品達 5 項'),
    icon: achive08,
    shadowIcon: achive08Shadow,
    defaultTarget: 5
  },
  {
    id: 'feedback_master',
    name: i18n.t('饋咖'),
    description: i18n.t('到回饋信箱進行 2 次實名回饋'),
    icon: achive09,
    shadowIcon: achive09Shadow,
    defaultTarget: 2
  },
  {
    id: 'ai_annoying',
    name: i18n.t('AI小助理的煩人精'),
    description: i18n.t('40？'),
    icon: achive10,
    shadowIcon: achive10Shadow,
    defaultTarget: 40
  },
  {
    id: 'platinum_trophy',
    name: i18n.t('BidForGood公益市集白金獎盃'),
    description: i18n.t('全成就達成'),
    icon: achive11,
    shadowIcon: achive11Shadow,
    defaultTarget: 10
  }
];

// 成就祝賀詞映射
const achievementCongratulations: { [key: string]: string } = {
  'first_upload': i18n.t('上傳第一件商品！你這操作比達叔上車還快，連星爺都來不及吐槽你！'),
  'first_purchase_request': i18n.t('第一次送出購買請求！這聲『Shut Up And Take My Money!』喊得比夜市殺價大媽還有誠意！'),
  'profile_change': i18n.t('哎呀～你的臉已經更新完畢！果X爺爺和X油妹妹親手幫你換的，換完直接讓你再度有力量拯救世界！'),
  'first_purchase': i18n.t('你買到的商品都比我吃到的便當還多！看來你的購物魂早就超越了我的飯量～'),
  'good_karma': i18n.t('：「啊啊啊啊啊～我、我真的沒有想上傳那麼多啊！只是手滑了三次啦！！不過這樣應該能得到禰X子的讚賞吧？！我超怕的，可是我還是做到了～！！！」'),
  'five_comments': i18n.t('：「吾乃五則天也！汝在留言區已留五則文，氣度堪比朕臨朝批奏，字字皆是聖旨，眾人不得不服！」'),
  'seller_master': i18n.t('：「You have sold three items. Just like I once said—『I shall return.』而你，也證明了：買家會再回來！Soldier，幹得好！」'),
  'five_likes': i18n.t('廟公：「哎呦～有緣人啊，你已收藏五件寶物啦！這裡就是你的五藏廟，寶貝都放得妥妥的，神明都要幫你看顧著呢～保庇保庇！」'),
  'feedback_master': i18n.t('兩次回饋達成！謝謝你用真心回饋，把這份溫暖傳回給市集，我們都感受到了。'),
  'ai_annoying': i18n.t('你居然戳了小助理 40 次！他都快 PTSD了，結果還是忍不住誇你一句：『你真是全台最溫柔的煩人精』！'),
  'platinum_trophy': i18n.t('「全成就解鎖！你已經完整體驗了這個市集的一切。謝謝你參加本次 BidForGood 公益市集活動，你的每一步都讓善意放大並讓這個活動更有意義。=)」')
};

// 成就背景色彩映射
const achievementColors: { [key: string]: { primary: string; secondary: string; accent: string } } = {
  'first_upload': { 
    primary: '#e6f7ff', 
    secondary: '#bae7ff', 
    accent: '#1890ff' 
  }, // 藍色系
  'first_purchase_request': { 
    primary: '#fff7e6', 
    secondary: '#ffd591', 
    accent: '#fa8c16' 
  }, // 橙色系
  'profile_change': { 
    primary: '#f6ffed', 
    secondary: '#d9f7be', 
    accent: '#52c41a' 
  }, // 綠色系
  'first_purchase': { 
    primary: '#fff1f0', 
    secondary: '#ffccc7', 
    accent: '#f5222d' 
  }, // 紅色系
  'good_karma': { 
    primary: '#f9f0ff', 
    secondary: '#d3adf7', 
    accent: '#722ed1' 
  }, // 紫色系
  'five_comments': { 
    primary: '#feffe6', 
    secondary: '#eaff8f', 
    accent: '#a0d911' 
  }, // 黃綠色系
  'seller_master': { 
    primary: '#e6fffb', 
    secondary: '#87e8de', 
    accent: '#13c2c2' 
  }, // 青色系
  'five_likes': { 
    primary: '#fff0f6', 
    secondary: '#ffadd2', 
    accent: '#eb2f96' 
  }, // 粉色系
  'feedback_master': { 
    primary: '#f0f5ff', 
    secondary: '#adc6ff', 
    accent: '#2f54eb' 
  }, // 藍紫色系
  'ai_annoying': { 
    primary: '#fff2e8', 
    secondary: '#ffbb96', 
    accent: '#ff7a45' 
  }, // 橙色系
  'platinum_trophy': { 
    primary: '#fafafa', 
    secondary: '#d9d9d9', 
    accent: '#8c8c8c' 
  } // 灰色系 - 白金色
};

const mmStyleOptions = [
  { label: i18n.t("海水藍"), value: 0 },
  { label: i18n.t("天空藍"), value: 1 },
  { label: i18n.t("青草綠"), value: 2 },
  { label: i18n.t("活力黃"), value: 3 },
  { label: i18n.t("熱情紅"), value: 4 },
  { label: i18n.t("皇家紫"), value: 5 },
  { label: i18n.t("典雅黑"), value: 6 },
];

// 我們不需要額外的主題配置，直接使用 mmStyleOptions


// 自定義 Radio 按鈕樣式
const ThemeRadio = ({ option, checked, onClick, isOriginal }: { 
  option: any, 
  checked: boolean, 
  onClick: () => void,
  isOriginal?: boolean
}) => {
  const { t } = useTranslation();
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

  // 獲取原始標示的顏色（根據主題顏色決定）
  const getOriginalIndicatorColor = (themeColor: string) => {
    // 典雅黑使用淺色
    if (themeColor === '#444') {
      return '#888'; // 較淺的灰色
    }
    // 其他主題使用該主題的深色版本
    return getDarkerColor(themeColor);
  };

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
    
    {isOriginal && !checked && (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, delay: 0.1 }}
        style={{
          position: 'absolute',
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: getOriginalIndicatorColor(option.color),
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          padding: '3px 8px',
          borderRadius: '10px',
          zIndex: 10,
          border: '1px solid white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap'
        }}
      >
        {t("原始")}
      </motion.div>
    )}
    
    <motion.div
      style={{
        width: '40px',
        height: '40px',
        backgroundColor: option.color,
        borderRadius: '50%',
        marginBottom: '4px',
        border: isOriginal && !checked ? `3px solid ${getOriginalIndicatorColor(option.color)}` : '2px solid #fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
      animate={{
        scale: checked ? 1.1 : 1,
        boxShadow: checked ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
      }}
      transition={{ type: "spring", stiffness: 400 }}
    />
    <Text style={{ 
      fontSize: '12px', 
      color: checked ? getDarkerColor(option.color) : (isOriginal ? getOriginalIndicatorColor(option.color) : '#666'),
      fontWeight: checked || isOriginal ? 'bold' : 'normal'
    }}>
      {option.label}
    </Text>
  </motion.div>
);
}

// 善意循環成就的特殊進度顯示組件
const GoodKarmaProgressDisplay: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  const { t } = useTranslation();
  const [goodKarmaDetails, setGoodKarmaDetails] = useState<{
    sellerCount: number;
    buyerCount: number;
    sellerTarget: number;
    buyerTarget: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoodKarmaDetails = async () => {
      try {
        setLoading(true);
        // TODO: 未來可以呼叫專門的API獲取詳細進度
        // 現在先使用成就的實際進度數據
        const sellerTarget = 3;
        const buyerTarget = 1;
        const currentProgress = achievement.progress || 0;
        
        // 如果成就已解鎖，顯示達成狀態
        if (achievement.unlocked) {
          setGoodKarmaDetails({
            sellerCount: sellerTarget, // 顯示已達成
            buyerCount: buyerTarget,   // 顯示已達成
            sellerTarget,
            buyerTarget
          });
        } else {
          // 如果未解鎖，根據實際進度計算
          // 這裡需要更精確的進度分解邏輯
          // 暫時簡化處理：假設進度主要來自賣家路徑
          const sellerCount = Math.min(currentProgress, sellerTarget);
          const buyerCount = Math.max(0, currentProgress - sellerTarget);
          
          setGoodKarmaDetails({
            sellerCount: Math.max(0, sellerCount),
            buyerCount: Math.min(buyerCount, buyerTarget),
            sellerTarget,
            buyerTarget
          });
        }
      } catch (error) {
        console.error('獲取善意循環詳細進度失敗:', error);
        // 使用成就的基本進度作為fallback
        setGoodKarmaDetails({
          sellerCount: achievement.unlocked ? 3 : Math.min(achievement.progress || 0, 3),
          buyerCount: achievement.unlocked ? 1 : 0,
          sellerTarget: 3,
          buyerTarget: 1
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGoodKarmaDetails();
  }, [achievement]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin size="small" />
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>{t("載入進度詳情...")}</div>
      </div>
    );
  }

  if (!goodKarmaDetails) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
        {t("無法載入詳細進度")}
      </div>
    );
  }

  const { sellerCount, buyerCount, sellerTarget, buyerTarget } = goodKarmaDetails;
  const sellerCompleted = sellerCount >= sellerTarget;
  const buyerCompleted = buyerCount >= buyerTarget;
  const achievementUnlocked = sellerCompleted || buyerCompleted;

  return (
    <div>
      <div style={{ 
        marginBottom: '16px',
        fontSize: '14px',
        fontWeight: '500',
        textAlign: 'center',
        color: '#666'
      }}>
        {t("達成以下任一條件即可解鎖成就")}
      </div>

      {/* 條件1: 作為賣家 */}
      <div style={{ 
        marginBottom: '16px',
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: sellerCompleted ? '#f6ffed' : '#f8f9fa',
        border: `1px solid ${sellerCompleted ? '#b7eb8f' : '#dee2e6'}`
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          <span style={{ color: sellerCompleted ? '#52c41a' : '#666' }}>
            {t("🛒 作為賣家：上傳捐贈比例≥60%的商品")}
          </span>
          <span style={{ color: sellerCompleted ? '#52c41a' : '#1890ff' }}>
            {Math.min(sellerCount, sellerTarget)} / {sellerTarget}
          </span>
        </div>
        
        <Progress
          percent={Math.min((sellerCount / sellerTarget) * 100, 100)}
          strokeColor={sellerCompleted ? '#52c41a' : '#1890ff'}
          trailColor={sellerCompleted ? '#f6ffed' : '#f5f5f5'}
          showInfo={false}
          strokeWidth={8}
        />
        
        {sellerCompleted && (
          <div style={{ 
            marginTop: '6px', 
            fontSize: '12px', 
            color: '#52c41a',
            textAlign: 'center'
          }}>
            {t("✓ 條件達成！")}
          </div>
        )}
      </div>

      {/* 條件2: 作為買家 */}
      <div style={{ 
        marginBottom: '12px',
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: buyerCompleted ? '#f6ffed' : '#f8f9fa',
        border: `1px solid ${buyerCompleted ? '#b7eb8f' : '#dee2e6'}`
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          <span style={{ color: buyerCompleted ? '#52c41a' : '#666' }}>
            {t("💝 作為買家：購買捐贈比例≥60%的商品")}
          </span>
          <span style={{ color: buyerCompleted ? '#52c41a' : '#1890ff' }}>
            {Math.min(buyerCount, buyerTarget)} / {buyerTarget}
          </span>
        </div>
        
        <Progress
          percent={Math.min((buyerCount / buyerTarget) * 100, 100)}
          strokeColor={buyerCompleted ? '#52c41a' : '#1890ff'}
          trailColor={buyerCompleted ? '#f6ffed' : '#f5f5f5'}
          showInfo={false}
          strokeWidth={8}
        />
        
        {buyerCompleted && (
          <div style={{ 
            marginTop: '6px', 
            fontSize: '12px', 
            color: '#52c41a',
            textAlign: 'center'
          }}>
            {t("✓ 條件達成！")}
          </div>
        )}
      </div>

      {/* 總體狀態 */}
      <div style={{ 
        textAlign: 'center',
        fontSize: '12px',
        color: '#666',
        fontStyle: 'italic'
      }}>
        {achievementUnlocked ? t('🎉 成就已解鎖！') : t('繼續努力，即將解鎖！')}
      </div>
    </div>
  );
};

const UserProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const profile = useSelector((state: RootState) => state.user.profile);
  const [messageApi, contextHolder] = message.useMessage();

  const [uploading, setUploading] = useState(false);
  const [localAvatarFile, setLocalAvatarFile] = useState<File | null>(null);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null | undefined>(undefined);
  const [localStyle, setLocalStyle] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [, setPendingAvatarFile] = useState<File | null>(null);
  const hasAvatarChanged =
    localAvatarFile !== null || localAvatarUrl === null;
  const hasStyleChanged = localStyle !== profile?.mm_style;
  
  // 隨機選擇副標題
  const [showEditor, setShowEditor] = useState(false);
  const [scale, setScale] = useState(1.2);
  const editorRef = useRef<AvatarEditor>(null);
  const [uploadButtonLoading, setUploadButtonLoading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const [avatarResetting, setAvatarResetting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  // 僅供編輯器預覽用，避免在未套用前就更換畫面上的頭像
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [isEasterEggCardHovered, setIsEasterEggCardHovered] = useState(false);
  const [aiQuotaStatus, setAiQuotaStatus] = useState<{used: number, total: number, remaining: number} | null>(null);
  const [loadingAiQuota, setLoadingAiQuota] = useState(false);

  // 商品搜尋偏好設定
  const [defaultProductStatus, setDefaultProductStatus] = useState<number>(4); // 預設為沒選
  const [defaultSortOrder, setDefaultSortOrder] = useState<number>(1);         // 預設為新上架優先

  // 檢測商品搜尋偏好是否有變更
  const hasSearchPreferenceChanged = 
    defaultProductStatus !== (profile?.default_product_status ?? 4) ||
    defaultSortOrder !== (profile?.default_sort_order ?? 1);
  
  const hasChanges = hasAvatarChanged || hasStyleChanged || hasSearchPreferenceChanged;

  // 載入使用者偏好設定
  useEffect(() => {
    if (profile) {
      setDefaultProductStatus(profile.default_product_status ?? 4);
      setDefaultSortOrder(profile.default_sort_order ?? 1);
    }
  }, [profile]);

  // 固定的隨機副標題（只在組件初始化時設定一次）
  const [randomSubtitle] = useState(() => {
    const subtitles = [
      t("編輯個人資料，享受更順暢的使用體驗。"),
      t("更新你的資訊，讓我們更懂你。"),
      t("完善設定，讓平台更貼近你的需求。"),
      t("個人化選項，打造舒適的使用環境。"),
      t("這是屬於你的編碼，獨一無二的存在證明。"),
      t("別小看這頁，它封印著你的真名與命運。"),
      t("設定完成的那刻，你將覺醒真正的力量。"),
      t("在這裡，傳說中的主角誕生了。"),
      t("每一筆設定，都是你風格的延伸。"),
      t("讓資料不只是資料，而是故事的一部分。"),
      t("慢慢填寫，為自己留下一點軌跡。"),
      t("從這裡開始，打造一個只屬於你的角落。"),
    ];
    return subtitles[Math.floor(Math.random() * subtitles.length)];
  });

  // 成就系統狀態
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isAchievementModalVisible, setIsAchievementModalVisible] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  // 隱藏成就 Modal 的關閉按鈕
  useEffect(() => {
    if (isAchievementModalVisible) {
      const hideCloseButton = () => {
        const closeButtons = document.querySelectorAll('.achievement-modal-wrapper .ant-modal-close');
        closeButtons.forEach(button => {
          (button as HTMLElement).style.display = 'none';
        });
      };
      
      // 延遲執行，確保 Modal 已經渲染
      const timer = setTimeout(hideCloseButton, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isAchievementModalVisible]);

  // 檢查成就解鎖狀態
  const fetchAchievements = async () => {
    try {
      // 先快速載入現有的成就數據，不等待同步檢查
      const backendAchievements = await getUserAchievements();
      
      // 將後端數據與前端成就定義合併
      const achievementsWithStatus: Achievement[] = achievementDefinitions.map(def => {
        const backendData = backendAchievements.find(ba => ba.id === def.id);
        
        return {
          ...def,
          unlocked: backendData?.is_unlocked || false,
          unlockedAt: backendData?.unlocked_at || undefined,
          progress: backendData?.progress || 0,
          target: backendData?.target || def.defaultTarget || 1
        };
      });
      
      setAchievements(achievementsWithStatus);
      
      // 🔄 將成就進度同步檢查改為後台異步執行，不阻塞頁面顯示
      setTimeout(async () => {
        try {
          const response = await axiosInstance.post('/api/achievements/check');
          console.log('🔄 後台成就進度同步檢查完成:', response.data);
          
          // 重新獲取更新後的成就數據
          const updatedAchievements = await getUserAchievements();
          const updatedAchievementsWithStatus: Achievement[] = achievementDefinitions.map(def => {
            const backendData = updatedAchievements.find(ba => ba.id === def.id);
            
            return {
              ...def,
              unlocked: backendData?.is_unlocked || false,
              unlockedAt: backendData?.unlocked_at || undefined,
              progress: backendData?.progress || 0,
              target: backendData?.target || def.defaultTarget || 1
            };
          });
          
          setAchievements(updatedAchievementsWithStatus);
        } catch (syncError) {
          console.warn('⚠️ 後台成就進度同步失敗:', syncError);
        }
      }, 1000); // 延遲1秒後執行，讓頁面先完全加載
      
      // 🎯 進入 UserProfilePage 時，標記所有已解鎖成就為已通知
      const unlockedAchievements = backendAchievements.filter(achievement => 
        achievement.is_unlocked && !achievement.notification_shown
      );
      
      if (unlockedAchievements.length > 0) {
        console.log('📋 UserProfilePage: 發現未標記的已解鎖成就，正在標記為已通知:', 
          unlockedAchievements.map(a => a.id));
        
        // 並行標記所有未通知的已解鎖成就 - 這個操作也改為非阻塞
        Promise.all(unlockedAchievements.map(achievement => 
          markAchievementNotificationShown(achievement.id)
        )).then(() => {
          console.log('✅ UserProfilePage: 所有已解鎖成就已標記為已通知');
        }).catch(error => {
          console.error('❌ UserProfilePage: 標記成就通知失敗:', error);
        });
      }
    } catch (error) {
      console.error('載入成就數據失敗:', error);
      // 如果後端請求失敗，使用默認數據
      const defaultAchievements: Achievement[] = achievementDefinitions.map(def => ({
        ...def,
        unlocked: false,
        unlockedAt: undefined,
        progress: 0,
        target: def.defaultTarget || 1
      }));
      setAchievements(defaultAchievements);
    }
  };

  const handleAchievementClick = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setIsAchievementModalVisible(true);
  };

  const handleModalClose = () => {
    setIsAchievementModalVisible(false);
    setSelectedAchievement(null);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 優先加載用戶基本資料，提升頁面響應速度
        const data = await getMyProfile();
        dispatch(updateUserProfile(data));
        setLocalStyle(data.mm_style);
        
        // 基本資料加載完成後立即隱藏 loading，提升用戶體驗
        setLoading(false);
        
        // 以下操作改為非阻塞式加載，不影響頁面顯示
        Promise.all([
          // AI配額狀態可以延遲加載
          fetchAiQuotaStatus(data.id).catch(error => {
            console.warn('AI配額狀態加載失敗:', error);
          }),
          // 成就系統也可以延遲加載
          fetchAchievements().catch(error => {
            console.warn('成就系統加載失敗:', error);
          })
        ]);
        
      } catch (error) {
        messageApi.error(t("載入個人資料失敗"));
        setLoading(false);
      }
    };
    
    loadData();
  }, [dispatch]);

  // 獲取AI配額狀態
  const fetchAiQuotaStatus = async (userId: number) => {
    try {
      setLoadingAiQuota(true);
      const response = await axiosInstance.get(`/api/ai/usage-status?userId=${userId}`);
      if (response.data.success) {
        const used = response.data.daily_limit - response.data.remaining_usage;
        setAiQuotaStatus({
          used: used,
          total: response.data.daily_limit,
          remaining: response.data.remaining_usage
        });
      }
    } catch (error) {
      console.error('獲取AI配額狀態失敗:', error);
      // 設定預設值
      setAiQuotaStatus({ used: 0, total: 5, remaining: 5 });
    } finally {
      setLoadingAiQuota(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarRemoving(true);
    // 添加延遲來顯示動畫效果
    setTimeout(() => {
      setLocalAvatarFile(null);
      setLocalAvatarUrl(null);
      setAvatarRemoving(false);
    }, 150);
  };

  const handleCropAndSave = () => {
    if (editorRef.current) {
      // 開始旋轉動畫
      setAvatarUploading(true);
      
      try {
        // 取得透明背景的 canvas
        const canvas = editorRef.current.getImageScaledToCanvas();
        const width = canvas.width;
        const height = canvas.height;
  
        // 建立一個新 canvas，白色背景
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = width;
        finalCanvas.height = height;
        const ctx = finalCanvas.getContext("2d");
  
        if (ctx) {
          // 先畫白色背景
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, width, height);
          // 再畫上原始頭像
          ctx.drawImage(canvas, 0, 0);
  
          // 輸出成 blob，使用較高的品質
          finalCanvas.toBlob((blob) => {
            if (blob) {
              console.log('圖片處理成功:', {
                size: `${(blob.size / 1024).toFixed(2)}KB`,
                type: blob.type
              });
              
              const croppedFile = new File([blob], "avatar.png", { type: "image/png" });
              const previewUrl = URL.createObjectURL(blob);
              
              // 預載圖片，避免切換時才載入造成延遲
              const img = new Image();
              img.onload = () => {
                console.log('預覽圖片載入成功');
                const prevUrl = localAvatarUrl;
                setLocalAvatarFile(croppedFile);
                setLocalAvatarUrl(previewUrl);
                setPendingAvatarFile(null);
                setPendingPreviewUrl(null);
                setShowEditor(false);
                
                // 略等 250ms 讓旋轉完整呈現再結束
                setTimeout(() => {
                  setAvatarUploading(false);
                  if (prevUrl && prevUrl.startsWith('blob:')) {
                    try { URL.revokeObjectURL(prevUrl); } catch {}
                  }
                }, 250);
              };
              
              img.onerror = () => {
                console.error('預覽圖片載入失敗');
                messageApi.error(t('圖片處理失敗，請重試'));
                setAvatarUploading(false);
              };
              
              img.src = previewUrl;
            } else {
              console.error('無法生成圖片 blob');
              messageApi.error('圖片處理失敗，請重試');
              setAvatarUploading(false);
            }
          }, "image/png", 0.9); // 提高品質參數
        } else {
          console.error('無法取得 Canvas 2D context');
          messageApi.error('圖片處理失敗，請重試');
          setAvatarUploading(false);
        }
      } catch (error) {
        console.error('圖片處理過程中發生錯誤:', error);
        messageApi.error('圖片處理失敗，請重試');
        setAvatarUploading(false);
      }
    }
  };
  

  const handleSave = async () => {
    try {
      setUploading(true);
      let avatarUrl: string | null | undefined = profile?.avatar_url;

      if (localAvatarFile) {
        avatarUrl = await uploadAvatar(localAvatarFile);
      } else if (localAvatarUrl === null) {
        // 使用者手動移除頭像
        avatarUrl = null;
      }

      const updated = await updateMyProfile({
        avatar_url: avatarUrl,
        mm_style: localStyle,
        default_product_status: defaultProductStatus,
        default_sort_order: defaultSortOrder,
      });

      dispatch(updateUserProfile(updated));
      messageApi.success(t("資料更新成功"));

      // 如果頭像有變更，強制檢查 profile_change 成就
      if (hasAvatarChanged) {
        // 先從session快取中移除 profile_change，確保通知能顯示
        clearSessionNotificationCache('profile_change');
        
        // 延遲檢查成就，讓後端有時間處理
        setTimeout(async () => {
          try {
            // 特別檢查 profile_change 成就
            const newAchievements = await checkForNewAchievements();
            const profileChangeAchievement = newAchievements.find((a: any) => a.id === 'profile_change');
            
            if (profileChangeAchievement) {
              console.log('🎯 強制顯示 profile_change 成就通知');
              const achievementWithIcon = {
                ...profileChangeAchievement,
                icon: achive03 // profile_change 的圖標
              };
              showAchievementNotification(achievementWithIcon);
            }
            
            // 重新載入成就狀態顯示
            fetchAchievements();
          } catch (error) {
            console.error('❌ 強制檢查 profile_change 成就失敗:', error);
            // 即使失敗也要重新載入成就狀態
            fetchAchievements();
          }
        }, 1000);
      }

      // 清除 local 狀態
      setLocalAvatarFile(null);
      setLocalAvatarUrl(undefined);
    } catch {
      messageApi.error(t("更新失敗"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '40px 20px'
    }}>
      <style>
        {`
          @keyframes shine {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .achievement-modal-wrapper .ant-modal-close {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          .achievement-modal-wrapper .ant-modal-close-x {
            display: none !important;
          }
          .achievement-modal-wrapper button[aria-label="Close"] {
            display: none !important;
            visibility: hidden !important;
          }
          .achievement-modal-wrapper .ant-modal-content .ant-modal-close {
            display: none !important;
          }
        `}
      </style>
      {contextHolder}
      {/* 保留原始的標題區塊 */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 0.6
          }}
          whileHover={{ 
            scale: 1.2,
            rotate: 15,
            transition: { type: "spring", stiffness: 300 }
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
          <UserOutlined
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
            {t("我的資料設定")}
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
            {randomSubtitle}
          </Paragraph>
        </motion.div>
      </div>

      {loading ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: "center", padding: "40px 0" }}
        >
          <Spin size="large" />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.6, 
            delay: 0.6,
            type: "spring",
            stiffness: 100
          }}
          style={{ width: '100%', maxWidth: '800px' }}
        >
          <Card
            style={{
              width: '100%',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              padding: '0',
            }}
            bodyStyle={{ padding: '32px' }}
          >
            {/* 大頭貼設定區塊 */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: 0.8,
                type: "spring",
                stiffness: 120
              }}
              style={{ marginBottom: '32px' }}
            >
              <Title level={4} style={{ marginBottom: '16px' }}>
                {t("大頭貼設定")}
              </Title>
            
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: avatarRemoving || avatarResetting || avatarUploading ? 0.5 : 1, 
                    scale: avatarRemoving || avatarResetting || avatarUploading ? 0.9 : 1,
                    rotate: avatarRemoving || avatarResetting || avatarUploading ? 180 : 0
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.3,
                    type: "spring",
                    stiffness: 200
                  }}
                >
                  {(localAvatarUrl !== null ? (localAvatarUrl || profile?.avatar_url) : null) ? (
                    <Avatar
                      src={localAvatarUrl || profile?.avatar_url}
                      size={80}
                      style={{ 
                        border: '3px solid #f0f0f0',
                        boxShadow: '0 4px 12px rgba(24,144,255,0.2)'
                      }}
                    />
                  ) : (
                    <Avatar
                      size={80}
                      style={{
                        backgroundColor: "#1890ff",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: 32,
                        boxShadow: "0 4px 12px rgba(24,144,255,0.2)"
                      }}
                    >
                      {(profile?.email?.charAt(0) || "?").toUpperCase()}
                    </Avatar>
                  )}
                </motion.div>
                
                <div style={{ marginLeft: 24 }}>
                  <Space size={12}>
          <Upload
                      showUploadList={false}
                      beforeUpload={(file) => {
                        // 更寬鬆的檔案類型檢查，支援更多 PNG 變異格式
                        const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
                        const isPng = file.type === 'image/png' || file.type === 'image/x-png' || file.name.toLowerCase().endsWith('.png');
                        const isValidType = isJpeg || isPng;
                        
                        if (!isValidType) {
                          messageApi.error(t('只能上傳 JPG/PNG 格式的圖片！'));
                          console.error('不支援的檔案類型:', file.type, '檔案名:', file.name);
                          return false;
                        }
                        
                        const isLt4M = file.size / 1024 / 1024 < 4;
                        if (!isLt4M) {
                          messageApi.error(t('圖片大小必須小於 4MB！'));
                          return false;
                        }
                        
                        console.log('檔案上傳檢查通過:', {
                          name: file.name,
                          type: file.type,
                          size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
                        });
                        
                        setUploadButtonLoading(true);
                        setPendingAvatarFile(file);
            // 僅設定編輯器預覽，不立即更動畫面上的頭像
            setPendingPreviewUrl(URL.createObjectURL(file));
                        
                        // 模擬文件處理時間，然後顯示編輯器
                        setTimeout(() => {
                          setUploadButtonLoading(false);
                          setShowEditor(true);
                        }, 300);
                        
                        return false;
                      }}
                    >
                      <motion.div
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Button
                          icon={<UploadOutlined />}
                          type="text"
                          loading={uploadButtonLoading}
                          style={{
                            height: '38px',
                            padding: '0 16px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: 'rgba(24, 144, 255, 0.1)',
                            color: '#1890ff',
                            border: 'none',
                            outline: 'none',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!uploadButtonLoading) {
                              e.currentTarget.style.backgroundColor = 'rgba(24, 144, 255, 0.2)';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!uploadButtonLoading) {
                              e.currentTarget.style.backgroundColor = 'rgba(24, 144, 255, 0.1)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }
                          }}
                        >
                          <span>{uploadButtonLoading ? t('處理中...') : t('選擇圖片')}</span>
                        </Button>
                      </motion.div>
                    </Upload>

                    <motion.div
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Button
                        danger
                        type="text"
                        disabled={!localAvatarFile && !localAvatarUrl && !profile?.avatar_url}
                        onClick={handleRemoveAvatar}
                        style={{
                          height: '38px',
                          padding: '0 16px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          backgroundColor: !(!localAvatarFile && !localAvatarUrl && !profile?.avatar_url) 
                            ? 'rgba(255, 77, 79, 0.1)'
                            : '#f5f5f5',
                          color: !(!localAvatarFile && !localAvatarUrl && !profile?.avatar_url) 
                            ? '#ff4d4f' 
                            : 'rgba(0,0,0,0.25)',
                          border: 'none',
                          outline: 'none',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!(!localAvatarFile && !localAvatarUrl && !profile?.avatar_url)) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 77, 79, 0.2)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!(!localAvatarFile && !localAvatarUrl && !profile?.avatar_url)) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 77, 79, 0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        {t("移除頭像")}
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, width: 0 }}
                      animate={{ 
                        opacity: hasAvatarChanged ? 1 : 0,
                        scale: hasAvatarChanged ? 1 : 0.8,
                        width: hasAvatarChanged ? 'auto' : 0
                      }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0.8, 
                        width: 0 
                      }}
                      transition={{ 
                        duration: 0.3,
                        ease: "easeInOut"
                      }}
                      style={{ 
                        overflow: 'hidden',
                        marginLeft: 12,
                        minWidth: hasAvatarChanged ? 'auto' : 0
                      }}
                    >
                      <motion.div
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Button
                          type="text"
                          onClick={() => {
                            setAvatarResetting(true);
                            // 添加延遲來顯示動畫效果
                            setTimeout(() => {
                              setLocalAvatarFile(null);
                              setLocalAvatarUrl(undefined);
                              setAvatarResetting(false);
                            }, 150);
                          }}
                          style={{
                            height: '38px',
                            padding: '0 16px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            color: '#666',
                            border: 'none',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            opacity: hasAvatarChanged ? 1 : 0,
                            pointerEvents: hasAvatarChanged ? 'auto' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (hasAvatarChanged) {
                              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (hasAvatarChanged) {
                              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }
                          }}
                        >
                          {t("取消變更")}
                        </Button>
                      </motion.div>
                    </motion.div>
                  </Space>
                </div>
              </div>
            </Space>
          </motion.div>

          {/* Not MM 留言板主題設定 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
              duration: 0.5, 
              delay: 1.0,
              type: "spring",
              stiffness: 120
            }}
            style={{ marginBottom: '32px' }}
          >
            <Title level={4} style={{ marginBottom: '16px' }}>
              {t("Not MM 留言板主題")}
            </Title>
            
            <div style={{ 
              display: 'flex', 
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              {mmStyleOptions.map((option) => {
                // 根據 mmStyleOptions 建立顏色映射
                const colorMap: {[key: number]: string} = {
                  0: '#387ef5', // 海水藍
                  1: '#11c1f3', // 天空藍
                  2: '#33cd5f', // 青草綠
                  3: '#ffc900', // 活力黃
                  4: '#ef473a', // 熱情紅
                  5: '#7066AD', // 皇家紫
                  6: '#444',    // 典雅黑
                };
                
                const themeOption = {
                  value: option.value,
                  label: option.label,
                  color: colorMap[option.value]
                };
                
                const isCurrentSelection = localStyle === option.value;
                const isOriginalTheme = profile?.mm_style === option.value;
                const showOriginalIndicator = isOriginalTheme && hasStyleChanged && !isCurrentSelection;
                
                return (
                  <ThemeRadio
                    key={option.value}
                    option={themeOption}
                    checked={isCurrentSelection}
                    onClick={() => setLocalStyle(option.value)}
                    isOriginal={showOriginalIndicator}
                  />
                );
              })}
            </div>
          </motion.div>

          {/* 商品搜尋偏好設定區塊 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              delay: 1.1,
              type: "spring",
              stiffness: 120
            }}
            style={{ marginBottom: '32px', marginTop: '48px' }}
          >
            <Typography.Title level={4} style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
              <SettingOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              {t("商品搜尋偏好設定")}
            </Typography.Title>
            
            <Row gutter={[24, 24]}>
              <Col span={24} md={12}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: 1.2,
                    type: "spring",
                    stiffness: 200
                  }}
                  style={{ 
                    background: getProductStatusColors(defaultProductStatus === 4 ? undefined : defaultProductStatus).background,
                    padding: '20px',
                    borderRadius: '12px',
                    color: getProductStatusColors(defaultProductStatus === 4 ? undefined : defaultProductStatus).color,
                    border: `1px solid ${getProductStatusColors(defaultProductStatus === 4 ? undefined : defaultProductStatus).border}`,
                    boxShadow: `0 2px 8px ${getProductStatusColors(defaultProductStatus === 4 ? undefined : defaultProductStatus).shadow}`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                    <ShoppingCartOutlined style={{ marginRight: 8 }} />
                    {t("預設商品狀態篩選")}
                  </div>
                  <Select
                    style={{ 
                      width: '100%',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: `1px solid ${getProductStatusColors(defaultProductStatus === 4 ? undefined : defaultProductStatus).border}`,
                      borderRadius: '8px'
                    }}
                    variant="outlined"
                    placeholder={t("選擇預設狀態篩選")}
                    value={defaultProductStatus === 4 ? undefined : defaultProductStatus}
                    onChange={(value) => {
                      setDefaultProductStatus(value || 4);
                    }}
                    allowClear
                  >
                    <Select.Option value={0}>
                      <ClockCircleOutlined style={{ marginRight: '8px', color: '#faad14' }} />
                      {t("尚未到貨")}
                    </Select.Option>
                    <Select.Option value={1}>
                      <CheckCircleOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                      {t("已到貨")}
                    </Select.Option>
                    <Select.Option value={2}>
                      <TrophyOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                      {t("已成交")}
                    </Select.Option>
                    <Select.Option value={3}>
                      <ShoppingCartOutlined style={{ marginRight: '8px', color: '#ff4d4f' }} />
                      {t("尚未成交")}
                    </Select.Option>
                  </Select>
                </motion.div>
              </Col>
              
              <Col span={24} md={12}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: 1.3,
                    type: "spring",
                    stiffness: 200
                  }}
                  style={{ 
                    background: getSortOrderColors(defaultSortOrder).background,
                    padding: '20px',
                    borderRadius: '12px',
                    color: getSortOrderColors(defaultSortOrder).color,
                    border: `1px solid ${getSortOrderColors(defaultSortOrder).border}`,
                    boxShadow: `0 2px 8px ${getSortOrderColors(defaultSortOrder).shadow}`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                    <SortAscendingOutlined style={{ marginRight: 8 }} />
                    {t("預設排序方式")}
                  </div>
                  <Select
                    style={{ 
                      width: '100%',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: `1px solid ${getSortOrderColors(defaultSortOrder).border}`,
                      borderRadius: '8px'
                    }}
                    variant="outlined"
                    placeholder={t("選擇預設排序方式")}
                    value={defaultSortOrder}
                    dropdownStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)'
                    }}
                    onChange={(value) => {
                      setDefaultSortOrder(value);
                    }}
                  >
                    <Select.Option value={0}>
                      <PushpinOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                      {t("商品編號優先")}
                    </Select.Option>
                    <Select.Option value={1}>
                      <RocketOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                      {t("新上架優先")}
                    </Select.Option>
                    <Select.Option value={2}>
                      <RiseOutlined style={{ marginRight: '8px', color: '#faad14' }} />
                      {t("價格低到高")}
                    </Select.Option>
                    <Select.Option value={3}>
                      <FallOutlined style={{ marginRight: '8px', color: '#f5222d' }} />
                      {t("價格高到低")}
                    </Select.Option>
                    <Select.Option value={4}>
                      <HeartOutlined style={{ marginRight: '8px', color: '#eb2f96' }} />
                      {t("最多收藏")}
                    </Select.Option>
                    <Select.Option value={5}>
                      <CommentOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                      {t("討論度最高")}
                    </Select.Option>
                    <Select.Option value={6}>
                      <EyeOutlined style={{ marginRight: '8px', color: '#13c2c2' }} />
                      {t("最高點閱")}
                    </Select.Option>
                  </Select>
                </motion.div>
              </Col>
            </Row>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.3, 
                delay: 1.4
              }}
              style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: '#f6ffed', 
                borderRadius: '8px',
                border: '1px solid #b7eb8f'
              }}
            >
              <Typography.Text style={{ fontSize: '12px', color: '#52c41a' }}>
                {t("💡 設定後，進入商品列表頁面時會自動套用您的偏好設定")}
              </Typography.Text>
            </motion.div>
          </motion.div>

          {/* 用戶資訊顯示 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              delay: 1.5,
              type: "spring",
              stiffness: 120
            }}
            style={{ marginBottom: '32px' }}
          >
            <Title level={4} style={{ marginBottom: '16px' }}>
              {t("帳號資訊")}
            </Title>
            
            <Row gutter={[24, 24]}>
              {/* 第一個：使用者帳號 */}
              <Col span={24} md={12}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: 1.6,
                    type: "spring",
                    stiffness: 200
                  }}
                  style={{ 
                    background: 'linear-gradient(135deg, #4cd964, #5ee077)',
                    padding: '16px',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 8 }}>{t("使用者帳號")}</div>
                  <div style={{ fontSize: 18, fontWeight: "bold" }}>{profile?.email || t("未知")}</div>
                </motion.div>
              </Col>
              {/* 第二個：帳號建立時間 */}
              <Col span={24} md={12}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: 1.7,
                    type: "spring",
                    stiffness: 200
                  }}
                  style={{ 
                    background: 'linear-gradient(135deg, #5b7fff, #6e90ff)',
                    padding: '16px',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 8 }}>{t("帳號建立時間")}</div>
                  <div style={{ fontSize: 18, fontWeight: "bold" }}>
                    {profile?.created_at
                      ? dayjs.utc(profile.created_at).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss")
                      : t("未知")}
                  </div>
                </motion.div>
              </Col>
              {/* 第三個：AI改寫使用狀態 */}
              <Col span={24} md={12}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: 1.8,
                    type: "spring",
                    stiffness: 200
                  }}
                  style={{ 
                    background: aiQuotaStatus && aiQuotaStatus.used >= aiQuotaStatus.total 
                      ? 'linear-gradient(135deg, #ff9500, #ffad33)' 
                      : 'linear-gradient(135deg, #722ed1, #9254de)',
                    padding: '16px',
                    borderRadius: '12px',
                    color: 'white',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <RobotOutlined style={{ marginRight: 8, fontSize: 16 }} />
                    <span style={{ fontSize: 14 }}>{t("AI改寫使用狀態")}</span>
                  </div>
                  {loadingAiQuota ? (
                    <div style={{ fontSize: 16, fontWeight: "bold" }}>{t("載入中...")}</div>
                  ) : aiQuotaStatus ? (
                    <>
                      <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 4 }}>
                        {t("今日已使用 {{used}}/{{total}} 次", { used: aiQuotaStatus.used, total: aiQuotaStatus.total })}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>
                        {aiQuotaStatus.remaining > 0
                          ? t("還可使用 {{remaining}} 次", { remaining: aiQuotaStatus.remaining })
                          : t("今日配額已用完")}
                      </div>
                      {/* 進度條 */}
                      <div style={{
                        marginTop: 8,
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '10px',
                        height: '6px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          background: 'rgba(255,255,255,0.8)',
                          height: '100%',
                          width: `${(aiQuotaStatus.used / aiQuotaStatus.total) * 100}%`,
                          borderRadius: '10px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 16, fontWeight: "bold" }}>{t("無法載入")}</div>
                  )}
                </motion.div>
              </Col>
              {/* 第四個：彩蛋狀態 */}
              <Col span={24} md={12}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: 1.7,
                    type: "spring",
                    stiffness: 200
                  }}
                  whileHover={profile?.easter_egg ? { 
                    scale: 1.05,
                    transition: { type: "spring", stiffness: 300 }
                  } : {}}
                  whileTap={profile?.easter_egg ? { 
                    scale: 0.95,
                    transition: { duration: 0.1 }
                  } : {}}
                  style={{ 
                    background: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)',
                    padding: '16px',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: profile?.easter_egg ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => {
                    if (profile?.easter_egg) {
                      setShowEasterEgg(true);
                    }
                  }}
                  onMouseEnter={() => {
                    if (profile?.easter_egg) {
                      setIsEasterEggCardHovered(true);
                    }
                  }}
                  onMouseLeave={() => {
                    if (profile?.easter_egg) {
                      setIsEasterEggCardHovered(false);
                    }
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 8 }}>{t("彩蛋狀態")}</div>
                  <div style={{ fontSize: 18, fontWeight: "bold" }}>
                    {profile?.easter_egg ? t("已觸發 🎊") : t("尚未觸發")}
                  </div>
                  {profile?.easter_egg && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      {profile.easter_egg_triggered_time
                        ? dayjs.utc(profile.easter_egg_triggered_time).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss")
                        : t("未知")}
                    </div>
                  )}
                  {profile?.easter_egg && (
                    <div style={{ 
                      fontSize: 10, 
                      marginTop: 6, 
                      opacity: 0.8,
                      fontStyle: 'italic'
                    }}>
                      {t("點擊重溫彩蛋體驗")}
                    </div>
                  )}
                  
                  {/* 右下角愛心圖示 - 只在已觸發且 hover 時顯示 */}
                  {profile?.easter_egg && (
                    <motion.div
                      initial={{ 
                        opacity: 0, 
                        scale: 0,
                        rotate: -30 
                      }}
                      animate={{ 
                        opacity: isEasterEggCardHovered ? 0.8 : 0,
                        scale: isEasterEggCardHovered ? 1 : 0,
                        rotate: -30
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                        duration: 0.3
                      }}
                      style={{
                        position: 'absolute',
                        bottom: '-10px',
                        right: '-10px',
                        width: '50px',
                        height: '50px',
                        backgroundImage: `url(${icHeartFace})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        pointerEvents: 'none',
                        zIndex: 1
                      }}
                    />
                  )}
                </motion.div>
              </Col>
            </Row>
          </motion.div>

          {/* 我的成就區塊 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              delay: 1.5,
              type: "spring",
              stiffness: 120
            }}
            style={{ marginBottom: '32px' }}
          >
            <Title level={4} style={{ marginBottom: '16px' }}>
              {t("我的成就")}
            </Title>
            
            
            {/* 成就網格 */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'flex-start' }}>
              {/* 左側：普通成就區域 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 上排 5 個成就 */}
                <Row gutter={[16, 0]} justify="start">
                  {achievements.slice(0, 5).map((achievement) => (
                    <Col key={achievement.id}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                          transition: { 
                            duration: 0.3,
                            type: "spring",
                            stiffness: 200
                          }
                        }}
                        whileHover={{ 
                          scale: 1.1
                        }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 400, 
                          damping: 25
                        }}
                        style={{
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleAchievementClick(achievement)}
                      >
                        <div
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '12px',
                            border: achievement.unlocked ? '3px solid #bfbfbf' : '3px solid #d9d9d9',
                            background: achievement.unlocked ? '#fff' : '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          title={achievement.unlocked ? '' : achievement.description}
                        >
                          <img
                            src={achievement.unlocked ? achievement.icon : achievement.shadowIcon}
                            alt={achievement.unlocked ? achievement.name : ''}
                            style={{
                              width: '50px',
                              height: '50px',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                        {achievement.unlocked && (
                          <div
                            style={{
                              marginTop: '8px',
                              fontSize: '12px',
                              textAlign: 'center',
                              fontWeight: '500',
                              color: '#333',
                              width: '80px',
                              wordBreak: 'break-all'
                            }}
                          >
                            {achievement.name}
                          </div>
                        )}
                      </motion.div>
                    </Col>
                  ))}
                </Row>
                
                {/* 下排 5 個普通成就 */}
                <Row gutter={[16, 0]} justify="start">
                  {achievements.slice(5, 10).map((achievement) => (
                    <Col key={achievement.id}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                          transition: { 
                            duration: 0.3,
                            type: "spring",
                            stiffness: 200
                          }
                        }}
                        whileHover={{ 
                          scale: 1.1
                        }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 400, 
                          damping: 25
                        }}
                        style={{
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleAchievementClick(achievement)}
                      >
                        <div
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '12px',
                            border: achievement.unlocked ? '3px solid #bfbfbf' : '3px solid #d9d9d9',
                            background: achievement.unlocked ? '#fff' : '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          title={achievement.unlocked ? '' : achievement.description}
                        >
                          <img
                            src={achievement.unlocked ? achievement.icon : achievement.shadowIcon}
                            alt={achievement.unlocked ? achievement.name : ''}
                            style={{
                              width: '50px',
                              height: '50px',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                        {achievement.unlocked && (
                          <div
                            style={{
                              marginTop: '8px',
                              fontSize: '12px',
                              textAlign: 'center',
                              fontWeight: '500',
                              color: '#333',
                              width: '80px',
                              wordBreak: 'break-all'
                            }}
                          >
                            {achievement.name}
                          </div>
                        )}
                      </motion.div>
                    </Col>
                  ))}
                </Row>
              </div>
              
              {/* 右側：白金獎盃 - 跨越兩排高度，位於紅框位置 */}
              {achievements[10] && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  height: '176px', // 80px + 16px gap + 80px，確保跨越兩排
                  marginLeft: '16px' // 增加一些左邊距離
                }}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      transition: { 
                        duration: 0.3,
                        type: "spring",
                        stiffness: 200
                      }
                    }}
                    whileHover={{ 
                      scale: 1.05
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 400, 
                      damping: 25
                    }}
                    style={{
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleAchievementClick(achievements[10])}
                  >
                    <div
                      style={{
                        width: '200px', // 80px * 2.5
                        height: '200px', // 80px * 2.5
                        borderRadius: '20px',
                        border: achievements[10].unlocked ? '5px solid #bfbfbf' : '5px solid #d9d9d9',
                        background: achievements[10].unlocked 
                          ? '#fff' 
                          : '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: achievements[10].unlocked 
                          ? '0 8px 32px rgba(191, 191, 191, 0.3)' 
                          : 'none'
                      }}
                      title={achievements[10].unlocked ? '' : achievements[10].description}
                    >
                      <img
                        src={achievements[10].unlocked ? achievements[10].icon : achievements[10].shadowIcon}
                        alt={achievements[10].unlocked ? achievements[10].name : ''}
                        style={{
                          width: '125px', // 50px * 2.5
                          height: '125px',
                          objectFit: 'contain'
                        }}
                      />
                      {/* 特殊光效 */}
                      {achievements[10].unlocked && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            right: '0',
                            bottom: '0',
                            background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                            animation: 'shine 2s infinite',
                            borderRadius: '20px'
                          }}
                        />
                      )}
                    </div>
                    {achievements[10].unlocked && (
                      <div
                        style={{
                          marginTop: '12px',
                          fontSize: '16px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#333',
                          width: '200px',
                          wordBreak: 'break-all'
                        }}
                      >
                        {achievements[10].name}
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>

          {/* 儲存按鈕 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              delay: 1.8,
              type: "spring",
              stiffness: 120
            }}
            style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}
          >
            <motion.div
              whileTap={{ scale: 0.95 }}
              whileHover={{ 
                scale: hasChanges && !uploading ? 1.05 : 1,
                transition: { type: "spring", stiffness: 400, damping: 17 }
              }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button
                type="default"
                onClick={handleSave}
                disabled={uploading || !hasChanges}
                loading={uploading}
                size="large"
                style={{
                  height: 'auto',
                  padding: '14px 48px',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: '12px',
                  border: 'none',
                  outline: 'none',
                  background: hasChanges && !uploading 
                    ? '#f5f5f5' 
                    : '#f0f0f0',
                  color: hasChanges && !uploading ? '#333' : '#999',
                  boxShadow: hasChanges && !uploading 
                    ? '0 2px 8px rgba(0,0,0,0.1)' 
                    : '0 1px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease',
                  cursor: hasChanges && !uploading ? 'pointer' : 'not-allowed'
                }}
                onMouseEnter={(e) => {
                  if (hasChanges && !uploading) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1890ff, #40a9ff)';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(24,144,255,0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasChanges && !uploading) {
                    e.currentTarget.style.background = '#f5f5f5';
                    e.currentTarget.style.color = '#333';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }
                }}
              >
                {uploading ? t('儲存中...') : t('儲存設定')}
              </Button>
            </motion.div>
          </motion.div>
        </Card>
      </motion.div>
      )}

      <Modal
        open={showEditor}
        onCancel={() => {
          setShowEditor(false);
          setPendingAvatarFile(null); // 清掉暫存檔
          setPendingPreviewUrl(null); // 清掉預覽，避免未套用狀態下改變畫面
        }}
        onOk={handleCropAndSave}
        okText={t("套用頭像")}
        cancelText={t("取消")}
        destroyOnClose
        width={600}
        bodyStyle={{ padding: 32 }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Title level={4} style={{ marginBottom: 24, textAlign: "center" }}>{t("編輯頭像")}</Title>
      {(pendingPreviewUrl || localAvatarUrl || profile?.avatar_url) && (
            <div style={{ 
              boxShadow: "0 10px 20px rgba(0,0,0,0.1)", 
              borderRadius: 8, 
              padding: 8, 
              backgroundColor: "#fafafa",
              marginBottom: 24 
            }}>
              <AvatarEditor
                ref={editorRef}
        image={pendingPreviewUrl || localAvatarUrl || (profile?.avatar_url as string)}
                width={250}
                height={250}
                border={30}
                borderRadius={125}
                scale={scale}
                style={{ borderRadius: 8 }}
              />
            </div>
          )}
          <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "bold", fontSize: 16 }}>{t("縮放調整")}</span>
              <span>{scale.toFixed(2)}x</span>
            </div>
            <Slider 
              min={0.5} 
              max={3} 
              step={0.01} 
              value={scale} 
              onChange={setScale}
              style={{ marginTop: 8 }} 
            />
          </Space>
        </div>
      </Modal>

      {/* 彩蛋 Modal */}
      <Modal
        open={showEasterEgg}
        onCancel={() => setShowEasterEgg(false)}
        footer={null}
        width={800}
        centered
        closable={false}
        styles={{
          body: { padding: 0 },
          content: { borderRadius: 16, overflow: 'hidden' }
        }}
      >
        <EasterEggGame
          isOpen={showEasterEgg}
          onClose={() => setShowEasterEgg(false)}
          onGameOver={() => {
            setShowEasterEgg(false);
          }}
        />
      </Modal>

      {/* 成就詳情 Modal */}
      <Modal
        title={null}
        open={isAchievementModalVisible}
        onCancel={handleModalClose}
        footer={null}
        centered
        width={520}
        closable={false}
        maskClosable={true}
        wrapClassName="achievement-modal-wrapper"
        styles={{
          body: { padding: 0 },
          content: { borderRadius: 16, overflow: 'hidden' }
        }}
        destroyOnClose
      >
        <div style={{ 
          background: selectedAchievement?.unlocked 
            ? `linear-gradient(135deg, ${achievementColors[selectedAchievement.id]?.primary || '#f6ffed'} 0%, ${achievementColors[selectedAchievement.id]?.secondary || '#e6f7ff'} 100%)` 
            : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
          padding: '32px',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Modal標題 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: selectedAchievement?.unlocked ? (achievementColors[selectedAchievement.id]?.accent || '#52c41a') : '#666',
              marginBottom: '24px'
            }}
          >
            {selectedAchievement?.unlocked ? selectedAchievement.name : t('神秘成就')}
          </motion.div>

          {/* 成就圖標區域 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.6,
              type: "spring",
              stiffness: 200,
              damping: 20
            }}
            whileHover={{
              scale: 1.05,
              transition: { duration: 0.2 }
            }}
            style={{
              position: 'relative',
              display: 'inline-block',
              marginBottom: '24px'
            }}
          >
            {/* 背景光暈效果 - 僅解鎖成就有 */}
            {selectedAchievement?.unlocked && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.15, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '180px',
                  height: '180px',
                  background: `radial-gradient(circle, ${achievementColors[selectedAchievement.id]?.accent || '#52c41a'} 0%, transparent 70%)`,
                  borderRadius: '50%',
                  zIndex: 0
                }}
              />
            )}
            
            {/* 主要圖標 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <AntImage
                src={selectedAchievement?.unlocked ? selectedAchievement.icon : (selectedAchievement?.shadowIcon || '')}
                alt={t("成就圖標")}
                preview={{
                  mask: false, // 隱藏 hover 時的 preview 文字
                  maskStyle: { backgroundColor: 'transparent' }
                }}
                style={{
                  width: '140px',
                  height: '140px',
                  objectFit: 'contain',
                  position: 'relative',
                  zIndex: 1,
                  filter: selectedAchievement?.unlocked 
                    ? `drop-shadow(0 8px 16px ${achievementColors[selectedAchievement.id]?.accent || '#52c41a'}40)` 
                    : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2)) grayscale(100%)',
                  borderRadius: '16px',
                  background: selectedAchievement?.unlocked 
                    ? 'rgba(255, 255, 255, 0.9)' 
                    : 'rgba(255, 255, 255, 0.5)',
                  padding: '12px',
                  border: selectedAchievement?.unlocked 
                    ? `3px solid ${achievementColors[selectedAchievement.id]?.accent || '#52c41a'}50` 
                    : '3px solid rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer'
                }}
              />
            </motion.div>
          </motion.div>
          
          {/* 成就描述區域 - 只有未解鎖成就才顯示 */}
          {!selectedAchievement?.unlocked && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              style={{
                marginBottom: '24px'
              }}
            >
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                marginBottom: '12px',
                color: '#8c8c8c'
              }}>
                {t("達成條件")}
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#bfbfbf', 
                lineHeight: '1.6', 
                marginBottom: '20px',
                padding: '12px 16px',
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                borderRadius: '8px',
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}>
                {selectedAchievement?.description || t('神秘的成就條件...')}
              </div>
            </motion.div>
          )}

          {/* 進度顯示區域 - 只有未解鎖成就才顯示 */}
          {selectedAchievement && !selectedAchievement.unlocked && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              style={{ marginBottom: '24px' }}
            >
              {selectedAchievement.id === 'good_karma' ? (
                /* 善意循環成就顯示詳細進度 */
                <GoodKarmaProgressDisplay achievement={selectedAchievement} />
              ) : (
                /* 其他成就顯示一般進度 */
                <>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    <span style={{ color: '#666' }}>{t("進度")}</span>
                    <span style={{ color: '#1890ff' }}>
                      {Math.min(selectedAchievement.progress || 0, selectedAchievement.target || 1)} / {selectedAchievement.target || 1}
                    </span>
                  </div>
                  
                  <Progress
                    percent={Math.min(((selectedAchievement.progress || 0) / (selectedAchievement.target || 1)) * 100, 100)}
                    strokeColor='#1890ff'
                    trailColor='#f5f5f5'
                    showInfo={false}
                    strokeWidth={12}
                    style={{ marginBottom: '16px' }}
                  />
                  
                  {/* 距離完成的差距 */}
                  {(selectedAchievement.target || 1) > (selectedAchievement.progress || 0) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.8 }}
                      style={{
                        fontSize: '13px',
                        color: '#666',
                        backgroundColor: '#f8f9fa',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef',
                        textAlign: 'center'
                      }}
                    >
                      <span style={{ fontWeight: '500' }}>{t("還需要：")}</span>
                      <span style={{ color: '#1890ff', fontWeight: '600', marginLeft: '4px' }}>
                        {(selectedAchievement.target || 1) - (selectedAchievement.progress || 0)}
                      </span>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* 完成狀態區域 */}
          {selectedAchievement?.unlocked ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              style={{ 
                marginTop: '16px', 
                padding: '16px', 
                backgroundColor: achievementColors[selectedAchievement.id]?.primary || '#f6ffed', 
                border: `1px solid ${achievementColors[selectedAchievement.id]?.secondary || '#b7eb8f'}`,
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
                textAlign: 'center'
              }}
            >
              <motion.div 
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  fontSize: '16px'
                }}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.0 }}
              >
                <motion.span 
                  style={{ fontSize: '18px' }}
                  animate={{ 
                    rotate: [0, 15, -15, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                >
                  🏆
                </motion.span>
                <span style={{ color: achievementColors[selectedAchievement.id]?.accent || '#52c41a' }}>{t("✓ 成就已達成！")}</span>
              </motion.div>
              
              <motion.div 
                style={{
                  color: achievementColors[selectedAchievement.id]?.accent || '#389e0d',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  padding: '8px 0'
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                {achievementCongratulations[selectedAchievement.id] || t('恭喜你解鎖了這個成就！')}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              style={{ 
                marginTop: '16px', 
                padding: '16px', 
                backgroundColor: '#f8f9fa', 
                border: '1px solid #dee2e6',
                borderRadius: '12px',
                color: '#6c757d',
                fontSize: '14px',
                fontWeight: '500',
                textAlign: 'center'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>🔒</span>
                {t("尚未解鎖")}
              </div>
            </motion.div>
          )}

          {/* 關閉按鈕 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
            style={{ marginTop: '24px' }}
          >
            <Button 
              onClick={handleModalClose}
              size="large"
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '8px',
                fontWeight: '500',
                border: 'none',
                background: '#1890ff',
                color: 'white'
              }}
            >
              {t("關閉")}
            </Button>
          </motion.div>
        </div>
      </Modal>
    </div>
  );
};

export default UserProfilePage;
