import React, { useState, useEffect } from "react";
import { Comment } from "../types/comment";
import { CommentReaction, ReactionCount } from "../types/reaction";
import ReactionList from "./ReactionList";
import ReactionPopup from "./ReactionPopup";
import { getCommentReactions, createCommentReaction, deleteCommentReaction } from "../services/reactionService";
import { getCurrentUserEmail } from "../utils/authUtils";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// 初始化 dayjs 插件
dayjs.extend(utc);
dayjs.extend(timezone);

interface CommentListProps {
  comments: Comment[];
}

const CommentList: React.FC<CommentListProps> = ({ comments }) => {
  const [commentReactions, setCommentReactions] = useState<{ [key: number]: CommentReaction[] }>({});
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

  // 從 API 獲取留言回應數據的函數
  const fetchReactions = async () => {
    const newCommentReactions: { [key: number]: CommentReaction[] } = {};
    const newUserReactions: { [key: number]: string[] } = {};
    const newReactionCounts: { [key: number]: ReactionCount[] } = {};
    
    // 獲取當前用戶的 email
    const currentUserEmail = getCurrentUserEmail();
    
    for (const comment of comments) {
      try {
        const reactions = await getCommentReactions(comment.id);
        newCommentReactions[comment.id] = reactions;
        
        // 分析用戶回應 - 從 API 返回的資料中判斷當前用戶點過哪些回應
        const userReactionsForComment = reactions
          .filter((r: CommentReaction) => r.email === currentUserEmail)
          .map((r: CommentReaction) => r.reaction_type);
        newUserReactions[comment.id] = userReactionsForComment;
          
        // 計算每種回應類型的數量和用戶
        const reactionTypeCounts: { [key: string]: { count: number, users: string[] } } = {};
        reactions.forEach((reaction: CommentReaction) => {
          if (!reactionTypeCounts[reaction.reaction_type]) {
            reactionTypeCounts[reaction.reaction_type] = { count: 0, users: [] };
          }
          reactionTypeCounts[reaction.reaction_type].count += 1;
          reactionTypeCounts[reaction.reaction_type].users.push(reaction.email);
        });
          
        newReactionCounts[comment.id] = Object.entries(reactionTypeCounts).map(([type, data]) => ({
          reaction_type: type,
          count: data.count,
          users: data.users
        }));
      } catch (error) {
        console.error(`獲取留言 ${comment.id} 的回應失敗`, error);
      }
    }
      
    setCommentReactions(newCommentReactions);
    setUserReactions(newUserReactions);
    setReactionCounts(newReactionCounts);
  };
  
  // 當留言列表改變時，獲取每個留言的回應
  useEffect(() => {
    if (comments.length > 0) {
      fetchReactions();
    }
  }, [comments]);

  // 處理點擊添加回應按鈕
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

  // 處理選擇回應
  const handleReactionSelect = async (reactionType: string) => {
    if (!popupState.commentId) return;
    
    const commentId = popupState.commentId;
    const commentUserReactions = userReactions[commentId] || [];
    
    // 檢查是否已經有這個回應，如果有則刪除它
    if (commentUserReactions.includes(reactionType)) {
      try {
        await deleteCommentReaction(commentId, reactionType);
        
        // 更新本地狀態
        const currentUserEmail = getCurrentUserEmail();
        
        // 從回應列表中移除
        const updatedReactions = (commentReactions[commentId] || []).filter(
          r => !(r.email === currentUserEmail && r.reaction_type === reactionType)
        );
        
        setCommentReactions({
          ...commentReactions,
          [commentId]: updatedReactions
        });
        
        // 更新用戶回應
        const updatedUserReactions = commentUserReactions.filter(r => r !== reactionType);
        setUserReactions({
          ...userReactions,
          [commentId]: updatedUserReactions
        });
        
        // 更新回應計數
        const counts = [...(reactionCounts[commentId] || [])];
        const existingCount = counts.find(c => c.reaction_type === reactionType);
        
        if (existingCount) {
          existingCount.count -= 1;
          existingCount.users = (existingCount.users || []).filter(email => email !== currentUserEmail);
          
          // 如果計數為 0，移除此回應類型
          if (existingCount.count === 0) {
            const updatedCounts = counts.filter(c => c.reaction_type !== reactionType);
            setReactionCounts({
              ...reactionCounts,
              [commentId]: updatedCounts
            });
          } else {
            setReactionCounts({
              ...reactionCounts,
              [commentId]: counts
            });
          }
        }
      } catch (error) {
        console.error('刪除回應失敗', error);
      }
    } else {
      // 這是新增回應的情況
      try {
        await createCommentReaction(commentId, reactionType);
        
        // 更新本地狀態
        const reactions = [...(commentReactions[commentId] || [])];
        const currentUserEmail = getCurrentUserEmail();
        
        const newReaction: CommentReaction = {
          id: Date.now(), // 臨時 ID，實際上會從伺服器返回
          comment_id: commentId,
          email: currentUserEmail,
          reaction_type: reactionType,
          created_at: new Date().toISOString()
        };
        
        reactions.push(newReaction);
        setCommentReactions({
          ...commentReactions,
          [commentId]: reactions
        });
        
        // 更新用戶回應
        const userReactionsForComment = [...(userReactions[commentId] || [])];
        userReactionsForComment.push(reactionType);
        setUserReactions({
          ...userReactions,
          [commentId]: userReactionsForComment
        });
        
        // 更新回應計數
        const counts = [...(reactionCounts[commentId] || [])];
        const existingCount = counts.find(c => c.reaction_type === reactionType);
        
        if (existingCount) {
          existingCount.count += 1;
          existingCount.users = [...(existingCount.users || []), currentUserEmail];
        } else {
          counts.push({
            reaction_type: reactionType,
            count: 1,
            users: [currentUserEmail]
          });
        }
        
        setReactionCounts({
          ...reactionCounts,
          [commentId]: counts
        });
      } catch (error) {
        console.error('添加回應失敗', error);
      }
    }
    
    // 關閉彈出視窗
    setPopupState({ ...popupState, isOpen: false });
    
    // 重新獲取最新的回應數據
    fetchReactions();
  };

  // 處理點擊現有回應
  const handleReactionClick = async (commentId: number, reactionType: string) => {
    const commentUserReactions = userReactions[commentId] || [];
    
    // 如果用戶已經做出此回應，則刪除；否則添加
    if (commentUserReactions.includes(reactionType)) {
      try {
        await deleteCommentReaction(commentId, reactionType);
        
        // 更新本地狀態
        const currentUserEmail = getCurrentUserEmail();
        
        // 從回應列表中移除
        const updatedReactions = (commentReactions[commentId] || []).filter(
          r => !(r.email === currentUserEmail && r.reaction_type === reactionType)
        );
        
        setCommentReactions({
          ...commentReactions,
          [commentId]: updatedReactions
        });
        
        // 更新用戶回應
        const updatedUserReactions = commentUserReactions.filter(r => r !== reactionType);
        setUserReactions({
          ...userReactions,
          [commentId]: updatedUserReactions
        });
        
        // 更新回應計數
        const counts = [...(reactionCounts[commentId] || [])];
        const existingCount = counts.find(c => c.reaction_type === reactionType);
        
        if (existingCount) {
          existingCount.count -= 1;
          existingCount.users = (existingCount.users || []).filter(email => email !== currentUserEmail);
          
          // 如果計數為 0，移除此回應類型
          if (existingCount.count === 0) {
            const updatedCounts = counts.filter(c => c.reaction_type !== reactionType);
            setReactionCounts({
              ...reactionCounts,
              [commentId]: updatedCounts
            });
          } else {
            setReactionCounts({
              ...reactionCounts,
              [commentId]: counts
            });
          }
        }
      } catch (error) {
        console.error('刪除回應失敗', error);
      }
    } else {
      // 這是新增回應的情況
      try {
        await createCommentReaction(commentId, reactionType);
        
        // 更新本地狀態
        const reactions = [...(commentReactions[commentId] || [])];
        const currentUserEmail = getCurrentUserEmail();
        
        const newReaction: CommentReaction = {
          id: Date.now(), // 臨時 ID，實際上會從伺服器返回
          comment_id: commentId,
          email: currentUserEmail,
          reaction_type: reactionType,
          created_at: new Date().toISOString()
        };
        
        reactions.push(newReaction);
        setCommentReactions({
          ...commentReactions,
          [commentId]: reactions
        });
        
        // 更新用戶回應
        const userReactionsForComment = [...(userReactions[commentId] || [])];
        userReactionsForComment.push(reactionType);
        setUserReactions({
          ...userReactions,
          [commentId]: userReactionsForComment
        });
        
        // 更新回應計數
        const counts = [...(reactionCounts[commentId] || [])];
        const existingCount = counts.find(c => c.reaction_type === reactionType);
        
        if (existingCount) {
          existingCount.count += 1;
          existingCount.users = [...(existingCount.users || []), currentUserEmail];
        } else {
          counts.push({
            reaction_type: reactionType,
            count: 1,
            users: [currentUserEmail]
          });
        }
        
        setReactionCounts({
          ...reactionCounts,
          [commentId]: counts
        });
      } catch (error) {
        console.error('添加回應失敗', error);
      }
    }
    
    // 重新獲取最新的回應數據
    fetchReactions();
  };

  if (!comments.length) return (
    <div style={{
      textAlign: "center",
      padding: "40px 20px",
      color: "#999",
      fontSize: "16px",
      background: "#f9f9f9",
      borderRadius: "8px"
    }}>
      目前沒有留言，來當第一個留言的人吧！ 💬
    </div>
  );

  return (
    <div style={{ maxHeight: "400px", overflowY: "auto", padding: "10px" }}>
      {comments.map((c) => (
        <div
          key={c.id}
          id={`comment-${c.id}`}
          style={{
            background: "#e0e0e0",
            borderRadius: "15px",
            padding: "10px 15px",
            marginBottom: "10px",
            maxWidth: "80%",
            wordBreak: "break-word",
            boxShadow: "0 1px 1px rgba(0,0,0,0.1)"
          }}
        >
          <div style={{
            fontSize: "14px",
            fontWeight: "bold",
            color: "#333",
            marginBottom: "5px"
          }}>
            {c.email}
          </div>
          <div style={{
            fontSize: "15px",
            color: "#555",
            lineHeight: "1.4",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            overflowWrap: "break-word"
          }}>
            {c.content}
          </div>
          <div style={{
            fontSize: "10px",
            color: "#777",
            textAlign: "right",
            marginTop: "5px"
          }}>
            {dayjs.utc(c.created_at).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm')}
          </div>
          
          {/* 顯示回應列表 */}
          <ReactionList
            reactions={reactionCounts[c.id] || []}
            userReactions={userReactions[c.id] || []}
            onReactionClick={(reactionType) => handleReactionClick(c.id, reactionType)}
            onAddReactionClick={(e) => handleAddReactionClick(c.id, e)}
          />
        </div>
      ))}
      
      {/* 回應選擇彈出視窗 */}
      {popupState.isOpen && popupState.commentId && (
        <ReactionPopup
          commentId={popupState.commentId}
          onSelectReaction={handleReactionSelect}
          onClose={() => setPopupState({ ...popupState, isOpen: false })}
          position={popupState.position}
        />
      )}
    </div>
  );
};

export default CommentList;
