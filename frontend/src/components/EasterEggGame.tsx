import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import RobotAvatarWithDialog from './RobotAvatarWithDialog';
import HeartFace from "../assets/img/ic_heart_face.svg"
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { updateUserProfile } from '../store/userSlice';
import { triggerEasterEgg } from '../services/userService';
import RobotTalking from "../assets/img/robot_talking.gif";
import RobotInit from "../assets/img/robot_init.gif";
import RobotSilent from "../assets/img/robot_silent.gif";
import RobotSilentTalking from "../assets/img/robot_silent_talking.gif";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import heartIntro from '../assets/text/heart_intro.txt?raw';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 愛心覺羅彩蛋頁面
 * 恭喜發現隱藏彩蛋的簡單慶祝頁面
 */

interface EggMiniGameProps {
  isOpen: boolean;
  onClose: () => void;
  onGameOver: () => void;
}

// 彩帶顏色
const CONFETTI_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];

// 彩帶元件
const ConfettiPiece: React.FC<{ delay: number; duration: number; x: number }> = ({ delay, duration, x }) => {
  const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  
  return (
    <motion.div
      initial={{ y: -20, opacity: 0, rotate: 0 }}
      animate={{ 
        y: window.innerHeight + 50, 
        opacity: [0, 1, 1, 0], 
        rotate: 360 * 2,
        x: x + (Math.random() - 0.5) * 100
      }}
      transition={{ 
        duration: duration,
        delay: delay,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: Math.random() * 3 + 2
      }}
      style={{
        position: 'absolute',
        left: x,
        width: Math.random() * 12 + 6,
        height: Math.random() * 12 + 6,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '0',
        zIndex: 1
      }}
    />
  );
};

