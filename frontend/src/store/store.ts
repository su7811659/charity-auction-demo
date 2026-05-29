import { configureStore } from '@reduxjs/toolkit';
import productReducer from './productSlice';
import userReducer from "./userSlice";

export const store = configureStore({
  reducer: {
    product: productReducer,
    user: userReducer,
  },
  // No need to manually add thunk - it's included by default in configureStore
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
