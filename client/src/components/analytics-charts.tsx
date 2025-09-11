import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProfitOverTimeData {
  date: string;
  profit: number;
  cumulativeProfit: number;
}

interface SportPerformanceData {
  sport: string;
  totalBets: number;
  winRate: number;
  profit: number;
  roi: number;
}

interface BetDistributionData {
  range: string;
  count: number;
  profit: number;
}

interface MonthlyTrendData {
  month: string;
  profit: number;
  betCount: number;
  winRate: number;
}

interface ROIMetricsData {
  overall: number;
  lastMonth: number;
  bestMonth: number;
  worstMonth: number;
}

// Custom Tooltip Components
const ProfitTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium">{`Date: ${label}`}</p>
        <p className="text-sm text-green-600">
          {`Daily Profit: $${payload[0].value.toFixed(2)}`}
        </p>
        <p className="text-sm text-blue-600">
          {`Total Profit: $${payload[1].value.toFixed(2)}`}
        </p>
      </div>
    );
  }
  return null;
};

const SportTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium">{`Sport: ${label}`}</p>
        <p className="text-sm">{`Total Bets: ${data.totalBets}`}</p>
        <p className="text-sm">{`Win Rate: ${data.winRate}%`}</p>
        <p className="text-sm">{`Profit: $${data.profit.toFixed(2)}`}</p>
        <p className="text-sm">{`ROI: ${data.roi}%`}</p>
      </div>
    );
  }
  return null;
};

