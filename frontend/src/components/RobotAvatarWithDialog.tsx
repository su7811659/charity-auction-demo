import React, { useEffect, useState } from "react";
import { Image, Popover } from "antd";
import ReactMarkdown from 'react-markdown';
import { typewriter } from "../utils/typewriter";
import { tickleRobot } from "../services/userService";
import RobotInit from "../assets/img/robot_init.gif";
import RobotTalking from "../assets/img/robot_talking.gif";
import RobotSilent from "../assets/img/robot_silent.gif";
import RobotSilentTalking from "../assets/img/robot_silent_talking.gif";
import RobotThinking from "../assets/img/robot_thinking.gif";

type PopoverPlacement = "left" | "right" | "top" | "bottom" | "leftTop" | "leftBottom" | "rightTop" | "rightBottom" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
type RobotType = "normal" | "silent" | "thinking";

export interface RobotSentence {
  content: string;
  type?: RobotType;
  skipTalk?: boolean | false;
}

interface RobotAvatarWithDialogProps {
  idleImage?: string;
  talkingImage?: string;
  silentImage?: string;
  silentTalkingImage?: string;
  thinkingImage?: string;
  sentences: RobotSentence[];
  imageOverride?: string;
  setImageOverride?: (src: string) => void;
  size?: number;
  offsetX?: number;
  offsetY?: number;
  hoverScale?: number;
  placement?: PopoverPlacement;
  dialogMaxWidth?: string;
  dialogMaxHeight?: string;
  isRandomMode?: boolean;
  isTalking?: boolean;
  onTalkEnd?: () => void;
  disableCursor?: boolean;
  disableShadow?: boolean;
  disableTickle?: boolean;
  inline?: boolean;               // 新增：是否使用內嵌模式（不使用 Popover）
  bubbleWidth?: string;           // 內嵌模式下氣泡寬度
  bubbleMaxHeight?: string;       // 內嵌模式下最大高度（超過出現 scrollbar）
  onStartTalking?: () => void;    // 新增：開始講話回調（第一下點擊時可用來觸發位移）
  skipLongTextThreshold?: number; // 新增：超過字數才顯示閉嘴
  onBubbleVisibleChange?: (visible: boolean) => void; // 新增：對話框可見性變化回調
  mountToBody?: boolean;         // 新增：將 Popover 掛到 body，避免被父層裁切
  popoverZIndex?: number;        // 新增：自訂 Popover 的 z-index
  skipTalkAnimation?: boolean;   // 跳過講話動畫
}

const offsetMap: Record<string, [number, number]> = {
  left: [-10, 0],
  right: [10, 0],
  top: [0, -12],
  bottom: [0, 12],
  leftTop: [-10, 12],
  leftBottom: [-10, -12],
  rightTop: [10, 10],
  rightBottom: [10, -12],
  topLeft: [13, -10],
  topRight: [13, -10],
  bottomLeft: [13, 10],
  bottomRight: [13, 10],
};

