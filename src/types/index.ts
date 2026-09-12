// User Types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'customer';
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  country?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Product Types
export type ProductType = 'course' | 'signal' | 'bot';

export interface Product {
  id: string;
  name: string;
  description: string;
  type: ProductType;
  price: number;
  currency: string;
  thumbnail_url?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Course Types
export interface Course extends Product {
  type: 'course';
  duration?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  video_url: string;
  cloudinary_public_id?: string;
  duration?: string;
  order_index: number;
  is_preview?: boolean;
  created_at: string;
}

// Signal Types
export interface SignalPlan extends Product {
  type: 'signal';
  interval: 'weekly' | 'monthly';
  features: string[];
}

export interface TradingSignal {
  id: string;
  plan_id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  entry_price: number;
  stop_loss?: number;
  take_profit?: number;
  description?: string;
  status: 'active' | 'closed' | 'expired';
  created_at: string;
  closed_at?: string;
  result?: 'win' | 'loss' | 'breakeven';
}

// Bot Types
export interface TradingBot extends Product {
  type: 'bot';
  download_url?: string;
  setup_instructions?: string;
  requirements?: string[];
  version?: string;
}

// Order & Payment Types
export interface Order {
  id: string;
  user_id: string;
  product_id: string;
  product_type: ProductType;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: string;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  currency: string;
  provider: 'stripe' | 'mtn_momo';
  provider_payment_id?: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Subscription Types
export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  plan?: SignalPlan;
}

// User Access Types
export interface UserAccess {
  id: string;
  user_id: string;
  product_id: string;
  product_type: ProductType;
  access_granted_at: string;
  access_expires_at?: string;
  is_active: boolean;
  granted_by: 'payment' | 'manual' | 'subscription';
  order_id?: string;
  subscription_id?: string;
  created_at: string;
  updated_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Dashboard Types
export interface CustomerDashboardData {
  courses: Course[];
  subscriptions: Subscription[];
  bots: TradingBot[];
  recentSignals: TradingSignal[];
  paymentHistory: Order[];
}

export interface AdminDashboardData {
  totalUsers: number;
  totalRevenue: number;
  totalOrders: number;
  activeSubscriptions: number;
  recentOrders: Order[];
  recentUsers: User[];
}

// Payment Provider Types
export interface PaymentProviderConfig {
  name: string;
  isActive: boolean;
  requiresWebhook: boolean;
}

export interface CreatePaymentIntent {
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

// Navigation Types
export interface NavLink {
  label: string;
  href: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

// Cloudinary Types
export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  format: string;
  duration?: number;
  bytes: number;
}
