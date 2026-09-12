# LOGICTRADERSLTD - Trading Platform

A modern, production-ready web-based e-commerce trading platform that sells trading video courses, trading signals (subscription-based), and trading bot links. All digital products are securely locked and accessible ONLY after successful payment.

## Features

### Public Website (Marketing)
- Modern dark theme with gold accents (premium fintech look)
- Responsive design for desktop and mobile
- Animated candlestick chart visuals
- Featured sections for courses, signals, and bots
- Trust indicators and statistics

### Authentication & Roles
- Supabase Authentication (email/password)
- Role-based access control (admin, customer)
- Protected routes with middleware

### Digital Products
1. **Video Courses**
   - Multiple lesson videos
   - Cloudinary video storage
   - Secure video streaming
   - Access only after payment

2. **Trading Signals**
   - Weekly & Monthly subscription plans
   - Private signals dashboard
   - Timestamped signal history
   - Automatic access expiration

3. **Trading Bot Links**
   - Secure private links
   - Token-based access
   - Accessible only after purchase

### Payments
- Stripe integration
- MTN Mobile Money (placeholder for future implementation)
- Payment abstraction layer for easy extension
- Webhook-ready architecture
- Automatic access granting after payment confirmation

### Dashboards
- **Customer Dashboard**: Only shows paid content
- **Admin Dashboard**: Full product, user, and transaction management

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion (animations)
- Lucide React (icons)

### Backend
- Next.js API Routes
- Server Actions

### Database & Auth
- Supabase (Postgres + Auth)
- Row Level Security (RLS) policies

### File Storage
- Cloudinary (videos, thumbnails)

### Payments
- Stripe API
- MTN Mobile Money API (future)

## Project Structure

```
logictradersltd/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication callbacks
│   │   │   ├── payments/      # Payment endpoints
│   │   │   └── webhooks/      # Webhook handlers
│   │   ├── admin/             # Admin dashboard
│   │   ├── dashboard/         # Customer dashboard
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── providers.tsx      # Context providers
│   ├── components/            # Reusable components
│   │   ├── Footer.tsx
│   │   └── Navbar.tsx
│   ├── contexts/              # React contexts
│   │   └── AuthContext.tsx    # Authentication context
│   ├── lib/                   # Utility libraries
│   │   ├── cloudinary.ts      # Cloudinary integration
│   │   ├── payment.ts         # Payment abstraction
│   │   └── supabase.ts        # Supabase client
│   ├── middleware/            # Next.js middleware
│   │   └── auth.ts            # Auth middleware
│   ├── sections/              # Page sections
│   │   ├── FeaturedBots.tsx
│   │   ├── FeaturedCourses.tsx
│   │   ├── FeaturedSignals.tsx
│   │   ├── Hero.tsx
│   │   └── WhyChooseUs.tsx
│   └── types/                 # TypeScript types
│       └── index.ts
├── supabase/
│   └── schema.sql             # Database schema
├── .env.local.example         # Environment variables template
├── next.config.mjs            # Next.js config
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account
- Cloudinary account

### 1. Clone and Install

```bash
cd logictradersltd
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Database Setup

1. Create a new Supabase project
2. Go to the SQL Editor
3. Copy the contents of `supabase/schema.sql`
4. Run the SQL to create all tables, indexes, and policies

### 4. Stripe Setup

1. Create a Stripe account
2. Get your API keys from the Dashboard
3. Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
4. Add the webhook signing secret to your environment variables

### 5. Cloudinary Setup

1. Create a Cloudinary account
2. Get your cloud name, API key, and API secret
3. Add them to your environment variables

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to update your environment variables for production:

- Use production Stripe keys
- Update webhook endpoint URL
- Configure production Supabase project

## Security Features

### Access Control
- All paid content routes are protected
- Server-side validation for every request
- Row Level Security (RLS) policies on all tables
- User access controlled by `user_access` table

### Payment Security
- Stripe handles all payment processing securely
- Webhook signature verification
- No sensitive data stored in client-side code

### Video Security
- Cloudinary signed URLs for video access
- Videos streamed securely (no public URLs)
- Access expires after set time

## Database Schema

### Core Tables
- `users` - User accounts with roles
- `user_profiles` - Extended user information
- `products` - Courses, signals, bots
- `course_lessons` - Video lessons for courses
- `signal_plans` - Signal subscription configuration
- `signals` - Individual trading signals
- `trading_bots` - Bot download information
- `orders` - Purchase orders
- `payments` - Payment records
- `subscriptions` - Active subscriptions
- `user_access` - Controls access to paid content

### Security Policies
All tables have Row Level Security (RLS) enabled with appropriate policies:
- Users can only access their own data
- Admins have full access
- Products are publicly readable (when active)
- Paid content requires valid access

## API Endpoints

### Authentication
- `GET /api/auth/callback` - OAuth callback handler

### Payments
- `POST /api/payments/stripe/create-intent` - Create Stripe payment intent

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler

## Customization

### Adding New Payment Providers

1. Create a new provider class in `src/lib/payment.ts`
2. Implement the `PaymentProvider` interface
3. Register the provider in `PaymentManager`

### Adding New Product Types

1. Update the `product_type` enum in the database
2. Add type-specific tables if needed
3. Update the product creation UI
4. Add access control logic

## Troubleshooting

### Common Issues

1. **Authentication not working**
   - Check Supabase credentials
   - Verify database schema is applied
   - Check browser console for errors

2. **Payments not processing**
   - Verify Stripe keys are correct
   - Check webhook endpoint is configured
   - Review Stripe dashboard for errors

3. **Videos not loading**
   - Verify Cloudinary credentials
   - Check video access permissions
   - Review browser network tab

## Support

For support and questions, contact: support@logictradersltd.com

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

Built with ❤️ by LOGICTRADERSLTD Team
