# BetSnap Quickstart Guide

## ✅ What's Been Done

1. **GitHub Repository**: https://github.com/Klendor/betsnap
2. **Supabase Project**: Created with ID `gruyhfqollminamjagjb`
3. **Database**: Schema deployed with all tables and RLS policies
4. **Vercel Deployment**: https://betsnap-fd9dqrnol-klendors-projects.vercel.app
5. **Authentication**: Migrated from session-based to Supabase Auth

## 🚀 Final Setup Steps

### 1. Get Supabase Keys

Visit your Supabase dashboard:
https://supabase.com/dashboard/project/gruyhfqollminamjagjb/settings/api

Copy these values:
- **Project URL**: `https://gruyhfqollminamjagjb.supabase.co`
- **Anon public key**: (starts with `eyJ...`)
- **Service role key**: (for server-side operations)

### 2. Add Environment Variables to Vercel

Option A: Using Vercel Dashboard
1. Go to: https://vercel.com/klendors-projects/betsnap-app/settings/environment-variables
2. Add these variables:
   ```
   VITE_SUPABASE_URL=https://gruyhfqollminamjagjb.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_KEY=your_service_key_here
   DATABASE_URL=your_supabase_db_url_here
   ```

Option B: Using Vercel CLI
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add DATABASE_URL production
```

### 3. Add Optional API Keys

For full functionality, add these:

**Google Gemini AI** (for bet extraction):
- Get key from: https://makersuite.google.com/app/apikey
- Add as: `GEMINI_API_KEY`

**Stripe** (for payments):
- Get keys from: https://dashboard.stripe.com/apikeys
- Add as: `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 4. Redeploy with Environment Variables

```bash
vercel --prod
```

Or trigger a redeploy from the Vercel dashboard.

## 🧪 Local Development

### 1. Create `.env` file

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://gruyhfqollminamjagjb.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
DATABASE_URL=postgresql://...
```

### 2. Run locally

```bash
npm run dev
```

Visit: http://localhost:5000

## 📱 Test the App

1. **Create an account**: Sign up with your email
2. **Check email**: Verify your account (Supabase sends verification email)
3. **Create a bankroll**: Set up your betting bankroll
4. **Upload bet slip**: Test the AI extraction (needs Gemini API key)

## 🎯 Features by Tier

### Free Tier
- 20 bets per month
- 1 bankroll
- Basic analytics

### Premium Tier ($9.99/mo)
- Unlimited bets
- 5 bankrolls
- Advanced analytics
- Kelly calculator

### Enterprise Tier ($29.99/mo)
- Everything in Premium
- Google Sheets integration
- Priority support

## 🔧 Troubleshooting

### "Missing Supabase environment variables" error
- Make sure you've added the environment variables to Vercel
- Redeploy after adding variables

### Can't sign up/login
- Check that Supabase Auth is enabled in your project
- Verify email settings in Supabase dashboard

### Bet extraction not working
- Add your Gemini API key to environment variables
- Check that the image is clear and shows a betting slip

## 📚 Resources

- **Supabase Dashboard**: https://supabase.com/dashboard/project/gruyhfqollminamjagjb
- **Vercel Dashboard**: https://vercel.com/klendors-projects/betsnap-app
- **GitHub Repo**: https://github.com/Klendor/betsnap
- **Live App**: https://betsnap-app.vercel.app

## 🎉 You're Done!

Once you've added the environment variables and redeployed, your BetSnap app will be fully functional with:
- Modern authentication (Supabase Auth)
- Scalable hosting (Vercel)
- PostgreSQL database with RLS (Supabase)
- AI-powered bet extraction (with Gemini API)
- Payment processing (with Stripe)