import { UserProfile, TopTickler, EasterEggTopUser } from "../types/userResponse";
import { UserUpdateRequest } from "../types/userApiTypes";
import axiosInstance from '../utils/axiosInstance';
import { ProductListResponse, Product, ProductForBuyer } from "../types/productResponse";

export const uploadAvatar = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await axiosInstance.post("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  
  return res.data.url;
};
  
export const getMyProfile = async (): Promise<UserProfile> => {
  const res = await axiosInstance.get("/api/user/me");
  return res.data;
};

export const updateMyProfile = async (data: UserUpdateRequest): Promise<UserProfile> => {
  const res = await axiosInstance.patch("/api/user/me", data);
  return res.data;
};

export const tickleRobot = async (): Promise<UserProfile> => {
  const res = await axiosInstance.post("/api/user/me/tickle");
  return res.data;
};

export const triggerEasterEgg = async (): Promise<UserProfile> => {
  const res = await axiosInstance.patch("/api/user/me", { easter_egg: true });
  return res.data;
};

export const getTopTicklers = async (): Promise<TopTickler[]> => {
  const res = await axiosInstance.get("/api/user/top-ticklers");
  return res.data;
};

export const getEasterEggTopUsers = async (): Promise<EasterEggTopUser[]> => {
  const res = await axiosInstance.get("/api/user/easter-egg/top");
  return res.data;
};

export const getTotalTickleStats = async (): Promise<{ total_tickles: number; total_ticklers: number }> => {
  const res = await axiosInstance.get("/api/user/total-tickle-stats");
  return res.data;
};

export const getTotalEasterEggStats = async (): Promise<{ total_discoverers: number }> => {
  const res = await axiosInstance.get("/api/user/easter-egg/total-stats");
  return res.data;
};

export const getPlatinumUsers = async (): Promise<{ id: number; email: string; nickname: string; avatar_url?: string; unlocked_at: string }[]> => {
  const res = await axiosInstance.get("/api/user/platinum-achievement");
  return res.data;
};

// 取得我上架的商品
export const getMyProducts = async (): Promise<ProductListResponse<Product>> => {
  const res = await axiosInstance.get("/api/user/me/product");
  return res.data;
};

// 取得我買到的商品
export const getMyPurchasedProducts = async (): Promise<ProductListResponse<ProductForBuyer>> => {
  const res = await axiosInstance.get("/api/user/me/purchased");
  return res.data;
};