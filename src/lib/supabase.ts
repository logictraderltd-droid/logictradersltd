import { createClient } from '@supabase/supabase-js';
import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';
import { User, UserProfile, Product, Course, CourseLesson, SignalPlan, TradingSignal, TradingBot, Order, Payment, Subscription, UserAccess } from '@/types';

// Client-side Supabase client - safe to use in browser
export const createBrowserClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createSSRBrowserClient(supabaseUrl, supabaseKey);
};

// Admin Supabase client (for server-side operations only)
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role key');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Database helper functions for browser usage
export const db = {
  // User operations
  users: {
    async getById(id: string): Promise<User | null> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },

    async getProfile(userId: string): Promise<UserProfile | null> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    async updateProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({ user_id: userId, ...profile, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },

  // Product operations
  products: {
    async getAll(): Promise<Product[]> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async getById(id: string): Promise<Product | null> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },

    async getByType(type: string): Promise<Product[]> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('type', type)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  },

  // Course operations
  courses: {
    async getAll(): Promise<Course[]> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          lessons:course_lessons(*)
        `)
        .eq('type', 'course')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async getById(id: string): Promise<Course | null> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          lessons:course_lessons(*)
        `)
        .eq('id', id)
        .eq('type', 'course')
        .single();

      if (error) throw error;
      return data;
    },

    async getLessons(courseId: string): Promise<CourseLesson[]> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  },

  // Signal operations
  signals: {
    async getPlans(): Promise<SignalPlan[]> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('type', 'signal')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      return data || [];
    },

    async getRecent(limit: number = 10): Promise<TradingSignal[]> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },

    async getByPlanId(planId: string): Promise<TradingSignal[]> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('plan_id', planId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  },

  // Bot operations
  bots: {
    async getAll(): Promise<TradingBot[]> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('type', 'bot')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  },

  // Order operations
  orders: {
    async getByUserId(userId: string): Promise<Order[]> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async create(order: Partial<Order>): Promise<Order> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async updateStatus(orderId: string, status: string): Promise<void> {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
    },
  },

  // Subscription operations
  subscriptions: {
    async getByUserId(userId: string): Promise<Subscription[]> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:products(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async getActiveByUserId(userId: string): Promise<Subscription[]> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:products(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('current_period_end', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async create(subscription: Partial<Subscription>): Promise<Subscription> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscription)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },

  // User Access operations (CRITICAL for security)
  userAccess: {
    async getByUserId(userId: string): Promise<UserAccess[]> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('user_access')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async checkAccess(userId: string, productId: string): Promise<boolean> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('user_access')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .eq('is_active', true)
        .or('access_expires_at.is.null,access_expires_at.gte.' + new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    },

    async grantAccess(access: Partial<UserAccess>): Promise<UserAccess> {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('user_access')
        .insert(access)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async revokeAccess(userId: string, productId: string): Promise<void> {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from('user_access')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) throw error;
    },
  },
};

export default db;
