export interface CommentReaction {
  id: number;
  comment_id: number;
  email: string;
  reaction_type: string;
  created_at: string;
}

export interface CommentWithReactions extends Comment {
  reactions?: CommentReaction[];
  userReactions?: string[]; // 用戶對此留言的回應類型
}

export interface ReactionCount {
  reaction_type: string;
  count: number;
  users?: string[]; // 有做出此回應的使用者列表
}

// 從已有的 Comment 介面擴展
import { Comment } from './comment';
