# Setting Up Google OAuth for BetSnap

## 1. Enable Google Provider in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/gruyhfqollminamjagjb/auth/providers
2. Find "Google" in the list of providers
3. Toggle it ON

## 2. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add these settings:
   - **Name**: BetSnap Auth
   - **Authorized JavaScript origins**: 
     - `https://gruyhfqollminamjagjb.supabase.co`
     - `http://localhost:5000` (for local development)
   - **Authorized redirect URIs**:
     - `https://gruyhfqollminamjagjb.supabase.co/auth/v1/callback`
     - `http://localhost:5000/auth/callback` (for local development)
7. Click "Create"
8. Copy the Client ID and Client Secret

## 3. Add to Supabase

Back in Supabase dashboard (Auth → Providers → Google):
1. Paste your Google Client ID
2. Paste your Google Client Secret
3. Click "Save"

## 4. Configure Redirect URLs in Supabase

Go to: https://supabase.com/dashboard/project/gruyhfqollminamjagjb/auth/url-configuration

Add these URLs to "Redirect URLs":
- `http://localhost:5000`
- `https://betsnap-app.vercel.app`
- `https://betsnap-fd9dqrnol-klendors-projects.vercel.app`

## 5. That's it!

The code is already set up to handle Google login. Once configured, users can sign in with Google!