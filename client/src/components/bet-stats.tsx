import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Trophy, DollarSign, Clock } from "lucide-react";
import { betsService } from "@/lib/services/bets";

type UserStats = Awaited<ReturnType<typeof betsService.getUserStats>>;

export default function BetStats() {
  const { data: stats, isLoading } = useQuery<UserStats>({
    queryKey: ['user-stats'],
    queryFn: betsService.getUserStats,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-20 mb-2"></div>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-24"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-testid="bet-stats">
      <Card className="p-6 shadow-sm" data-testid="stat-total-bets">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Total Bets</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalBets}</p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-primary w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">All time</p>
        </CardContent>
      </Card>
      
      <Card className="p-6 shadow-sm" data-testid="stat-win-rate">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Win Rate</p>
              <p className="text-2xl font-bold text-accent">{stats.winRate}%</p>
            </div>
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Trophy className="text-accent w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Success rate</p>
        </CardContent>
      </Card>
      
      <Card className="p-6 shadow-sm" data-testid="stat-profit">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Profit/Loss</p>
              <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <DollarSign className="text-accent w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Net profit</p>
        </CardContent>
      </Card>
      
      <Card className="p-6 shadow-sm" data-testid="stat-pending">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Pending Bets</p>
              <p className="text-2xl font-bold text-foreground">{stats.pendingBets}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <Clock className="text-yellow-600 w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Awaiting results</p>
        </CardContent>
      </Card>
    </div>
  );
}
