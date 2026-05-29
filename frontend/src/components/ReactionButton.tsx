import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import { Tooltip } from 'antd';
import { ReactionCount } from '../types/reaction';
import { REACTION_ICONS, REACTION_NAMES } from '../constants/reactionIcons';
import { getCurrentUserEmail } from '../utils/authUtils';

interface ReactionButtonProps {
  reaction: ReactionCount;
  userHasReacted: boolean;
  onClick: () => void;
}

const ReactionButton: React.FC<ReactionButtonProps> = ({ reaction, userHasReacted, onClick }) => {
  const { t } = useTranslation();
  const [isHovering, setIsHovering] = useState(false);
  const currentUserEmail = getCurrentUserEmail();
  const currentUserIndex = (reaction.users ?? []).findIndex(email => email === currentUserEmail);
  const hasUserReacted = currentUserIndex !== -1;
  
  // 準備 tooltip 顯示的用戶列表
  const formatUsers = () => {
    if (!reaction.users || reaction.users.length === 0) return t("沒有人做出此回應");
    
    
    // 處理顯示的用戶列表
    let usersToDisplay = [...reaction.users];
    
    // 如果當前用戶有參與，將其移到第一位
    if (hasUserReacted) {
      usersToDisplay.splice(currentUserIndex, 1);
      usersToDisplay.unshift(currentUserEmail);
    }
    
    // 取前三個用戶
    const displayUsers = usersToDisplay.slice(0, 3).map(email => {
      if (email === currentUserEmail) {
        return t("你");
      } else {
        return email.split('@')[0];
      }
    });
    
    let usersText = displayUsers.join('、');
    
    // 如果還有其他人，顯示剩餘人數
    if (reaction.users.length > 3) {
      usersText += t(" 和其他 {{count}} 人", { count: reaction.users.length - 3 });
    }
    
    return usersText;
  };
  
  return (
    <Tooltip 
      title={
        <div style={{ textAlign: 'center' }}>
          <div>{formatUsers()}</div>
          {userHasReacted && <div style={{ marginTop: '4px', color: '#999' }}>{t("（再次點擊取消回應）")}</div>}
        </div>
      }
    >
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: isHovering ? '#eee' : '#fff',
          border: '0 solid transparent',
          borderRadius: '14px',
          padding: '4px 10px',
          margin: '0 4px',
          cursor: 'pointer',
          transition: 'all 0.3s',
          boxShadow: !hasUserReacted ? '0 1px 2px 0 rgba(0,0,0,.4)':'0 0 1px 0 rgba(0,0,0,.2)',
          justifyContent: 'center',
          height: '26px',
          width: '48px',
          outline: 'none',
          color: !hasUserReacted ? '#2382fe' : '#000',
        }}
      >
        <img 
          src={REACTION_ICONS[reaction.reaction_type as keyof typeof REACTION_ICONS]} 
          alt={REACTION_NAMES[reaction.reaction_type as keyof typeof REACTION_NAMES] || reaction.reaction_type} 
          style={{ width: '16px', height: '16px', marginRight: '4px' }} 
        />
        <span style={{ fontSize: '14px' }}>{reaction.count}</span>
      </button>
    </Tooltip>
  );
};

export default ReactionButton;
