import { useState, useEffect } from "react";
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
  Settings,
  Unlink,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X
} from "lucide-react";
import type { User } from "@shared/schema";

// Type definitions for API responses
interface CompleteSetupResponse {
  sheetId: string;
  message: string;
  url: string;
  syncedBets: number;
}

interface SyncBetsResponse {
  message: string;
  syncedBets: number;
}

interface DisconnectResponse {
  message: string;
}

export default function Sidebar() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/user/stats'],
  });

  // Listen for OAuth completion messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      console.log('Received OAuth message:', event.data);
      
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const { tokens } = event.data;
        completeGoogleSetup(tokens);
        if (authWindow) {
          authWindow.close();
          setAuthWindow(null);
        }
      } else if (event.data.type === 'GOOGLE_AUTH_CANCELLED') {
        setIsConnecting(false);
        if (authWindow) {
          authWindow.close();
          setAuthWindow(null);
        }
        toast({
          title: "Authorization cancelled",
          description: "Google Sheets connection was cancelled. You can try again anytime.",
          variant: "default",
        });
      } else if (event.data.type === 'GOOGLE_AUTH_FAILED' || event.data.type === 'GOOGLE_AUTH_ERROR') {
        setIsConnecting(false);
        if (authWindow) {
          authWindow.close();
          setAuthWindow(null);
        }
        toast({
          title: "Connection failed",
          description: event.data.error || "Failed to connect to Google Sheets. Please try again.",
          variant: "destructive",
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [authWindow, toast]);

  const initiateGoogleAuthMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('GET', '/api/auth/google');
    },
    onSuccess: async (response) => {
      try {
        const data = await response.json();
        if (data.authUrl) {
          console.log('Opening Google OAuth popup:', data.authUrl);
          const popup = window.open(
            data.authUrl,
            'google-auth',
            'width=500,height=600,left=' + (window.screen.width / 2 - 250) + ',top=' + (window.screen.height / 2 - 300)
          );
          setAuthWindow(popup);
          
          // Check if popup was closed manually
          const checkClosed = setInterval(() => {
            if (popup?.closed) {
              clearInterval(checkClosed);
              setIsConnecting(false);
              setAuthWindow(null);
              toast({
                title: "Authorization cancelled",
                description: "Google Sheets connection was cancelled.",
              });
            }
          }, 1000);
        } else {
          throw new Error('No authorization URL received');
        }
      } catch (error) {
        console.error('Failed to parse auth response:', error);
        setIsConnecting(false);
        throw error;
      }
    },
    onError: (error: any) => {
      console.error('Google auth initiation failed:', error);
      setIsConnecting(false);
      toast({
        title: "Connection failed",
        description: error.message || "Failed to start Google authorization. Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  const completeSetupMutation = useMutation<CompleteSetupResponse, Error, any>({
    mutationFn: async (tokens: any) => {
      const response = await apiRequest('POST', '/api/sheets/complete-setup', tokens);
      return await response.json();
    },
    onSuccess: (data: CompleteSetupResponse) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setIsConnecting(false);
      
      toast({
        title: "Google Sheets connected!",
        description: `Your betting tracker is ready with ${data.syncedBets || 0} existing bets synced.`,
      });
      
      // Open the sheet in a new tab
      if (data.url) {
        setTimeout(() => window.open(data.url, '_blank'), 1000);
      }
    },
    onError: (error: Error) => {
      console.error('Setup completion failed:', error);
      setIsConnecting(false);
      toast({
        title: "Setup failed",
        description: error.message || "Failed to complete Google Sheets setup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const syncBetsMutation = useMutation<SyncBetsResponse, Error>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/sheets/sync-bets', {});
      return await response.json();
    },
    onSuccess: (data: SyncBetsResponse) => {
      setIsSyncing(false);
      toast({
        title: "Sync completed!",
        description: `Successfully synced ${data.syncedBets} bets to your Google Sheet.`,
      });
    },
    onError: (error: Error) => {
      console.error('Sync failed:', error);
      setIsSyncing(false);
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync bets. Please try again.",
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation<DisconnectResponse, Error>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/sheets/disconnect', {});
      return await response.json();
    },
    onSuccess: (data: DisconnectResponse) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setIsDisconnecting(false);
      toast({
        title: "Disconnected successfully",
        description: "Google Sheets integration has been disconnected.",
      });
    },
    onError: (error: Error) => {
      console.error('Disconnect failed:', error);
      setIsDisconnecting(false);
      toast({
        title: "Disconnect failed",
        description: error.message || "Failed to disconnect Google Sheets. Please try again.",
        variant: "destructive",
      });
    },
  });

  const completeGoogleSetup = (tokens: any) => {
    completeSetupMutation.mutate(tokens);
  };

  const handleConnectGoogleSheets = () => {
    setIsConnecting(true);
    initiateGoogleAuthMutation.mutate();
  };

  const handleSyncBets = () => {
    setIsSyncing(true);
    syncBetsMutation.mutate();
  };

  const handleDisconnect = () => {
    setIsDisconnecting(true);
    disconnectMutation.mutate();
  };

  const handleOpenSheet = () => {
    if (user?.googleSheetsId) {
      window.open(`https://docs.google.com/spreadsheets/d/${user.googleSheetsId}`, '_blank');
    }
  };

  const isConnected = user?.googleSheetsConnected === 1 && user?.googleSheetsId;
  const isProcessing = isConnecting || completeSetupMutation.isPending;

  return (
    <div className="space-y-6" data-testid="sidebar">
      {/* Google Sheets Integration */}
      <Card className="shadow-sm" data-testid="google-sheets-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Google Sheets</CardTitle>
            <div className="flex items-center space-x-2">
              {isConnected && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  Connected
                </Badge>
              )}
              <div 
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-muted'}`} 
                title={isConnected ? 'Connected and syncing' : 'Not connected'}
                data-testid="connection-status"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="text-green-600 w-5 h-5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">BetSnap Tracker {new Date().getFullYear()}</p>
                  <p className="text-xs text-muted-foreground">Auto-sync enabled • Real-time updates</p>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSyncBets}
                  disabled={isSyncing}
                  data-testid="button-sync-sheet"
                  title="Manually sync all bets"
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  data-testid="button-disconnect-sheet"
                  title="Disconnect Google Sheets"
                  className="text-destructive hover:text-destructive"
                >
                  {isDisconnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlink className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>New bets sync automatically</span>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="mb-4">
                <Table className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Connect your Google account to automatically sync your bets to a beautiful spreadsheet.
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center justify-center space-x-1">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>Real-time bet synchronization</span>
                  </div>
                  <div className="flex items-center justify-center space-x-1">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>Advanced analytics & charts</span>
                  </div>
                  <div className="flex items-center justify-center space-x-1">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>Monthly performance tracking</span>
                  </div>
                </div>
              </div>
              
              {isProcessing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {isConnecting ? 'Connecting to Google...' : 'Setting up your tracker...'}
                    </span>
                  </div>
                  {isConnecting && (
                    <p className="text-xs text-muted-foreground">
                      Please complete the authorization in the popup window
                    </p>
                  )}
                </div>
              ) : (
                <Button 
                  onClick={handleConnectGoogleSheets}
                  disabled={isProcessing}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground min-w-[140px]"
                  data-testid="button-connect-google"
                >
                  <Table className="w-4 h-4 mr-2" />
                  Connect Google
                </Button>
              )}
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
                  <span className="text-foreground">Google Sheets integration</span>
                </div>
                <div className="flex items-center text-sm">
                  <Check className="text-accent w-4 h-4 mr-2" />
                  <span className="text-foreground">Priority AI processing</span>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Valid until March 15, 2025</p>
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
                  Upgrade to Premium for unlimited captures and Google Sheets integration.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 5 captures per day limit</li>
                  <li>• Basic analytics only</li>
                  <li>• No Google Sheets sync</li>
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
            
            {isConnected && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Google Sheets</span>
                <span className="text-green-600 flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Synced</span>
                </span>
              </div>
            )}
            
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