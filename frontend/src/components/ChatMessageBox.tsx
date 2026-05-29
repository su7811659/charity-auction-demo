import React, { useState, useEffect } from 'react';
import { Comment } from '../types/comment';
import { CommentReaction, ReactionCount } from '../types/reaction';
import ReactionList from './ReactionList';
import ReactionPopup from './ReactionPopup';
import addReactionIcon from '../assets/img/ic_comment_react_hover_add.svg';
import mmIcon from '../assets/img/mm.svg';
import settingsIcon from '../assets/img/ic_settings.svg';
import './ChatMessageBox.css';
import { getCommentReactions, createCommentReaction, deleteCommentReaction } from '../services/reactionService';
import { getCurrentUserEmail } from '../utils/authUtils';
import axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Divider, Tooltip, Dropdown } from 'antd';
import _ from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { updateMyProfile } from "../services/userService";
import { updateUserProfile } from "../store/userSlice";


dayjs.extend(utc);
dayjs.extend(timezone);

interface ChatMessageProps {
  id: number;
  username: string;
  message: string;
  time: string;
  avatar?: string;
  avatarLetter?: string;
  avatarColor?: string;
  email?: string;
  created_at?: string; // 新增，用於排序
}

interface ChatMessageBoxProps {
  productId?: number;
  productName?: string;
  initialMessages?: ChatMessageProps[];
  onSendMessage?: (message: string) => void;
}

