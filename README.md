# BetSnap - AI-Powered Sports Betting Tracker

A comprehensive sports betting tracking application with AI-powered bet slip data extraction, Google Sheets integration, and subscription-based features.

## Features

- 📸 **AI-Powered Bet Extraction**: Upload betting slip screenshots and automatically extract bet details using Google Gemini AI
- 💰 **Bankroll Management**: Track multiple bankrolls with customizable risk management settings
- 📊 **Advanced Analytics**: Comprehensive betting performance analytics and insights
- 📈 **Google Sheets Integration**: Sync your bets with Google Sheets for custom reporting
- 💳 **Subscription System**: Freemium model with Stripe integration
- 🔐 **Secure Authentication**: Powered by Supabase Auth
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI/shadcn
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **AI/ML**: Google Gemini AI
- **Payments**: Stripe
- **Hosting**: Vercel

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google Cloud account (for Gemini AI)
- Stripe account
- Google Cloud Console project (for Sheets API)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/betsnap.git
cd betsnap
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 4. Set up Supabase

1. Create a new Supabase project
2. Run the database migrations in `supabase/migrations`
3. Copy your project URL and keys to `.env`

### 5. Run the development server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
betsnap/
├── client/              # React frontend
│   └── src/
│       ├── components/  # UI components
│       ├── pages/       # Page components
│       ├── contexts/    # React contexts
│       └── lib/         # Utilities
├── server/              # Express backend
│   ├── services/        # External service integrations
│   ├── routes.ts        # API routes
│   └── index.ts         # Server entry point
├── shared/              # Shared types and schemas
│   └── schema.ts        # Database schema and types
└── supabase/           # Supabase configuration
    └── migrations/      # Database migrations
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking
- `npm run db:push` - Push database schema changes

## Subscription Tiers

- **Free**: 20 bets/month, 1 bankroll, basic analytics
- **Premium ($9.99/mo)**: Unlimited bets, 5 bankrolls, advanced analytics
- **Enterprise ($29.99/mo)**: Everything in Premium + Google Sheets integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For support, email support@betsnap.com or open an issue on GitHub.