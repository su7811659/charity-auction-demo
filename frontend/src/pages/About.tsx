import React, { useEffect, useRef, useState } from "react";
import {
  Collapse,
  Typography,
  Divider,
  Carousel,
  Row,
  Col,
  Card,
  Popover,
  Modal,
} from "antd";
import { LeftOutlined, RightOutlined, TrophyFilled, GiftFilled } from "@ant-design/icons";
import type { CarouselRef } from "antd/es/carousel";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { fetchTopDonors } from '../store/productSlice';
import { TopDonorsPopover } from "../components/TopDonorsPopover";
import { typewriter } from '../utils/typewriter';
import EasterEggGame from "../components/EasterEggGame";
import donateLogo1 from "../assets/img/donate_logo_1.png";
import donateLogo2 from "../assets/img/donate_logo_2.png";
import icHeartFace from "../assets/img/ic_heart_face.svg";
import sellerStep01 from '../assets/img/seller_step_01.png';
import sellerStep02 from '../assets/img/seller_step_02.png';
import sellerStep03 from '../assets/img/seller_step_03.png';
import sellerStep04 from '../assets/img/seller_step_04.png';
import buyerStep01 from '../assets/img/buyer_step_01.png';
import buyerStep02 from '../assets/img/buyer_step_02.png';
import buyerStep03 from '../assets/img/buyer_step_03.png';
import { motion } from "framer-motion";

const { Title, Paragraph, Text } = Typography;

