import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  subscriptionPlan: text("subscription_plan").notNull().default("free"), // free, premium, enterprise
  subscriptionStatus: text("subscription_status").notNull().default("inactive"), // inactive, active, trialing, past_due, canceled, unpaid
  subscriptionTier: text("subscription_tier").notNull().default("free"), // free, premium, enterprise
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialStartDate: timestamp("trial_start_date"),
  trialEndDate: timestamp("trial_end_date"),
  subscriptionCancelAtPeriodEnd: integer("subscription_cancel_at_period_end").default(0), // 0 = false, 1 = true
  monthlyBetLimit: integer("monthly_bet_limit").notNull().default(20), // Monthly bet limit based on plan
  maxBankrolls: integer("max_bankrolls").notNull().default(1), // Max bankrolls based on plan
  advancedAnalytics: integer("advanced_analytics").notNull().default(0), // 0 = basic, 1 = advanced
  kellyCalculator: integer("kelly_calculator").notNull().default(0), // 0 = disabled, 1 = enabled
  googleSheetsId: text("google_sheets_id"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: timestamp("google_token_expiry"),
  googleSheetsConnected: integer("google_sheets_connected").default(0), // 0 = not connected, 1 = connected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bankrolls = pgTable("bankrolls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("USD"),
  startingBalance: decimal("starting_balance", { precision: 12, scale: 2 }).notNull(),
  unitMode: text("unit_mode").notNull().default("fixed"), // 'fixed' | 'percent'
  unitValue: decimal("unit_value", { precision: 12, scale: 4 }).notNull(), // Fixed amount or percentage (0.01 = 1%)
  maxBetPct: decimal("max_bet_pct", { precision: 5, scale: 4 }).default("0.05"), // 5% default
  dailyLossLimitPct: decimal("daily_loss_limit_pct", { precision: 5, scale: 4 }),
  weeklyLossLimitPct: decimal("weekly_loss_limit_pct", { precision: 5, scale: 4 }),
  kellyFraction: decimal("kelly_fraction", { precision: 5, scale: 4 }).default("0.25"), // 25% Kelly default
  isActive: integer("is_active").notNull().default(1), // 0 = inactive, 1 = active
  createdAt: timestamp("created_at").defaultNow(),
});

export const bankrollTransactions = pgTable("bankroll_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bankrollId: varchar("bankroll_id").notNull().references(() => bankrolls.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'deposit' | 'withdrawal' | 'adjustment' | 'profit' | 'loss' | 'transfer_in' | 'transfer_out'
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason"),
  refBetId: varchar("ref_bet_id"), // Reference to bet if transaction is from bet settlement
  createdAt: timestamp("created_at").defaultNow(),
});

export const bankrollGoals = pgTable("bankroll_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bankrollId: varchar("bankroll_id").notNull().references(() => bankrolls.id, { onDelete: "cascade" }),
  targetAmount: decimal("target_amount", { precision: 12, scale: 2 }),
  targetProfit: decimal("target_profit", { precision: 12, scale: 2 }),
  targetDate: timestamp("target_date"),
  status: text("status").notNull().default("active"), // 'active' | 'met' | 'missed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const bets = pgTable("bets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  bankrollId: varchar("bankroll_id").notNull().references(() => bankrolls.id),
  sport: text("sport").notNull(),
  event: text("event").notNull(), // teams or event description
  betType: text("bet_type").notNull(), // moneyline, spread, over/under, etc
  odds: text("odds").notNull(), // +155, -110, etc
  stake: decimal("stake", { precision: 10, scale: 2 }).notNull(),
  stakeUnits: decimal("stake_units", { precision: 8, scale: 4 }).notNull(), // stake / unit value
  potentialPayout: decimal("potential_payout", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, won, lost
  actualPayout: decimal("actual_payout", { precision: 10, scale: 2 }),
  screenshotUrl: text("screenshot_url"),
  extractedData: text("extracted_data"), // JSON string of raw AI extraction
  notes: text("notes"), // User notes for the bet
  sheetRowId: text("sheet_row_id"), // Google Sheets row ID for syncing
  createdAt: timestamp("created_at").defaultNow(),
  settledAt: timestamp("settled_at"),
});

