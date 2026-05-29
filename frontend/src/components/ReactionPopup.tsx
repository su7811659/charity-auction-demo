import React, { useEffect, useRef } from 'react';
import { REACTION_TYPES, REACTION_ICONS } from '../constants/reactionIcons';

interface ReactionPopupProps {
  commentId: number;
  onSelectReaction: (reaction: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

const ReactionPopup: React.FC<ReactionPopupProps> = ({ 
  onSelectReaction, 
  onClose,
  position
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  // 點擊彈出視窗外部時關閉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div 
      ref={popupRef}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        background: '#fff',
        boxShadow: '0 2px 4px 0 rgba(0,0,0,.4)',
        borderRadius: '8px',
        zIndex: 1000,
        width: '240px',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {REACTION_TYPES.map(reaction => {
          return (
            <div 
              key={reaction}
              onClick={() => onSelectReaction(reaction)}
              style={{
                cursor: 'pointer',
                opacity: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                background: 'transparent',
                transition: 'all 0.3s',
                position: 'relative',
                width: '40px',
                height: '40px',
                margin: '4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <img 
                src={REACTION_ICONS[reaction as keyof typeof REACTION_ICONS]} 
                alt={reaction} 
                style={{ width: '24px', height: '24px' }} 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReactionPopup;