const RobotAvatarWithDialog: React.FC<RobotAvatarWithDialogProps> = ({
  idleImage = RobotInit,
  talkingImage = RobotTalking,
  silentImage = RobotSilent,
  silentTalkingImage = RobotSilentTalking,
  thinkingImage = RobotThinking,
  sentences,
  imageOverride,
  setImageOverride,
  size = 64,
  offsetX,
  offsetY,
  hoverScale = 1.08,
  placement = "rightTop",
  dialogMaxWidth = "240px",
  dialogMaxHeight = "auto",
  isRandomMode = true,
  isTalking = false,
  onTalkEnd,
  disableCursor = false,
  disableShadow = false,
  disableTickle = false,
  inline = false,
  bubbleWidth = '260px',
  bubbleMaxHeight = '260px',
  onStartTalking,
  skipLongTextThreshold = 400,
  onBubbleVisibleChange,
  mountToBody = false,
  popoverZIndex = 9,
  skipTalkAnimation = false,
}) => {
  const [internalImage, setInternalImage] = useState(idleImage);
  const image = imageOverride ?? internalImage;
  const setImage = setImageOverride ?? setInternalImage;

  const [visibleState, setVisibleState] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // 創建帶有回調的 setVisible 函數
  const setVisible = (newVisible: boolean) => {
    setVisibleState(newVisible);
    if (onBubbleVisibleChange) {
      onBubbleVisibleChange(newVisible);
    }
  };

  // 使用 visibleState 作為實際的 visible 值
  const visible = visibleState;

  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const cancelRef = React.useRef<() => void | undefined>(undefined);
  const bubbleElRef = React.useRef<HTMLDivElement | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const talkEndedRef = React.useRef(false);

  const handleTalkAnimation = async (content: string, type: RobotType) => {
    let talking = talkingImage;
    let idle = idleImage;
    switch (type) {
      case "silent":
        talking = silentTalkingImage;
        idle = silentImage;
        break;
      case "thinking":
        talking = thinkingImage;
        idle = thinkingImage;
        break;
      default:
        talking = talkingImage;
        idle = idleImage;
        break;
    }

    if (onStartTalking) onStartTalking();
    setVisible(true);
    setBubbleText("");
    setIsTyping(true);
    await typewriter(
      content,
      (val) => {
        setBubbleText(val);
        if (bubbleElRef.current) {
          bubbleElRef.current.scrollTop = bubbleElRef.current.scrollHeight;
        }
      },
      setImage,
      talking,
      idle,
      25,
      true,
      false,
      (cancel) => { cancelRef.current = cancel; }
    );
    setIsTyping(false);
    if (!talkEndedRef.current) {
      talkEndedRef.current = true;
      if (onTalkEnd) onTalkEnd();
    }
  };

  const handleClick = async () => {
    if (isTalking || sentences.length === 0) return;
    if (visible) {
      setVisible(false);
      setBubbleText("");
      return;
    }

    // 調用 tickle API 記錄點擊次數（僅在未禁用時）
    if (!disableTickle) {
      try {
        await tickleRobot();
      } catch (error) {
        console.error("Failed to tickle robot:", error);
      }
    }

    let newIndex = Math.floor(Math.random() * sentences.length);
    if (sentences.length > 1 && newIndex === lastIndex) {
      newIndex = (newIndex + 1) % sentences.length;
    }
    setLastIndex(newIndex);

    const { content, type = "normal" } = isRandomMode ? sentences[newIndex] : sentences[0];
    handleTalkAnimation(content, type);
  };

  const stopTypingAutomation = () => {
    if (sentences[0]) {
      if (cancelRef.current) cancelRef.current(); // 停止打字動畫
      setBubbleText(sentences[0].content); // 設置完整的對話內容
      setImage(idleImage); // 切換到靜止圖片
      setIsTyping(false); // 停止打字狀態
      if (!talkEndedRef.current) {
        talkEndedRef.current = true;
        if (onTalkEnd) onTalkEnd(); // 執行結束回調
      }
      if (bubbleElRef.current) {
        bubbleElRef.current.scrollTop = bubbleElRef.current.scrollHeight; // 滾動到對話框底部
      }
    }
  };

  useEffect(() => {
    // 自動講話：不再強制需要 onTalkEnd
    if (
      isTalking &&
      sentences.length === 1 &&
      !isTyping &&
      bubbleText === '' &&
      !visible
    ) {
      const { content, type = 'normal' } = sentences[0];
      handleTalkAnimation(content, type).then(() => {
        if (onTalkEnd) onTalkEnd();
      });
    }
  }, [isTalking, sentences, isTyping, bubbleText, visible]);
  // 點擊外部關閉 (inline 模式)
  useEffect(() => {
    if (!inline) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node) && visible && !isTyping) {
        setVisible(false);
        setBubbleText('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [inline, visible, isTyping]);

  useEffect(() => {
    if (!skipTalkAnimation) return;
    stopTypingAutomation();
  }, [skipTalkAnimation]);

  // Precompute hover scaling to avoid blur: render at max size, downscale initially
  const maxScale = hoverScale || 1;
  const initialScale = 1 / maxScale;
  const renderedSize = Math.round(size * maxScale);

  return inline ? (
    <div ref={rootRef} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div
        style={{
          width: size,
          height: size,
          position: 'relative',
          cursor: disableCursor ? 'default' : 'pointer',
          transition: 'transform 0.3s ease-in-out'
        }}
        onClick={handleClick}
      >
        <Image
          style={{
            borderRadius: '50%',
            backgroundColor: '#F0F0F0',
            transform: 'translate(0, -3px)'
          }}
          src={image}
          alt="robot status"
          width={size}
          height={size}
          preview={false}
        />
      </div>
      {(visible || isTalking || bubbleText) && (
        <div style={{
          position: 'relative',
          width: bubbleWidth,
          maxWidth: bubbleWidth,
          background: '#FFFFFF',
          borderRadius: 12,
            padding: '32px 16px 16px 16px',
          boxShadow: disableShadow ? 'none' : '0 4px 16px rgba(0,0,0,0.12)',
          fontSize: 14,
          lineHeight: 1.5,
          overflow: 'hidden',
          textAlign: 'left'
        }}>
          {(isTyping || (bubbleText && bubbleText.length > 0 && bubbleText !== (sentences[0]?.content || ''))) &&
           sentences[0] && sentences[0].content.length >= skipLongTextThreshold && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                stopTypingAutomation();
              }}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: 'rgba(0,0,0,0.55)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
                lineHeight: 1.4,
                backdropFilter: 'blur(4px)'
              }}
            >閉嘴</button>
          )}
          <div ref={(el) => { bubbleElRef.current = el; }} style={{
            maxHeight: bubbleMaxHeight,
            overflowY: 'auto',
            paddingRight: 4,
            scrollbarWidth: 'thin'
          }}>
            <ReactMarkdown
              components={{
                p: ({children}) => <div style={{margin: '8px 0', lineHeight: '1.6'}}>{children}</div>,
                strong: ({children}) => <strong style={{fontWeight: 'bold', color: '#1890ff'}}>{children}</strong>,
                li: ({children}) => <li style={{margin: '4px 0', lineHeight: '1.5'}}>{children}</li>,
                ul: ({children}) => <ul style={{paddingLeft: '16px', margin: '8px 0'}}>{children}</ul>
              }}
            >
              {bubbleText || '...'}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  ) : (
    <Popover
      content={
        <div style={{ 
          fontSize: 14, 
          maxHeight: sentences.length === 1 && sentences[0].content.length > 500 ? '300px' : 'auto',
          overflowY: sentences.length === 1 && sentences[0].content.length > 500 ? 'auto' : 'visible',
          padding: '4px 0'
        }}>
          <div style={{ 
            lineHeight: '1.5',
            marginBottom: sentences.length === 1 && sentences[0].content.length > 500 ? '8px' : '0'
          }}>
            <ReactMarkdown
              components={{
                p: ({children}) => <div style={{margin: '8px 0', lineHeight: '1.6'}}>{children}</div>,
                strong: ({children}) => <strong style={{fontWeight: 'bold', color: '#1890ff'}}>{children}</strong>,
                li: ({children}) => <li style={{margin: '4px 0', lineHeight: '1.5'}}>{children}</li>,
                ul: ({children}) => <ul style={{paddingLeft: '16px', margin: '8px 0'}}>{children}</ul>
              }}
            >
              {bubbleText || "..."}
            </ReactMarkdown>
          </div>
        </div>
      }
      open={visible}
      placement={placement}
      arrow={true}
      destroyTooltipOnHide={true}
      getPopupContainer={mountToBody ? () => document.body : (node) => node.parentElement!}
      styles={{
        root: {
          maxWidth: dialogMaxWidth,
          zIndex: popoverZIndex,
          borderRadius: 8,
          backgroundColor: 'white',
        },
        body: {
          maxHeight: dialogMaxHeight,
          overflow: 'hidden auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'whitesmoke transparent',
        },
      } as any}
      classNames={{ 
        root: disableShadow ? 'custom-popover' : undefined
      }}
      align={{
        offset: [offsetX || offsetMap[placement][0] || 0, offsetY || offsetMap[placement][1] || 0],
        overflow: {
          adjustX: false,
          adjustY: false
        }
      }}
      trigger="click"
      onOpenChange={handleClick}
    >
      <div
        style={{
          width: size,
          height: size,
          position: "relative",
          cursor: disableCursor ? "default" : "pointer",
          transition: "transform 0.3s ease-in-out",
          willChange: "transform",
          overflow: 'visible' // allow slight enlargement without clipping
        }}
      >
        <Image
          style={{
            borderRadius: "50%",
            backgroundColor: "#F0F0F0",
            transform: `translateZ(0) translate(0, -3px) scale(${initialScale})`,
            transformOrigin: 'center center',
            imageRendering: "auto",
            filter: "none",
            willChange: "transform",
            backfaceVisibility: "hidden",
          }}
          src={image}
          alt="robot status"
          width={renderedSize}
          height={renderedSize}
          preview={false}
          draggable={false}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLImageElement).style.transform = `translateZ(0) translate(0, -3px) scale(1)`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLImageElement).style.transform = `translateZ(0) translate(0, -3px) scale(${initialScale})`;
          }}
        />
      </div>
    </Popover>
  );
};

export default RobotAvatarWithDialog;
