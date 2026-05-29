export interface UserProfile {
    id: number;
    email: string;
    avatar_url?: string;
    robot_tickle_count: number;
    mm_style: number;
    easter_egg: boolean;
    easter_egg_triggered_time?: string;
    last_online_deals_visit?: string;
    default_product_status: number;
    default_sort_order: number;
    created_at?: string;
  }
  
  export interface TopTickler {
    email: string;
    avatar_url?: string;
    robot_tickle_count: number;
  }
  
  export interface EasterEggTopUser {
    email: string;
    avatar_url?: string;
    easter_egg_triggered_time: string;
  }
  