-- LOGICTRADERSLTD Database Schema
-- Production-ready schema for trading platform e-commerce

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles
CREATE TABLE user_profiles (
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
CREATE TYPE product_type AS ENUM ('course', 'signal', 'bot');

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type product_type NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course lessons
CREATE TABLE course_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  duration TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signal plans configuration
CREATE TABLE signal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  interval TEXT NOT NULL CHECK (interval IN ('weekly', 'monthly')),
  features TEXT[] DEFAULT '{}',
  UNIQUE(product_id)
);

-- Trading signals
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price DECIMAL(15, 8) NOT NULL,
  stop_loss DECIMAL(15, 8),
  take_profit DECIMAL(15, 8),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  result TEXT CHECK (result IN ('win', 'loss', 'breakeven'))
);

-- Trading bots
CREATE TABLE trading_bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  download_url TEXT,
  setup_instructions TEXT,
  requirements TEXT[] DEFAULT '{}',
  version TEXT,
  UNIQUE(product_id)
);

-- ============================================
-- ORDERS & PAYMENTS
-- ============================================

-- Order status enum
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Orders table
CREATE TABLE orders (
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
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'mtn_momo')),
  provider_payment_id TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================

-- Subscription status enum
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired');

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES products(id),
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER ACCESS (CRITICAL FOR SECURITY)
-- ============================================

-- Access grant type enum
CREATE TYPE access_grant_type AS ENUM ('payment', 'manual', 'subscription');

-- User access table (controls access to paid content)
CREATE TABLE user_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_type product_type NOT NULL,
  access_granted_at TIMESTAMPTZ DEFAULT NOW(),
  access_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  granted_by access_grant_type NOT NULL,
  order_id UUID REFERENCES orders(id),
  subscription_id UUID REFERENCES subscriptions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Users indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Products indexes
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_price ON products(price);

-- Orders indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Payments indexes
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_provider_payment_id ON payments(provider_payment_id);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- User access indexes
CREATE INDEX idx_user_access_user_id ON user_access(user_id);
CREATE INDEX idx_user_access_product_id ON user_access(product_id);
CREATE INDEX idx_user_access_is_active ON user_access(is_active);
CREATE INDEX idx_user_access_expires_at ON user_access(access_expires_at);

-- Signals indexes
CREATE INDEX idx_signals_plan_id ON signals(plan_id);
CREATE INDEX idx_signals_status ON signals(status);
CREATE INDEX idx_signals_created_at ON signals(created_at);

-- Course lessons indexes
CREATE INDEX idx_course_lessons_course_id ON course_lessons(course_id);
CREATE INDEX idx_course_lessons_order_index ON course_lessons(order_index);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_access ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can manage all users" ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Products policies (public read for active products)
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Course lessons policies
CREATE POLICY "Users with access can view lessons" ON course_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_access 
      WHERE user_id = auth.uid() 
      AND product_id = course_id 
      AND is_active = true
      AND (access_expires_at IS NULL OR access_expires_at > NOW())
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    is_preview = true
  );

CREATE POLICY "Admin can manage lessons" ON course_lessons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Signals policies
CREATE POLICY "Subscribers can view signals" ON signals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE user_id = auth.uid() 
      AND plan_id = signals.plan_id
      AND status = 'active'
      AND current_period_end > NOW()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can manage signals" ON signals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Orders policies
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all subscriptions" ON subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- User access policies
CREATE POLICY "Users can view own access" ON user_access
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage access" ON user_access
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_access_updated_at BEFORE UPDATE ON user_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to grant access after successful payment
CREATE OR REPLACE FUNCTION grant_access_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_product_type product_type;
  v_interval TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Only process completed payments
  IF NEW.status = 'completed' THEN
    -- Get product type
    SELECT type INTO v_product_type FROM products WHERE id = (
      SELECT product_id FROM orders WHERE id = NEW.order_id
    );
    
    -- Calculate expiration for subscriptions
    IF v_product_type = 'signal' THEN
      SELECT interval INTO v_interval FROM signal_plans WHERE product_id = (
        SELECT product_id FROM orders WHERE id = NEW.order_id
      );
      
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
    )
    SELECT 
      user_id,
      product_id,
      v_product_type,
      NOW(),
      v_expires_at,
      true,
      'payment',
      NEW.order_id
    FROM orders
    WHERE id = NEW.order_id
    ON CONFLICT (user_id, product_id) 
    DO UPDATE SET 
      is_active = true,
      access_granted_at = NOW(),
      access_expires_at = EXCLUDED.access_expires_at,
      order_id = NEW.order_id,
      granted_by = 'payment';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to grant access after payment
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
  -- Get product type
  SELECT p.type, sp.interval 
  INTO v_product_type, v_interval
  FROM products p
  JOIN signal_plans sp ON sp.product_id = p.id
  WHERE p.id = NEW.product_id;
  
  -- Only process signal subscriptions
  IF v_product_type = 'signal' THEN
    -- Calculate period end
    IF v_interval = 'weekly' THEN
      v_period_end := NOW() + INTERVAL '7 days';
    ELSIF v_interval = 'monthly' THEN
      v_period_end := NOW() + INTERVAL '30 days';
    END IF;
    
    -- Create subscription
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
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create subscription after order completion
CREATE TRIGGER create_subscription_after_order_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
  EXECUTE FUNCTION create_subscription_after_signal_purchase();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert sample products (run after schema creation)
-- Uncomment and modify as needed

/*
-- Sample Courses
INSERT INTO products (name, description, type, price, currency, thumbnail_url, is_active) VALUES
('Forex Trading Masterclass', 'Complete guide to forex trading from beginner to advanced', 'course', 199.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/courses/forex-masterclass', true),
('Crypto Trading Strategies', 'Proven strategies for cryptocurrency trading', 'course', 149.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/courses/crypto-strategies', true),
('Risk Management Essentials', 'Learn to protect your capital with proper risk management', 'course', 99.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/courses/risk-management', true);

-- Sample Signal Plans
INSERT INTO products (name, description, type, price, currency, thumbnail_url, is_active) VALUES
('Weekly Signals Plan', 'Get access to premium trading signals for 1 week', 'signal', 49.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/signals/weekly', true),
('Monthly Signals Plan', 'Get access to premium trading signals for 1 month', 'signal', 149.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/signals/monthly', true);

-- Insert signal plan details
INSERT INTO signal_plans (product_id, interval, features) VALUES
((SELECT id FROM products WHERE name = 'Weekly Signals Plan'), 'weekly', ARRAY['5-10 signals per day', 'Forex & Crypto', 'Entry, SL & TP', '24/7 Support']),
((SELECT id FROM products WHERE name = 'Monthly Signals Plan'), 'monthly', ARRAY['5-10 signals per day', 'Forex & Crypto', 'Entry, SL & TP', '24/7 Support', 'Weekly market analysis', 'Priority support']);

-- Sample Trading Bots
INSERT INTO products (name, description, type, price, currency, thumbnail_url, is_active) VALUES
('AutoTrader Pro Bot', 'Automated trading bot for MT4/MT5', 'bot', 299.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/bots/autotrader-pro', true),
('Scalper X Bot', 'High-frequency scalping bot', 'bot', 199.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/bots/scalper-x', true);
*/
