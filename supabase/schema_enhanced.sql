-- ============================================
-- LOGICTRADERSLTD ENHANCED DATABASE SCHEMA
-- Version: 2.0 - Production Ready
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- PRODUCTS
-- ============================================

-- Product types enum
DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('course', 'signal', 'bot');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type product_type NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course lessons
CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  duration INTEGER, -- Duration in seconds
  order_index INTEGER NOT NULL DEFAULT 0,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video progress tracking (NEW)
CREATE TABLE IF NOT EXISTS video_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  progress_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Signal plans configuration
CREATE TABLE IF NOT EXISTS signal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  interval TEXT NOT NULL CHECK (interval IN ('weekly', 'monthly')),
  features TEXT[] DEFAULT '{}',
  max_signals_per_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id)
);

-- Trading signals
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price DECIMAL(15, 8) NOT NULL,
  stop_loss DECIMAL(15, 8),
  take_profit DECIMAL(15, 8),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  result TEXT CHECK (result IN ('win', 'loss', 'breakeven')),
  profit_loss_percentage DECIMAL(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trading bots
CREATE TABLE IF NOT EXISTS trading_bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  download_url TEXT,
  file_size TEXT,
  setup_instructions TEXT,
  requirements TEXT[] DEFAULT '{}',
  version TEXT,
  changelog TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id)
);

-- Download tokens for secure bot downloads (NEW)
CREATE TABLE IF NOT EXISTS download_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS & PAYMENTS
-- ============================================

-- Order status enum
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_type product_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status order_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment status enum
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'mtn_momo')),
  provider_payment_id TEXT,
  provider_customer_id TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================

-- Subscription status enum
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'paused');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES products(id),
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER ACCESS (CRITICAL FOR SECURITY)
-- ============================================

-- Access grant type enum
DO $$ BEGIN
  CREATE TYPE access_grant_type AS ENUM ('payment', 'manual', 'subscription', 'trial');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- User access table (controls access to paid content)
