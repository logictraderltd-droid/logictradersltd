# ⚡ LOGICTRADERSLTD - Quick Start Checklist

Use this checklist to get your development environment up and running quickly!

---

## 🚀 Phase 1: Initial Setup (15 minutes)

### Step 1: Prerequisites
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm or yarn installed (`npm --version`)
- [ ] Git installed (`git --version`)
- [ ] Code editor ready (VS Code recommended)

### Step 2: Project Setup
```bash
cd logictradersltd-fixed
npm install
```
- [ ] All dependencies installed successfully
- [ ] No errors in terminal

---

## 🗄️ Phase 2: Database Setup (10 minutes)

### Step 1: Create Supabase Account
- [ ] Go to [supabase.com](https://supabase.com) and sign up
- [ ] Email verified

### Step 2: Create New Project
- [ ] Click "New Project"
- [ ] Project name: `logictradersltd`
- [ ] Strong database password created (save it!)
- [ ] Region selected (closest to you)
- [ ] Wait for project creation (~2 min)

### Step 3: Run Database Schema
- [ ] Open project in Supabase Dashboard
- [ ] Navigate to: SQL Editor
- [ ] Create new query
- [ ] Copy all content from `supabase/schema_enhanced.sql`
- [ ] Paste and click "RUN"
- [ ] Wait for success message
- [ ] Verify tables created (should see 15+ tables)

### Step 4: Get API Credentials
- [ ] Go to: Settings > API
- [ ] Copy Project URL
- [ ] Copy `anon` public key
- [ ] Copy `service_role` key (keep secret!)

---

## 💳 Phase 3: Stripe Setup (10 minutes)

### Step 1: Create Stripe Account
- [ ] Go to [stripe.com](https://stripe.com) and sign up
- [ ] Account verified (may require business info)

### Step 2: Get Test API Keys
- [ ] Switch to **Test Mode** (toggle in top-right)
- [ ] Go to: Developers > API keys
- [ ] Copy Publishable key (starts with `pk_test_`)
- [ ] Copy Secret key (starts with `sk_test_`)

### Step 3: Setup Local Webhooks
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe
# OR
npm install -g stripe-cli

# Login
stripe login

# Forward webhooks (keep this running!)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
- [ ] Stripe CLI installed
- [ ] Logged in successfully
- [ ] Webhook forwarding running
- [ ] Webhook secret copied (starts with `whsec_`)

---

## ☁️ Phase 4: Cloudinary Setup (5 minutes)

### Step 1: Create Account
- [ ] Go to [cloudinary.com](https://cloudinary.com) and sign up
- [ ] Free tier is fine for development

### Step 2: Get Credentials
- [ ] Go to Dashboard (home page after login)
- [ ] Copy Cloud Name
- [ ] Copy API Key
- [ ] Copy API Secret

---

## 🔐 Phase 5: Environment Variables (5 minutes)

### Step 1: Create .env.local File
```bash
cp .env.local.example .env.local
```
- [ ] File created successfully

### Step 2: Fill in Variables
Open `.env.local` and fill in:

```env
# SUPABASE (from Phase 2, Step 4)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# STRIPE (from Phase 3, Step 2 & 3)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# CLOUDINARY (from Phase 4, Step 2)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# APP CONFIG
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

- [ ] All Supabase variables filled
- [ ] All Stripe variables filled
- [ ] All Cloudinary variables filled
- [ ] App URL set correctly

---

## 🎯 Phase 6: First Run (5 minutes)

### Step 1: Start Development Server
```bash
npm run dev
```
- [ ] Server started successfully
- [ ] No errors in terminal
- [ ] Open [http://localhost:3000](http://localhost:3000)

### Step 2: Test Homepage
- [ ] Homepage loads correctly
- [ ] Dark theme with gold accents visible
- [ ] Navigation menu works
- [ ] No console errors (press F12)

### Step 3: Create First User
- [ ] Click "Register" in nav
- [ ] Fill in registration form
- [ ] Submit successfully
- [ ] Redirected to dashboard

### Step 4: Make User Admin
In Supabase Dashboard:
- [ ] Go to: Authentication > Users
- [ ] Find your user and copy the ID
- [ ] Go to: SQL Editor
- [ ] Run this query (replace with your email):
```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```
- [ ] Query successful
- [ ] Refresh your browser
- [ ] Visit `/admin` - should now have access!

---

## ✅ Phase 7: Verification (10 minutes)

### Test Authentication
- [ ] Can register new user
- [ ] Can login
- [ ] Can logout
- [ ] Session persists on refresh

### Test Database Connection
- [ ] User profile loads in dashboard
- [ ] No database errors in console

### Test Payments (using Stripe test card)
- [ ] Browse to a product page
- [ ] Click "Buy Now"
- [ ] Fill checkout with test card: `4242 4242 4242 4242`
- [ ] Any future expiry date
- [ ] Any 3-digit CVC
- [ ] Complete payment
- [ ] Check Stripe dashboard for payment
- [ ] Verify access granted in database:
```sql
SELECT * FROM user_access WHERE user_id = 'your-user-id';
```
- [ ] Payment appears in dashboard
- [ ] Product appears in "My Courses" or relevant section

### Test Admin Functions
- [ ] Access `/admin` dashboard
- [ ] All admin tabs load
- [ ] Can view users list
- [ ] Can view products list
- [ ] Can view orders list

---

## 🎓 Phase 8: Add Sample Data (Optional - 5 minutes)

### Option 1: Via Admin Dashboard
- [ ] Go to `/admin`
- [ ] Click "Products" tab
- [ ] Click "Create Product"
- [ ] Fill in product details
- [ ] Save successfully

### Option 2: Via SQL (Faster for Testing)
In Supabase SQL Editor, uncomment and run the seed data section at the end of `schema_enhanced.sql`
- [ ] Sample courses created
- [ ] Sample signal plans created
- [ ] Sample bots created
- [ ] All products visible on homepage

---

## 🐛 Common Issues & Quick Fixes

### "Missing Supabase environment variables"
✅ **Fix**: Check `.env.local` exists and has all Supabase variables

### "Cannot connect to database"
✅ **Fix**: Verify Supabase URL and keys are correct

### "Stripe payment failed"
✅ **Fix**: 
1. Check Stripe keys are correct
2. Ensure webhook forwarding is running
3. Check webhook secret is set

### "Video not loading"
✅ **Fix**: Verify Cloudinary credentials are correct

### "Can't access admin dashboard"
✅ **Fix**: Run the UPDATE query to set your role to 'admin'

### "Port 3000 already in use"
✅ **Fix**: Kill the process or use different port:
```bash
npm run dev -- -p 3001
```

---

## 📚 Next Steps

Now that everything is set up:

1. **Read the full docs**: Check `COMPLETE_SETUP_GUIDE.md`
2. **Explore the code**: Start with `src/app/page.tsx`
3. **Customize**: Update branding, colors, content
4. **Add products**: Use admin dashboard to add your courses
5. **Upload videos**: Test video upload to Cloudinary
6. **Test everything**: Go through complete user journey

---

## 🚢 Ready for Production?

Before deploying:

- [ ] Read `COMPLETE_SETUP_GUIDE.md` deployment section
- [ ] Get production Stripe keys
- [ ] Setup production Supabase project
- [ ] Configure production Cloudinary
- [ ] Setup domain and SSL
- [ ] Configure webhooks for production URLs
- [ ] Test payment flow in production
- [ ] Setup monitoring and alerts

---

## 💪 You're Ready to Build!

### Development Workflow

1. **Start coding**: `npm run dev`
2. **Make changes**: Files auto-reload
3. **Test features**: Use test cards and accounts
4. **Commit often**: `git add . && git commit -m "message"`
5. **Deploy**: Push to GitHub → Auto-deploy on Vercel

### Resources

- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Stripe Docs**: [stripe.com/docs](https://stripe.com/docs)
- **Tailwind CSS**: [tailwindcss.com/docs](https://tailwindcss.com/docs)

### Support

- Check `PROJECT_ANALYSIS_AND_FIXES.md` for detailed info
- Review `COMPLETE_SETUP_GUIDE.md` for troubleshooting
- All API endpoints documented in code comments

---

**Total Setup Time: ~60 minutes**
**Difficulty: Intermediate**
**Result: Fully functional trading platform ready for customization!**

Happy coding! 🎉
