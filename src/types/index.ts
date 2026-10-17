// User Types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'customer';
  full_name?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  first_name: string;
  last_name: string;
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
  product_type?: ProductType;
  price: number;
  price_cents?: number;
  currency?: string;
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
  level?: 'beginner' | 'intermediate' | 'professional';
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  product_id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  sort_order?: number | null;
  created_at: string;
  updated_at?: string;
}

// Signal Types
export interface SignalPlan extends Product {
  type: 'signal';
  interval: 'weekly' | 'monthly';
  features: string[];
}

export interface TradingSignal {
  id: string;
  plan_id?: string | null;
  title: string;
  pair: string;
  direction: string;
  entry_price?: number | null;
  stop_loss?: number | null;
  take_profit_1?: number | null;
  take_profit_2?: number | null;
  take_profit_3?: number | null;
  status?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
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
  amount_cents?: number;
  currency: string;
  metadata?: Record<string, any>;
  delivery_status?: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: string;
  manual_payment_status?: 'pending' | 'verifying' | 'paid' | 'rejected';
  manual_payment_method?: 'mobile_money' | 'binance';
  manual_payment_request?: {
    id: string;
    method: 'mobile_money' | 'binance';
    amount_minor: number;
    currency: 'RWF' | 'USDT';
    display_amount_minor: number;
    display_currency: 'USD' | 'RWF' | 'USDT';
    transaction_reference: string | null;
    status: 'pending' | 'verifying' | 'paid' | 'rejected';
    rejection_reason: string | null;
  } | null;
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
  product_id: string;
  plan_id?: string;
  status: 'active' | 'cancelled' | 'expired';
  starts_at: string;
  ends_at: string;
  stripe_subscription_id?: string | null;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  created_at: string;
  updated_at: string;
  plan?: SignalPlan;
}

// User Access Types
export interface UserAccess {
  id: string;
  user_id: string;
  product_id: string;
  order_id?: string | null;
  granted_at?: string | null;
  expires_at?: string | null;
  is_active: boolean | null;
  granted_by?: string | null;
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
