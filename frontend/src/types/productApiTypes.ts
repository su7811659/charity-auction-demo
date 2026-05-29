 import { UploadFile } from 'antd';

export interface GetProductsParams {
  minPrice?: number;
  maxPrice?: number;
  strquery?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
  isApprove?: boolean;
  productStatus?: number | number[] | string;
  sellerName?: string;
  sellerNickname?: string;
  isRejected?: boolean;
}

export interface CreateProductRequest {
  sellerName: string;
  sellerNickname: string;
  productName: string;
  price: number;
  condition: number;
  description: string;
  donationRatio: number;
  image: UploadFile[];
}

export interface UpdateProductRequest {
  sellerName?: string;
  sellerNickname?: string;
  productName?: string;
  price?: number;
  condition?: number;
  description?: string;
  imageUrl?: string;
  aiRating?: number;
  aiComment?: string;
  productStatus?: number;
  buyerName?: string;
  isApprove?: boolean;
  donationRatio?: number;
  sellerIncome?: number;
  donationAmount?: number;
}
