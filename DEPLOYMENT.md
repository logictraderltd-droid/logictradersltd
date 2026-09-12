# LOGICTRADERSLTD - Deployment Guide

This guide will walk you through deploying the LOGICTRADERSLTD trading platform to production.

## Prerequisites

- Node.js 18+ installed locally
- Git repository set up
- Accounts created on:
  - [Vercel](https://vercel.com)
  - [Supabase](https://supabase.com)
  - [Stripe](https://stripe.com)
  - [Cloudinary](https://cloudinary.com)

## Step 1: Database Setup (Supabase)

1. **Create Supabase Project**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Click "New Project"
   - Enter project name: `logictradersltd`
   - Choose a secure database password
   - Select region closest to your users
   - Click "Create new project"

2. **Run Database Schema**
   - Once project is created, go to SQL Editor
   - Create a "New query"
   - Copy the entire contents of `supabase/schema.sql`
   - Paste into the SQL Editor
   - Click "Run"
   - Verify all tables are created in the Table Editor

3. **Get API Keys**
   - Go to Project Settings → API
   - Copy:
     - `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
     - `anon public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
     - `service_role secret` key (SUPABASE_SERVICE_ROLE_KEY)

## Step 2: Stripe Setup

1. **Create Stripe Account**
   - Sign up at [Stripe](https://stripe.com)
   - Complete account verification

2. **Get API Keys**
   - Go to Developers → API Keys
   - Copy Publishable key (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
   - Create Secret key (STRIPE_SECRET_KEY)

3. **Setup Webhook**
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
   - Select events to listen to:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
   - Copy Signing secret (STRIPE_WEBHOOK_SECRET)

## Step 3: Cloudinary Setup

1. **Create Cloudinary Account**
   - Sign up at [Cloudinary](https://cloudinary.com)

2. **Get Credentials**
   - Go to Dashboard
   - Copy:
     - Cloud name (CLOUDINARY_CLOUD_NAME)
     - API Key (CLOUDINARY_API_KEY)
     - API Secret (CLOUDINARY_API_SECRET)

## Step 4: Local Development

1. **Install Dependencies**
   ```bash
   cd logictradersltd
   npm install
   ```

2. **Setup Environment Variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in all the values from steps 1-3

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## Step 5: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/logictradersltd.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Framework Preset: Next.js
   - Click "Deploy"

3. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`
   - Redeploy the project

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login and Deploy**
   ```bash
   vercel login
   vercel
   ```

3. **Add Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   # ... add all other variables
   ```

4. **Redeploy**
   ```bash
   vercel --prod
   ```

## Step 6: Post-Deployment Configuration

### Update Stripe Webhook URL

After deployment, update your Stripe webhook endpoint:
- Old: `https://your-domain.com/api/webhooks/stripe`
- New: `https://your-vercel-app.vercel.app/api/webhooks/stripe`

### Create Admin User

1. Register a new user through the website
2. In Supabase Dashboard, go to Table Editor → users
3. Find your user and change `role` from `customer` to `admin`

### Add Sample Products

Run this SQL in Supabase SQL Editor to add sample products:

```sql
-- Sample Courses
INSERT INTO products (name, description, type, price, currency, thumbnail_url, is_active, metadata) VALUES
('Forex Trading Masterclass', 'Complete guide to forex trading from beginner to advanced', 'course', 199.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/courses/forex', true, '{"level": "All Levels", "duration": "12 hours", "lessons": 24}'),
('Crypto Trading Strategies', 'Proven strategies for cryptocurrency trading', 'course', 149.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/courses/crypto', true, '{"level": "Intermediate", "duration": "8 hours", "lessons": 16}'),
('Risk Management Essentials', 'Learn to protect your capital with proper risk management', 'course', 99.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/courses/risk', true, '{"level": "Beginner", "duration": "4 hours", "lessons": 8}');

-- Sample Signal Plans
INSERT INTO products (name, description, type, price, currency, thumbnail_url, is_active, metadata) VALUES
('Weekly Signals Plan', 'Get access to premium trading signals for 1 week', 'signal', 49.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/signals/weekly', true, '{"interval": "week", "popular": false, "features": ["5-10 signals per day", "Forex & Crypto", "Entry, SL & TP", "24/7 Support"]}'),
('Monthly Signals Plan', 'Get access to premium trading signals for 1 month', 'signal', 149.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/signals/monthly', true, '{"interval": "month", "popular": true, "features": ["5-10 signals per day", "Forex & Crypto", "Entry, SL & TP", "24/7 Support", "Weekly market analysis", "Priority support"]}');

-- Sample Trading Bots
INSERT INTO products (name, description, type, price, currency, thumbnail_url, is_active, metadata) VALUES
('AutoTrader Pro Bot', 'Automated trading bot for MT4/MT5 with advanced risk management', 'bot', 299.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/bots/autotrader', true, '{"requirements": ["MT4/MT5 Platform", "VPS Recommended", "Minimum $500 Balance"], "features": ["Auto Trading", "Risk Management", "Backtested Strategy"]}'),
('Scalper X Bot', 'High-frequency scalping bot for quick trades', 'bot', 199.99, 'USD', 'https://res.cloudinary.com/demo/image/upload/v1/bots/scalper', true, '{"requirements": ["MT4/MT5 Platform", "Low Spread Broker", "Minimum $1000 Balance"], "features": ["High-Frequency", "Sub-second Execution", "News Filter"]}');
```

## Step 7: Testing

### Test Authentication
1. Register a new account
2. Login with credentials
3. Verify dashboard access

### Test Payments (Stripe Test Mode)
1. Use test card: `4242 4242 4242 4242`
2. Any future expiry date
3. Any 3-digit CVC
4. Any ZIP code

### Test Access Control
1. Purchase a course
2. Verify it appears in dashboard
3. Try accessing without purchase (should fail)

## Step 8: Go Live

### Switch to Stripe Live Mode
1. In Stripe Dashboard, toggle to "Live mode"
2. Replace test keys with live keys in Vercel
3. Update webhook endpoint to live mode
4. Redeploy

### Production Checklist
- [ ] All environment variables are production values
- [ ] Stripe is in live mode
- [ ] Database has production data
- [ ] Admin user is configured
- [ ] Products are added
- [ ] Terms of Service page is updated
- [ ] Privacy Policy page is updated
- [ ] Support email is configured

## Troubleshooting

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

### Database Connection Issues
- Verify Supabase URL and keys
- Check database is not paused (free tier)
- Verify Row Level Security policies

### Payment Issues
- Verify Stripe keys are correct
- Check webhook is configured correctly
- Review Stripe Dashboard logs

### Authentication Issues
- Check Supabase Auth settings
- Verify email confirmation is disabled (if needed)
- Check browser console for errors

## Support

For deployment support:
- Email: support@logictradersltd.com
- Documentation: https://docs.logictradersltd.com

## Security Notes

1. Never commit `.env.local` to Git
2. Keep service role key secure (server-side only)
3. Regularly rotate API keys
4. Enable 2FA on all accounts
5. Monitor Stripe for suspicious activity
6. Keep dependencies updated

---

**Congratulations!** Your LOGICTRADERSLTD platform is now live! 🚀
