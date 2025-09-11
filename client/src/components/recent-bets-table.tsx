import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { Bet } from "@shared/schema";

export default function RecentBetsTable() {
  const { data: bets, isLoading } = useQuery<Bet[]>({
    queryKey: ['/api/bets'],
  });

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Bets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentBets = bets?.slice(0, 5) || [];

  return (
    <Card className="shadow-sm" data-testid="recent-bets-table">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Bets</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-all">
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {recentBets.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-state">
            <p className="text-muted-foreground">No bets found. Upload a screenshot to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Event</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Odds</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Stake</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentBets.map((bet) => (
                  <tr key={bet.id} className="hover:bg-muted/20 transition-colors" data-testid={`bet-row-${bet.id}`}>
                    <td className="py-4 px-6 text-sm text-foreground">
                      {new Date(bet.createdAt!).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-sm font-medium text-foreground">{bet.event}</p>
                        <p className="text-xs text-muted-foreground">{bet.sport}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-foreground">{bet.betType}</td>
                    <td className="py-4 px-6 text-sm text-foreground">{bet.odds}</td>
                    <td className="py-4 px-6 text-sm text-foreground">${bet.stake}</td>
                    <td className="py-4 px-6">
                      <Badge 
                        variant={
                          bet.status === 'won' ? 'default' : 
                          bet.status === 'lost' ? 'destructive' : 
                          'secondary'
                        }
                        className={
                          bet.status === 'won' ? 'bg-accent/10 text-accent hover:bg-accent/20' :
                          bet.status === 'lost' ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' :
                          'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        }
                        data-testid={`status-${bet.status}`}
                      >
                        {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-sm font-medium" data-testid={`profit-${bet.id}`}>
                      {bet.status === 'pending' ? (
                        <span className="text-muted-foreground">--</span>
                      ) : bet.status === 'won' && bet.actualPayout ? (
                        <span className="text-accent">
                          +${(parseFloat(bet.actualPayout) - parseFloat(bet.stake)).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-destructive">
                          -${parseFloat(bet.stake).toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
