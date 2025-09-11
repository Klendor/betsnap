import { type User, type InsertUser, type RegisterData, type PublicUser, type Bet, type InsertBet, type UpdateBet, type BetHistory, type InsertBetHistory, type Screenshot, type InsertScreenshot } from "@shared/schema";
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
  updateBet(id: string, bet: UpdateBet, userId: string): Promise<Bet | undefined>;
  deleteBet(id: string, userId: string): Promise<boolean>;
  duplicateBet(id: string, userId: string): Promise<Bet | undefined>;
  bulkUpdateBets(betIds: string[], action: string, userId: string, data?: any): Promise<{ success: number; failed: number }>;
  updateBetNotes(id: string, notes: string, userId: string): Promise<Bet | undefined>;
  getUserStats(userId: string): Promise<{
    totalBets: number;
    winRate: number;
    totalProfit: number;
    pendingBets: number;
  }>;

  // Bet History methods
  getBetHistory(betId: string): Promise<BetHistory[]>;
  createBetHistory(history: InsertBetHistory): Promise<BetHistory>;

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
  private betHistories: Map<string, BetHistory>;
  private screenshots: Map<string, Screenshot>;

  constructor() {
    this.users = new Map();
    this.bets = new Map();
    this.betHistories = new Map();
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
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleSheetsConnected: 0,
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
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleSheetsConnected: 0,
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
    
    // Create history entry for creation
    await this.createBetHistory({
      betId: id,
      userId: bet.userId,
      action: "created",
      changes: JSON.stringify({ bet }),
    });
    
    return bet;
  }

  async updateBet(id: string, updates: UpdateBet, userId: string): Promise<Bet | undefined> {
    const bet = this.bets.get(id);
    if (!bet || bet.userId !== userId) return undefined;
    
    const originalBet = { ...bet };
    const updatedBet = { ...bet, ...updates };
    
    // Apply business logic
    if (updates.status && updates.status !== "pending" && !updatedBet.settledAt) {
      updatedBet.settledAt = new Date();
    }
    
    // Settlement rules
    if (updates.status === "lost") {
      updatedBet.actualPayout = "0";
    }
    if (updates.status === "won" && updates.actualPayout) {
      const actualPayout = parseFloat(updates.actualPayout);
      const stake = parseFloat(bet.stake);
      if (actualPayout < stake) {
        throw new Error("Won bets must have actualPayout >= stake");
      }
    }
    
    this.bets.set(id, updatedBet);
    
    // Create history entry
    const changes: any = {};
    Object.keys(updates).forEach(key => {
      if (originalBet[key] !== updates[key]) {
        changes[key] = { from: originalBet[key], to: updates[key] };
      }
    });
    
    if (Object.keys(changes).length > 0) {
      await this.createBetHistory({
        betId: id,
        userId,
        action: "updated",
        changes: JSON.stringify(changes),
      });
    }
    
    return updatedBet;
  }

  async deleteBet(id: string, userId: string): Promise<boolean> {
    const bet = this.bets.get(id);
    if (!bet || bet.userId !== userId) return false;
    
    // Create history entry before deleting
    await this.createBetHistory({
      betId: id,
      userId,
      action: "deleted",
      changes: JSON.stringify({ deletedBet: bet }),
    });
    
    this.bets.delete(id);
    return true;
  }

  async duplicateBet(id: string, userId: string): Promise<Bet | undefined> {
    const originalBet = this.bets.get(id);
    if (!originalBet || originalBet.userId !== userId) return undefined;
    
    const duplicatedBet: Bet = {
      ...originalBet,
      id: randomUUID(),
      status: "pending",
      actualPayout: null,
      settledAt: null,
      createdAt: new Date(),
      notes: originalBet.notes ? `${originalBet.notes} (duplicated)` : "Duplicated bet",
      sheetRowId: null, // Reset sheet sync
    };
    
    this.bets.set(duplicatedBet.id, duplicatedBet);
    
    // Create history entry
    await this.createBetHistory({
      betId: duplicatedBet.id,
      userId,
      action: "duplicated",
      changes: JSON.stringify({ originalBetId: id }),
    });
    
    return duplicatedBet;
  }

  async bulkUpdateBets(betIds: string[], action: string, userId: string, data?: any): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    
    for (const betId of betIds) {
      try {
        const bet = this.bets.get(betId);
        if (!bet || bet.userId !== userId) {
          failed++;
          continue;
        }
        
        switch (action) {
          case "markStatus":
            if (data?.status) {
              await this.updateBet(betId, { status: data.status, actualPayout: data.actualPayout }, userId);
              success++;
            } else {
              failed++;
            }
            break;
          case "delete":
            const deleted = await this.deleteBet(betId, userId);
            if (deleted) success++;
            else failed++;
            break;
          case "duplicate":
            const duplicated = await this.duplicateBet(betId, userId);
            if (duplicated) success++;
            else failed++;
            break;
          default:
            failed++;
        }
      } catch (error) {
        failed++;
      }
    }
    
    return { success, failed };
  }

  async updateBetNotes(id: string, notes: string, userId: string): Promise<Bet | undefined> {
    return this.updateBet(id, { notes }, userId);
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

  // Bet History methods
  async getBetHistory(betId: string): Promise<BetHistory[]> {
    return Array.from(this.betHistories.values())
      .filter(history => history.betId === betId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createBetHistory(insertHistory: InsertBetHistory): Promise<BetHistory> {
    const id = randomUUID();
    const history: BetHistory = {
      ...insertHistory,
      id,
      createdAt: new Date(),
    };
    this.betHistories.set(id, history);
    return history;
  }
}

export const storage = new MemStorage();
