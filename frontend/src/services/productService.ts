import qs from 'qs';
import sessionService from './sessionService';
import { GetProductsParams, CreateProductRequest, UpdateProductRequest } from '../types/productApiTypes';
import axiosInstance from '../utils/axiosInstance';


const APIS = {
  PRODUCT: '/api/products',
  QUERY_PRODUCT: '/api/products/query',
  SUBMIT_PRODUCT: '/api/submit_product',
  APPROVE_PRODUCT: '/api/approve_product',
  TOTAL_DONATION: '/api/products/total_donation',
  TOP_DONORS: '/api/products/top_donors',
  TOP_LIKED_PRODUCTS: '/api/products/summary/top-liked',
  TOP_COMMENTED_PRODUCTS: '/api/products/summary/top-commented',
  TOP_VIEWED_PRODUCTS: '/api/products/summary/top-viewed', // 新增
  PRODUCT_STATS: '/api/products/stats',
  LEGENDARY_STATS: '/api/products/legendary-stats',
};

export async function listProducts(
  params: GetProductsParams,
  failCallback: (error: object) => { items: any[]; total: number }
): Promise<{ items: any[]; total: number }> {
  try {
    const queryStr = qs.stringify({
      seller_name: params.sellerName,
      seller_nickname: params.sellerNickname,
      min_price: params.minPrice,
      max_price: params.maxPrice,
      strquery: params.strquery,
      order_by: params.orderBy,
      limit: params.limit,
      offset: params.offset,
      is_approve: params.isApprove,
      is_rejected: params.isRejected,
      product_status: params.productStatus,
    });

    const result = await axiosInstance({
      method: 'get',
      url: `${APIS.PRODUCT}?${queryStr}`,
      headers: {
        'accept': 'application/json',
      }
    });

    return {
      items: result.data.items,
      total: result.data.total,
    };
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export interface QueryProductsParams {
  userQuery: string;
}

export async function queryProducts(
  params: QueryProductsParams,
  failCallback: (error: object) => void
) {
  try {
    const { userQuery } = params;
    const result = await axiosInstance({
      method: 'post',
      url: APIS.QUERY_PRODUCT,
      params: {
        user_query: userQuery,
      },
      headers: {
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function getProduct(
  productId: number,
  failCallback: (error: object) => void,
  incrementView: boolean = true
) {
  try {
    const result = await axiosInstance({
      method: 'get',
      url: `${APIS.PRODUCT}/${productId}`,
      params: {
        increment_view: incrementView
      },
      headers: {
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function updateProduct(
  productId: number,
  updateData: UpdateProductRequest,
  failCallback: (error: object) => void
) {
  try {
    const token = sessionService.getToken();
    const data = {
      seller_name: updateData.sellerName ?? null,
      seller_nickname: updateData.sellerNickname ?? null,
      product_name: updateData.productName ?? null,
      price: updateData.price ?? null,
      condition: updateData.condition ?? null,
      description: updateData.description ?? null,
      image_url: updateData.imageUrl ?? null,
      ai_rating: updateData.aiRating ?? null,
      ai_comment: updateData.aiComment ?? null,
      product_status: updateData.productStatus ?? null,
      buyer_name: updateData.buyerName ?? null,
      is_approve: updateData.isApprove ?? null,
      donation_ratio: updateData.donationRatio ?? null,
      seller_income: updateData.sellerIncome ?? null,
      donation_amount: updateData.donationAmount ?? null,
    }
    const result = await axiosInstance({
      method: 'put',
      url: `${APIS.PRODUCT}/${productId}`,
      data: data,
      headers: {
        'accept': 'application/json',
        'admin-token': token,
        'Content-Type': 'application/json',
      },
    });

    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function deleteProduct(
  productId: number,
  failCallback: (error: object) => void
) {
  try {
    const token = sessionService.getToken();
    const result = await axiosInstance({
      method: 'delete',
      url: `${APIS.PRODUCT}/${productId}`,
      headers: {
        'accept': 'application/json',
        'admin-token': token,
      },
    });

    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function submitProduct(
  data: CreateProductRequest,
  failCallback: (error: object) => void
) {
  try {
    const formData = new FormData();
    const file = data.image?.[0]?.originFileObj;
    formData.append('seller_name', data.sellerName);
    formData.append('seller_nickname', data.sellerNickname);
    formData.append('product_name', data.productName);
    formData.append('price', String(Number(data.price)));
    formData.append('condition', String(Number(data.condition)));
    formData.append('description', data.description);
    formData.append('donation_ratio', String(Number(data.donationRatio)));
    if (file instanceof File) {
      formData.append('image', file);
    }

    const result = await axiosInstance({
      method: 'post',
      url: APIS.SUBMIT_PRODUCT,
      data: formData
    });

    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function approveProduct(
  productId: number,
  isRetry: boolean,
  failCallback: (error: object) => void
) {
  try {
    const token = sessionService.getToken();

    const result = await axiosInstance({
      method: 'put',
      url: `${APIS.APPROVE_PRODUCT}/${productId}`,
      params: { is_retry: isRetry },
      headers: {
        'accept': 'application/json',
        'admin-token': token,
      }
    });

    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function rejectProduct(
  productId: number,
  failCallback: (error: object) => void
) {
  try {
    const token = sessionService.getToken();

    const result = await axiosInstance({
      method: 'put',
      url: `/api/reject_product/${productId}`,
      headers: {
        'accept': 'application/json',
        'admin-token': token,
      }
    });

    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}


export async function getTotalDonation(
  failCallback: (error: object) => void
) {
  try {
    const result = await axiosInstance({
      method: 'get',
      url: APIS.TOTAL_DONATION,
      headers: {
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function getTopDonor(
  failCallback: (error: object) => void
) {
  try {
    const result = await axiosInstance({
      method: 'get',
      url: APIS.TOP_DONORS,
      headers: {
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

// 取得待審核商品列表
export async function getPendingProducts(
  params: { limit: number; offset: number },
  failCallback: (error: object) => void
) {
  try {
    const token = sessionService.getToken();
    const queryStr = qs.stringify({
      is_approve: false,
      is_rejected: false,
      ...params, // 包含 limit 與 offset
    });

    const result = await axiosInstance({
      method: "get",
      url: `/api/products?${queryStr}`,
      headers: {
        "accept": "application/json",
        "admin-token": token,
      },
    });

    return {
      items: result.data.items,
      total: result.data.total,
    };
  } catch (e: any) {
    failCallback(e.response?.data);
    return { items: [], total: 0 };
  }
}


// Like 相關功能
export async function likeProduct(
  productId: number,
  failCallback: (error: object) => void
) {
  try {
    const result = await axiosInstance({
      method: 'post',
      url: `/api/products/${productId}/like`,
      headers: { 
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function unlikeProduct(
  productId: number,
  failCallback: (error: object) => void
) {
  try {
    const result = await axiosInstance({
      method: 'delete',
      url: `/api/products/${productId}/like`,
      headers: { 
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function getProductLikeCount(
  productId: number,
  failCallback: (error: object) => void
) {
  try {
    const result = await axiosInstance({
      method: 'get',
      url: `/api/products/${productId}/like_count`,
      headers: { 
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function dealProduct(
  productId: number,
  buyerName: string,
  failCallback: (error: object) => void
) {
  try {
    const token = sessionService.getToken();
    const result = await axiosInstance({
      method: 'put',
      url: `/api/deal_product/${productId}`,
      data: { buyer_name: buyerName },
      headers: {
        'accept': 'application/json',
        'admin-token': token,
        'Content-Type': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function getLikedProducts(
  failCallback: (error: object) => void,
  limit: number = 1000,  // 預設獲取 1000 筆，足夠大部分使用情境
  offset: number = 0
) {
  try {
    const result = await axiosInstance({
      method: 'get',
      url: `/api/user/me/likes`,
      params: {
        limit,
        offset
      },
      headers: {
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function getTopLikedProducts(
  limit: number = 3,
  failCallback: (error: object) => void
) {
  try {
    const result = await axiosInstance({
      method: 'get',
      url: APIS.TOP_LIKED_PRODUCTS,
      params: { limit },
      headers: {
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function getTopCommentedProducts(
  limit: number = 3,
  failCallback: (error: object) => void
) {
  try {
    const result = await axiosInstance({
      method: 'get',
      url: APIS.TOP_COMMENTED_PRODUCTS,
      params: { limit },
      headers: {
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function getTopViewedProducts(
  limit: number = 3,
  failCallback: (error: object) => void
) {
  try {
    const result = await axiosInstance({
      method: 'get',
      url: APIS.TOP_VIEWED_PRODUCTS,
      params: { limit },
      headers: {
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

export async function getProductStats(
  failCallback: (error: object) => void
) {
  try {
    const result = await axiosInstance({
      method: 'get',
      url: APIS.PRODUCT_STATS,
      headers: {
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    return failCallback(e.response?.data);
  }
}

// 新增：獲取活動時間軸事件
export async function getTimelineEvents(
  failCallback?: (error: object) => void
) {
  try {
    const result = await axiosInstance({
      method: 'get',
      url: '/api/timeline/events',
      headers: {
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    if (failCallback) {
      return failCallback(e.response?.data);
    }
    throw e;
  }
}

// 新增：獲取AI生成的總結報告
export async function getAISummary(
  forceRegenerate: boolean = false,
  failCallback?: (error: object) => void
) {
  try {
    const result = await axiosInstance({
      method: 'get',
      url: '/api/ai-summary/generate',
      params: { force_regenerate: forceRegenerate },
      headers: {
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    if (failCallback) {
      return failCallback(e.response?.data);
    }
    throw e;
  }
}

// 新增：獲取創世商品統計
export async function getLegendaryProductStats(failCallback?: (error: object) => void) {
  try {
    const result = await axiosInstance({
      method: 'get',
      url: APIS.LEGENDARY_STATS,
      headers: {
        'accept': 'application/json',
      },
    });
    return result.data;
  } catch (e: any) {
    if (failCallback) {
      return failCallback(e.response?.data);
    }
    throw e;
  }
}