export const betHistories = pgTable("bet_histories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  betId: varchar("bet_id").notNull().references(() => bets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // created, updated, settled, deleted, duplicated
  changes: text("changes").notNull(), // JSON string of what changed
  createdAt: timestamp("created_at").defaultNow(),
});

export const screenshots = pgTable("screenshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  processed: integer("processed").notNull().default(0), // 0 = pending, 1 = processed, -1 = failed
  extractedData: text("extracted_data"), // JSON string of AI extraction
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscription management table for tracking subscription events and billing history
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  status: text("status").notNull(), // incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid
  tier: text("tier").notNull(), // free, premium, enterprise
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  cancelAtPeriodEnd: integer("cancel_at_period_end").notNull().default(0), // 0 = false, 1 = true
  canceledAt: timestamp("canceled_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Billing events table for tracking all Stripe events
export const billingEvents = pgTable("billing_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  eventType: text("event_type").notNull(), // customer.subscription.created, invoice.paid, etc.
  eventData: text("event_data").notNull(), // JSON string of Stripe event data
  processed: integer("processed").notNull().default(0), // 0 = pending, 1 = processed, -1 = failed
  processingError: text("processing_error"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Usage tracking table for monitoring feature usage and enforcing limits
export const usageTracking = pgTable("usage_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  featureType: text("feature_type").notNull(), // bets, bankrolls, analytics_queries, etc.
  usageMonth: text("usage_month").notNull(), // YYYY-MM format
  usageCount: integer("usage_count").notNull().default(0),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  password: true, // Exclude password from regular insert schema
});

// Authentication specific schemas
export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const insertUserWithPasswordSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertBankrollSchema = createInsertSchema(bankrolls).omit({
  id: true,
  createdAt: true,
});

export const updateBankrollSchema = insertBankrollSchema.partial();

export const insertBankrollTransactionSchema = createInsertSchema(bankrollTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertBankrollGoalSchema = createInsertSchema(bankrollGoals).omit({
  id: true,
  createdAt: true,
});

export const updateBankrollGoalSchema = insertBankrollGoalSchema.partial().extend({
  status: z.enum(["active", "met", "missed"]).optional(),
});

export const insertBetSchema = createInsertSchema(bets).omit({
  id: true,
  createdAt: true,
  settledAt: true,
  stakeUnits: true, // This will be auto-calculated
});

export const updateBetSchema = insertBetSchema.partial().extend({
  status: z.enum(["pending", "won", "lost"]).optional(),
  actualPayout: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  // If status is being set to 'won', actualPayout must be provided and valid
  if (data.status === 'won') {
    if (!data.actualPayout) {
      return false;
    }
    const payout = parseFloat(data.actualPayout);
    if (isNaN(payout) || payout <= 0) {
      return false;
    }
  }
  return true;
}, {
  message: "actualPayout is required and must be a positive number when status is 'won'",
  path: ["actualPayout"],
});

export const insertBetHistorySchema = createInsertSchema(betHistories).omit({
  id: true,
  createdAt: true,
});

export const insertScreenshotSchema = createInsertSchema(screenshots).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSubscriptionSchema = insertSubscriptionSchema.partial();

export const insertBillingEventSchema = createInsertSchema(billingEvents).omit({
  id: true,
  createdAt: true,
});

export const insertUsageTrackingSchema = createInsertSchema(usageTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUsageTrackingSchema = insertUsageTrackingSchema.partial();

// Subscription plan configuration schema
export const subscriptionPlanSchema = z.object({
  tier: z.enum(["free", "premium", "enterprise"]),
  monthlyBetLimit: z.number().min(0),
  maxBankrolls: z.number().min(1),
  advancedAnalytics: z.boolean(),
  kellyCalculator: z.boolean(),
  googleSheetsSync: z.boolean(),
  price: z.number().min(0),
  stripePriceId: z.string().optional(),
});

// Stripe webhook event schema
export const stripeWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
  created: z.number(),
});

// Subscription creation request schema
export const createSubscriptionSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  paymentMethodId: z.string().optional(),
});

// Subscription update request schema
export const updateSubscriptionRequestSchema = z.object({
  cancelAtPeriodEnd: z.boolean().optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type InsertUserWithPassword = z.infer<typeof insertUserWithPasswordSchema>;
export type PublicUser = Omit<User, 'password'>; // User without password for API responses
export type Bankroll = typeof bankrolls.$inferSelect;
export type InsertBankroll = z.infer<typeof insertBankrollSchema>;
export type UpdateBankroll = z.infer<typeof updateBankrollSchema>;
export type BankrollTransaction = typeof bankrollTransactions.$inferSelect;
export type InsertBankrollTransaction = z.infer<typeof insertBankrollTransactionSchema>;
export type BankrollGoal = typeof bankrollGoals.$inferSelect;
export type InsertBankrollGoal = z.infer<typeof insertBankrollGoalSchema>;
export type UpdateBankrollGoal = z.infer<typeof updateBankrollGoalSchema>;
export type Bet = typeof bets.$inferSelect;
export type InsertBet = z.infer<typeof insertBetSchema>;
export type UpdateBet = z.infer<typeof updateBetSchema>;
export type BetHistory = typeof betHistories.$inferSelect;
export type InsertBetHistory = z.infer<typeof insertBetHistorySchema>;
export type Screenshot = typeof screenshots.$inferSelect;
export type InsertScreenshot = z.infer<typeof insertScreenshotSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type UpdateSubscription = z.infer<typeof updateSubscriptionSchema>;
export type BillingEvent = typeof billingEvents.$inferSelect;
export type InsertBillingEvent = z.infer<typeof insertBillingEventSchema>;
export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = z.infer<typeof insertUsageTrackingSchema>;
export type UpdateUsageTracking = z.infer<typeof updateUsageTrackingSchema>;
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type StripeWebhookEvent = z.infer<typeof stripeWebhookSchema>;
export type CreateSubscriptionRequest = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionRequest = z.infer<typeof updateSubscriptionRequestSchema>;

// Subscription plan definitions
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    tier: "free",
    monthlyBetLimit: 20,
    maxBankrolls: 1,
    advancedAnalytics: false,
    kellyCalculator: false,
    googleSheetsSync: false,
    price: 0,
  },
  premium: {
    tier: "premium",
    monthlyBetLimit: -1, // Unlimited
    maxBankrolls: 10,
    advancedAnalytics: true,
    kellyCalculator: true,
    googleSheetsSync: true,
    price: 19.99,
    stripePriceId: "price_premium_monthly", // Will be replaced with actual Stripe price ID
  },
  enterprise: {
    tier: "enterprise",
    monthlyBetLimit: -1, // Unlimited
    maxBankrolls: -1, // Unlimited
    advancedAnalytics: true,
    kellyCalculator: true,
    googleSheetsSync: true,
    price: 49.99,
    stripePriceId: "price_enterprise_monthly", // Will be replaced with actual Stripe price ID
  },
};

// Helper functions for subscription management
export function getSubscriptionPlan(tier: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS[tier];
}

export function canAccessFeature(user: PublicUser, feature: keyof SubscriptionPlan): boolean {
  const plan = getSubscriptionPlan(user.subscriptionTier);
  if (!plan) return false;
  
  // Special handling for numeric limits
  if (feature === 'monthlyBetLimit' || feature === 'maxBankrolls') {
    return plan[feature] === -1 || plan[feature] > 0;
  }
  
  return Boolean(plan[feature]);
}

export function hasActiveSubscription(user: PublicUser): boolean {
  return user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
}

export function isSubscriptionExpired(user: PublicUser): boolean {
  if (!user.subscriptionEndDate) return false;
  return new Date() > new Date(user.subscriptionEndDate);
}
