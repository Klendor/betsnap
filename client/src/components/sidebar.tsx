import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Table, 
  ExternalLink, 
  RefreshCw, 
  Crown, 
  Check, 
  Puzzle, 
  Globe, 
  Keyboard,
  Settings
} from "lucide-react";
import type { User } from "@shared/schema";

export default function Sidebar() {
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/user/stats'],
  });

  const createSheetMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/sheets/create', {});
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Google Sheet created!",
        description: "Your betting tracker spreadsheet is ready.",
      });
      setIsCreatingSheet(false);
      // Open the sheet in a new tab
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error) => {
      console.error('Sheet creation failed:', error);
      toast({
        title: "Failed to create sheet",
        description: "Please try again or check your Google account permissions.",
        variant: "destructive",
      });
      setIsCreatingSheet(false);
    },
  });

  const handleCreateSheet = () => {
    setIsCreatingSheet(true);
    createSheetMutation.mutate();
  };

  const handleOpenSheet = () => {
    if (user?.googleSheetsId) {
      window.open(`https://docs.google.com/spreadsheets/d/${user.googleSheetsId}`, '_blank');
    }
  };

  return (
    <div className="space-y-6" data-testid="sidebar">
      {/* Google Sheets Integration */}
      <Card className="shadow-sm" data-testid="google-sheets-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Google Sheets</CardTitle>
            <div 
              className={`w-2 h-2 rounded-full ${user?.googleSheetsId ? 'bg-accent' : 'bg-muted'}`} 
              title={user?.googleSheetsId ? 'Connected' : 'Not connected'}
              data-testid="connection-status"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.googleSheetsId ? (
            <>
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <Table className="text-accent w-5 h-5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">BetSnap Tracker 2024</p>
                  <p className="text-xs text-muted-foreground">Synced automatically</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" 
                  size="sm"
                  onClick={handleOpenSheet}
                  data-testid="button-open-sheet"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Sheet
                </Button>
                <Button variant="outline" size="sm" data-testid="button-sync-sheet">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Google account to automatically sync your bets to a spreadsheet.
              </p>
              <Button 
                onClick={handleCreateSheet}
                disabled={isCreatingSheet}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                data-testid="button-create-sheet"
              >
                {isCreatingSheet ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Table className="w-4 h-4 mr-2" />
                )}
                {isCreatingSheet ? 'Creating...' : 'Create Sheet'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Information */}
      <Card className="bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20" data-testid="plan-card">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Crown className="text-accent w-5 h-5" />
            <CardTitle className="text-lg font-semibold">
              {user?.subscriptionPlan === 'premium' ? 'Premium Plan' : 'Free Plan'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {user?.subscriptionPlan === 'premium' ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Check className="text-accent w-4 h-4 mr-2" />
                  <span className="text-foreground">Unlimited bet captures</span>
                </div>
                <div className="flex items-center text-sm">
                  <Check className="text-accent w-4 h-4 mr-2" />
                  <span className="text-foreground">Advanced analytics</span>
                </div>
                <div className="flex items-center text-sm">
                  <Check className="text-accent w-4 h-4 mr-2" />
                  <span className="text-foreground">Custom templates</span>
                </div>
                <div className="flex items-center text-sm">
                  <Check className="text-accent w-4 h-4 mr-2" />
                  <span className="text-foreground">Priority AI processing</span>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Valid until March 15, 2024</p>
                <Button 
                  className="w-full mt-2 bg-accent hover:bg-accent/90 text-accent-foreground" 
                  size="sm"
                  data-testid="button-manage-subscription"
                >
                  Manage Subscription
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Upgrade to Premium for unlimited captures and advanced features.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 5 captures per day limit</li>
                  <li>• Basic analytics only</li>
                  <li>• Standard templates</li>
                </ul>
              </div>
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
                size="sm"
                data-testid="button-upgrade-premium"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Analytics */}
      {stats && (
        <Card className="shadow-sm" data-testid="analytics-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">This Month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Win Rate</span>
              <span className="text-sm font-medium text-accent">{stats.winRate}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-accent h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(stats.winRate, 100)}%` }}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Profit</span>
              <span className={`text-sm font-medium ${stats.totalProfit >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Bets Placed</span>
              <span className="text-sm font-medium text-foreground">{stats.totalBets}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="text-sm font-medium text-foreground">{stats.pendingBets}</span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              data-testid="button-full-analytics"
            >
              View Full Analytics
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Browser Extension Status */}
      <Card className="shadow-sm" data-testid="extension-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Extension Status</CardTitle>
            <div className="w-2 h-2 bg-accent rounded-full" title="Active" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center text-sm">
            <Puzzle className="text-primary w-4 h-4 mr-2" />
            <span className="text-foreground">BetSnap v2.1.0</span>
          </div>
          <div className="flex items-center text-sm">
            <Globe className="text-accent w-4 h-4 mr-2" />
            <span className="text-foreground">Active on 12 sites</span>
          </div>
          <div className="flex items-center text-sm">
            <Keyboard className="text-muted-foreground w-4 h-4 mr-2" />
            <span className="text-muted-foreground">Hotkey: Ctrl+Shift+S</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-4"
            data-testid="button-extension-settings"
          >
            <Settings className="w-4 h-4 mr-2" />
            Extension Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
