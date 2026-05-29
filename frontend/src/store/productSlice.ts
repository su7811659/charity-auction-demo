import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { listProducts, queryProducts, getProduct, submitProduct, updateProduct, deleteProduct, approveProduct, getTotalDonation, getTopDonor, QueryProductsParams } from '../services/productService';
import { GetProductsParams, CreateProductRequest, UpdateProductRequest } from '../types/productApiTypes';
import { AsyncStatus, APIState } from '../types/apiState';

interface ProductListResponse {
  items: any[];
  total: number;
  aiResponse?: string;
  allAiResults?: any[]; // 新增：儲存完整的 AI 搜尋結果
}

interface ProductState {
  apiStatus: Record<string, APIState>;
  list: ProductListResponse;
  product: any;
  totalDonation: number;
  topDonors: any[];
}

const initialState: ProductState = {
  apiStatus: {},
  list: {
    items: [],
    total: 0,
    aiResponse: '',
    allAiResults: [], // 新增初始值
  },
  product: null,
  totalDonation: 0,
  topDonors: [] as { nickname: string; user_donation_amount: number }[],
};

const setApiStatus = (state: ProductState, key: string, status: AsyncStatus, error?: string) => {
  state.apiStatus[key] = { status, error };
};

export const fetchProducts = createAsyncThunk(
  'product/fetchProducts',
  async (data: GetProductsParams, { rejectWithValue }) => {
    try {
      return await listProducts(
        {
          minPrice: data.minPrice,
          maxPrice: data.maxPrice,
          strquery: data.strquery,
          orderBy: data.orderBy,
          limit: data.limit,
          offset: data.offset,
          isApprove: data.isApprove,
          productStatus: data.productStatus,
          sellerNickname: data.sellerNickname,
        },
        (error) => {
          throw error;
        }
      );
    } catch (e: any) {
      return rejectWithValue(e.response.data);
    }
  }
);

export const retrieveProducts = createAsyncThunk(
  'product/retrieveProducts',
  async (data: QueryProductsParams, { rejectWithValue }) => {
    try {
      return await queryProducts(data, rejectWithValue);
    } catch (e: any) {
      return rejectWithValue(e.response.data);
    }
  }
)

export const fetchProduct = createAsyncThunk(
  'product/fetchProduct',
  async (productId: number, { rejectWithValue }) => {
    try {
      return await getProduct(productId, rejectWithValue);
    } catch (e: any) {
      return rejectWithValue(e.response.data);
    }
  }
);

export const createProduct = createAsyncThunk(
  'product/createProduct',
  async (data: CreateProductRequest, { rejectWithValue }) => {
    try {
      return await submitProduct(data, rejectWithValue);
    } catch (e: any) {
      return rejectWithValue(e.response.data);
    }
  }
);

export const updateProductDetails = createAsyncThunk(
  'product/updateProductDetails',
  async (data: { productId: number, updateData: UpdateProductRequest }, { rejectWithValue }) => {
    try {
      return await updateProduct(data.productId, data.updateData, rejectWithValue);
    } catch (e: any) {
      return rejectWithValue(e.response.data);
    }
  }
);

export const removeProduct = createAsyncThunk(
  'product/removeProduct',
  async (productId: number, { rejectWithValue }) => {
    try {
      return await deleteProduct(productId, rejectWithValue);
    } catch (e: any) {
      return rejectWithValue(e.response.data);
    }
  }
)

export const approveProductByAI = createAsyncThunk(
  'product/approveProductByAI',
  async (data: { productId: number, isRetry: boolean }, { rejectWithValue }) => {
    try {
      return await approveProduct(data.productId, data.isRetry, rejectWithValue);
    } catch (e: any) {
      return rejectWithValue(e.response.data);
    }
  }
)

export const fetchTotalDonation = createAsyncThunk(
  'product/fetchTotalDonation',
  async (_, { rejectWithValue }) => {
    return await getTotalDonation(rejectWithValue);
  }
);

export const fetchTopDonors = createAsyncThunk(
  'product/fetchTopDonor',
  async (_, { rejectWithValue }) => {
    return await getTopDonor(rejectWithValue);
  }
);



const apiCases = [
  {
    key: 'fetchProducts',
    thunk: fetchProducts,
    onFulfilled: (state: ProductState, action: any) => {
      state.list = {
        items: action.payload.items,
        total: action.payload.total,
        aiResponse: '', // 清除 AI 回應
        allAiResults: [], // 清除 AI 結果
      };
    },
  },
  {
    key: 'retrieveProducts',
    thunk: retrieveProducts,
    onFulfilled: (state: ProductState, action: any) => {
      const allItems = action.payload.items || [];
      const pageSize = 12; // 預設每頁 12 個商品
      state.list = {
        items: allItems.slice(0, pageSize), // 只儲存第一頁的結果
        total: allItems.length, // 總數量是完整結果的數量
        aiResponse: action.payload.ai_query_response || '',
        allAiResults: allItems, // 儲存完整的 AI 搜尋結果
      };
    },
  },
  {
    key: 'fetchProduct',
    thunk: fetchProduct,
    onFulfilled: (state: ProductState, action: any) => {
      state.product = action.payload;
    },
  },
  { key: 'createProduct', thunk: createProduct },
  { key: 'updateProductDetails', thunk: updateProductDetails },
  { key: 'removeProduct', thunk: removeProduct },
  { key: 'approveProductByAI', thunk: approveProductByAI },
  {
    key: 'fetchTotalDonation',
    thunk: fetchTotalDonation,
    onFulfilled: (state: ProductState, action: any) => {
      state.totalDonation = action.payload.total_donation_amount;
    },
  },
  {
    key: 'fetchTopDonors',
    thunk: fetchTopDonors,
    onFulfilled: (state: ProductState, action: any) => {
      state.topDonors = action.payload;
    },
  },
];

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    resetProducts: (state) => {
      return { ...state, ...initialState };
    },
    resetStatus: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      if (state.apiStatus[key]) {
        setApiStatus(state, key, AsyncStatus.Idle);
      }
    },
    updateProductList: (state, action: PayloadAction<{ items: any[], total: number }>) => {
      state.list.items = [...action.payload.items]; // 創建新數組確保重新渲染
      state.list.total = action.payload.total;
    },
  },
  extraReducers: (builder) => {
    apiCases.forEach(({ key, thunk, onFulfilled }) => {
      builder
        .addCase(thunk.pending, (state) => {
          setApiStatus(state, key, AsyncStatus.Loading);
        })
        .addCase(thunk.fulfilled, (state, action) => {
          setApiStatus(state, key, AsyncStatus.Succeeded);
          if (onFulfilled) onFulfilled(state, action);
        })
        .addCase(thunk.rejected, (state, action) => {
          setApiStatus(state, key, AsyncStatus.Failed, String(action.payload));
        });
    });
  },
});

export const { resetProducts, resetStatus, updateProductList } = productSlice.actions;
export default productSlice.reducer;
