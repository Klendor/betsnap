#!/bin/bash

echo "🔧 Adding Supabase Environment Variables to Vercel"
echo "=================================================="
echo ""
echo "Your Supabase Project URL is:"
echo "https://gruyhfqollminamjagjb.supabase.co"
echo ""
echo "To get your API keys:"
echo "1. Go to: https://supabase.com/dashboard/project/gruyhfqollminamjagjb/settings/api"
echo "2. Copy the 'anon' key (it's safe to use in the browser)"
echo ""

# Add the URL
echo "Setting VITE_SUPABASE_URL..."
echo "https://gruyhfqollminamjagjb.supabase.co" | vercel env add VITE_SUPABASE_URL production

# Remove old anon key if exists and add new one
echo ""
echo "Now paste your Supabase Anon Key (starts with 'eyJ'):"
read -r ANON_KEY

if [ ! -z "$ANON_KEY" ]; then
  vercel env rm VITE_SUPABASE_ANON_KEY production --yes 2>/dev/null
  echo "$ANON_KEY" | vercel env add VITE_SUPABASE_ANON_KEY production
fi

echo ""
echo "✅ Environment variables updated!"
echo ""
echo "🚀 Redeploying to apply changes..."
vercel --prod --yes

echo ""
echo "🎉 Done! Your app should now work at: https://betsnap-app.vercel.app"