CREATE TABLE IF NOT EXISTS user_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_type product_type NOT NULL,
  access_granted_at TIMESTAMPTZ DEFAULT NOW(),
  access_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  granted_by access_grant_type NOT NULL,
  order_id UUID REFERENCES orders(id),
  subscription_id UUID REFERENCES subscriptions(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ============================================
-- NOTIFICATIONS (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('payment', 'subscription', 'signal', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Course lessons indexes
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_order_index ON course_lessons(order_index);

-- Video progress indexes
CREATE INDEX IF NOT EXISTS idx_video_progress_user_id ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_lesson_id ON video_progress(lesson_id);

-- Signals indexes
CREATE INDEX IF NOT EXISTS idx_signals_plan_id ON signals(plan_id);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- User access indexes
CREATE INDEX IF NOT EXISTS idx_user_access_user_id ON user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_product_id ON user_access(product_id);
CREATE INDEX IF NOT EXISTS idx_user_access_is_active ON user_access(is_active);
CREATE INDEX IF NOT EXISTS idx_user_access_expires_at ON user_access(access_expires_at);

-- Download tokens indexes
CREATE INDEX IF NOT EXISTS idx_download_tokens_token ON download_tokens(token);
CREATE INDEX IF NOT EXISTS idx_download_tokens_user_id ON download_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_download_tokens_expires_at ON download_tokens(expires_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Service role can insert users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can manage all users" ON users;

-- Users policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role can insert users" ON users
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can manage all users" ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- User profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can manage profiles" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Products policies (Public read for active products)
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Admin can manage products" ON products;

CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Course lessons policies
DROP POLICY IF EXISTS "Anyone can view preview lessons" ON course_lessons;
DROP POLICY IF EXISTS "Users can view purchased course lessons" ON course_lessons;
DROP POLICY IF EXISTS "Admin can manage lessons" ON course_lessons;

CREATE POLICY "Anyone can view preview lessons" ON course_lessons
  FOR SELECT USING (is_preview = true);

CREATE POLICY "Users can view purchased course lessons" ON course_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_access
      WHERE user_access.user_id = auth.uid()
      AND user_access.product_id = course_lessons.course_id
      AND user_access.is_active = true
      AND (user_access.access_expires_at IS NULL OR user_access.access_expires_at > NOW())
    )
  );

CREATE POLICY "Admin can manage lessons" ON course_lessons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Video progress policies
DROP POLICY IF EXISTS "Users can manage own progress" ON video_progress;

CREATE POLICY "Users can manage own progress" ON video_progress
  FOR ALL USING (auth.uid() = user_id);

-- Signals policies
DROP POLICY IF EXISTS "Users with subscription can view signals" ON signals;
DROP POLICY IF EXISTS "Admin can manage signals" ON signals;

CREATE POLICY "Users with subscription can view signals" ON signals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_access
      WHERE user_access.user_id = auth.uid()
      AND user_access.product_id = signals.plan_id
      AND user_access.is_active = true
      AND (user_access.access_expires_at IS NULL OR user_access.access_expires_at > NOW())
    )
    OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can manage signals" ON signals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Orders policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Admin can view all orders" ON orders;

CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Payments policies
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Admin can manage payments" ON payments;

CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can manage payments" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admin can manage subscriptions" ON subscriptions;

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can manage subscriptions" ON subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- User access policies
DROP POLICY IF EXISTS "Users can view own access" ON user_access;
DROP POLICY IF EXISTS "Admin can manage access" ON user_access;

CREATE POLICY "Users can view own access" ON user_access
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can manage access" ON user_access
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Download tokens policies
DROP POLICY IF EXISTS "Users can manage own tokens" ON download_tokens;

CREATE POLICY "Users can manage own tokens" ON download_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Notifications policies
DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;

CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_lessons_updated_at ON course_lessons;
CREATE TRIGGER update_course_lessons_updated_at BEFORE UPDATE ON course_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_video_progress_updated_at ON video_progress;
CREATE TRIGGER update_video_progress_updated_at BEFORE UPDATE ON video_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_signal_plans_updated_at ON signal_plans;
CREATE TRIGGER update_signal_plans_updated_at BEFORE UPDATE ON signal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_signals_updated_at ON signals;
CREATE TRIGGER update_signals_updated_at BEFORE UPDATE ON signals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trading_bots_updated_at ON trading_bots;
CREATE TRIGGER update_trading_bots_updated_at BEFORE UPDATE ON trading_bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_access_updated_at ON user_access;
CREATE TRIGGER update_user_access_updated_at BEFORE UPDATE ON user_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to grant access after successful payment
CREATE OR REPLACE FUNCTION grant_access_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_product_type product_type;
  v_interval TEXT;
  v_expires_at TIMESTAMPTZ;
  v_product_id UUID;
  v_user_id UUID;
BEGIN
  -- Only process completed payments
  IF NEW.status = 'completed' THEN
    -- Get order details
    SELECT product_id, user_id, product_type
    INTO v_product_id, v_user_id, v_product_type
    FROM orders
    WHERE id = NEW.order_id;
    
    -- Calculate expiration for subscriptions
    IF v_product_type = 'signal' THEN
      SELECT interval INTO v_interval
      FROM signal_plans
      WHERE product_id = v_product_id;
      
      IF v_interval = 'weekly' THEN
        v_expires_at := NOW() + INTERVAL '7 days';
      ELSIF v_interval = 'monthly' THEN
        v_expires_at := NOW() + INTERVAL '30 days';
      END IF;
    END IF;
    
    -- Grant access
    INSERT INTO user_access (
      user_id,
      product_id,
      product_type,
      access_granted_at,
      access_expires_at,
      is_active,
      granted_by,
      order_id
    ) VALUES (
      v_user_id,
      v_product_id,
      v_product_type,
      NOW(),
      v_expires_at,
      true,
      'payment',
      NEW.order_id
    )
    ON CONFLICT (user_id, product_id) 
    DO UPDATE SET 
      is_active = true,
      access_granted_at = NOW(),
      access_expires_at = EXCLUDED.access_expires_at,
      order_id = NEW.order_id,
      granted_by = 'payment',
      updated_at = NOW();
      
    -- Update order status
    UPDATE orders
    SET status = 'completed', updated_at = NOW()
    WHERE id = NEW.order_id;
    
    -- Create notification
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      v_user_id,
      'payment',
      'Payment Successful',
      'Your payment has been processed successfully. You now have access to your purchase.'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to grant access after payment
DROP TRIGGER IF EXISTS grant_access_after_payment_trigger ON payments;
CREATE TRIGGER grant_access_after_payment_trigger
  AFTER UPDATE ON payments
  FOR EACH ROW
  WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
  EXECUTE FUNCTION grant_access_after_payment();

-- Function to create subscription after signal plan purchase
CREATE OR REPLACE FUNCTION create_subscription_after_signal_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_product_type product_type;
  v_interval TEXT;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Only process completed orders
  IF NEW.status = 'completed' THEN
    -- Get product type and interval
    SELECT p.type, sp.interval 
    INTO v_product_type, v_interval
    FROM products p
    LEFT JOIN signal_plans sp ON sp.product_id = p.id
    WHERE p.id = NEW.product_id;
    
    -- Only process signal subscriptions
    IF v_product_type = 'signal' THEN
      -- Calculate period end
      IF v_interval = 'weekly' THEN
        v_period_end := NOW() + INTERVAL '7 days';
      ELSIF v_interval = 'monthly' THEN
        v_period_end := NOW() + INTERVAL '30 days';
      ELSE
        v_period_end := NOW() + INTERVAL '30 days'; -- Default
      END IF;
      
      -- Create or update subscription
      INSERT INTO subscriptions (
        user_id,
        plan_id,
        status,
        current_period_start,
        current_period_end
      ) VALUES (
        NEW.user_id,
        NEW.product_id,
        'active',
        NOW(),
        v_period_end
      )
      ON CONFLICT (user_id, plan_id)
      DO UPDATE SET
        status = 'active',
        current_period_start = NOW(),
        current_period_end = v_period_end,
        updated_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create subscription after order completion
DROP TRIGGER IF EXISTS create_subscription_after_order_trigger ON orders;
CREATE TRIGGER create_subscription_after_order_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
  EXECUTE FUNCTION create_subscription_after_signal_purchase();

-- Function to expire old subscriptions (run via cron job)
CREATE OR REPLACE FUNCTION expire_old_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active'
  AND current_period_end < NOW()
  AND NOT cancel_at_period_end;
  
  -- Deactivate corresponding access for expired subscriptions
  UPDATE user_access
  SET is_active = false, updated_at = NOW()
  WHERE subscription_id IN (
    SELECT id FROM subscriptions
    WHERE status = 'expired'
  )
  AND (access_expires_at IS NULL OR access_expires_at < NOW());
END;
$$ LANGUAGE plpgsql;

-- Function to check user access to product
CREATE OR REPLACE FUNCTION check_user_product_access(
  user_uuid UUID,
  product_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_access
    WHERE user_id = user_uuid
    AND product_id = product_uuid
    AND is_active = true
    AND (access_expires_at IS NULL OR access_expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired download tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM download_tokens
  WHERE expires_at < NOW()
  OR download_count >= max_downloads;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL ADMIN USER SETUP
-- ============================================

-- NOTE: Run this after creating your first user via Supabase Auth
-- Replace 'YOUR_USER_ID' with the actual UUID from auth.users
/*
UPDATE users
SET role = 'admin'
WHERE email = 'admin@logictradersltd.com';
*/

-- ============================================
-- SEED DATA (OPTIONAL - for development/testing)
-- ============================================

/*
-- Sample Courses
INSERT INTO products (name, description, type, price, currency, thumbnail_url, is_active, featured) VALUES
('Forex Trading Masterclass', 'Complete guide to forex trading from beginner to advanced. Learn technical analysis, fundamental analysis, and risk management.', 'course', 199.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/courses/forex-masterclass.jpg', true, true),
('Crypto Trading Strategies', 'Proven strategies for cryptocurrency trading. Master altcoins, Bitcoin, and DeFi trading.', 'course', 149.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/courses/crypto-strategies.jpg', true, true),
('Risk Management Essentials', 'Learn to protect your capital with proper risk management. Position sizing, stop losses, and portfolio management.', 'course', 99.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/courses/risk-management.jpg', true, false);

-- Sample Signal Plans
INSERT INTO products (name, description, type, price, currency, thumbnail_url, is_active, featured) VALUES
('Weekly Signals Plan', 'Get access to premium trading signals for 1 week. 5-10 signals per day across Forex and Crypto markets.', 'signal', 49.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/signals/weekly.jpg', true, false),
('Monthly Signals Plan', 'Get access to premium trading signals for 1 month. 5-10 signals per day with priority support and weekly market analysis.', 'signal', 149.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/signals/monthly.jpg', true, true);

-- Insert signal plan details
INSERT INTO signal_plans (product_id, interval, features, max_signals_per_day)
SELECT id, 'weekly', ARRAY['5-10 signals per day', 'Forex & Crypto', 'Entry, SL & TP', '24/7 Support'], 10
FROM products WHERE name = 'Weekly Signals Plan';

INSERT INTO signal_plans (product_id, interval, features, max_signals_per_day)
SELECT id, 'monthly', ARRAY['5-10 signals per day', 'Forex & Crypto', 'Entry, SL & TP', '24/7 Support', 'Weekly market analysis', 'Priority support'], 10
FROM products WHERE name = 'Monthly Signals Plan';

-- Sample Trading Bots
INSERT INTO products (name, description, type, price, currency, thumbnail_url, is_active, featured) VALUES
('AutoTrader Pro Bot', 'Automated trading bot for MT4/MT5. Advanced algorithms for consistent profits with built-in risk management.', 'bot', 299.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/bots/autotrader-pro.jpg', true, true),
('Scalper X Bot', 'High-frequency scalping bot for quick profits. Optimized for major currency pairs and low latency execution.', 'bot', 199.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/bots/scalper-x.jpg', true, false);

-- Insert bot details
INSERT INTO trading_bots (product_id, setup_instructions, requirements, version)
SELECT id, 'Download the bot files, install on MT4/MT5, configure your API keys, and start trading.', 
ARRAY['MT4/MT5 platform', 'VPS recommended', 'Minimum $500 account'], '1.0.0'
FROM products WHERE name = 'AutoTrader Pro Bot';

INSERT INTO trading_bots (product_id, setup_instructions, requirements, version)
SELECT id, 'Install on your trading platform, set your risk parameters, and enable automated trading.', 
ARRAY['MT4/MT5 platform', 'Fast internet connection', 'Minimum $1000 account'], '1.0.0'
FROM products WHERE name = 'Scalper X Bot';
*/

-- ============================================
-- MAINTENANCE QUERIES
-- ============================================

-- Check database health
-- SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public';

-- Check RLS policies
-- SELECT tablename, policyname, permissive, roles, cmd FROM pg_policies WHERE schemaname = 'public';

-- Monitor active subscriptions
-- SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND current_period_end > NOW();

-- Check expired access that needs cleanup
-- SELECT COUNT(*) FROM user_access WHERE is_active = true AND access_expires_at < NOW();

-- Revenue analytics
-- SELECT 
--   DATE_TRUNC('month', created_at) as month,
--   SUM(amount) as revenue,
--   COUNT(*) as orders
-- FROM orders
-- WHERE status = 'completed'
-- GROUP BY month
-- ORDER BY month DESC;

-- ============================================
-- END OF SCHEMA
-- ============================================
