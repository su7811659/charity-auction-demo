import React, { useState, useEffect, useRef } from 'react';
import { Card, Avatar } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { useTranslation } from "react-i18next";

interface NewsReportAreaProps {
  content: string;
  onComplete?: () => void;
  lineLength?: number; // 每行字符數
  scrollSpeed?: number; // 滾動速度 (毫秒)
}

const NewsReportArea: React.FC<NewsReportAreaProps> = ({
  content,
  onComplete,
  lineLength = 30, // 預設每行30個字符
  scrollSpeed = 2000 // 預設每2秒滾動一行
}) => {
  const { t } = useTranslation();
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentLinesRef = useRef<string[]>([]);

  // 將內容分割為固定長度的行
  useEffect(() => {
    if (!content) return;

    const lines: string[] = [];
    let currentLine = '';
    
    // 將內容按字符分割，考慮中英文混合
    for (const char of content) {
      // 計算當前行的實際顯示長度（中文字符算2個長度）
      const currentLength = currentLine.split('').reduce((acc, c) => {
        return acc + (c.charCodeAt(0) > 255 ? 2 : 1);
      }, 0);
      
      const charLength = char.charCodeAt(0) > 255 ? 2 : 1;
      
      if (currentLength + charLength > lineLength && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine += char;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    contentLinesRef.current = lines;
    setDisplayedLines([]);
    setCurrentLineIndex(0);
    setIsScrolling(true);
  }, [content, lineLength]);

  // 滾動效果
  useEffect(() => {
    if (!isScrolling || currentLineIndex >= contentLinesRef.current.length) {
      if (currentLineIndex >= contentLinesRef.current.length && isScrolling) {
        setIsScrolling(false);
        onComplete?.();
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedLines(prev => {
        const newLines = [...prev, contentLinesRef.current[currentLineIndex]];
        // 最多顯示6行，超過的話移除最上面的行
        return newLines.slice(-6);
      });
      setCurrentLineIndex(prev => prev + 1);
    }, scrollSpeed);

    return () => clearTimeout(timer);
  }, [currentLineIndex, isScrolling, scrollSpeed, onComplete]);

  return (
    <Card
      style={{
        width: '100%',
        minHeight: '200px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
        border: '1px solid #e1e8ff',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(138, 43, 226, 0.1)'
      }}
      bodyStyle={{ padding: '16px' }}
    >
      {/* 機器人頭像和標題 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e1e8ff'
      }}>
        <Avatar
          size={40}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            marginRight: '12px'
          }}
          icon={<RobotOutlined />}
        />
        <div>
          <div style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '2px'
          }}>
            {t("AI 新聞播報員")}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#666'
          }}>
            {t("為您播報最新市集動態")}
          </div>
        </div>
      </div>

      {/* 新聞內容滾動區域 */}
      <div
        ref={containerRef}
        style={{
          minHeight: '120px',
          backgroundColor: '#f8faff',
          borderRadius: '8px',
          padding: '12px',
          border: '1px solid #e8f0ff',
          fontFamily: '"SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {displayedLines.map((line, index) => (
            <div
              key={`${currentLineIndex - displayedLines.length + index + 1}`}
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#2c3e50',
                padding: '2px 0',
                animation: 'slideInFromBottom 0.5s ease-out',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* 正在播報指示器 */}
        {isScrolling && (
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#666'
          }}>
            <span>{t("播報中")}</span>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#52c41a',
              animation: 'pulse 1.5s infinite'
            }} />
          </div>
        )}
      </div>
    </Card>
  );
};

// 添加樣式到全局
const globalStyles = `
  @keyframes slideInFromBottom {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(0.8);
    }
  }
`;

// 注入樣式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = globalStyles;
  if (!document.head.querySelector('style[data-news-report-styles]')) {
    styleElement.setAttribute('data-news-report-styles', 'true');
    document.head.appendChild(styleElement);
  }
}

export default NewsReportArea;
