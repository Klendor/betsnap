import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  subscriptionPlan: text("subscription_plan").notNull().default("free"), // free, premium
  googleSheetsId: text("google_sheets_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bets = pgTable("bets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sport: text("sport").notNull(),
  event: text("event").notNull(), // teams or event description
  betType: text("bet_type").notNull(), // moneyline, spread, over/under, etc
  odds: text("odds").notNull(), // +155, -110, etc
  stake: decimal("stake", { precision: 10, scale: 2 }).notNull(),
  potentialPayout: decimal("potential_payout", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, won, lost
  actualPayout: decimal("actual_payout", { precision: 10, scale: 2 }),
  screenshotUrl: text("screenshot_url"),
  extractedData: text("extracted_data"), // JSON string of raw AI extraction
  createdAt: timestamp("created_at").defaultNow(),
  settledAt: timestamp("settled_at"),
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
});

export const insertBetSchema = createInsertSchema(bets).omit({
  id: true,
  createdAt: true,
  settledAt: true,
});

export const insertScreenshotSchema = createInsertSchema(screenshots).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Bet = typeof bets.$inferSelect;
export type InsertBet = z.infer<typeof insertBetSchema>;
export type Screenshot = typeof screenshots.$inferSelect;
export type InsertScreenshot = z.infer<typeof insertScreenshotSchema>;
