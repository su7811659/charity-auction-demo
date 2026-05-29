import React from 'react';
import ReactionButton from './ReactionButton';
import { ReactionCount } from '../types/reaction';
import addIcon from '../assets/img/ic_add.svg';

interface ReactionListProps {
  reactions: ReactionCount[];
  userReactions: string[];
  onReactionClick: (reactionType: string) => void;
  onAddReactionClick: (event: React.MouseEvent) => void;
}

const ReactionList: React.FC<ReactionListProps> = ({ reactions, userReactions, onReactionClick, onAddReactionClick }) => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '8px' }}>
      {reactions.map(reaction => (
        <ReactionButton
          key={reaction.reaction_type}
          reaction={reaction}
          userHasReacted={userReactions.includes(reaction.reaction_type)}
          onClick={() => onReactionClick(reaction.reaction_type)}
        />
      ))}
      
      {/* 新增回應按鈕 - 只有在有回應時才顯示 */}
      {reactions.length > 0 && (
        <button
          onClick={onAddReactionClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            border: '0px solid transparent',
            borderRadius: '14px',
            padding: '0',
            width: '26px',
            height: '26px',  
            margin: '0 4px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 1px 2px 0 rgba(0,0,0,.4)',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
          }}
        >
          <img 
            src={addIcon} 
            alt="新增回應" 
            style={{ width: '16px', height: '16px' }} 
          />
        </button>
      )}
    </div>
  );
};

export default ReactionList;
