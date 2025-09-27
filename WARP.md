# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

BetSnap is a sports betting tracking application with AI-powered bet slip data extraction, Google Sheets integration, and a subscription-based pricing model using Stripe. The application uses React with TypeScript on the frontend, Express.js backend, PostgreSQL database with Drizzle ORM, and is configured for Vercel deployment.

## Common Development Commands

### Development
```bash
# Start development server (both frontend and backend)
npm run dev

# Start production server
npm run build && npm run start
```

### Database Operations
```bash
# Push database schema changes to Neon PostgreSQL
npm run db:push

# Generate migrations (if using drizzle-kit generate)
npx drizzle-kit generate

# Run migrations (if using drizzle-kit migrate)
npx drizzle-kit migrate
```

### Type Checking
```bash
# Run TypeScript type checking
npm run check
```

### Environment Setup
```bash
# Required environment variables:
DATABASE_URL          # Neon PostgreSQL connection string
SESSION_SECRET        # Express session secret
GEMINI_API_KEY        # Google Gemini AI API key for image extraction
STRIPE_SECRET_KEY     # Stripe secret key for payments
STRIPE_WEBHOOK_SECRET # Stripe webhook secret
GOOGLE_CLIENT_ID      # Google OAuth client ID
GOOGLE_CLIENT_SECRET  # Google OAuth client secret
GOOGLE_REDIRECT_URI   # Google OAuth redirect URI
PORT                  # Server port (default: 5000)
```

## Architecture and Code Structure

### Frontend Architecture (`/client/src`)
- **Framework**: React 18 with TypeScript, using Wouter for routing
- **State Management**: TanStack Query for server state, React Context for auth
- **UI Components**: Radix UI primitives with shadcn/ui components (`@/components/ui`)
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom design tokens
- **Key Pages**:
  - Dashboard: Main user interface showing bets and stats
  - Analytics: Advanced betting analytics (premium feature)
  - Bankrolls: Bankroll management system
  - Subscription: Payment and plan management

### Backend Architecture (`/server`)
- **API Server**: Express.js with TypeScript (`server/index.ts`)
- **Routes**: RESTful API endpoints in `server/routes.ts`
- **Authentication**: Session-based auth with bcrypt password hashing
- **File Handling**: Multer for image/PDF uploads of betting slips
- **Services**:
  - `services/gemini.ts`: AI-powered bet data extraction from images
  - `services/googleSheets.ts`: Google Sheets API integration
- **Storage Layer**: `storage.ts` handles all database operations

### Database Schema (`/shared/schema.ts`)
- **ORM**: Drizzle ORM with PostgreSQL (Neon)
- **Core Tables**:
  - `users`: User accounts with subscription data
  - `bets`: Betting records with AI-extracted data
  - `bankrolls`: Bankroll management configurations
  - `bankroll_transactions`: Financial transaction tracking
  - `subscriptions`: Stripe subscription tracking
  - `screenshots`: Uploaded bet slip images

### Shared Code (`/shared`)
- Type definitions and Zod schemas shared between frontend and backend
- Database schema definitions using Drizzle ORM

### Build Configuration
- **Vite**: Development server and production builds
- **TypeScript**: Configured with path aliases (`@/`, `@shared/`)
- **Vercel**: Production deployment configuration in `vercel.json`

## Key Features and Implementation Details

### AI-Powered Bet Extraction
The application uses Google Gemini AI to extract betting data from uploaded screenshots:
- Images are processed in `server/services/gemini.ts`
- Supports various betting slip formats (images and PDFs)
- Extracts: sport, event, bet type, odds, stake, potential payout
- Includes confidence scoring for extraction accuracy

### Subscription System
Tiered pricing model with Stripe integration:
- **Free Tier**: 20 bets/month, 1 bankroll, basic analytics
- **Premium Tier**: Unlimited bets, multiple bankrolls, advanced analytics
- **Enterprise Tier**: Custom features and Google Sheets integration
- Webhook handling for subscription lifecycle events

### Google Sheets Integration
Premium feature allowing users to sync bets with Google Sheets:
- OAuth 2.0 flow for authentication
- Automatic sheet creation with templates
- Real-time bet synchronization
- Monthly summaries and analytics

### Authentication Flow
Session-based authentication with secure cookie management:
- Registration/login endpoints in `/api/auth/*`
- Protected routes using `requireAuth` middleware
- User context available throughout the application

## Development Workflow

### Adding New Features
1. Define types in `shared/schema.ts` if database changes needed
2. Run `npm run db:push` to update database schema
3. Implement backend logic in `server/routes.ts`
4. Add storage operations in `server/storage.ts`
5. Create frontend components in `client/src/components`
6. Update pages in `client/src/pages`

### File Upload Handling
- Max file size: 10MB
- Supported formats: JPG, PNG, WEBP, PDF
- Files temporarily stored in `/uploads` during processing
- Images are processed through Gemini AI for data extraction

### API Endpoints Pattern
All API endpoints follow RESTful conventions:
- `GET /api/resource` - List resources
- `POST /api/resource` - Create resource
- `PUT /api/resource/:id` - Update resource
- `DELETE /api/resource/:id` - Delete resource
- Authentication required endpoints use `requireAuth` middleware

## Testing and Debugging

### Local Development
- Frontend runs on Vite dev server
- Backend API on Express server (port 5000 by default)
- Hot module replacement enabled for React components
- TypeScript checking with `npm run check`

### Common Issues and Solutions
- **Database Connection**: Ensure `DATABASE_URL` is set correctly
- **AI Extraction Failures**: Check `GEMINI_API_KEY` is valid
- **Payment Issues**: Verify Stripe keys and webhook configuration
- **File Upload Errors**: Check file size and format restrictions