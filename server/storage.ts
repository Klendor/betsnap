import { type User, type InsertUser, type RegisterData, type PublicUser, type Bet, type InsertBet, type Screenshot, type InsertScreenshot } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<PublicUser | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>; // Returns full user with password for auth
  createUser(user: RegisterData): Promise<PublicUser>; // For registration
  updateUser(id: string, user: Partial<User>): Promise<PublicUser | undefined>;
  validatePassword(email: string, password: string): Promise<PublicUser | null>; // For login

  // Bet methods
  getBet(id: string): Promise<Bet | undefined>;
  getBetsByUser(userId: string): Promise<Bet[]>;
  createBet(bet: InsertBet): Promise<Bet>;
  updateBet(id: string, bet: Partial<Bet>): Promise<Bet | undefined>;
  getUserStats(userId: string): Promise<{
    totalBets: number;
    winRate: number;
    totalProfit: number;
    pendingBets: number;
  }>;

  // Screenshot methods
  getScreenshot(id: string): Promise<Screenshot | undefined>;
  getScreenshotsByUser(userId: string): Promise<Screenshot[]>;
  createScreenshot(screenshot: InsertScreenshot): Promise<Screenshot>;
  updateScreenshot(id: string, screenshot: Partial<Screenshot>): Promise<Screenshot | undefined>;
  getUnprocessedScreenshots(): Promise<Screenshot[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private bets: Map<string, Bet>;
  private screenshots: Map<string, Screenshot>;

  constructor() {
    this.users = new Map();
    this.bets = new Map();
    this.screenshots = new Map();
    
    // Create a demo user with hashed password for testing
    this.initializeDemoUser();
  }

  private async initializeDemoUser() {
    const hashedPassword = await bcrypt.hash("demo123", 10);
    const demoUser: User = {
      id: "demo-user-1",
      email: "demo@betsnap.com",
      name: "Demo User",
      password: hashedPassword,
      subscriptionPlan: "premium",
      googleSheetsId: null,
      createdAt: new Date(),
    };
    this.users.set(demoUser.id, demoUser);
  }

  // User methods
  async getUser(id: string): Promise<PublicUser | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    // Return user without password
    const { password, ...publicUser } = user;
    return publicUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(registerData: RegisterData): Promise<PublicUser> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(registerData.password, 10);
    const user: User = {
      ...registerData,
      id,
      password: hashedPassword,
      subscriptionPlan: "free", // Default plan
      googleSheetsId: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    // Return user without password
    const { password, ...publicUser } = user;
    return publicUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<PublicUser | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    // Return user without password
    const { password, ...publicUser } = updatedUser;
    return publicUser;
  }

  async validatePassword(email: string, password: string): Promise<PublicUser | null> {
    const user = Array.from(this.users.values()).find(user => user.email === email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;
    
    // Return user without password
    const { password: _, ...publicUser } = user;
    return publicUser;
  }

  // Bet methods
  async getBet(id: string): Promise<Bet | undefined> {
    return this.bets.get(id);
  }

  async getBetsByUser(userId: string): Promise<Bet[]> {
    return Array.from(this.bets.values())
      .filter(bet => bet.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createBet(insertBet: InsertBet): Promise<Bet> {
    const id = randomUUID();
    const bet: Bet = {
      ...insertBet,
      id,
      createdAt: new Date(),
      settledAt: null,
    };
    this.bets.set(id, bet);
    return bet;
  }

  async updateBet(id: string, updates: Partial<Bet>): Promise<Bet | undefined> {
    const bet = this.bets.get(id);
    if (!bet) return undefined;
    
    const updatedBet = { ...bet, ...updates };
    if (updates.status && updates.status !== "pending" && !updatedBet.settledAt) {
      updatedBet.settledAt = new Date();
    }
    this.bets.set(id, updatedBet);
    return updatedBet;
  }

  async getUserStats(userId: string): Promise<{
    totalBets: number;
    winRate: number;
    totalProfit: number;
    pendingBets: number;
  }> {
    const userBets = await this.getBetsByUser(userId);
    const totalBets = userBets.length;
    const settledBets = userBets.filter(bet => bet.status !== "pending");
    const wonBets = userBets.filter(bet => bet.status === "won");
    const pendingBets = userBets.filter(bet => bet.status === "pending").length;
    
    const winRate = settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0;
    
    const totalProfit = userBets.reduce((sum, bet) => {
      if (bet.status === "won" && bet.actualPayout) {
        return sum + (parseFloat(bet.actualPayout) - parseFloat(bet.stake));
      } else if (bet.status === "lost") {
        return sum - parseFloat(bet.stake);
      }
      return sum;
    }, 0);

    return {
      totalBets,
      winRate: Math.round(winRate * 10) / 10,
      totalProfit,
      pendingBets,
    };
  }

  // Screenshot methods
  async getScreenshot(id: string): Promise<Screenshot | undefined> {
    return this.screenshots.get(id);
  }

  async getScreenshotsByUser(userId: string): Promise<Screenshot[]> {
    return Array.from(this.screenshots.values())
      .filter(screenshot => screenshot.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createScreenshot(insertScreenshot: InsertScreenshot): Promise<Screenshot> {
    const id = randomUUID();
    const screenshot: Screenshot = {
      ...insertScreenshot,
      id,
      createdAt: new Date(),
    };
    this.screenshots.set(id, screenshot);
    return screenshot;
  }

  async updateScreenshot(id: string, updates: Partial<Screenshot>): Promise<Screenshot | undefined> {
    const screenshot = this.screenshots.get(id);
    if (!screenshot) return undefined;
    
    const updatedScreenshot = { ...screenshot, ...updates };
    this.screenshots.set(id, updatedScreenshot);
    return updatedScreenshot;
  }

  async getUnprocessedScreenshots(): Promise<Screenshot[]> {
    return Array.from(this.screenshots.values()).filter(screenshot => screenshot.processed === 0);
  }
}

export const storage = new MemStorage();