// Profit Over Time Chart
export function ProfitOverTimeChart({ data, isLoading }: { data: ProfitOverTimeData[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card data-testid="profit-over-time-chart">
        <CardHeader>
          <CardTitle>Profit Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="profit-over-time-chart">
        <CardHeader>
          <CardTitle>Profit Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No betting data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="profit-over-time-chart">
      <CardHeader>
        <CardTitle>Profit Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<ProfitTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="profit" 
              stroke="hsl(var(--accent))" 
              strokeWidth={2}
              name="Daily Profit"
              dot={{ r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="cumulativeProfit" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              name="Cumulative Profit"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Sport Performance Chart
export function SportPerformanceChart({ data, isLoading }: { data: SportPerformanceData[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card data-testid="sport-performance-chart">
        <CardHeader>
          <CardTitle>Performance by Sport</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="sport-performance-chart">
        <CardHeader>
          <CardTitle>Performance by Sport</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No betting data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="sport-performance-chart">
      <CardHeader>
        <CardTitle>Performance by Sport</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data.slice(0, 8)} margin={{ top: 20, right: 50, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="sport" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            {/* Left Y-axis for Profit ($) */}
            <YAxis 
              yAxisId="profit"
              tick={{ fontSize: 12 }} 
              tickFormatter={(value) => `$${value}`}
            />
            {/* Right Y-axis for Win Rate (%) */}
            <YAxis 
              yAxisId="winRate"
              orientation="right"
              tick={{ fontSize: 12 }} 
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<SportTooltip />} />
            <Legend />
            <Bar 
              yAxisId="profit"
              dataKey="profit" 
              fill="hsl(var(--primary))" 
              name="Profit ($)"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              yAxisId="winRate"
              dataKey="winRate" 
              fill="hsl(var(--accent))" 
              name="Win Rate (%)"
              radius={[2, 2, 0, 0]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Bet Size Distribution Chart
export function BetDistributionChart({ data, isLoading }: { data: BetDistributionData[]; isLoading: boolean }) {
  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--accent))', 
    'hsl(var(--secondary))',
    'hsl(var(--destructive))',
    'hsl(var(--muted))',
  ];

  if (isLoading) {
    return (
      <Card data-testid="bet-distribution-chart">
        <CardHeader>
          <CardTitle>Bet Size Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="bet-distribution-chart">
        <CardHeader>
          <CardTitle>Bet Size Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No betting data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.filter(item => item.count > 0);

  return (
    <Card data-testid="bet-distribution-chart">
      <CardHeader>
        <CardTitle>Bet Size Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex items-center">
          <ResponsiveContainer width="70%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ range, percent }: any) => 
                  percent > 5 ? `${range} (${(percent * 100).toFixed(0)}%)` : ''
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name, props) => [
                `${value} bets`,
                `${props.payload.range}`,
                `Profit: $${props.payload.profit.toFixed(2)}`
              ]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="w-30% pl-4">
            <div className="space-y-2">
              {chartData.map((entry, index) => (
                <div key={entry.range} className="flex items-center text-sm">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="flex-1">{entry.range}</span>
                  <Badge variant="outline" className="ml-2">
                    {entry.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Monthly Trends Chart
export function MonthlyTrendsChart({ data, isLoading }: { data: MonthlyTrendData[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card data-testid="monthly-trends-chart">
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="monthly-trends-chart">
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No betting data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="monthly-trends-chart">
      <CardHeader>
        <CardTitle>Monthly Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const [year, month] = value.split('-');
                return `${month}/${year.slice(2)}`;
              }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                name === 'profit' ? `$${value.toFixed(2)}` : 
                name === 'winRate' ? `${value}%` : value,
                name === 'profit' ? 'Profit' :
                name === 'betCount' ? 'Bet Count' :
                name === 'winRate' ? 'Win Rate' : name
              ]}
              labelFormatter={(value) => {
                const [year, month] = value.split('-');
                return `${month}/${year}`;
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="profit" 
              stackId="1"
              stroke="hsl(var(--primary))" 
              fill="hsl(var(--primary))"
              fillOpacity={0.6}
              name="Profit ($)"
            />
            <Area 
              type="monotone" 
              dataKey="betCount" 
              stackId="2"
              stroke="hsl(var(--accent))" 
              fill="hsl(var(--accent))"
              fillOpacity={0.6}
              name="Bet Count"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ROI Metrics Chart
export function ROIMetricsChart({ data, isLoading }: { data: ROIMetricsData | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card data-testid="roi-metrics-chart">
        <CardHeader>
          <CardTitle>ROI Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card data-testid="roi-metrics-chart">
        <CardHeader>
          <CardTitle>ROI Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No ROI data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Overall', value: data.overall },
    { name: 'Last Month', value: data.lastMonth },
    { name: 'Best Month', value: data.bestMonth },
    { name: 'Worst Month', value: data.worstMonth },
  ];

  return (
    <Card data-testid="roi-metrics-chart">
      <CardHeader>
        <CardTitle>ROI Performance (%)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'ROI']}
            />
            <Bar 
              dataKey="value" 
              fill={(entry: any) => entry.value >= 0 ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'}
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.value >= 0 ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Streak Analysis Component
export function StreakAnalysisCard({ 
  data, 
  isLoading 
}: { 
  data: {
    currentStreak: { type: 'win' | 'loss', count: number };
    longestWinStreak: number;
    longestLoseStreak: number;
  } | null; 
  isLoading: boolean 
}) {
  if (isLoading) {
    return (
      <Card data-testid="streak-analysis-card">
        <CardHeader>
          <CardTitle>Streak Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                <div className="h-8 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card data-testid="streak-analysis-card">
        <CardHeader>
          <CardTitle>Streak Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            No streak data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="streak-analysis-card">
      <CardHeader>
        <CardTitle>Streak Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Current Streak</p>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={data.currentStreak.type === 'win' ? 'default' : 'destructive'}
                data-testid="current-streak-badge"
              >
                {data.currentStreak.count} {data.currentStreak.type === 'win' ? 'Wins' : 'Losses'}
              </Badge>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Longest Win Streak</p>
            <p className="text-2xl font-bold text-accent" data-testid="longest-win-streak">
              {data.longestWinStreak}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Longest Lose Streak</p>
            <p className="text-2xl font-bold text-destructive" data-testid="longest-lose-streak">
              {data.longestLoseStreak}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Day of Week Performance Chart
export function DayOfWeekChart({ 
  data, 
  isLoading 
}: { 
  data: Array<{ day: string; profit: number; betCount: number }>; 
  isLoading: boolean 
}) {
  if (isLoading) {
    return (
      <Card data-testid="day-of-week-chart">
        <CardHeader>
          <CardTitle>Performance by Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="day-of-week-chart">
        <CardHeader>
          <CardTitle>Performance by Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No daily performance data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="day-of-week-chart">
      <CardHeader>
        <CardTitle>Performance by Day of Week</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.slice(0, 3)} // Show short day names
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value: number, name: string) => [
                name === 'profit' ? `$${value.toFixed(2)}` : value,
                name === 'profit' ? 'Profit' : 'Bet Count'
              ]}
            />
            <Legend />
            <Bar 
              dataKey="profit" 
              fill="hsl(var(--primary))" 
              name="Profit ($)"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="betCount" 
              fill="hsl(var(--accent))" 
              name="Bet Count"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}