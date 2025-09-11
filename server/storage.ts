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
}

export const storage = new MemStorage();
