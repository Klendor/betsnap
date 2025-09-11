import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  subscriptionPlan: text("subscription_plan").notNull().default("free"), // free, premium
  googleSheetsId: text("google_sheets_id"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: timestamp("google_token_expiry"),
  googleSheetsConnected: integer("google_sheets_connected").default(0), // 0 = not connected, 1 = connected
  createdAt: timestamp("created_at").defaultNow(),
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
