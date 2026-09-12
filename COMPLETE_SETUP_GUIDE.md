# LOGICTRADERSLTD - Complete Setup & Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Configuration](#database-configuration)
4. [Environment Variables](#environment-variables)
5. [Third-Party Services](#third-party-services)
6. [Development](#development)
7. [Deployment](#deployment)
8. [Post-Deployment](#post-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Git**

### Required Accounts
- **Supabase** - Database & Authentication
- **Stripe** - Payment Processing
- **Cloudinary** - Media Storage
- **Vercel** - Hosting (recommended)
- **MTN Mobile Money** - Alternative Payment (optional)

---

## Initial Setup

### 1. Clone or Extract Project

```bash
cd logictradersltd-fixed
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- React 18
- Supabase client
- Stripe SDK
- Cloudinary SDK
- Tailwind CSS
- Framer Motion
- TypeScript

---

## Database Configuration

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - Project name: `logictradersltd`
   - Database password: (save this!)
   - Region: Choose closest to your users
4. Wait for project creation (~2 minutes)

### Step 2: Run Database Schema

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Click "New Query"
4. Copy the contents of `supabase/schema_enhanced.sql`
5. Paste and click "Run"
6. Wait for completion (should see "Success")

### Step 3: Verify Database Setup

Run this query to verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see all these tables:
- users
- user_profiles
- products
- course_lessons
- video_progress
- signal_plans
- signals
- trading_bots
- download_tokens
- orders
- payments
- subscriptions
- user_access
- notifications
- analytics_events

### Step 4: Get Supabase Credentials

From Supabase Dashboard:
1. Go to Settings > API
2. Copy these values:
   - Project URL
   - anon/public key
   - service_role key (keep secret!)

---

## Environment Variables

### Step 1: Create .env.local

```bash
cp .env.local.example .env.local
```

### Step 2: Fill in All Variables

```env
# ============================================
# SUPABASE CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ============================================
# STRIPE CONFIGURATION
# ============================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# ============================================
# CLOUDINARY CONFIGURATION
# ============================================
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# ============================================
# MTN MOBILE MONEY (OPTIONAL)
# ============================================
MTN_SUBSCRIPTION_KEY=your-subscription-key
MTN_API_USER=your-api-user
MTN_API_KEY=your-api-key
MTN_ENVIRONMENT=sandbox

# ============================================
# APPLICATION CONFIGURATION
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Important Notes:
- **NEVER** commit `.env.local` to git
- Use test keys for development
- Production keys go in Vercel environment variables

---

## Third-Party Services

### Stripe Setup

#### 1. Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Sign up and complete verification
3. Switch to "Test Mode" for development

#### 2. Get API Keys
1. Dashboard > Developers > API keys
2. Copy Publishable key (starts with `pk_test_`)
3. Copy Secret key (starts with `sk_test_`)

#### 3. Setup Webhook (Local Development)

Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
# or
npm install -g stripe-cli
```

Login:
```bash
stripe login
```

Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret (starts with `whsec_`)

#### 4. Setup Webhook (Production)

1. Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy webhook signing secret

### Cloudinary Setup

#### 1. Create Account
1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for free account

#### 2. Get Credentials
1. Go to Dashboard
2. Copy:
   - Cloud Name
   - API Key
   - API Secret

#### 3. Configure Upload Presets (Optional)
1. Settings > Upload
2. Add upload preset
3. Name: `course-videos`
4. Signing Mode: `Signed`
5. Folder: `logictradersltd/courses`

#### 4. Enable Video Transformation
1. Settings > Video
2. Enable: Adaptive Bitrate Streaming
3. Enable: Signed URLs (for security)

### MTN Mobile Money Setup (Optional)

#### 1. Create Developer Account
1. Go to [momodeveloper.mtn.com](https://momodeveloper.mtn.com)
2. Register account
3. Subscribe to Collections API

#### 2. Create API User & Key
1. Collections > API Documentation
2. Create API User
3. Create API Key
4. Copy Subscription Key

#### 3. Test in Sandbox
Use sandbox for testing:
- Environment: `sandbox`
- Test phone: MTN provides test numbers

---

## Development

### Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Initial Admin Setup

#### Create First Admin User

1. Register a new user at `/register`
2. Check Supabase Dashboard > Authentication
3. Copy the user ID
4. Run this SQL query:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

Now you can access `/admin` dashboard!

### Add Sample Products (Optional)

Run the seed data queries in `supabase/schema_enhanced.sql` (uncomment the section at the end)

### Test Payment Flow

1. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Use any future date for expiry
   - Use any 3 digits for CVC

2. Test checkout:
   - Select a product
   - Go to checkout
   - Enter test card details
   - Complete payment
   - Verify access granted in database

---

## Deployment

### Deploy to Vercel (Recommended)

#### 1. Install Vercel CLI (Optional)
```bash
npm i -g vercel
```

#### 2. Connect GitHub Repository

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository

#### 3. Configure Project

- Framework Preset: **Next.js**
- Root Directory: `./`
- Build Command: `npm run build`
- Output Directory: `.next`

#### 4. Add Environment Variables

In Vercel dashboard, add all variables from `.env.local`:

**CRITICAL**: Use production values for:
- Stripe keys (pk_live_, sk_live_)
- Cloudinary production credentials
- Supabase production project

#### 5. Deploy

Click "Deploy" and wait (~2 minutes)

### Update Webhook URLs

After deployment, update webhook endpoints:

#### Stripe
1. Dashboard > Webhooks
2. Update endpoint URL to: `https://your-domain.vercel.app/api/webhooks/stripe`

#### MTN (if using)
1. MTN Developer Portal
2. Update callback URL

### Setup Custom Domain (Optional)

1. Vercel Dashboard > Settings > Domains
2. Add your domain
3. Configure DNS records as shown
4. Wait for SSL certificate (~5 minutes)

---

## Post-Deployment

### 1. Create Production Admin

Same as development but in production database:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'admin@yourdomain.com';
```

### 2. Add Products

Use admin dashboard at `/admin` to:
- Create courses
- Upload videos to Cloudinary
- Create signal plans
- Add trading bots

### 3. Test Everything

- [ ] User registration
- [ ] Email verification (if enabled)
- [ ] Product browsing
- [ ] Payment processing
- [ ] Access control
- [ ] Video streaming
- [ ] Download bots
- [ ] Signal viewing
- [ ] Admin functions

### 4. Enable Production Mode

In `.env`:
```env
NODE_ENV=production
```

### 5. Monitor

Check these regularly:
- Vercel deployment logs
- Supabase dashboard (auth errors)
- Stripe dashboard (payments)
- Cloudinary usage

---

## Troubleshooting

### Common Issues

#### Database Connection Errors

**Error**: "Missing Supabase environment variables"

**Solution**:
1. Check `.env.local` exists
2. Verify all Supabase variables are set
3. Restart dev server

#### Authentication Not Working

**Error**: "User not found" or "Unauthorized"

**Solution**:
1. Verify RLS policies are enabled
2. Check if user exists in `users` table
3. Run `supabase/fix_rls_policies.sql`

#### Payments Failing

**Error**: "Payment intent creation failed"

**Solution**:
1. Verify Stripe keys are correct
2. Check Stripe dashboard for errors
3. Ensure webhook is receiving events
4. Verify webhook secret is correct

#### Videos Not Loading

**Error**: "Failed to stream video"

**Solution**:
1. Check Cloudinary credentials
2. Verify video uploaded correctly
3. Check if signed URLs are enabled
4. Verify user has access in `user_access` table

#### Can't Access Admin Dashboard

**Error**: "Access denied"

**Solution**:
1. Verify user role is 'admin' in database:
```sql
SELECT * FROM users WHERE email = 'your-email';
```
2. Update role if needed:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email';
```

### Performance Issues

#### Slow Page Loads

1. Check database indexes are created
2. Optimize images (use Next.js Image component)
3. Enable caching in Vercel
4. Use CDN for static assets

#### High Database Costs

1. Review query patterns
2. Add appropriate indexes
3. Implement query caching
4. Use connection pooling

### Security Checklist

- [ ] All environment variables are set
- [ ] RLS policies are enabled on all tables
- [ ] Webhook signatures are verified
- [ ] API keys are not in client-side code
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled (if needed)

---

## Maintenance

### Regular Tasks

#### Daily
- Monitor error logs
- Check payment processing
- Verify user signups

#### Weekly
- Review user feedback
- Check analytics
- Update content

#### Monthly
- Database backups
- Security updates
- Dependency updates

### Database Maintenance

Run cleanup functions:

```sql
-- Expire old subscriptions
SELECT expire_old_subscriptions();

-- Clean expired tokens
SELECT cleanup_expired_tokens();
```

### Backup Strategy

1. **Supabase**: Automatic backups (check your plan)
2. **Manual**: Export via Supabase Dashboard
3. **Local**: Keep copy of schema files

---

## Support

### Getting Help

1. Check documentation
2. Review error logs
3. Search GitHub issues
4. Contact support

### Resources

- Next.js: [nextjs.org/docs](https://nextjs.org/docs)
- Supabase: [supabase.com/docs](https://supabase.com/docs)
- Stripe: [stripe.com/docs](https://stripe.com/docs)
- Cloudinary: [cloudinary.com/documentation](https://cloudinary.com/documentation)

---

**Last Updated**: January 28, 2026
**Version**: 2.0
