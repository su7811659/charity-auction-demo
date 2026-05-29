// 導入所有反應圖標
import like from '../assets/img/ic_comment_like.svg';
import laugh from '../assets/img/ic_comment_laugh.svg';
import sad from '../assets/img/ic_comment_sad.svg';
import scared from '../assets/img/ic_comment_scared.svg';
import ok from '../assets/img/ic_comment_ok.svg';
import join from '../assets/img/ic_comment_join.svg';
import understand from '../assets/img/ic_comment_understand.svg';
import none from '../assets/img/ic_comment_none.svg';
import shock from '../assets/img/ic_comment_shock.png';
import heart from '../assets/img/if_comment_heart.png';

// 反應類型
export const REACTION_TYPES = [
  'like',     // 讚
  'scared',   // 驚訝
  'sad',      // 悲傷
  'understand', // 理解
  'laugh',    // 笑臉
  'join',     // 加入
  'none',     // 無
  'shock',    // 震驚
  'heart',
  'ok',       // OK
] as const;

export type ReactionType = typeof REACTION_TYPES[number];

// 反應圖標映射
export const REACTION_ICONS: Record<ReactionType, string> = {
  like,
  laugh,
  sad,
  scared,
  heart,
  ok,
  join,
  understand,
  none,
  shock,
};

// 反應名稱映射
export const REACTION_NAMES: Record<ReactionType, string> = {
  like: '讚',
  laugh: '笑臉',
  sad: '悲傷',
  scared: '驚訝',
  heart: '已檢查',
  ok: 'OK',
  join: '加入',
  understand: '理解',
  none: '無',
  shock: '震驚',
};