const ChatMessageBox: React.FC<ChatMessageBoxProps> = ({
  productId,
  productName = '',
  initialMessages = [],
  onSendMessage
}) => {
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessageProps[]>(initialMessages);
  const [currentUser, setCurrentUser] = useState<{ 
    email: string; 
    username: string; 
    avatarLetter: string 
    avatar?: string
  } | null>(null);
  // 雖然本組件內只用於 API 操作，但仍需保存 
  const [, setCommentReactions] = useState<{ [key: number]: CommentReaction[] }>({});
  const [userReactions, setUserReactions] = useState<{ [key: number]: string[] }>({});
  const [reactionCounts, setReactionCounts] = useState<{ [key: number]: ReactionCount[] }>({});
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    commentId: number | null;
    position: { x: number; y: number }
  }>({
    isOpen: false,
    commentId: null,
    position: { x: 0, y: 0 }
  });
  const [currentTheme, setCurrentTheme] = useState<string>('#7066ad'); // 預設主題
  const [headerTheme, setHeaderTheme] = useState<string>('#574f8a'); // 預設主題
  const [dropdownVisible, setDropdownVisible] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    messageId?: number;
  }>({
    visible: false,
    position: { x: 0, y: 0 }
  });
  const [copyToast, setCopyToast] = useState<{
    visible: boolean;
    position: { x: number; y: number };
  }>({
    visible: false,
    position: { x: 0, y: 0 }
  });
  const userProfile = useSelector((state: RootState) => state.user?.profile);

  useEffect(() => {
    if (!userProfile) return;

    const styleIndex = userProfile.mm_style ?? 5;
    const selectedTheme = themes[styleIndex] || themes[5];
  
    setCurrentTheme(selectedTheme.color);
    setHeaderTheme(selectedTheme.subColor);

    setCurrentUser({
      email: userProfile.email,
      username: userProfile.email.split('@')[0],
      avatarLetter: userProfile.email.charAt(0).toUpperCase(),
      avatar: userProfile.avatar_url || undefined,
    });
  }, [userProfile]);

  // 監聽點擊事件來關閉右鍵選單
  useEffect(() => {
    const handleGlobalClick = () => {
      handleClickOutside();
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleGlobalClick);
    }

    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [contextMenu.visible]);

  // 從 API 獲取留言
  const fetchComments = async () => {
    if (!productId) return;

    try {
      const res = await axios.get(`/api/products/${productId}/comments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        }
      });

      // 將 API 返回的留言轉換為聊天訊息格式
      const chatMessages = res.data.map((comment: Comment) => ({
        id: comment.id,
        username: comment.email.split('@')[0],
        message: comment.content,
        time: dayjs.utc(comment.created_at).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm'),
        avatarLetter: comment.email.charAt(0).toUpperCase(),
        email: comment.email,
        created_at: comment.created_at, // 保存原始日期用於排序
        avatar: comment.avatar_url || undefined,
      }));

      // 依照留言時間排序（從舊到新）
      const sortedMessages = [...chatMessages].sort((b, a) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setMessages(sortedMessages);

      // 獲取每條留言的回應
      fetchAllReactions(sortedMessages);
    } catch (error) {
      console.error('載入留言失敗', error);
    }
  };

  // 從 API 獲取所有留言的回應
  const fetchAllReactions = async (chatMessages: ChatMessageProps[]) => {
    if (!chatMessages.length) return;

    const newCommentReactions: { [key: number]: CommentReaction[] } = {};
    const newUserReactions: { [key: number]: string[] } = {};
    const newReactionCounts: { [key: number]: ReactionCount[] } = {};

    // 獲取當前登入用戶的電子郵件
    const currentUserEmail = getCurrentUserEmail();

    // 使用 Promise.all 併發請求所有留言的反應，提高性能
    await Promise.all(
      chatMessages.map(async (message) => {
        if (!message.id) return;

        try {
          // 從 API 獲取單一留言的所有反應
          const reactions = await getCommentReactions(message.id);
          newCommentReactions[message.id] = reactions;

          // 從反應數據中找出用戶的反應類型
          const userReactionsForComment = reactions
            .filter((r: CommentReaction) => r.email === currentUserEmail)
            .map((r: CommentReaction) => r.reaction_type);
          newUserReactions[message.id] = userReactionsForComment;

          // 計算反應計數
          const reactionTypeCounts = calculateReactionCounts(reactions);
          newReactionCounts[message.id] = reactionTypeCounts;
        } catch (error) {
          console.error(`獲取留言 ${message.id} 的回應失敗`, error);
          // 如果獲取失敗，設置空數組作為預設值
          newCommentReactions[message.id] = [];
          newUserReactions[message.id] = [];
          newReactionCounts[message.id] = [];
        }
      })
    );

    // 一次性更新所有狀態
    setCommentReactions(newCommentReactions);
    setUserReactions(newUserReactions);
    setReactionCounts(newReactionCounts);
  };

  // 計算各類回應的數量和用戶
  const calculateReactionCounts = (reactions: CommentReaction[]): ReactionCount[] => {
    // 使用 Map 來分組和計算，比物件更適合此任務
    const reactionMap = new Map<string, { count: number, users: string[] }>();

    // 遍歷所有反應，按類型分組
    reactions.forEach((reaction: CommentReaction) => {
      // 如果這個類型還沒有記錄，先初始化
      if (!reactionMap.has(reaction.reaction_type)) {
        reactionMap.set(reaction.reaction_type, { count: 0, users: [] });
      }

      // 獲取當前計數和用戶列表
      const data = reactionMap.get(reaction.reaction_type)!;
      data.count += 1;
      data.users.push(reaction.email);
    });

    // 將 Map 轉換為數組返回
    return Array.from(reactionMap.entries()).map(([type, data]) => ({
      reaction_type: type,
      count: data.count,
      users: data.users
    }));
  };

  // 更新單一留言的回應狀態
  const updateCommentReactionState = async (commentId: number) => {
    try {
      // 獲取此留言的所有反應
      const reactions = await getCommentReactions(commentId);
      const currentUserEmail = getCurrentUserEmail();

      // 直接從 API 獲取的反應數據更新狀態
      setCommentReactions(prev => ({
        ...prev,
        [commentId]: reactions
      }));

      // 找出用戶對該留言的反應類型
      const userReactionsForComment = reactions
        .filter((r: CommentReaction) => r.email === currentUserEmail)
        .map((r: CommentReaction) => r.reaction_type);

      // 更新用戶反應狀態
      setUserReactions(prev => ({
        ...prev,
        [commentId]: userReactionsForComment
      }));

      // 計算並更新反應計數
      const reactionTypeCounts = calculateReactionCounts(reactions);
      setReactionCounts(prev => ({
        ...prev,
        [commentId]: reactionTypeCounts
      }));

      return reactions;
    } catch (error) {
      console.error(`更新留言 ${commentId} 的回應狀態失敗`, error);
      throw error;
    }
  };

  // 初始化時載入留言和產品資訊
  useEffect(() => {
    if (productId) {
      fetchComments();
    }
  }, [productId]);

  // 處理發送留言
  const handleSendMessage = async () => {
    if (inputValue.trim() && productId) {
      try {
        await axios.post(`/api/products/${productId}/comments`, { content: inputValue }, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
          }
        });

        // 發送成功後清空輸入框
        setInputValue('');

        // 重新載入留言
        fetchComments();

        // 如果有外部的回調函數，也呼叫它
        if (onSendMessage) {
          onSendMessage(inputValue);
        }
      } catch (error) {
        console.error('發送留言失敗', error);
      }
    }
  };

  // 處理回應操作 (點擊現有回應或選擇新回應)
  const handleReaction = async (commentId: number, reactionType: string) => {
    // 獲取用戶目前對此留言的反應狀態
    const commentUserReactions = userReactions[commentId] || [];
    const hasReacted = commentUserReactions.includes(reactionType);

    try {
      // 根據目前狀態執行相應的 API 操作
      if (hasReacted) {
        // 如果用戶已經做出此回應，則發送刪除請求
        await deleteCommentReaction(commentId, reactionType);
      } else {
        // 如果用戶尚未做出此回應，則發送新增請求
        await createCommentReaction(commentId, reactionType);
      }

      // API 操作後，重新獲取並更新最新的反應狀態
      await updateCommentReactionState(commentId);
    } catch (error) {
      console.error('處理回應失敗', error);
    }
  };

  // 處理點擊現有回應
  const handleReactionClick = async (commentId: number, reactionType: string) => {
    await handleReaction(commentId, reactionType);
  };

  // 處理選擇回應
  const handleReactionSelect = async (reactionType: string) => {
    if (!popupState.commentId) return;

    await handleReaction(popupState.commentId, reactionType);

    // 關閉彈出視窗
    setPopupState({ ...popupState, isOpen: false });
  };

  // 點擊添加回應按鈕
  const handleAddReactionClick = (commentId: number, event: React.MouseEvent) => {
    // 計算彈出視窗位置
    const rect = event.currentTarget.getBoundingClientRect();
    setPopupState({
      isOpen: true,
      commentId,
      position: {
        x: rect.left,
        y: rect.bottom + window.scrollY
      }
    });

    // 阻止事件冒泡，避免立即被外部點擊事件關閉
    event.stopPropagation();
  };

  // 處理右鍵選單
  const handleContextMenu = (messageId: number, event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      position: {
        x: event.clientX,
        y: event.clientY
      },
      messageId
    });
  };

  // 處理測試按鈕點擊
  const handleCopyAction = (event: React.MouseEvent) => {
    const message = messages.find(msg => msg.id === contextMenu.messageId);
    if (message?.message) {
      window.navigator.clipboard.writeText(message.message);
      
      // 顯示複製成功提示，從滑鼠位置出現
      setCopyToast({
        visible: true,
        position: {
          x: event.clientX,
          y: event.clientY
        }
      });

      // 2秒後自動隱藏提示
      setTimeout(() => {
        setCopyToast(prev => ({ ...prev, visible: false }));
      }, 2000);
    }
    
    setContextMenu({ ...contextMenu, visible: false });
  };

  // 點擊其他地方關閉右鍵選單
  const handleClickOutside = () => {
    if (contextMenu.visible) {
      setContextMenu({ ...contextMenu, visible: false });
    }
  };
  const themes = [
    { key: 0, label: '海水藍', color: '#0e5c9c', subColor: '#2382fe' },
    { key: 1, label: '天空藍', color: '#1e8bc3', subColor: '#19b5fe' },
    { key: 2, label: '青草綠', color: '#23a15d', subColor: '#2ecc71' },
    { key: 3, label: '活力黃', color: '#e6c231', subColor: '#d2aa0d' }, 
    { key: 4, label: '熱情紅', color: '#d24d57', subColor: '#b71c1c' },
    { key: 5, label: '皇家紫', color: '#7066ad', subColor: '#574f8a' },
    { key: 6, label: '典雅黑', color: '#6c7a89', subColor: '#2e3131' } 

  ]

  const handleThemeChange = async (color: string, subColor: string, index: number) => {
    setCurrentTheme(color);
    setHeaderTheme(subColor);
    setDropdownVisible(false); // 關閉下拉選單
  
    try {
      const updated = await updateMyProfile({ mm_style: index }); // 後端 PATCH 更新
      dispatch(updateUserProfile({ mm_style: updated.mm_style })); // Redux 局部更新
    } catch (err) {
      console.error("更新主題失敗", err);
    }
  };

  const themeMenu = (
    <div className="theme-menu">
      {themes.map(theme => (
        <div 
          key={theme.key} 
          onClick={() => handleThemeChange(theme.color, theme.subColor, theme.key)} 
          className="theme-menu-item"
        >
          {theme.label}
        </div>
        ))}
    </div>
  );

  const statusList = [
  '我要做公益',
  '出價支持善舉',
  '一起為愛競標',
  '做好事也能拍',
  '小錢成大愛',
  '出價傳遞溫暖',
  '公益無價，善行有你',
  '我為公益出手',
  '愛在拍賣中蔓延',
  '買的是物，送的是愛',
  '公益啦，不是敗家啦',
  '錢沒了，德行+1',
  '為善最樂，但好貴',
  '公益我懂，買東西我更懂',
  '錢沒了，但我很善良',
  '錢包哭了，但心是暖的',
  '我不是敗家，是在行善',
  '媽，我在買東西救世界！'
  ]

  const [userStatus] = useState<string>(_.sample(statusList) || '');

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      {/* 左側輸入卡片 */}
      <div style={{ 
        width: '300px',
        flexShrink: 0,
        background: "#555", 
        height: 'fit-content',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ alignItems: 'center', display: 'flex', padding: '0 8px', flexShrink: 0, backgroundColor: currentTheme, height: '30px' }}>
          <img
            src={mmIcon}
            alt="mm logo"
            style={{
              width: 24,
              height: 24,
              overflow: "hidden",
            }}
          />
          <span style={{ color: '#fff', margin: 0, fontSize: '14px', lineHeight:'20px', marginLeft: '8px' }}>Not MM</span>
          <Dropdown 
            overlay={themeMenu} 
            trigger={['click']} 
            placement="bottomRight"
            open={dropdownVisible}
            onOpenChange={setDropdownVisible}
          >
            <Tooltip title="設定主題" placement="top">
              <img
                src={settingsIcon}
                alt="Settings"
                className="settings-icon"
              />
            </Tooltip>
          </Dropdown>
        </div>
        <div>
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px 20px' }}>
              <div style={{ position: 'relative', marginRight: 10, flexShrink: 0 }}>
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt="avatar"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    objectFit: "cover"
                  }}
                />
              ) : (
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: "rgb(161, 175, 195)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: 18,
                }}>
                  {currentUser.avatarLetter}
                </div>
              )}

                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 12,
                  height: 12,
                  backgroundColor: '#0d5',
                  borderRadius: '50%',
                  border: '1px solid #555'
                }} />
              </div>
              <div style={{ display:'flex', color:'#fff', flexDirection: 'column' }}>
                <span style={{ fontWeight: "700", fontSize: '16px'}}>{currentUser.username}</span>
                <span style={{fontSize: '12px', opacity: '0.4'}}>{userStatus}</span>
              </div>
            </div>
          )}
          <Divider style={{  margin: '1px', borderColor: 'hsla(0,0%,100%,.1)'}}></Divider>
          <div style={{padding: '4px 20px'}}>

          <textarea
            placeholder="輸入你的留言..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{
              width: "100%",
              minHeight: '200px',
              padding: "10px",
              borderRadius: '4px',
              background: "#444",
              fontSize: 14,
              color: "#fff",
              boxSizing: "border-box",
              resize: 'vertical',
              marginBottom: '12px',
              border: 0
            }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            style={{
              width: '100%',
              padding: '10px',
              background: currentTheme,
              color: 'white',
              border: "none",
              borderRadius: '4px',
              fontSize: 14,
              cursor: "pointer",
              opacity: inputValue.trim() ? 1 : 0.7,
            }}
            disabled={!inputValue.trim()}
          >
            發送
          </button>
        </div>
      </div>

      {/* 右側聊天訊息區域 */}
      <div style={{ flex: 1, background: "#fafafa", border: "1px solid #e6e6e6", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ alignItems: 'center', display: 'flex', paddingLeft: '15px', borderBottom: '1px solid #e6e6e6', flexShrink: 0, backgroundColor: headerTheme, height: '30px' }}>
          <span style={{ color: '#fff', margin: 0, fontSize: '14px', lineHeight:'20px' }}>{productName} ({messages.length})</span>
        </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className="message-row"
              onContextMenu={(e) => handleContextMenu(msg.id, e)}
              style={{ cursor: 'context-menu' }}
            >
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                {msg.avatar ? (
                  <img
                    src={msg.avatar}
                    alt={msg.username}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      overflow: "hidden",
                      marginRight: 10,
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    overflow: "hidden",
                    marginRight: 10,
                    flexShrink: 0,
                    backgroundColor: "rgb(161, 175, 195)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 15
                  }}>
                    {msg.avatarLetter || msg.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontWeight: "500", fontSize: 14, color: "#333", opacity: 0.5 }}>{msg.username}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                      {msg.id && (
                        <span className="reaction-icon-wrapper">
                          <img
                            src={addReactionIcon}
                            alt="Add reaction"
                            onClick={(e) => handleAddReactionClick(msg.id, e)}
                            className="reaction-icon"
                          />
                        </span>
                      )}
                      <span style={{ color: "#9e9e9e", fontSize: 12 }}>{msg.time}</span>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: "#333",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    overflowWrap: "break-word"
                  }}>
                    {msg.message}
                  </div>

                  {/* 顯示回應列表 */}
                  {msg.id && (
                    <ReactionList
                      reactions={reactionCounts[msg.id] || []}
                      userReactions={userReactions[msg.id] || []}
                      onReactionClick={(reactionType) => handleReactionClick(msg.id, reactionType)}
                      onAddReactionClick={(e) => handleAddReactionClick(msg.id, e)}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 回應選擇彈出視窗 */}
        {popupState.isOpen && popupState.commentId && (
          <ReactionPopup
            commentId={popupState.commentId}
            onSelectReaction={handleReactionSelect}
            onClose={() => setPopupState({ ...popupState, isOpen: false })}
            position={popupState.position}
          />
        )}

        {/* 自定義右鍵選單 */}
        {contextMenu.visible && (
          <div
            style={{
              position: 'fixed',
              top: contextMenu.position.y,
              left: contextMenu.position.x,
              backgroundColor: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              minWidth: '120px',
              padding: '4px 0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onClick={handleCopyAction}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#333',
                transition: 'background-color 0.2s',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              這不是 MM 沒有其他功能，先給你一個複製留言功能
            </div>
          </div>
        )}

        {/* 複製成功提示 */}
        {copyToast.visible && (
          <div
            className="copy-success-toast"
            style={{
              top: copyToast.position.y,
              left: copyToast.position.x
            }}
          >
            複製成功！
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageBox;
