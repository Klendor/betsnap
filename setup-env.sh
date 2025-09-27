#!/bin/bash

echo "🔧 Setting up Vercel Environment Variables"
echo "=========================================="
echo ""
echo "📝 You'll need to get the following from your Supabase dashboard:"
echo "   - Go to: https://supabase.com/dashboard/project/gruyhfqollminamjagjb/settings/api"
echo "   - Copy the Project URL and anon public key"
echo ""

read -p "Enter your Supabase Project URL: " SUPABASE_URL
read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY
read -p "Enter your Supabase Service Key (optional, for server-side): " SUPABASE_SERVICE_KEY

echo ""
echo "Setting Vercel environment variables..."

# Set Supabase variables
vercel env add VITE_SUPABASE_URL production <<< "$SUPABASE_URL"
vercel env add VITE_SUPABASE_ANON_KEY production <<< "$SUPABASE_ANON_KEY"

if [ ! -z "$SUPABASE_SERVICE_KEY" ]; then
  vercel env add SUPABASE_SERVICE_KEY production <<< "$SUPABASE_SERVICE_KEY"
fi

# Database URL (for Drizzle if needed)
DATABASE_URL="postgresql://postgres.gruyhfqollminamjagjb:$DB_PASS@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
vercel env add DATABASE_URL production <<< "$DATABASE_URL"

echo ""
echo "📝 Optional: Add your other API keys"
echo ""

read -p "Enter your Gemini API Key (press Enter to skip): " GEMINI_API_KEY
if [ ! -z "$GEMINI_API_KEY" ]; then
  vercel env add GEMINI_API_KEY production <<< "$GEMINI_API_KEY"
fi

read -p "Enter your Stripe Secret Key (press Enter to skip): " STRIPE_SECRET_KEY
if [ ! -z "$STRIPE_SECRET_KEY" ]; then
  vercel env add STRIPE_SECRET_KEY production <<< "$STRIPE_SECRET_KEY"
  
  read -p "Enter your Stripe Publishable Key: " STRIPE_PUBLISHABLE_KEY
  vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production <<< "$STRIPE_PUBLISHABLE_KEY"
fi

echo ""
echo "✅ Environment variables set!"
echo ""
echo "🚀 Deploying with new environment variables..."
vercel --prod

echo ""
echo "🎉 Deployment complete!"
echo "   Visit your app at: https://betsnap-app.vercel.app"