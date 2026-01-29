# LOGICTRADERSLTD - Quick Start Guide

Get the trading platform running locally in 5 minutes.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/logictradersltd.git
cd logictradersltd

# Install dependencies
npm install
```

## 2. Environment Setup

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your credentials
nano .env.local
```

Required environment variables:

```env
# Supabase (from https://app.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (from https://dashboard.stripe.com)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary (from https://cloudinary.com)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 3. Database Setup

1. Go to [Supabase SQL Editor](https://app.supabase.com)
2. Copy contents of `supabase/schema.sql`
3. Paste and run the SQL

## 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5. Create Admin User

1. Register at [http://localhost:3000/register](http://localhost:3000/register)
2. In Supabase Table Editor, find your user in `users` table
3. Change `role` from `customer` to `admin`

## Project Structure

```
logictradersltd/
├── src/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   ├── contexts/         # Auth context
│   ├── lib/             # Utilities (Supabase, Stripe, Cloudinary)
│   ├── sections/        # Page sections
│   └── types/           # TypeScript types
├── supabase/
│   └── schema.sql       # Database schema
└── README.md            # Full documentation
```

## Key Features

| Feature | Path |
|---------|------|
| Home | `/` |
| Courses | `/courses` |
| Signals | `/signals` |
| Bots | `/bots` |
| Pricing | `/pricing` |
| Login | `/login` |
| Register | `/register` |
| Dashboard | `/dashboard` |
| Admin | `/admin` |

## Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm run lint         # Run ESLint

# Database
# Use Supabase Dashboard SQL Editor
```

## Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
npx kill-port 3000
```

### Module not found
```bash
# Clear cache and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

### Database errors
- Check Supabase URL and keys
- Verify schema is applied
- Check Row Level Security policies

## Next Steps

1. Read [README.md](README.md) for full documentation
2. Read [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
3. Customize branding in `tailwind.config.ts`
4. Add your products via Admin dashboard

## Support

- Email: support@logictradersltd.com
- Docs: https://docs.logictradersltd.com
