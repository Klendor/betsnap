import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navigation from '@/components/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, TrendingUp, BarChart3, PieChart, TrendingDown } from 'lucide-react';
import { 
  ProfitOverTimeChart, 
  SportPerformanceChart, 
  BetDistributionChart, 
  MonthlyTrendsChart,
  ROIMetricsChart,
  StreakAnalysisCard,
  DayOfWeekChart
} from '@/components/analytics-charts';

// Types for analytics data
interface AnalyticsData {
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
}

// Date range options
const DATE_RANGES = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 3 Months', value: '3m' },
  { label: 'Last 6 Months', value: '6m' },
  { label: 'This Year', value: '1y' },
] as const;

type DateRangeValue = typeof DATE_RANGES[number]['value'];

function getDateRange(range: DateRangeValue): { dateFrom?: Date; dateTo?: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (range) {
    case '7d':
      return { 
        dateFrom: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), 
        dateTo: today 
      };
    case '30d':
      return { 
        dateFrom: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), 
        dateTo: today 
      };
    case '3m':
      return { 
        dateFrom: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000), 
        dateTo: today 
      };
    case '6m':
      return { 
        dateFrom: new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000), 
        dateTo: today 
      };
    case '1y':
      return { 
        dateFrom: new Date(today.getFullYear(), 0, 1), 
        dateTo: today 
      };
    case 'all':
    default:
      return {};
  }
}

export default function Analytics() {
  const [selectedRange, setSelectedRange] = useState<DateRangeValue>('30d');
  const { dateFrom, dateTo } = getDateRange(selectedRange);

  // Build query params for date filtering
  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.append('dateFrom', dateFrom.toISOString());
  if (dateTo) queryParams.append('dateTo', dateTo.toISOString());
  const queryString = queryParams.toString();

  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['/api/user/analytics', selectedRange, queryString],
    queryFn: async () => {
      const url = `/api/user/analytics${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return response.json();
    },
  });

  // Calculate key metrics for the summary cards with safe chaining
  const lastProfitPoint = analytics?.profitOverTime?.at(-1);
  const totalProfit = lastProfitPoint?.cumulativeProfit ?? 0;
  
  const totalBets = analytics?.sportPerformance?.reduce((sum, sport) => sum + (sport?.totalBets ?? 0), 0) ?? 0;
  
  const sportData = analytics?.sportPerformance;
  const avgWinRate = sportData?.length 
    ? (sportData.reduce((sum, sport) => sum + (sport?.winRate ?? 0), 0) / sportData.length)
    : 0;
    
  const overallROI = analytics?.roiMetrics?.overall ?? 0;

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Analytics Dashboard</h1>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
              <p className="text-destructive">Failed to load analytics data. Please try again later.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="analytics-title">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Comprehensive insights into your betting performance
            </p>
          </div>
          
          {/* Date Range Selector */}
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <Select 
              value={selectedRange} 
              onValueChange={(value: DateRangeValue) => setSelectedRange(value)}
            >
              <SelectTrigger className="w-40" data-testid="date-range-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 shadow-sm" data-testid="summary-profit">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Profit</p>
                  <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-accent' : 'text-destructive'}`}>
                    {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-accent w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedRange === 'all' ? 'All time' : DATE_RANGES.find(r => r.value === selectedRange)?.label}
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 shadow-sm" data-testid="summary-bets">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Bets</p>
                  <p className="text-2xl font-bold text-foreground">{totalBets}</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="text-primary w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Placed bets</p>
            </CardContent>
          </Card>

          <Card className="p-6 shadow-sm" data-testid="summary-winrate">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Avg Win Rate</p>
                  <p className="text-2xl font-bold text-accent">{avgWinRate.toFixed(1)}%</p>
                </div>
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <PieChart className="text-accent w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Across all sports</p>
            </CardContent>
          </Card>

          <Card className="p-6 shadow-sm" data-testid="summary-roi">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Overall ROI</p>
                  <p className={`text-2xl font-bold ${overallROI >= 0 ? 'text-accent' : 'text-destructive'}`}>
                    {overallROI >= 0 ? '+' : ''}{overallROI.toFixed(1)}%
                  </p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  {overallROI >= 0 ? 
                    <TrendingUp className="text-accent w-5 h-5" /> : 
                    <TrendingDown className="text-destructive w-5 h-5" />
                  }
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Return on investment</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Profit Over Time - Full Width */}
          <div className="xl:col-span-2">
            <ProfitOverTimeChart 
              data={analytics?.profitOverTime || []} 
              isLoading={isLoading}
            />
          </div>

          {/* Sport Performance */}
          <SportPerformanceChart 
            data={analytics?.sportPerformance || []} 
            isLoading={isLoading}
          />

          {/* Monthly Trends */}
          <MonthlyTrendsChart 
            data={analytics?.monthlyTrends || []} 
            isLoading={isLoading}
          />

          {/* Bet Distribution */}
          <BetDistributionChart 
            data={analytics?.betSizeDistribution || []} 
            isLoading={isLoading}
          />

          {/* ROI Metrics */}
          <ROIMetricsChart 
            data={analytics?.roiMetrics || null} 
            isLoading={isLoading}
          />
        </div>

        {/* Bottom Row - Streak and Day Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <StreakAnalysisCard 
            data={analytics?.streakAnalysis || null} 
            isLoading={isLoading}
          />
          
          <div className="lg:col-span-2">
            <DayOfWeekChart 
              data={analytics?.profitByDayOfWeek || []} 
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Insights Section */}
        {!isLoading && analytics && (
          <div className="mt-8">
            <Card data-testid="insights-section">
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Best performing sport */}
                  {analytics.sportPerformance.length > 0 && (
                    <div className="p-4 bg-accent/10 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Best Performing Sport</p>
                      <p className="font-semibold">
                        {analytics.sportPerformance[0]?.sport} 
                        <span className="text-accent ml-2">
                          (+${analytics.sportPerformance[0]?.profit.toFixed(2)})
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Current streak info */}
                  {analytics.streakAnalysis && (
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Current Streak</p>
                      <p className="font-semibold">
                        {analytics.streakAnalysis.currentStreak.count} {
                          analytics.streakAnalysis.currentStreak.type === 'win' ? 'Wins' : 'Losses'
                        }
                        <span className={`ml-2 ${
                          analytics.streakAnalysis.currentStreak.type === 'win' ? 'text-accent' : 'text-destructive'
                        }`}>
                          {analytics.streakAnalysis.currentStreak.type === 'win' ? '🔥' : '❄️'}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Most common bet size */}
                  {analytics.betSizeDistribution.length > 0 && (
                    <div className="p-4 bg-secondary/10 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Most Common Bet Size</p>
                      <p className="font-semibold">
                        {analytics.betSizeDistribution.reduce((max, item) => 
                          item.count > max.count ? item : max
                        ).range}
                      </p>
                    </div>
                  )}

                  {/* ROI trend */}
                  <div className="p-4 bg-muted/10 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-1">ROI Status</p>
                    <p className="font-semibold">
                      {overallROI >= 5 ? '🚀 Excellent Performance' :
                       overallROI >= 0 ? '📈 Profitable' :
                       overallROI >= -10 ? '⚠️ Needs Improvement' :
                       '🔴 Review Strategy'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}