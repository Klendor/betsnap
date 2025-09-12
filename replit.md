# Overview

BetSnap is a comprehensive sports betting tracking application built with a modern full-stack architecture. The application allows users to capture betting slips through image upload, automatically extract bet data using AI, track their betting performance, and manage bankrolls. It features a freemium subscription model with Stripe integration, Google Sheets connectivity for data export, and advanced analytics for premium users.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with custom design tokens and responsive design patterns
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Forms**: React Hook Form with Zod schema validation for robust form handling
- **Authentication**: Context-based auth system with session management

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **Session Management**: Express-session with secure cookie configuration
- **File Uploads**: Multer middleware for handling betting slip images and PDFs
- **API Design**: RESTful API with consistent error handling and validation

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Normalized schema with tables for users, bets, bankrolls, transactions, and subscription data
- **Database Provider**: Neon serverless PostgreSQL for scalable cloud hosting
- **Migrations**: Drizzle Kit for database schema management and versioning

## Authentication and Authorization
- **Strategy**: Session-based authentication with secure HTTP-only cookies
- **Password Security**: Bcrypt for password hashing with proper salt rounds
- **Route Protection**: Middleware-based authentication checks for protected endpoints
- **User Sessions**: Extended session data including user preferences and subscription status

## External Service Integrations

### AI-Powered Data Extraction
- **Service**: Google Gemini AI for optical character recognition and data extraction
- **Purpose**: Automatically parse betting slip images to extract bet details
- **Validation**: Confidence scoring and data validation for extracted information

### Payment Processing
- **Service**: Stripe for subscription billing and payment processing
- **Features**: Recurring subscriptions, trial periods, plan upgrades/downgrades
- **Security**: PCI-compliant payment handling with webhook verification

### Data Export and Sync
- **Service**: Google Sheets API for data export and synchronization
- **OAuth Flow**: Secure OAuth 2.0 implementation for Google account integration
- **Features**: Automatic bet sync, template creation, and real-time updates

### Development and Deployment
- **Build Tool**: Vite for fast development and optimized production builds
- **Development Environment**: Replit-specific configurations and error overlays
- **Asset Management**: Optimized asset handling with proper MIME type detection

## Key Design Patterns

### Data Flow Architecture
- Unidirectional data flow with React Query managing server state
- Optimistic updates for better user experience
- Automatic background refetching and cache invalidation

### Error Handling Strategy
- Global error boundaries for React components
- Consistent API error responses with proper HTTP status codes
- User-friendly error messages with fallback states

### Security Considerations
- Input validation using Zod schemas on both client and server
- CSRF protection through session-based authentication
- File upload security with type validation and size limits
- Environment variable management for sensitive configurations

### Performance Optimizations
- Code splitting and lazy loading for reduced bundle size
- Database query optimization with proper indexing
- Image compression and format optimization for betting slip uploads
- Efficient caching strategies with React Query

### Subscription Model Implementation
- Tiered feature access based on subscription plans
- Usage tracking and limit enforcement
- Graceful degradation for users exceeding limits
- Automated billing and subscription lifecycle management