const About = () => {
  const dispatch = useDispatch<AppDispatch>();
  const topDonors = useSelector((state: RootState) => state.product.topDonors || []);
  
  // 從 Redux 獲取用戶資訊，檢查是否已觸發彩蛋
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const hasTriggeredEasterEgg = userProfile?.easter_egg || false;
  
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [sellerStep, setSellerStep] = useState(0);
  const [buyerStep, setBuyerStep] = useState(0);
  const sellerCarouselRef = useRef<CarouselRef>(null);
  const buyerCarouselRef = useRef<CarouselRef>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTopDonors, setShowTopDonors] = useState(false);
  
  // 彩蛋相關狀態
  const [heartClickCount, setHeartClickCount] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [heartShaking, setHeartShaking] = useState(false);
  const [showHeartPopover, setShowHeartPopover] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const [emojiParticles, setEmojiParticles] = useState<Array<{id: number, emoji: string, x: number, y: number}>>([]);
  const [recentMessageIndexes, setRecentMessageIndexes] = useState<number[]>([]); // 記錄最近使用的文案索引

  // 字體樣式定義
  const pixelFontStyle = {
    fontFamily: "'LanaPixel', 'Courier New', monospace",
    fontSize: 14,
    lineHeight: 1.4,
    letterSpacing: '0.5px'
  };

  // 專業英文字型樣式 (僅套用於英文單字/副標題)
  const englishFontStyle: React.CSSProperties = {
    fontFamily: "Inter, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
    fontWeight: 500,
    letterSpacing: '0.5px'
  };

  // 獲取大善人排行榜數據
  useEffect(() => {
    dispatch(fetchTopDonors());
  }, [dispatch]);

  // 載入像素字體
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'LanaPixel';
        src: url('/fonts/LanaPixel.ttf') format('truetype');
        font-display: swap;
      }
      
      /* Heart Popover Arrow 樣式 */
      .heart-popover .ant-popover-arrow {
        border-top-color: #333 !important;
        border-bottom-color: transparent !important;
      }
      
      .heart-popover .ant-popover-arrow::before {
        border-top-color: #333 !important;
        border-bottom-color: transparent !important;
      }
      
      .heart-popover .ant-popover-arrow::after {
        border-top-color: #f8f9fa !important;
        border-bottom-color: transparent !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 愛心點擊文案 - 根據是否已觸發過彩蛋使用不同內容
  const heartMessages = hasTriggeredEasterEgg ? [
    // 已觸發過彩蛋的簡短版本，不會再觸發彩蛋
    '你輕點了一下 ， 愛心覺羅看著你 ， 彷彿在說 ： 「 趕快去上傳商品 。 」',
    '你戳了戳他 ， 他的眼睛眨了兩下 ， 好像在問 ： 「 今天有逛市集嗎 ？ 」',
    '愛心覺羅沒什麼反應 ， 可能是想睡了 。 ',
    '你碰了一下 ， 他微微歪頭，像是在打量你要做什麼 。 ',
    '你按了一下 ， 他的眼神意味深長，像是在暗示你去看看下面的活動指南 。 ',
    '愛心覺羅縮了縮身子 ，  好像有點害羞',
    '你試著引起他的注意 ， 他只是用餘光瞄了你一下 。 ',
    '愛心覺羅一動不動 。 '
  ] : [
    // 首次觸發的完整版本
    '你輕點了一下 ， 它晃動了一下 ， 然後靜止不動 。 ',
    '你第二次點擊 ， 它表面泛起一層淡淡的微光 。 ',
    '你第三次點擊 ， 它邊緣劃過一道細緻的光暈 。 ',
    '你再次點擊 ， 它的中心微微鼓起， 像在呼吸 。 ',
    '你連點幾下 ， 它跳動了一下 ， 閃出短暫光芒 。 ',
    '你不斷點擊 ，它浮現幾個模糊的表情圖案 ， 又迅速淡去 。',
    '你又點了一下 ， 它的光澤變強 ， 然後又恢復原樣 。',
    '你接連點擊 ， 它周圍出現細碎的光點 ， 緩緩旋轉 。',
    '第九下 ， 它的顏色瞬間加深 ， 並刻上流動符號 。',
    '你最後一次點擊 ， 它猛然爆出耀眼光芒 —— 隱藏的祕密被啟動了。 '
  ];

  // 愛心點擊處理函數
  const handleHeartClick = async () => {
    // 如果 popover 已經顯示，則只關閉 popover，不增加點擊次數
    if (showHeartPopover) {
      setShowHeartPopover(false);
      return;
    }
    
    const newCount = heartClickCount + 1;
    setHeartClickCount(newCount);
    
    // 如果已觸發過彩蛋，使用簡化的特效
    if (hasTriggeredEasterEgg) {
      // 隨機選擇：放大效果或震動效果
      const effectType = Math.random() > 0.5 ? 'scale' : 'shake';
      
      if (effectType === 'shake') {
        setHeartShaking(true);
        setTimeout(() => setHeartShaking(false), 500);
      }
      // 放大效果會在 animate 屬性中處理
    } else {
      // 首次觸發的完整特效
      setHeartShaking(true);
      setTimeout(() => setHeartShaking(false), 500);
      
      // 第六次點擊時噴射 emoji
      if (newCount === 6) {
        const emojis = ['🕝', '🎁', '🦊', '🎖️', '🐯', '👹', '👾', '👽'];
        const particles = Array.from({length: 8}, (_, i) => ({
          id: Date.now() + i,
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
          x: Math.random() * 160 - 80,  // 擴大噴射範圍：從 ±40 變成 ±80
          y: Math.random() * 160 - 80   // 擴大噴射範圍：從 ±40 變成 ±80
        }));
        setEmojiParticles(particles);
        setTimeout(() => setEmojiParticles([]), 4000);  // 延長消失時間：從 2000ms 變成 4000ms
      }
      
      // 第十下觸發彩蛋
      if (newCount === 10) {
        setTimeout(() => {
          setShowEasterEgg(true);
        }, 1000);
      }
    }
    
    // 清除舊的打字機內容
    setTypewriterText('');
    
    // 顯示像素風對話框並執行打字機效果
    setShowHeartPopover(true);
    
    let message: string;
    if (hasTriggeredEasterEgg) {
      // 隨機選擇文案，但不要與前一個和前兩個重複
      let randomIndex: number;
      do {
        randomIndex = Math.floor(Math.random() * heartMessages.length);
      } while (recentMessageIndexes.includes(randomIndex) && heartMessages.length > 2);
      
      message = heartMessages[randomIndex];
      
      // 更新最近使用的文案索引，只保留最近兩個
      setRecentMessageIndexes(prev => {
        const newIndexes = [randomIndex, ...prev.slice(0, 1)];
        return newIndexes;
      });
    } else {
      // 首次觸發按照順序顯示
      message = heartMessages[newCount - 1] || heartMessages[heartMessages.length - 1];
    }
    
    // 稍微延遲執行打字機效果，確保內容已清除
    setTimeout(async () => {
      await typewriter(message, setTypewriterText, undefined, undefined, undefined, 30, false, true);
    }, 50);
  };

  const handleCollapseChange = (keys: string | string[]) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    setActiveKeys(keyArray);
  };

  const sellerSteps = [
    { url: sellerStep01, desc: "選擇想要義賣的愛心商品" },
    { url: sellerStep02, desc: "前往上傳商品、填寫商品資訊後提交審核" },
    { url: sellerStep03, desc: "待審核通過後確認商品是否上架" },
    { url: sellerStep04, desc: "活動當日(9/23)將你的愛心商品交給6F夏威夷的ESG小組成員" },
  ];

  const buyerSteps = [
    { url: buyerStep01, desc: "瀏覽商品列表並挑選你心儀的商品" },
    { url: buyerStep02, desc: "將點擊商品頁上的愛心加入收藏" },
    { url: buyerStep03, desc: "活動當日(9/23 的 15:00 ~ 17:30) 在6F夏威夷中尋覓你的心儀商品並交由櫃檯的ESG小組成員進行成交" },
  ];

  const donationOrgs = [
    {
      name: "家扶基金會",
      logo: donateLogo1,
      desc: "家扶基金會是一個關懷弱勢兒童少年及其家庭的國際性非營利組織，運用社會工作的專業方法，讓兒少享有家庭妥善的照顧、身心安全的保護、健康成長的環境、充分受教育的機會，快樂學習的生活，期待兒少自立後能夠帶著大家的愛展翅飛翔。",
      link: "https://www.ccf.org.tw/"
    },
    {
      name: "南迴基金會",
      logo: donateLogo2,
      desc: "南迴基金會以從事醫療事業辦理醫療機構及公益事業為目的，包含支援南迴線及臨近區域等急性後醫療照護，協助各村落之巡迴醫療、辦理長期照顧服務、疾病預防篩檢及健康促進業務。關懷南迴線及鄰近區域等在地居民（老人、身心障礙者、弱勢族群）急難救助等相關照護事項。",
      link: "https://www.4141.org.tw/"
    },
  ];

  const rewardItems = [
    {
      title: "員工公益獎勵",
      desc: "榮登「大善人排行榜」前三名的熱血捐贈者，將獲頒專屬訂製的 公益榮耀獎座。(PS.獎座上印的是你第一個商品的賣家暱稱，所以請好好取名:D)\n\n這不只是個獎座，它是專屬於你的「宇宙級好人認證徽章」，象徵著你在這場善意接力中所留下的溫暖足跡。\n\n當你把它擺在辦公桌上，陽光會在上面灑下一圈光暈，像是在為你的善心加冕。\n它不會替你發聲，但它會替你說話——告訴每一位路過的人，這裡坐著的是一位用行動改變世界的人。\n\n因為你的一點點善意，正化成一道道漣漪，穿過城市的喧囂，輕輕擁抱那些需要幫助的人，讓整個世界的溫柔，被看見、被放大。",
      color: "#FCFCFC",
      hoverColor: "#f0f5ff",
      iconColor: "#FFDC35",
      icon: TrophyFilled,
    },
    {
      title: "公司倍倍捐款配對",
      desc: "為感謝同仁參與公益、擴大善意影響力，公司將依員工實際捐贈總金額進行 1:1 金額配對，公司配對金額上限為 20,000 元。\n\n超過上限的部分，將由執行長 Ivan 親自加碼貼補——是的，他會豪爽地從自己的口袋掏出來，讓每一份善心都能獲得全額加倍。\n\n這不只是企業對公益的承諾與支持，更是我們對永續發展與社會責任的實踐。因為在這場善意接力中，你的愛心不僅不打折，還可能被 Ivan 「限時加倍送」：）",
      color: "#FCFCFC",
      hoverColor: "#fff7e6",
      iconColor: "#66B3FF",
      icon: GiftFilled,
    },
  ];

  useEffect(() => {
    const preload = (steps: { url: string }[]) =>
      steps.forEach(({ url }) => {
        const img = new window.Image();
        img.src = url;
      });
    preload(sellerSteps);
    preload(buyerSteps);
  }, []);

  const renderCarousel = (
    steps: { url: string; desc: string }[],
    role: string,
    step: number,
    setStep: (s: number) => void,
    ref: React.RefObject<CarouselRef | null>
  ) => (
    <div style={{ position: "relative", maxWidth: 600, margin: "0 auto" }}>
      <Carousel
        ref={ref}
        dots={false}
        infinite={false}
        draggable
        afterChange={(i) => setStep(i)}
      >
        {steps.map(({ url, desc }, idx) => (
          <div key={idx}>
            <img
              src={url}
              alt={`${role} 步驟 ${idx + 1}`}
              style={{ width: "100%", borderRadius: 8 }}
            />
            <Paragraph style={{ textAlign: "center", marginTop: 8 }}>
              <Text strong>Step {idx + 1}</Text>：{desc}
            </Paragraph>
          </div>
        ))}
      </Carousel>

      <LeftOutlined
        onClick={() => ref.current?.prev()}
        style={{
          position: "absolute",
          top: "50%",
          left: -30,
          transform: "translateY(-50%)",
          fontSize: 20,
          cursor: step === 0 ? "not-allowed" : "pointer",
          opacity: step === 0 ? 0.3 : 1,
        }}
      />
      <RightOutlined
        onClick={() => ref.current?.next()}
        style={{
          position: "absolute",
          top: "50%",
          right: -30,
          transform: "translateY(-50%)",
          fontSize: 20,
          cursor: step === steps.length - 1 ? "not-allowed" : "pointer",
          opacity: step === steps.length - 1 ? 0.3 : 1,
        }}
      />

      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        {steps.map((_, i) => (
          <div
            key={i}
            onClick={() => ref.current?.goTo(i)}
            style={{
              height: 4,
              width: step === i ? 32 : 16,
              backgroundColor: step === i ? "#1890ff" : "#d9d9d9",
              borderRadius: 2,
              margin: "0 4px",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* 全局大善人排行榜 Popover - 固定在右上角 */}
      <Popover
        content={<TopDonorsPopover donors={topDonors} />}
        open={showTopDonors}
        placement="bottomRight"
        arrow={true}
        overlayStyle={{ 
          position: 'fixed',
          top: '80px',
          right: '24px',
          zIndex: 1000,
          minWidth: '250px'
        }}
        getPopupContainer={() => document.body}
      >
        <div style={{ position: 'fixed', top: '80px', right: '24px', width: '1px', height: '1px', zIndex: -1 }} />
      </Popover>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ fontFamily: "'Noto Serif TC', serif" }}
      >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{ maxWidth: 800, margin: "0 auto", padding: "12px" }}
      >
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        style={{ textAlign: "center", marginBottom:5 }}>
        {/* 上方圖示 */}
        <Popover
          content={
            <div style={{ 
              padding: '12px 16px', 
              color: '#333',
              fontWeight: 500,
              width: 300, // 固定寬度避免跳動
              ...pixelFontStyle,
              background: '#f8f9fa',
              border: '2px solid #333',
              borderRadius: 8,
              boxShadow: '0 0 0 2px #fff, 0 0 0 4px #333'
            }}>
              {typewriterText}
            </div>
          }
          open={showHeartPopover}
          onOpenChange={setShowHeartPopover}
          placement="top"
          trigger="click"
          arrow={{
            pointAtCenter: false,
            arrowPointAtCenter: false,
          }}
          autoAdjustOverflow={false}
          destroyTooltipOnHide={true}
          fresh={true}
          overlayStyle={{
            marginTop: '-20px', // 改回用 margin 來控制距離
          }}
          overlayInnerStyle={{
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            padding: 0
          }}
          overlayClassName="heart-popover"
        >
          {/* Emoji 粒子效果 */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {emojiParticles.map(particle => (
              <motion.div
                key={particle.id}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  scale: 0.5, 
                  opacity: 1 
                }}
                animate={{ 
                  x: particle.x, 
                  y: particle.y, 
                  scale: [0.5, 1.5, 0.8, 0], 
                  opacity: [1, 1, 0.8, 0] 
                }}
                transition={{ 
                  duration: 3.5,  // 延長動畫時間：從 1.5s 變成 3.5s
                  ease: "easeOut" 
                }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  fontSize: 20,
                  pointerEvents: 'none',
                  zIndex: 10,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {particle.emoji}
              </motion.div>
            ))}
            
            <motion.img
              src={icHeartFace}
              alt="活動圖示"
              style={{ 
                width: hasTriggeredEasterEgg ? 45 : (45 + (heartClickCount * 2)), // 已觸發過彩蛋不會累積放大
                height: hasTriggeredEasterEgg ? 45 : (45 + (heartClickCount * 2)),
                marginBottom: -10,
                cursor: hasTriggeredEasterEgg ? "pointer" : "default", // 已觸發過彩蛋才顯示手指
                userSelect: "none",
                // 已觸發過彩蛋不使用複雜的視覺效果
                filter: hasTriggeredEasterEgg ? 'none' : (heartClickCount >= 2 ? `brightness(${1.3 + heartClickCount * 0.15}) saturate(${1.2 + heartClickCount * 0.1}) contrast(1.1)` : 'none'),
                boxShadow: hasTriggeredEasterEgg ? 'none' : (heartClickCount >= 3 ? `0 0 ${heartClickCount * 4}px ${heartClickCount * 2}px rgba(255, 215, 0, 0.8), 0 0 ${heartClickCount * 6}px rgba(255, 193, 7, 0.6)` : 'none'),
                borderRadius: hasTriggeredEasterEgg ? '0' : (heartClickCount >= 3 ? '50%' : (heartClickCount >= 8 ? '50%' : '0')),
              }}
              onClick={handleHeartClick}
              animate={hasTriggeredEasterEgg ? 
                // 已觸發過彩蛋的簡化動畫
                (heartShaking ? {
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0],
                } : {
                  scale: 1,
                  rotate: 0,
                }) :
                // 首次觸發的完整動畫
                (heartShaking ? {
                  scale: [1, 1.4, 1.1, 1.4, 1],
                  rotate: [0, -15, 15, -15, 0],
                  filter: heartClickCount >= 5 && heartClickCount !== 6 ? [
                    'brightness(1) hue-rotate(0deg)',
                    'brightness(1.5) hue-rotate(60deg)',
                    'brightness(1.2) hue-rotate(120deg)',
                    'brightness(1.5) hue-rotate(180deg)',
                    'brightness(1) hue-rotate(0deg)'
                  ] : undefined,
                } : {
                  scale: heartClickCount >= 4 ? [1, 1.05, 1] : 1,
                  rotate: heartClickCount === 8 ? 360 : 0,  // 第八下時旋轉360度
                  filter: heartClickCount >= 9 ? [
                    'brightness(1) hue-rotate(0deg)',
                    'brightness(2) hue-rotate(180deg)',
                    'brightness(1) hue-rotate(360deg)'
                  ] : undefined,
                })
              }
              transition={{
                duration: hasTriggeredEasterEgg ? 0.3 : (heartShaking ? 0.6 : (heartClickCount >= 4 ? 2 : (heartClickCount === 8 ? 1.5 : 0.2))),
                ease: "easeInOut",
                repeat: hasTriggeredEasterEgg ? 0 : (heartClickCount >= 4 && !heartShaking && heartClickCount !== 8 ? Infinity : 0),
                repeatType: "reverse"
              }}
              whileHover={hasTriggeredEasterEgg ? { 
                scale: 1.1,
                transition: { duration: 0.2 }
              } : {}}
              whileTap={hasTriggeredEasterEgg ? { 
                scale: 0.9,
                transition: { duration: 0.1 }
              } : {}}
            />
          </div>
        </Popover>

        {/* 主標題 */}
        <Title level={3} style={{ fontWeight: 400, marginBottom: 8 }}>
          公益市集活動指南
        </Title>

        {/* 短分隔線 */}
        <div style={{
          width: 80,
          height: 1,
          backgroundColor: "#bbb",
          margin: "8px auto",
        }} />

        {/* 副標題 */}
        <Text italic type="secondary" style={{ fontSize: 14 }}>
          以善為念，以愛為行
        </Text>
      </motion.div>
      <Divider />

      <Collapse
        activeKey={activeKeys}
        onChange={handleCollapseChange}
        expandIconPosition="end"
        bordered={false}
        style={{ background: "#f6f7fb", borderRadius: 8 }}
        ghost
      >
        <Collapse.Panel
          key="1"
          showArrow={false}
          header={     
            <div style={{ width: "100%", position: "relative", height: 60 /* or auto */ }}>
              <motion.div
                initial={false}
                animate={{
                  left: activeKeys.includes("1") ? "50%" : "0%",
                  top: "50%",
                  transform: activeKeys.includes("1") ? "translate(-50%, -50%)" : "translateY(-50%)",
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  width: 240,
                  justifyContent: "center",
                  position: "absolute",
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    transform: "rotate(45deg)",
                    backgroundColor: "#bbb",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Text strong style={{ fontSize: 20 }}>理念初心</Text>
                  <div style={{ fontSize: 16, color: "#999", ...englishFontStyle }}>Vision</div>
                </div>
              </motion.div>
            </div>
          }
          style={{ background: "#fff", marginBottom: 12, borderRadius: 4, overflow: "hidden" }}
        >
          <Divider style={{ margin: '4px 0 16px' }} />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Paragraph
                style={{
                  fontSize: 14,
                  lineHeight: "1.9",
                  color: "#444",
                  letterSpacing: "0.03em",
                  textIndent: "2em",
                  marginBottom: 24,
                }}
              >
                在 BidForGood，我們相信科技應該是為人服務、為社會創造價值的力量。由 ESG 小組主辦的 BidForGood 公益市集，是一場融合「循環永續」與「科技善意」的公益行動。同仁們透過捐出閒置物品，讓舊愛重獲新生，並將拍賣所得捐助給需要幫助的社福單位，實踐共享經濟與愛的延續。
              </Paragraph>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Paragraph
                style={{
                  fontSize: 14,
                  lineHeight: "1.9",
                  color: "#444",
                  letterSpacing: "0.03em",
                  textIndent: "2em",
                  marginBottom: 24,
                }}
              >
                本次市集更首次導入 AI 技術，協助商品搜尋、產生有趣的商品鑑定報告，讓每件物品的故事被看見，也讓公益參與變得更輕鬆、友善與智慧。透過創新科技的協助，我們希望建立一個充滿人情味的數位公益平台，讓參與者在每一次挑選、每一次捐贈中，看見科技與善意的交會。
              </Paragraph>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Paragraph
                style={{
                  fontSize: 14,
                  lineHeight: "1.9",
                  color: "#444",
                  letterSpacing: "0.03em",
                  textIndent: "2em",
                }}
              >
                BidForGood 公益市集，不只是跳蚤市場，更是我們對永續與社會責任的共同承諾。邀請你一同加入，讓 AI 為愛助力，讓每一份心意都有機會被傳遞得更遠。
              </Paragraph>
            </motion.div>
          </motion.div>
        </Collapse.Panel>

        <Collapse.Panel
          key="2"
          showArrow={false}
          header={     
            <div style={{ width: "100%", position: "relative", height: 60 }}>
              <motion.div
                initial={false}
                animate={{
                  left: activeKeys.includes("2") ? "50%" : "0%",
                  top: "50%",
                  transform: activeKeys.includes("2") ? "translate(-50%, -50%)" : "translateY(-50%)",
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  width: 240,
                  justifyContent: "center",
                  position: "absolute",
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    border: "2px solid #666",
                    transform: "rotate(45deg)",
                    backgroundColor: "white",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Text strong style={{ fontSize: 20 }}>活動詳程</Text>
                  <div style={{ fontSize: 16, color: "#999", ...englishFontStyle }}>Timeline</div>
                </div>
              </motion.div>
            </div>
          }
          style={{ background: "#fff", marginBottom: 12, borderRadius: 4, overflow: "hidden" }}
        >
          <Divider style={{ margin: '4px 0 16px' }} />
          <div
            style={{
              borderLeft: "4px solid #8E8E8E",
              paddingLeft: 12,
              marginTop: 24,
              marginBottom: 16,
            }}
          >
            <Text strong style={{ fontSize: 18, color: "#3C3C3C", letterSpacing: 1.5 }}>
              活動時程
            </Text>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}
          >
            {/* 上傳與截止資訊 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{ display: "flex", flexDirection: "row", alignItems: "baseline", gap: 16 }}
            >
              <Text strong style={{ minWidth: 120, fontSize: 14, color: "#555", ...englishFontStyle }}>商品上傳開放</Text>
              <Text style={{ fontSize: 14, color: "#333" }}>8/26（二）網站開放上傳</Text>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ display: "flex", flexDirection: "row", alignItems: "baseline", gap: 16 }}
            >
              <Text strong style={{ minWidth: 120, fontSize: 14, color: "#555", ...englishFontStyle }}>上架截止時間</Text>
              <Text style={{ fontSize: 14, color: "#333" }}>9/23（二）中午 12:00</Text>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              style={{ display: "flex", flexDirection: "row", alignItems: "baseline", gap: 16 }}
            >
              <Text strong style={{ minWidth: 120, fontSize: 14, color: "#555", ...englishFontStyle }}>市集活動日</Text>
              <Text style={{ fontSize: 14, color: "#333" }}>9/23（二）下午 3:00–5:30</Text>
            </motion.div>
          </motion.div>

          <Divider />

          <div
            style={{
              borderLeft: "4px solid #8E8E8E",
              paddingLeft: 12,
              marginTop: 24,
              marginBottom: 16,
            }}
          >
            <Text strong style={{ fontSize: 18, color: "#3C3C3C", letterSpacing: 1.5 }}>
              活動當日(9/23)流程
            </Text>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
            {[
              { time: "10:00–14:30", desc: "賣家送件至 6F 夏威夷會場" },
              { time: "14:30–15:30", desc: "ESG 小組前置準備" },
              { time: "15:00–17:30", desc: "公益市集活動進行" },
              { time: "17:30–18:00", desc: "賣家取回未售出商品" },
              { time: "17:50", desc: "公告未取回物品，統一放置桌面" },
            ].map(({ time, desc }, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 16,
                  backgroundColor: "#f8f8f8",
                  padding: "12px 16px",
                  borderRadius: 8,
                }}
              >
                <div style={{ minWidth: 90, fontWeight: 500, color: "#444" }}>{time}</div>
                <div style={{ flex: 1, color: "#333", fontSize: 14 }}>{desc}</div>
              </div>
            ))}
          </div>
        </Collapse.Panel>

        <Collapse.Panel
          key="3"
          showArrow={false}
          header={     
            <div style={{ width: "100%", position: "relative", height: 60 }}>
              <motion.div
                initial={false}
                animate={{
                  left: activeKeys.includes("3") ? "50%" : "0%",
                  top: "50%",
                  transform: activeKeys.includes("3") ? "translate(-50%, -50%)" : "translateY(-50%)",
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  width: 240,
                  justifyContent: "center",
                  position: "absolute",
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    border: "2px solid #666",
                    borderRadius: "50%",
                    backgroundColor: "#666",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Text strong style={{ fontSize: 20 }}>參與指引</Text>
                  <div style={{ fontSize: 16, color: "#999", ...englishFontStyle }}>Guide</div>
                </div>
              </motion.div>
            </div>
          }
          style={{ background: "#fff", marginBottom: 12, borderRadius: 4, overflow: "hidden" }}
        >
          <Divider style={{ margin: '4px 0 16px' }} />
          {/* 子區塊：賣家流程指引 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Text strong style={{ fontSize: 18, color: '#333', borderBottom: '4px solid #003D79', paddingBottom: 4 }}>
                賣家流程指引
              </Text>
            </div>
          </motion.div>
          <div style={{ marginBottom: 32 }}>
            {renderCarousel(sellerSteps, "賣家", sellerStep, setSellerStep, sellerCarouselRef)}
          </div>

          <Divider style={{ margin: "24px 0" }} />

          {/* 子區塊：買家流程指引 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Text strong style={{ fontSize: 18, color: '#333', borderBottom: '4px solid #003D79', paddingBottom: 4 }}>
                買家流程指引
              </Text>
            </div>
          </motion.div>
          <div style={{ marginBottom: 32 }}>
            {renderCarousel(buyerSteps, "買家", buyerStep, setBuyerStep, buyerCarouselRef)}
          </div>
        </Collapse.Panel>

        <Collapse.Panel
          key="4"
          showArrow={false}
          header={
            <div style={{ width: "100%", position: "relative", height: 60 }}>
              <motion.div
                initial={false}
                animate={{
                  left: activeKeys.includes("4") ? "50%" : "0%",
                  top: "50%",
                  transform: activeKeys.includes("4") ? "translate(-50%, -50%)" : "translateY(-50%)",
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  width: 240,
                  justifyContent: "center",
                  position: "absolute",
                }}
              >
                {/* 同心圓 icon */}
                <div
                  style={{
                    width: 12,
                    height: 12,
                    border: "2px solid #666",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: "#666",
                      borderRadius: "50%",
                    }}
                  />
                </div>

                {/* 文字內容 */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Text strong style={{ fontSize: 20 }}>捐贈機構</Text>
                  <div style={{ fontSize: 16, color: "#999", ...englishFontStyle }}>Charity</div>
                </div>
              </motion.div>
            </div>
          }
          style={{ background: "#fff", marginBottom: 12, borderRadius: 4, overflow: "hidden" }}
        >
          <Divider style={{ margin: '4px 0 16px' }} />
          <Row gutter={[16, 16]}>
            {donationOrgs.map((org, index) => (
              <Col span={24} key={org.name}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                >
                  <div
                    style={{
                      padding: 20,
                      background: "#fff",
                      borderRadius: 10,
                      border: "1px solid #eee",
                    }}
                  >
                    {/* Logo + 名稱 */}
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 + index * 0.2 }}
                      style={{ display: "flex", alignItems: "center", marginBottom: 12 }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: "50%",
                          backgroundColor: "#FBFBFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          marginRight: 16,
                          flexShrink: 0,
                        }}
                      >
                        <motion.img
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.4 + index * 0.2 }}
                          src={org.logo}
                          alt={org.name}
                          style={{ width: "60%", height: "60%", objectFit: "contain" }}
                        />
                      </div>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 + index * 0.2 }}
                        style={{ fontSize: 17, fontWeight: 500, letterSpacing: "0.5px", color: "#222" }}
                      >
                        {org.name}
                      </motion.div>
                    </motion.div>

                    {/* 描述文字 */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 + index * 0.2 }}
                    >
                      <Paragraph style={{ color: "#555", fontSize: 14, marginBottom: 12 }}>
                        {org.desc}
                      </Paragraph>
                    </motion.div>

                    {/* 官方連結 */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 + index * 0.2 }}
                    >
                      <a
                        href={org.link}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#1677ff", display: "inline-flex", alignItems: "center", fontWeight: 500 }}
                      >
                        <RightOutlined style={{ fontSize: 14, marginRight: 6 }} />
                        前往官方網站
                      </a>
                    </motion.div>
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </Collapse.Panel>

        <Collapse.Panel
          key="5"
          showArrow={false}
          header={
            <div style={{ width: "100%", position: "relative", height: 60 }}>
              <motion.div
                initial={false}
                animate={{
                  left: activeKeys.includes("5") ? "50%" : "0%",
                  top: "50%",
                  transform: activeKeys.includes("5") ? "translate(-50%, -50%)" : "translateY(-50%)",
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  width: 240,
                  justifyContent: "center",
                  position: "absolute",
                }}
              >
                {/* 同心圓（實心版）icon */}
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: "#666", // 外層實心
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      border: "2px solid white", // 中間空心圓
                      borderRadius: "50%",
                      backgroundColor: "transparent",
                    }}
                  />
                </div>

                {/* 標題與副標題 */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Text strong style={{ fontSize: 20 }}>獎勵機制</Text>
                  <div style={{ fontSize: 16, color: "#999", ...englishFontStyle }}>Rewards</div>
                </div>
              </motion.div>
            </div>
          }
          style={{ background: "#fff", marginBottom: 12, borderRadius: 4, overflow: "hidden" }}
        >
          <Divider style={{ margin: '4px 0 16px' }} />
          <Row gutter={[16, 16]}>
            {rewardItems.map((item, index) => {
              const IconComp = item.icon;
              const isHover = hoverIndex === index;
              const isEmployeeReward = item.title === "員工公益獎勵";
              
              return (
                <Col xs={24} sm={12} key={item.title} style={{ display: "flex" }}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    onMouseEnter={() => {
                      setHoverIndex(index);
                      if (isEmployeeReward) {
                        setShowTopDonors(true);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoverIndex(null);
                      if (isEmployeeReward) {
                        setShowTopDonors(false);
                      }
                    }}
                    style={{
                      transition: "all 0.3s",
                      borderRadius: 12,
                      height: "100%",
                      cursor: "default",
                      backgroundColor: isHover ? item.hoverColor : item.color,
                      width: "100%"
                    }}
                  >
                    <Card
                      variant="borderless"
                      styles={{
                        body: {
                          padding: 20,
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                        },
                      }}
                      style={{ backgroundColor: "transparent", borderRadius: 12, height: "100%" }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 12 }}>
                        <IconComp
                          style={{
                            fontSize: isHover ? 28 : 24,
                            color: isHover ? item.iconColor : "#BEBEBE",
                            transition: "all 0.3s",
                            marginBottom: 4,
                            padding: 8,
                          }}
                        />
                        <Title level={5} style={{ margin: 0 }}>{item.title}</Title>
                      </div>
                      <Paragraph style={{ 
                        color: "#555", 
                        fontSize: 15, 
                        lineHeight: 1.8, 
                        textAlign: "left",
                        whiteSpace: "pre-line",
                        marginBottom: 0
                      }}>{item.desc}</Paragraph>
                    </Card>
                  </motion.div>
                </Col>
              );
            })}
          </Row>
        </Collapse.Panel>
      </Collapse>
      </motion.div>
      </motion.div>

      {/* 彩蛋 Modal - 愛心覺羅版 */}
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
    </>
  );
};

export default About;
