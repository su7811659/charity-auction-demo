import axiosInstance from '../utils/axiosInstance';

// 取得留言的所有回應
export const getCommentReactions = async (commentId: number) => {
  try {
    const response = await axiosInstance.get(`/api/comments/${commentId}/reactions`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
      }
    });
    return response.data;
  } catch (error) {
    console.error('取得回應失敗', error);
    throw error;
  }
};

// 建立對留言的回應
export const createCommentReaction = async (commentId: number, reactionType: string) => {
  try {
    const response = await axiosInstance.post(`/api/comments/${commentId}/reactions`, {
      reaction_type: reactionType
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
      }
    });
    return response.data;
  } catch (error) {
    console.error('建立回應失敗', error);
    throw error;
  }
};

// 刪除對留言的回應
export const deleteCommentReaction = async (commentId: number, reactionType: string) => {
  try {
    const response = await axiosInstance.delete(`/api/comments/${commentId}/reactions/${reactionType}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
      }
    });
    return response.data;
  } catch (error) {
    console.error('刪除回應失敗', error);
    throw error;
  }
};
