import { type User, type InsertUser, type RegisterData, type PublicUser, type Bet, type InsertBet, type UpdateBet, type BetHistory, type InsertBetHistory, type Screenshot, type InsertScreenshot, type Bankroll, type InsertBankroll, type UpdateBankroll, type BankrollTransaction, type InsertBankrollTransaction, type BankrollGoal, type InsertBankrollGoal, type UpdateBankrollGoal } from "@shared/schema";
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

  // Advanced Analytics methods
  getAdvancedAnalytics(userId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    profitOverTime: Array<{ date: string; profit: number; cumulativeProfit: number }>;
    sportPerformance: Array<{ sport: string; totalBets: number; winRate: number; profit: number; roi: number }>;
    betTypeAnalysis: Array<{ betType: string; totalBets: number; winRate: number; profit: number; avgOdds: string }>;
    profitByDayOfWeek: Array<{ day: string; profit: number; betCount: number }>;
    streakAnalysis: {
      currentStreak: { type: 'win' | 'loss', count: number };
      longestWinStreak: number;
      longestLoseStreak: number;
    };
    betSizeDistribution: Array<{ range: string; count: number; profit: number }>;
    monthlyTrends: Array<{ month: string; profit: number; betCount: number; winRate: number }>;
    roiMetrics: {
      overall: number;
      lastMonth: number;
      bestMonth: number;
      worstMonth: number;
    };
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

  // Bankroll methods
  getBankroll(id: string): Promise<Bankroll | undefined>;
  getBankrollsByUser(userId: string): Promise<Bankroll[]>;
  getActiveBankroll(userId: string): Promise<Bankroll | undefined>;
  createBankroll(bankroll: InsertBankroll): Promise<Bankroll>;
  updateBankroll(id: string, bankroll: UpdateBankroll, userId: string): Promise<Bankroll | undefined>;
  deleteBankroll(id: string, userId: string): Promise<boolean>;
  activateBankroll(id: string, userId: string): Promise<Bankroll | undefined>;
  deactivateBankroll(id: string, userId: string): Promise<Bankroll | undefined>;
  getBankrollBalance(bankrollId: string): Promise<number>;
  
  // Bankroll Transaction methods
  getBankrollTransaction(id: string): Promise<BankrollTransaction | undefined>;
  getBankrollTransactions(bankrollId: string): Promise<BankrollTransaction[]>;
  createBankrollTransaction(transaction: InsertBankrollTransaction): Promise<BankrollTransaction>;
  getBankrollTransactionsByType(bankrollId: string, type: string): Promise<BankrollTransaction[]>;
  
  // Bankroll Goal methods
  getBankrollGoals(bankrollId: string): Promise<BankrollGoal[]>;
  createBankrollGoal(goal: InsertBankrollGoal): Promise<BankrollGoal>;
  updateBankrollGoal(id: string, goal: UpdateBankrollGoal, userId: string): Promise<BankrollGoal | undefined>;
  deleteBankrollGoal(id: string, userId: string): Promise<boolean>;
  
  // Bankroll Analytics methods
  getBankrollAnalytics(bankrollId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    currentBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalProfit: number;
    balanceHistory: Array<{ date: string; balance: number; }>;
    drawdownAnalysis: {
      maxDrawdown: number;
      maxDrawdownPercent: number;
      currentDrawdown: number;
      currentDrawdownPercent: number;
      recoverySinceMax: number;
    };
    unitPnL: {
      totalUnitsWagered: number;
      unitsWon: number;
      unitsLost: number;
      avgUnitSize: number;
      unitProfitLoss: number;
    };
    riskMetrics: {
      riskOfRuin: number;
      sharpeRatio: number;
      maxConcurrentRisk: number;
      winStreakStdDev: number;
    };
    recentActivity: Array<{ date: string; type: string; amount: number; description: string; }>;
  }>;
  
  // Helper methods for risk management
  checkDailyLossLimit(bankrollId: string): Promise<{ exceeded: boolean; current: number; limit: number; }>;
  checkWeeklyLossLimit(bankrollId: string): Promise<{ exceeded: boolean; current: number; limit: number; }>;
  calculateKellyBetSize(bankrollId: string, winProbability: number, odds: string): Promise<{ units: number; amount: number; kelly: number; }>;
  getMaxBetSize(bankrollId: string): Promise<{ maxAmount: number; maxUnits: number; }>;
  validateBetSize(bankrollId: string, stakeAmount: number): Promise<{ valid: boolean; reasons: string[]; }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private bets: Map<string, Bet>;
  private betHistories: Map<string, BetHistory>;
  private screenshots: Map<string, Screenshot>;
  private bankrolls: Map<string, Bankroll>;
  private bankrollTransactions: Map<string, BankrollTransaction>;
  private bankrollGoals: Map<string, BankrollGoal>;

  constructor() {
    this.users = new Map();
    this.bets = new Map();
    this.betHistories = new Map();
    this.screenshots = new Map();
    this.bankrolls = new Map();
    this.bankrollTransactions = new Map();
    this.bankrollGoals = new Map();
    
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
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
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

  async getAdvancedAnalytics(userId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    profitOverTime: Array<{ date: string; profit: number; cumulativeProfit: number }>;
    sportPerformance: Array<{ sport: string; totalBets: number; winRate: number; profit: number; roi: number }>;
    betTypeAnalysis: Array<{ betType: string; totalBets: number; winRate: number; profit: number; avgOdds: string }>;
    profitByDayOfWeek: Array<{ day: string; profit: number; betCount: number }>;
    streakAnalysis: {
      currentStreak: { type: 'win' | 'loss', count: number };
      longestWinStreak: number;
      longestLoseStreak: number;
    };
    betSizeDistribution: Array<{ range: string; count: number; profit: number }>;
    monthlyTrends: Array<{ month: string; profit: number; betCount: number; winRate: number }>;
    roiMetrics: {
      overall: number;
      lastMonth: number;
      bestMonth: number;
      worstMonth: number;
    };
  }> {
    let userBets = await this.getBetsByUser(userId);
    
    // Apply date filtering if provided
    if (dateFrom || dateTo) {
      userBets = userBets.filter(bet => {
        if (!bet.createdAt) return false; // Skip bets without creation date
        const betDate = new Date(bet.createdAt);
        if (dateFrom && betDate < dateFrom) return false;
        if (dateTo && betDate > dateTo) return false;
        return true;
      });
    }
    
    const settledBets = userBets.filter(bet => bet.status !== "pending");
    
    // Profit over time
    const profitOverTime = this.calculateProfitOverTime(settledBets);
    
    // Sport performance
    const sportPerformance = this.analyzeSportPerformance(settledBets);
    
    // Bet type analysis
    const betTypeAnalysis = this.analyzeBetTypes(settledBets);
    
    // Profit by day of week
    const profitByDayOfWeek = this.analyzeProfitByDayOfWeek(settledBets);
    
    // Streak analysis
    const streakAnalysis = this.analyzeStreaks(settledBets);
    
    // Bet size distribution
    const betSizeDistribution = this.analyzeBetSizeDistribution(settledBets);
    
    // Monthly trends
    const monthlyTrends = this.analyzeMonthlyTrends(settledBets);
    
    // ROI metrics
    const roiMetrics = this.calculateROIMetrics(settledBets);
    
    return {
      profitOverTime,
      sportPerformance,
      betTypeAnalysis,
      profitByDayOfWeek,
      streakAnalysis,
      betSizeDistribution,
      monthlyTrends,
      roiMetrics,
    };
  }
  
  private calculateProfitOverTime(bets: Bet[]): Array<{ date: string; profit: number; cumulativeProfit: number }> {
    // Filter out bets without creation dates first
    const validBets = bets.filter(bet => bet.createdAt);
    const sortedBets = validBets.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
    
    let cumulativeProfit = 0;
    const result: Array<{ date: string; profit: number; cumulativeProfit: number }> = [];
    
    sortedBets.forEach(bet => {
      const profit = this.calculateBetProfit(bet);
      cumulativeProfit += profit;
      
      result.push({
        date: new Date(bet.createdAt!).toISOString().split('T')[0], // Safe after filter above
        profit,
        cumulativeProfit,
      });
    });
    
    return result;
  }
  
  private analyzeSportPerformance(bets: Bet[]): Array<{ sport: string; totalBets: number; winRate: number; profit: number; roi: number }> {
    const sportMap = new Map<string, { totalBets: number; winCount: number; totalStake: number; totalProfit: number }>();
    
    bets.forEach(bet => {
      const sport = bet.sport;
      const current = sportMap.get(sport) || { totalBets: 0, winCount: 0, totalStake: 0, totalProfit: 0 };
      
      current.totalBets++;
      if (bet.status === "won") current.winCount++;
      current.totalStake += parseFloat(bet.stake);
      current.totalProfit += this.calculateBetProfit(bet);
      
      sportMap.set(sport, current);
    });
    
    return Array.from(sportMap.entries()).map(([sport, data]) => ({
      sport,
      totalBets: data.totalBets,
      winRate: data.totalBets > 0 ? Math.round((data.winCount / data.totalBets) * 100 * 10) / 10 : 0,
      profit: Math.round(data.totalProfit * 100) / 100,
      roi: data.totalStake > 0 ? Math.round((data.totalProfit / data.totalStake) * 100 * 10) / 10 : 0,
    })).sort((a, b) => b.profit - a.profit);
  }
  
  private analyzeBetTypes(bets: Bet[]): Array<{ betType: string; totalBets: number; winRate: number; profit: number; avgOdds: string }> {
    const betTypeMap = new Map<string, { totalBets: number; winCount: number; totalProfit: number; oddsSum: number }>();
    
    bets.forEach(bet => {
      const betType = bet.betType;
      const current = betTypeMap.get(betType) || { totalBets: 0, winCount: 0, totalProfit: 0, oddsSum: 0 };
      
      current.totalBets++;
      if (bet.status === "won") current.winCount++;
      current.totalProfit += this.calculateBetProfit(bet);
      
      // Parse odds for averaging (handle +/- format)
      const odds = bet.odds.replace(/[^-\d]/g, '');
      current.oddsSum += parseInt(odds) || 0;
      
      betTypeMap.set(betType, current);
    });
    
    return Array.from(betTypeMap.entries()).map(([betType, data]) => ({
      betType,
      totalBets: data.totalBets,
      winRate: data.totalBets > 0 ? Math.round((data.winCount / data.totalBets) * 100 * 10) / 10 : 0,
      profit: Math.round(data.totalProfit * 100) / 100,
      avgOdds: data.totalBets > 0 ? (data.oddsSum >= 0 ? '+' : '') + Math.round(data.oddsSum / data.totalBets).toString() : '+0',
    })).sort((a, b) => b.totalBets - a.totalBets);
  }
  
  private analyzeProfitByDayOfWeek(bets: Bet[]): Array<{ day: string; profit: number; betCount: number }> {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayMap = new Map<string, { profit: number; betCount: number }>();
    
    days.forEach(day => dayMap.set(day, { profit: 0, betCount: 0 }));
    
    bets.forEach(bet => {
      if (!bet.createdAt) return; // Skip bets without creation date
      const day = days[new Date(bet.createdAt).getDay()];
      const current = dayMap.get(day)!;
      current.profit += this.calculateBetProfit(bet);
      current.betCount++;
    });
    
    return days.map(day => ({
      day,
      profit: Math.round(dayMap.get(day)!.profit * 100) / 100,
      betCount: dayMap.get(day)!.betCount,
    }));
  }
  
  private analyzeStreaks(bets: Bet[]): {
    currentStreak: { type: 'win' | 'loss', count: number };
    longestWinStreak: number;
    longestLoseStreak: number;
  } {
    // Filter out bets without creation dates first
    const validBets = bets.filter(bet => bet.createdAt);
    const sortedBets = validBets.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    
    let currentStreak = { type: 'win' as const, count: 0 };
    let longestWinStreak = 0;
    let longestLoseStreak = 0;
    let currentWinStreak = 0;
    let currentLoseStreak = 0;
    
    for (const bet of sortedBets) {
      if (bet.status === "won") {
        currentWinStreak++;
        currentLoseStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
        
        if (currentStreak.count === 0) {
          currentStreak = { type: 'win', count: currentWinStreak };
        } else if (currentStreak.type === 'win') {
          currentStreak.count = currentWinStreak;
        }
      } else if (bet.status === "lost") {
        currentLoseStreak++;
        currentWinStreak = 0;
        longestLoseStreak = Math.max(longestLoseStreak, currentLoseStreak);
        
        if (currentStreak.count === 0) {
          currentStreak = { type: 'loss', count: currentLoseStreak };
        } else if (currentStreak.type === 'loss') {
          currentStreak.count = currentLoseStreak;
        }
      }
    }
    
    return { currentStreak, longestWinStreak, longestLoseStreak };
  }
  
  private analyzeBetSizeDistribution(bets: Bet[]): Array<{ range: string; count: number; profit: number }> {
    const ranges = [
      { label: '$1-25', min: 1, max: 25 },
      { label: '$26-50', min: 26, max: 50 },
      { label: '$51-100', min: 51, max: 100 },
      { label: '$101-250', min: 101, max: 250 },
      { label: '$251+', min: 251, max: Infinity },
    ];
    
    const rangeMap = new Map<string, { count: number; profit: number }>();
    ranges.forEach(range => rangeMap.set(range.label, { count: 0, profit: 0 }));
    
    bets.forEach(bet => {
      const stake = parseFloat(bet.stake);
      const range = ranges.find(r => stake >= r.min && stake <= r.max);
      if (range) {
        const current = rangeMap.get(range.label)!;
        current.count++;
        current.profit += this.calculateBetProfit(bet);
      }
    });
    
    return ranges.map(range => ({
      range: range.label,
      count: rangeMap.get(range.label)!.count,
      profit: Math.round(rangeMap.get(range.label)!.profit * 100) / 100,
    }));
  }
  
  private analyzeMonthlyTrends(bets: Bet[]): Array<{ month: string; profit: number; betCount: number; winRate: number }> {
    const monthMap = new Map<string, { profit: number; betCount: number; winCount: number }>();
    
    bets.forEach(bet => {
      if (!bet.createdAt) return; // Skip bets without creation date
      const month = new Date(bet.createdAt).toISOString().slice(0, 7); // YYYY-MM format
      const current = monthMap.get(month) || { profit: 0, betCount: 0, winCount: 0 };
      
      current.profit += this.calculateBetProfit(bet);
      current.betCount++;
      if (bet.status === "won") current.winCount++;
      
      monthMap.set(month, current);
    });
    
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        profit: Math.round(data.profit * 100) / 100,
        betCount: data.betCount,
        winRate: data.betCount > 0 ? Math.round((data.winCount / data.betCount) * 100 * 10) / 10 : 0,
      }));
  }
  
  private calculateROIMetrics(bets: Bet[]): {
    overall: number;
    lastMonth: number;
    bestMonth: number;
    worstMonth: number;
  } {
    const totalStake = bets.reduce((sum, bet) => sum + parseFloat(bet.stake), 0);
    const totalProfit = bets.reduce((sum, bet) => sum + this.calculateBetProfit(bet), 0);
    const overall = totalStake > 0 ? Math.round((totalProfit / totalStake) * 100 * 10) / 10 : 0;
    
    // Last month ROI
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthBets = bets.filter(bet => bet.createdAt && new Date(bet.createdAt) >= lastMonth);
    const lastMonthStake = lastMonthBets.reduce((sum, bet) => sum + parseFloat(bet.stake), 0);
    const lastMonthProfit = lastMonthBets.reduce((sum, bet) => sum + this.calculateBetProfit(bet), 0);
    const lastMonthROI = lastMonthStake > 0 ? Math.round((lastMonthProfit / lastMonthStake) * 100 * 10) / 10 : 0;
    
    // Best and worst month ROI
    const monthlyTrends = this.analyzeMonthlyTrends(bets);
    const monthlyROIs = monthlyTrends.map(trend => {
      const monthBets = bets.filter(bet => bet.createdAt && new Date(bet.createdAt).toISOString().startsWith(trend.month));
      const stake = monthBets.reduce((sum, bet) => sum + parseFloat(bet.stake), 0);
      return stake > 0 ? Math.round((trend.profit / stake) * 100 * 10) / 10 : 0;
    });
    
    const bestMonth = monthlyROIs.length > 0 ? Math.max(...monthlyROIs) : 0;
    const worstMonth = monthlyROIs.length > 0 ? Math.min(...monthlyROIs) : 0;
    
    return { overall, lastMonth: lastMonthROI, bestMonth, worstMonth };
  }
  
  private calculateBetProfit(bet: Bet): number {
    if (bet.status === "won" && bet.actualPayout) {
      return parseFloat(bet.actualPayout) - parseFloat(bet.stake);
    } else if (bet.status === "lost") {
      return -parseFloat(bet.stake);
    }
    return 0;
  }

  // Screenshot methods
  async getScreenshot(id: string): Promise<Screenshot | undefined> {
    return this.screenshots.get(id);
  }

  async getScreenshotsByUser(userId: string): Promise<Screenshot[]> {
    return Array.from(this.screenshots.values())
      .filter(screenshot => screenshot.userId === userId)
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
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
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
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

  // ============ BANKROLL MANAGEMENT METHODS ============

  // Bankroll CRUD methods
  async getBankroll(id: string): Promise<Bankroll | undefined> {
    return this.bankrolls.get(id);
  }

  async getBankrollsByUser(userId: string): Promise<Bankroll[]> {
    return Array.from(this.bankrolls.values())
      .filter(bankroll => bankroll.userId === userId)
      .sort((a, b) => {
        // Active bankrolls first, then by creation date (newest first)
        if (a.isActive !== b.isActive) {
          return (b.isActive || 0) - (a.isActive || 0);
        }
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }

  async getActiveBankroll(userId: string): Promise<Bankroll | undefined> {
    return Array.from(this.bankrolls.values())
      .find(bankroll => bankroll.userId === userId && bankroll.isActive === 1);
  }

  async createBankroll(insertBankroll: InsertBankroll): Promise<Bankroll> {
    const id = randomUUID();
    const bankroll: Bankroll = {
      ...insertBankroll,
      id,
      createdAt: new Date(),
    };
    
    // If this is the first bankroll for the user, make it active
    const userBankrolls = await this.getBankrollsByUser(bankroll.userId);
    if (userBankrolls.length === 0) {
      bankroll.isActive = 1;
    }
    
    this.bankrolls.set(id, bankroll);
    
    // Create initial deposit transaction
    await this.createBankrollTransaction({
      bankrollId: id,
      userId: bankroll.userId,
      type: "deposit",
      amount: bankroll.startingBalance,
      reason: "Initial bankroll funding",
    });
    
    return bankroll;
  }

  async updateBankroll(id: string, updates: UpdateBankroll, userId: string): Promise<Bankroll | undefined> {
    const bankroll = this.bankrolls.get(id);
    if (!bankroll || bankroll.userId !== userId) return undefined;
    
    const updatedBankroll = { ...bankroll, ...updates };
    this.bankrolls.set(id, updatedBankroll);
    return updatedBankroll;
  }

  async deleteBankroll(id: string, userId: string): Promise<boolean> {
    const bankroll = this.bankrolls.get(id);
    if (!bankroll || bankroll.userId !== userId) return false;
    
    // Check if there are any bets associated with this bankroll
    const associatedBets = Array.from(this.bets.values()).filter(bet => bet.bankrollId === id);
    if (associatedBets.length > 0) {
      throw new Error("Cannot delete bankroll with associated bets");
    }
    
    // Delete all associated data
    this.bankrolls.delete(id);
    
    // Delete transactions
    Array.from(this.bankrollTransactions.values())
      .filter(transaction => transaction.bankrollId === id)
      .forEach(transaction => this.bankrollTransactions.delete(transaction.id));
    
    // Delete goals
    Array.from(this.bankrollGoals.values())
      .filter(goal => goal.bankrollId === id)
      .forEach(goal => this.bankrollGoals.delete(goal.id));
    
    return true;
  }

  async activateBankroll(id: string, userId: string): Promise<Bankroll | undefined> {
    const bankroll = this.bankrolls.get(id);
    if (!bankroll || bankroll.userId !== userId) return undefined;
    
    // Deactivate all other bankrolls for this user
    const userBankrolls = await this.getBankrollsByUser(userId);
    userBankrolls.forEach(br => {
      if (br.id !== id) {
        br.isActive = 0;
        this.bankrolls.set(br.id, br);
      }
    });
    
    // Activate this bankroll
    bankroll.isActive = 1;
    this.bankrolls.set(id, bankroll);
    return bankroll;
  }

  async deactivateBankroll(id: string, userId: string): Promise<Bankroll | undefined> {
    const bankroll = this.bankrolls.get(id);
    if (!bankroll || bankroll.userId !== userId) return undefined;
    
    bankroll.isActive = 0;
    this.bankrolls.set(id, bankroll);
    return bankroll;
  }

  async getBankrollBalance(bankrollId: string): Promise<number> {
    const bankroll = this.bankrolls.get(bankrollId);
    if (!bankroll) return 0;
    
    const transactions = await this.getBankrollTransactions(bankrollId);
    const totalTransactions = transactions.reduce((sum, transaction) => {
      const amount = parseFloat(transaction.amount);
      switch (transaction.type) {
        case "deposit":
        case "adjustment":
        case "profit":
        case "transfer_in":
          return sum + amount;
        case "withdrawal":
        case "loss":
        case "transfer_out":
          return sum - amount;
        default:
          return sum;
      }
    }, 0);
    
    return Math.round((parseFloat(bankroll.startingBalance) + totalTransactions) * 100) / 100;
  }

  // Bankroll Transaction methods
  async getBankrollTransaction(id: string): Promise<BankrollTransaction | undefined> {
    return this.bankrollTransactions.get(id);
  }

  async getBankrollTransactions(bankrollId: string): Promise<BankrollTransaction[]> {
    return Array.from(this.bankrollTransactions.values())
      .filter(transaction => transaction.bankrollId === bankrollId)
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }

  async createBankrollTransaction(insertTransaction: InsertBankrollTransaction): Promise<BankrollTransaction> {
    const id = randomUUID();
    const transaction: BankrollTransaction = {
      ...insertTransaction,
      id,
      createdAt: new Date(),
    };
    this.bankrollTransactions.set(id, transaction);
    return transaction;
  }

  async getBankrollTransactionsByType(bankrollId: string, type: string): Promise<BankrollTransaction[]> {
    return Array.from(this.bankrollTransactions.values())
      .filter(transaction => transaction.bankrollId === bankrollId && transaction.type === type);
  }

  // Bankroll Goal methods
  async getBankrollGoals(bankrollId: string): Promise<BankrollGoal[]> {
    return Array.from(this.bankrollGoals.values())
      .filter(goal => goal.bankrollId === bankrollId)
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }

  async createBankrollGoal(insertGoal: InsertBankrollGoal): Promise<BankrollGoal> {
    const id = randomUUID();
    const goal: BankrollGoal = {
      ...insertGoal,
      id,
      createdAt: new Date(),
    };
    this.bankrollGoals.set(id, goal);
    return goal;
  }

  async updateBankrollGoal(id: string, updates: UpdateBankrollGoal, userId: string): Promise<BankrollGoal | undefined> {
    const goal = this.bankrollGoals.get(id);
    if (!goal) return undefined;
    
    // Verify user owns the bankroll
    const bankroll = this.bankrolls.get(goal.bankrollId);
    if (!bankroll || bankroll.userId !== userId) return undefined;
    
    const updatedGoal = { ...goal, ...updates };
    this.bankrollGoals.set(id, updatedGoal);
    return updatedGoal;
  }

  async deleteBankrollGoal(id: string, userId: string): Promise<boolean> {
    const goal = this.bankrollGoals.get(id);
    if (!goal) return false;
    
    // Verify user owns the bankroll
    const bankroll = this.bankrolls.get(goal.bankrollId);
    if (!bankroll || bankroll.userId !== userId) return false;
    
    this.bankrollGoals.delete(id);
    return true;
  }

  // Advanced Bankroll Analytics
  async getBankrollAnalytics(bankrollId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    currentBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalProfit: number;
    balanceHistory: Array<{ date: string; balance: number; }>;
    drawdownAnalysis: {
      maxDrawdown: number;
      maxDrawdownPercent: number;
      currentDrawdown: number;
      currentDrawdownPercent: number;
      recoverySinceMax: number;
    };
    unitPnL: {
      totalUnitsWagered: number;
      unitsWon: number;
      unitsLost: number;
      avgUnitSize: number;
      unitProfitLoss: number;
    };
    riskMetrics: {
      riskOfRuin: number;
      sharpeRatio: number;
      maxConcurrentRisk: number;
      winStreakStdDev: number;
    };
    recentActivity: Array<{ date: string; type: string; amount: number; description: string; }>;
  }> {
    const bankroll = this.bankrolls.get(bankrollId);
    if (!bankroll) throw new Error("Bankroll not found");
    
    let transactions = await this.getBankrollTransactions(bankrollId);
    let bets = Array.from(this.bets.values()).filter(bet => bet.bankrollId === bankrollId);
    
    // Apply date filtering
    if (dateFrom || dateTo) {
      transactions = transactions.filter(transaction => {
        if (!transaction.createdAt) return false;
        const transactionDate = new Date(transaction.createdAt);
        if (dateFrom && transactionDate < dateFrom) return false;
        if (dateTo && transactionDate > dateTo) return false;
        return true;
      });
      
      bets = bets.filter(bet => {
        if (!bet.createdAt) return false;
        const betDate = new Date(bet.createdAt);
        if (dateFrom && betDate < dateFrom) return false;
        if (dateTo && betDate > dateTo) return false;
        return true;
      });
    }
    
    const currentBalance = await this.getBankrollBalance(bankrollId);
    
    // Calculate transaction totals
    const deposits = transactions.filter(t => ["deposit", "transfer_in"].includes(t.type))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const withdrawals = transactions.filter(t => ["withdrawal", "transfer_out"].includes(t.type))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalProfit = transactions.filter(t => t.type === "profit")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0) - 
      transactions.filter(t => t.type === "loss")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    // Generate balance history
    const balanceHistory = this.generateBalanceHistory(bankrollId, transactions);
    
    // Calculate drawdown analysis
    const drawdownAnalysis = this.calculateDrawdownAnalysis(balanceHistory, parseFloat(bankroll.startingBalance));
    
    // Calculate unit P&L analysis
    const unitPnL = this.calculateUnitPnL(bets, bankroll);
    
    // Calculate risk metrics
    const riskMetrics = this.calculateRiskMetrics(bets, balanceHistory, bankroll);
    
    // Generate recent activity
    const recentActivity = this.generateRecentActivity(transactions, bets).slice(0, 10);
    
    return {
      currentBalance,
      totalDeposits: deposits,
      totalWithdrawals: withdrawals,
      totalProfit,
      balanceHistory,
      drawdownAnalysis,
      unitPnL,
      riskMetrics,
      recentActivity,
    };
  }

  // Risk Management Helper Methods
  async checkDailyLossLimit(bankrollId: string): Promise<{ exceeded: boolean; current: number; limit: number; }> {
    const bankroll = this.bankrolls.get(bankrollId);
    if (!bankroll || !bankroll.dailyLossLimitPct) {
      return { exceeded: false, current: 0, limit: 0 };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysLosses = Array.from(this.bankrollTransactions.values())
      .filter(transaction => 
        transaction.bankrollId === bankrollId &&
        transaction.type === "loss" &&
        transaction.createdAt &&
        new Date(transaction.createdAt) >= today
      )
      .reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
    
    const currentBalance = await this.getBankrollBalance(bankrollId);
    const limit = currentBalance * parseFloat(bankroll.dailyLossLimitPct);
    
    return {
      exceeded: todaysLosses >= limit,
      current: todaysLosses,
      limit,
    };
  }

  async checkWeeklyLossLimit(bankrollId: string): Promise<{ exceeded: boolean; current: number; limit: number; }> {
    const bankroll = this.bankrolls.get(bankrollId);
    if (!bankroll || !bankroll.weeklyLossLimitPct) {
      return { exceeded: false, current: 0, limit: 0 };
    }
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    const weeklyLosses = Array.from(this.bankrollTransactions.values())
      .filter(transaction => 
        transaction.bankrollId === bankrollId &&
        transaction.type === "loss" &&
        transaction.createdAt &&
        new Date(transaction.createdAt) >= weekAgo
      )
      .reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
    
    const currentBalance = await this.getBankrollBalance(bankrollId);
    const limit = currentBalance * parseFloat(bankroll.weeklyLossLimitPct);
    
    return {
      exceeded: weeklyLosses >= limit,
      current: weeklyLosses,
      limit,
    };
  }

  async calculateKellyBetSize(bankrollId: string, winProbability: number, odds: string): Promise<{ units: number; amount: number; kelly: number; }> {
    const bankroll = this.bankrolls.get(bankrollId);
    if (!bankroll) throw new Error("Bankroll not found");
    
    const currentBalance = await this.getBankrollBalance(bankrollId);
    const unitValue = parseFloat(bankroll.unitValue);
    
    // Parse odds to decimal
    let decimalOdds: number;
    if (odds.startsWith('+')) {
      decimalOdds = (parseInt(odds.substring(1)) / 100) + 1;
    } else if (odds.startsWith('-')) {
      decimalOdds = (100 / parseInt(odds.substring(1))) + 1;
    } else {
      decimalOdds = parseFloat(odds);
    }
    
    // Kelly Formula: f = (bp - q) / b
    // where b = odds-1, p = win probability, q = lose probability
    const b = decimalOdds - 1;
    const p = winProbability / 100;
    const q = 1 - p;
    
    const kellyFraction = (b * p - q) / b;
    const adjustedKelly = kellyFraction * parseFloat(bankroll.kellyFraction); // Apply conservative factor
    
    // Calculate suggested bet size
    let units: number;
    let amount: number;
    
    if (bankroll.unitMode === "percent") {
      // Percentage-based units
      amount = currentBalance * adjustedKelly;
      units = amount / (currentBalance * unitValue);
    } else {
      // Fixed units
      units = adjustedKelly * currentBalance / unitValue;
      amount = units * unitValue;
    }
    
    // Ensure non-negative
    units = Math.max(0, units);
    amount = Math.max(0, amount);
    
    return {
      units: Math.round(units * 100) / 100,
      amount: Math.round(amount * 100) / 100,
      kelly: Math.round(kellyFraction * 10000) / 100, // As percentage
    };
  }

  async getMaxBetSize(bankrollId: string): Promise<{ maxAmount: number; maxUnits: number; }> {
    const bankroll = this.bankrolls.get(bankrollId);
    if (!bankroll) throw new Error("Bankroll not found");
    
    const currentBalance = await this.getBankrollBalance(bankrollId);
    const maxAmount = currentBalance * parseFloat(bankroll.maxBetPct || "0.05");
    
    let maxUnits: number;
    if (bankroll.unitMode === "percent") {
      maxUnits = maxAmount / (currentBalance * parseFloat(bankroll.unitValue));
    } else {
      maxUnits = maxAmount / parseFloat(bankroll.unitValue);
    }
    
    return {
      maxAmount: Math.round(maxAmount * 100) / 100,
      maxUnits: Math.round(maxUnits * 100) / 100,
    };
  }

  async validateBetSize(bankrollId: string, stakeAmount: number): Promise<{ valid: boolean; reasons: string[]; }> {
    const reasons: string[] = [];
    
    const bankroll = this.bankrolls.get(bankrollId);
    if (!bankroll) {
      reasons.push("Bankroll not found");
      return { valid: false, reasons };
    }
    
    const currentBalance = await this.getBankrollBalance(bankrollId);
    
    // Check if stake exceeds balance
    if (stakeAmount > currentBalance) {
      reasons.push("Stake amount exceeds current bankroll balance");
    }
    
    // Check max bet percentage
    const maxBetAmount = currentBalance * parseFloat(bankroll.maxBetPct || "0.05");
    if (stakeAmount > maxBetAmount) {
      reasons.push(`Stake exceeds maximum bet size of ${Math.round(maxBetAmount * 100) / 100} (${parseFloat(bankroll.maxBetPct || "0.05") * 100}% of bankroll)`);
    }
    
    // Check daily loss limits
    const dailyCheck = await this.checkDailyLossLimit(bankrollId);
    if (dailyCheck.exceeded) {
      reasons.push("Daily loss limit already exceeded");
    } else if (dailyCheck.current + stakeAmount > dailyCheck.limit) {
      reasons.push("This bet would exceed daily loss limit");
    }
    
    // Check weekly loss limits
    const weeklyCheck = await this.checkWeeklyLossLimit(bankrollId);
    if (weeklyCheck.exceeded) {
      reasons.push("Weekly loss limit already exceeded");
    } else if (weeklyCheck.current + stakeAmount > weeklyCheck.limit) {
      reasons.push("This bet would exceed weekly loss limit");
    }
    
    return {
      valid: reasons.length === 0,
      reasons,
    };
  }

  // Private helper methods for complex calculations
  private generateBalanceHistory(bankrollId: string, transactions: BankrollTransaction[]): Array<{ date: string; balance: number; }> {
    const bankroll = this.bankrolls.get(bankrollId);
    if (!bankroll) return [];
    
    let runningBalance = parseFloat(bankroll.startingBalance);
    const history: Array<{ date: string; balance: number; }> = [];
    
    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aDate - bDate;
    });
    
    // Add starting point
    if (bankroll.createdAt) {
      history.push({
        date: new Date(bankroll.createdAt).toISOString().split('T')[0],
        balance: runningBalance,
      });
    }
    
    // Process each transaction
    sortedTransactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount);
      switch (transaction.type) {
        case "deposit":
        case "adjustment":
        case "profit":
        case "transfer_in":
          runningBalance += amount;
          break;
        case "withdrawal":
        case "loss":
        case "transfer_out":
          runningBalance -= amount;
          break;
      }
      
      if (transaction.createdAt) {
        history.push({
          date: new Date(transaction.createdAt).toISOString().split('T')[0],
          balance: Math.round(runningBalance * 100) / 100,
        });
      }
    });
    
    return history;
  }

  private calculateDrawdownAnalysis(balanceHistory: Array<{ date: string; balance: number; }>, startingBalance: number): {
    maxDrawdown: number;
    maxDrawdownPercent: number;
    currentDrawdown: number;
    currentDrawdownPercent: number;
    recoverySinceMax: number;
  } {
    if (balanceHistory.length === 0) {
      return { maxDrawdown: 0, maxDrawdownPercent: 0, currentDrawdown: 0, currentDrawdownPercent: 0, recoverySinceMax: 0 };
    }
    
    let maxBalance = startingBalance;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    
    balanceHistory.forEach(entry => {
      if (entry.balance > maxBalance) {
        maxBalance = entry.balance;
      }
      
      const drawdown = maxBalance - entry.balance;
      const drawdownPercent = maxBalance > 0 ? (drawdown / maxBalance) * 100 : 0;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    });
    
    const currentBalance = balanceHistory[balanceHistory.length - 1]?.balance || startingBalance;
    const currentDrawdown = Math.max(0, maxBalance - currentBalance);
    const currentDrawdownPercent = maxBalance > 0 ? (currentDrawdown / maxBalance) * 100 : 0;
    const recoverySinceMax = currentBalance - (maxBalance - maxDrawdown);
    
    return {
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      maxDrawdownPercent: Math.round(maxDrawdownPercent * 100) / 100,
      currentDrawdown: Math.round(currentDrawdown * 100) / 100,
      currentDrawdownPercent: Math.round(currentDrawdownPercent * 100) / 100,
      recoverySinceMax: Math.round(recoverySinceMax * 100) / 100,
    };
  }

  private calculateUnitPnL(bets: Bet[], bankroll: Bankroll): {
    totalUnitsWagered: number;
    unitsWon: number;
    unitsLost: number;
    avgUnitSize: number;
    unitProfitLoss: number;
  } {
    const settledBets = bets.filter(bet => bet.status !== "pending");
    
    const totalUnitsWagered = settledBets.reduce((sum, bet) => sum + parseFloat(bet.stakeUnits), 0);
    const unitsWon = settledBets.filter(bet => bet.status === "won").reduce((sum, bet) => sum + parseFloat(bet.stakeUnits), 0);
    const unitsLost = settledBets.filter(bet => bet.status === "lost").reduce((sum, bet) => sum + parseFloat(bet.stakeUnits), 0);
    
    const totalStake = settledBets.reduce((sum, bet) => sum + parseFloat(bet.stake), 0);
    const avgUnitSize = settledBets.length > 0 ? totalStake / totalUnitsWagered : 0;
    
    const unitProfitLoss = settledBets.reduce((sum, bet) => {
      const profit = this.calculateBetProfit(bet);
      return sum + (profit / parseFloat(bet.stakeUnits));
    }, 0);
    
    return {
      totalUnitsWagered: Math.round(totalUnitsWagered * 100) / 100,
      unitsWon: Math.round(unitsWon * 100) / 100,
      unitsLost: Math.round(unitsLost * 100) / 100,
      avgUnitSize: Math.round(avgUnitSize * 100) / 100,
      unitProfitLoss: Math.round(unitProfitLoss * 100) / 100,
    };
  }

  private calculateRiskMetrics(bets: Bet[], balanceHistory: Array<{ date: string; balance: number; }>, bankroll: Bankroll): {
    riskOfRuin: number;
    sharpeRatio: number;
    maxConcurrentRisk: number;
    winStreakStdDev: number;
  } {
    const settledBets = bets.filter(bet => bet.status !== "pending");
    
    // Risk of Ruin estimation (simplified)
    const winRate = settledBets.length > 0 ? settledBets.filter(bet => bet.status === "won").length / settledBets.length : 0;
    const avgUnitSize = settledBets.length > 0 ? settledBets.reduce((sum, bet) => sum + parseFloat(bet.stakeUnits), 0) / settledBets.length : 0;
    const riskOfRuin = winRate > 0.5 ? Math.pow((1 - winRate) / winRate, avgUnitSize) * 100 : 50;
    
    // Sharpe Ratio calculation
    const returns = balanceHistory.slice(1).map((entry, index) => {
      const prevBalance = balanceHistory[index].balance;
      return prevBalance > 0 ? (entry.balance - prevBalance) / prevBalance : 0;
    });
    
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const returnStdDev = returns.length > 1 ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)) : 0;
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
    
    // Max concurrent risk (highest % of bankroll at risk at one time)
    const maxConcurrentRisk = settledBets.reduce((max, bet) => {
      const riskPercent = parseFloat(bet.stakeUnits) * parseFloat(bankroll.unitValue);
      return Math.max(max, riskPercent);
    }, 0);
    
    // Win streak standard deviation
    const streaks: number[] = [];
    let currentStreak = 0;
    settledBets.forEach(bet => {
      if (bet.status === "won") {
        currentStreak++;
      } else {
        if (currentStreak > 0) {
          streaks.push(currentStreak);
          currentStreak = 0;
        }
      }
    });
    if (currentStreak > 0) streaks.push(currentStreak);
    
    const avgStreak = streaks.length > 0 ? streaks.reduce((sum, s) => sum + s, 0) / streaks.length : 0;
    const winStreakStdDev = streaks.length > 1 ? Math.sqrt(streaks.reduce((sum, s) => sum + Math.pow(s - avgStreak, 2), 0) / (streaks.length - 1)) : 0;
    
    return {
      riskOfRuin: Math.round(Math.min(100, Math.max(0, riskOfRuin)) * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 10000) / 10000,
      maxConcurrentRisk: Math.round(maxConcurrentRisk * 10000) / 100,
      winStreakStdDev: Math.round(winStreakStdDev * 100) / 100,
    };
  }

  private generateRecentActivity(transactions: BankrollTransaction[], bets: Bet[]): Array<{ date: string; type: string; amount: number; description: string; }> {
    const activities: Array<{ date: string; type: string; amount: number; description: string; }> = [];
    
    // Add transaction activities
    transactions.slice(0, 20).forEach(transaction => {
      if (transaction.createdAt) {
        activities.push({
          date: new Date(transaction.createdAt).toISOString(),
          type: transaction.type,
          amount: parseFloat(transaction.amount),
          description: transaction.reason || `${transaction.type.replace('_', ' ')} transaction`,
        });
      }
    });
    
    // Add bet activities
    bets.filter(bet => bet.status !== "pending").slice(0, 20).forEach(bet => {
      if (bet.settledAt) {
        const profit = this.calculateBetProfit(bet);
        activities.push({
          date: new Date(bet.settledAt).toISOString(),
          type: bet.status === "won" ? "profit" : "loss",
          amount: Math.abs(profit),
          description: `${bet.status} bet: ${bet.event} (${bet.betType})`,
        });
      }
    });
    
    // Sort by date (newest first)
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}

export const storage = new MemStorage();