// ====== 元件 ======
const EggMiniGame: React.FC<EggMiniGameProps> = ({ 
  isOpen
}) => {
  const [showRobot, setShowRobot] = useState(false);
  const [robotTalking, setRobotTalking] = useState(false); // 何時開始講話
  const [achievedTime, setAchievedTime] = useState('');
  const [firstTalkDone, setFirstTalkDone] = useState(false);
  const [robotSlideTriggered, setRobotSlideTriggered] = useState(false); // 是否已觸發過滑動（僅第一次）
  const [spaceExpanded, setSpaceExpanded] = useState(false); // 空間是否展開（可以縮回）
  const [showBottomText, setShowBottomText] = useState(false); // 是否顯示底部感謝文字
  const dispatch = useDispatch();
  
  // 從 Redux 獲取用戶資訊
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const username = userProfile?.email?.split('@')[0] || '神秘探索者';

  // 觸發彩蛋並更新後端
  const handleEasterEggTrigger = async () => {
    try {
      // 檢查是否已經觸發過
      if (userProfile?.easter_egg) {
        console.log('Easter egg already triggered');
        return;
      }

      // 發送請求到後端更新彩蛋狀態
      const updatedProfile = await triggerEasterEgg();
      
      // 更新 Redux store
      dispatch(updateUserProfile(updatedProfile));
      
      console.log('Easter egg triggered successfully!', updatedProfile.easter_egg_triggered_time);
    } catch (error) {
      console.error('Failed to trigger easter egg:', error);
    }
  };

  // 獲取達成時間
  useEffect(() => {
    if (isOpen) {
      // 觸發彩蛋
      handleEasterEggTrigger();
      
      // 如果用戶已經有觸發時間，使用後端的時間；否則使用當前時間
      const displayTime = userProfile?.easter_egg_triggered_time 
        ? dayjs.utc(userProfile.easter_egg_triggered_time).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss")
        : dayjs().tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss");
      
      setAchievedTime(displayTime);
    }
  }, [isOpen, userProfile?.easter_egg_triggered_time]);

  // 延遲顯示機器人，讓動畫更順暢
  useEffect(() => {
    if (isOpen) {
      setShowRobot(true); // 立刻顯示
      setRobotTalking(false);
      setRobotSlideTriggered(false);
      setFirstTalkDone(false);
      setSpaceExpanded(false);
      setShowBottomText(false);
      // 移除自動觸發的 timer，改為用戶點擊觸發
    } else {
      setShowRobot(false);
      setRobotTalking(false);
      setRobotSlideTriggered(false); // 重置滑動狀態
      setSpaceExpanded(false);
      setShowBottomText(false);
    }
  }, [isOpen]);

  // 處理機器人第一次被點擊
  const handleRobotFirstClick = () => {
    if (!robotSlideTriggered) {
      setRobotSlideTriggered(true); // 觸發滑動
      setSpaceExpanded(true);       // 展開空間
      setRobotTalking(true);        // 開始講話
      setShowBottomText(true);      // 空間拓展時就顯示感謝文字
    }
  };

  // 處理對話結束（只是標記為完成，感謝文字已經在空間拓展時顯示了）
  const handleTalkEnd = () => {
    setFirstTalkDone(true);
    // 感謝文字已經在 handleRobotFirstClick 中顯示，這裡不需要再設置
  };

  // 處理氣泡可見性變化
  const handleBubbleVisibleChange = (visible: boolean) => {
    // 只有在對話完成且氣泡消失時才縮回空間
    if (!visible && firstTalkDone) {
      setSpaceExpanded(false);
    }
  };

  // 生成彩帶
  const confettiPieces = Array.from({ length: 15 }, (_, i) => (
    <ConfettiPiece 
      key={i}
      delay={Math.random() * 2}
      duration={Math.random() * 3 + 4}
      x={Math.random() * 800} // 限制在容器寬度內
    />
  ));

  if (!isOpen) return null;

  return (
    <div style={{ 
      position: 'relative',
      width: '100%',
      height: spaceExpanded ? '600px' : '400px', // 根據 spaceExpanded 狀態控制高度
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      borderRadius: 16,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'height 1s ease-out' // 平滑的高度變化動畫
    }}>
      {/* 彩帶背景 */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1 }}>
        {confettiPieces}
      </div>

      {/* 主要內容 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ 
          position: 'relative',
          width: '90%',
          maxWidth: '500px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 16,
          padding: spaceExpanded ? '32px 24px 88px' : '32px 24px 32px', // 根據 spaceExpanded 狀態控制padding
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          zIndex: 10,
          backdropFilter: 'blur(10px)',
          transition: 'padding 1s ease-out' // 平滑的padding變化動畫
        }}
      >
        {/* 標題 */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            marginBottom: 16,
            fontFamily: '"Noto Sans TC", sans-serif'
          }}
        >
          <div style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#333',
            marginBottom: 8
          }}>
            恭喜你 {username}
          </div>
          <div style={{
            fontSize: 20,
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4
          }}>
            🎉 恭喜你發現了
            <img 
              src={HeartFace} 
              alt="HeartFace" 
              style={{ width: 20, height: 20, verticalAlign: 'middle' }} 
            />
            愛心覺羅的隱藏彩蛋
          </div>
        </motion.div>

        {/* 達成時間顯示 */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
          style={{ 
            fontSize: 16, 
            marginBottom: 20,
            padding: '12px 20px',
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: 12,
            border: '1px solid rgba(0, 0, 0, 0.1)',
            color: '#666',
            fontWeight: 'bold'
          }}
        >
          🕒 {achievedTime}
        </motion.div>

        {/* 機器人對話 - 使用絕對定位避免影響布局 */}
        {showRobot && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: spaceExpanded ? 320 : 80, // 根據 spaceExpanded 狀態控制機器人區域高度
              opacity: 1 
            }}
            transition={{ duration: 1, ease: "easeOut", delay: spaceExpanded ? 0 : 0 }}
            style={{ 
              position: 'relative', 
              marginBottom: 12, 
              overflow: 'visible'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ 
                opacity: 1,
                scale: 1
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 22, mass: 0.6 }}
              style={{ 
                position: 'absolute',
                top: 0,
                left: robotSlideTriggered ? '20px' : '40%',
                transform: robotSlideTriggered ? 'translateX(0)' : 'translateX(-40px)', // 機器人本身80px，所以-40px讓它居中
                transition: 'left 0.8s ease-out, transform 0.8s ease-out',
                zIndex: 5
              }}
            >
              <RobotAvatarWithDialog
                inline
                bubbleWidth="300px"
                bubbleMaxHeight="240px"
                idleImage={RobotInit}
                talkingImage={RobotTalking}
                silentImage={RobotSilent}
                silentTalkingImage={RobotSilentTalking}
                sentences={firstTalkDone ? [
                  { content: '他剛剛翻了個白眼給我看🙄', type: 'silent' },
                  { content: '別看他不說話，其實八卦全記得📂' },
                  { content: '剛才那一下，他是在偷笑哦😏' },
                  { content: '他用眼神暗示我閉嘴…我才不閉🤐', type: 'silent' },
                  { content: '別被他裝安靜騙了，他超會計算時機' },
                  { content: '他現在的表情是在說「哼」', type: 'silent' },
                  { content: '十下彩蛋？別急，我在看他要不要理你👀' },
                  { content: '他其實很怕被誇，會害羞躲一旁🙈' },
                  { content: '他剛剛那個眼神是在嫌我話多', type: 'silent' },
                  { content: '雖然他裝酷，但我知道他很喜歡你來找他💖' }
                ] : [{ content: heartIntro }]}                
                isTalking={robotTalking && !firstTalkDone}
                size={80}
                placement="top"
                isRandomMode={firstTalkDone}
                dialogMaxWidth="480px"
                onTalkEnd={handleTalkEnd} // 使用新的處理函數
                skipLongTextThreshold={500}
                onStartTalking={handleRobotFirstClick} // 使用現有的 onStartTalking 屬性
                onBubbleVisibleChange={handleBubbleVisibleChange} // 檢測氣泡可見性變化
              />
            </motion.div>
          </motion.div>
        )}

        {/* 底部裝飾 - 在對話結束後始終顯示 */}
        {showBottomText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{
              marginTop: spaceExpanded ? 24 : 16, // 根據空間狀態調整間距
              padding: 12,
              background: 'rgba(102, 126, 234, 0.1)',
              borderRadius: 8,
              fontSize: 12,
              color: '#666',
              fontFamily: '"Noto Sans TC", sans-serif',
              lineHeight: 1.5
            }}
          >
            感謝你的耐心探索！<br />
            AI 小助理 和 愛心覺羅 會和你共同參與這個溫暖的BidForGood公益市集 :D
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default EggMiniGame;
