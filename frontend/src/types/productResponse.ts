export interface Product {
    id: number;
    seller_name: string;
    seller_nickname: string;
    product_name: string;
    price: number;
    condition: number;
    description: string;
    image_url: string;
    ai_rating?: number;
    ai_comment?: string;
    ai_fit_owner?: string;
    product_status: number;
    buyer_name?: string;
    donation_ratio: number;
    like_count: number;
    liked: boolean;
    comment_count: number;
    view_count?: number;
    is_approve: boolean;
    is_rejected: boolean;
    is_online_deal?: boolean;
    seller_income?: number;
    donation_amount?: number;
    created_at: string;
}

export interface ProductForBuyer {
    id: number;
    product_name: string;
    price: number;
    image_url: string;
    condition: number;
    product_status: number;
    created_at: string;
    seller_nickname: string;
    seller_name: string;
    comment_count: number;
    like_count: number;
    ai_rating?: number;
  }

export interface ProductListResponse<T = Product> {
    items: T[];
    total: number;
  }