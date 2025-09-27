# Migration Guide: Replit to Vercel + Supabase

## Overview
This guide walks through migrating BetSnap from Replit (with Neon DB and session auth) to a modern stack with Vercel hosting and Supabase.

## Key Changes

### 1. Database Migration (Neon → Supabase)
- Supabase provides PostgreSQL with built-in auth, real-time subscriptions, and storage
- Row-level security (RLS) for better data protection
- Built-in user management

### 2. Authentication (Express Sessions → Supabase Auth)
- Replace express-session with Supabase Auth
- JWT-based authentication
- Built-in email verification, password reset
- Social auth providers available

### 3. Hosting (Replit → Vercel)
- Better performance with edge functions
- Automatic deployments from GitHub
- Environment variable management
- Custom domains support

## Step-by-Step Migration

### Phase 1: Database Setup

1. **Create Supabase Project**
   - Go to https://supabase.com and create a new project
   - Save the project URL and anon key

2. **Create Database Schema**
   ```sql
   -- Run this in Supabase SQL Editor
   -- The schema will be similar but with RLS policies
   ```

3. **Export Data from Neon**
   - Use pg_dump to export existing data
   - Import into Supabase using psql

### Phase 2: Update Authentication

1. **Install Supabase Client**
   ```bash
   npm install @supabase/supabase-js @supabase/auth-helpers-react
   ```

2. **Replace Auth Context**
   - Update `client/src/contexts/AuthContext.tsx` to use Supabase Auth
   - Remove express-session dependencies

3. **Update API Routes**
   - Remove session middleware from `server/index.ts`
   - Use Supabase service key for server-side operations

### Phase 3: Update Environment Variables

1. **Remove Old Variables**
   - SESSION_SECRET (no longer needed)
   - DATABASE_URL (replace with Supabase connection string)

2. **Add Supabase Variables**
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_KEY

### Phase 4: Deploy to Vercel

1. **Push to GitHub**
   ```bash
   gh repo create betsnap --public
   git remote add origin https://github.com/yourusername/betsnap.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Import GitHub repository in Vercel dashboard
   - Add environment variables
   - Deploy

## Benefits of Migration

1. **Better Auth**: Supabase Auth is more secure and feature-rich
2. **Scalability**: Vercel's edge network provides better global performance
3. **Developer Experience**: Better local development with Supabase CLI
4. **Cost**: More generous free tiers
5. **No Vendor Lock-in**: Standard PostgreSQL and Node.js

## Rollback Plan

If issues arise:
1. Keep Neon database backup
2. Replit project remains available
3. Can revert Git commits
4. Parallel run both systems during transition