import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import Navigation from "@/components/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CreditCard, Calendar, TrendingUp, Zap, Crown, Star, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SubscriptionData {
  currentPlan: string;
  status: string;
  nextBillingDate?: string;
  cancelAtPeriodEnd: boolean;
  usage: {
    bets: { current: number; limit: number; };
    analytics: { current: number; limit: number; };
    bankrolls: { current: number; limit: number; };
  };
}

export default function SubscriptionDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch subscription data
  const { data: subscription, isLoading: subscriptionLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription"],
  });

  // Fetch available plans
  const { data: plans } = useQuery({
    queryKey: ["/api/subscription/plans"],
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => apiRequest("/api/subscription", { 
      method: "PATCH", 
      body: JSON.stringify({ cancelAtPeriodEnd: true }) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: "Subscription Updated",
        description: "Your subscription will be canceled at the end of the current billing period.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  // Reactivate subscription mutation
  const reactivateSubscriptionMutation = useMutation({
    mutationFn: () => apiRequest("/api/subscription", { 
      method: "PATCH", 
      body: JSON.stringify({ cancelAtPeriodEnd: false }) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: "Subscription Reactivated",
        description: "Your subscription will continue at the end of the current period.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate subscription",
        variant: "destructive",
      });
    },
  });

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Star className="h-5 w-5 text-gray-500" />;
      case 'premium':
        return <Zap className="h-5 w-5 text-blue-500" />;
      case 'enterprise':
        return <Crown className="h-5 w-5 text-purple-500" />;
      default:
        return <Star className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return <Badge variant="destructive">Canceling</Badge>;
    }

    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'trialing':
        return <Badge variant="secondary">Trial</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      case 'canceled':
        return <Badge variant="outline">Canceled</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? "Unlimited" : limit.toString();
  };

  if (subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
            <p className="text-muted-foreground">
              Manage your subscription and view usage details.
            </p>
          </div>

          {/* Current Plan Card */}
          <Card data-testid="card-current-plan">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getPlanIcon(subscription?.currentPlan || 'free')}
                  <div>
                    <CardTitle className="capitalize" data-testid="text-current-plan">
                      {subscription?.currentPlan || 'Free'} Plan
                    </CardTitle>
                    <CardDescription>
                      Your current subscription plan
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(subscription?.status || 'inactive', subscription?.cancelAtPeriodEnd || false)}
                  {subscription?.nextBillingDate && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Next billing: {new Date(subscription.nextBillingDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            
            {subscription?.currentPlan !== 'free' && (
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Billing Cycle</p>
                    <p className="text-sm text-muted-foreground">
                      {subscription?.nextBillingDate 
                        ? `Next payment due ${new Date(subscription.nextBillingDate).toLocaleDateString()}`
                        : 'No upcoming payments'
                      }
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <div className="space-x-2">
                    {!subscription?.cancelAtPeriodEnd ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" data-testid="button-cancel-subscription">
                            Cancel Subscription
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel your subscription? You'll continue to have access 
                              to premium features until the end of your current billing period.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => cancelSubscriptionMutation.mutate()}
                              disabled={cancelSubscriptionMutation.isPending}
                            >
                              {cancelSubscriptionMutation.isPending ? 'Canceling...' : 'Cancel Subscription'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => reactivateSubscriptionMutation.mutate()}
                        disabled={reactivateSubscriptionMutation.isPending}
                        data-testid="button-reactivate-subscription"
                      >
                        {reactivateSubscriptionMutation.isPending ? 'Reactivating...' : 'Reactivate Subscription'}
                      </Button>
                    )}
                    
                    <Button variant="outline" data-testid="button-manage-payment">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Manage Payment Method
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Usage Overview */}
          <Card data-testid="card-usage-overview">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Usage Overview</span>
              </CardTitle>
              <CardDescription>
                Track your usage across different features this month
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bets Usage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Bets Tracked</span>
                  <span className="text-sm text-muted-foreground">
                    {subscription?.usage.bets.current || 0} / {formatLimit(subscription?.usage.bets.limit || 20)}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(subscription?.usage.bets.current || 0, subscription?.usage.bets.limit || 20)}
                  className="h-2"
                  data-testid="progress-bets-usage"
                />
              </div>

              {/* Analytics Usage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Analytics Queries</span>
                  <span className="text-sm text-muted-foreground">
                    {subscription?.usage.analytics.current || 0} / {formatLimit(subscription?.usage.analytics.limit || 10)}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(subscription?.usage.analytics.current || 0, subscription?.usage.analytics.limit || 10)}
                  className="h-2"
                  data-testid="progress-analytics-usage"
                />
              </div>

              {/* Bankrolls Usage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Active Bankrolls</span>
                  <span className="text-sm text-muted-foreground">
                    {subscription?.usage.bankrolls.current || 0} / {formatLimit(subscription?.usage.bankrolls.limit || 1)}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(subscription?.usage.bankrolls.current || 0, subscription?.usage.bankrolls.limit || 1)}
                  className="h-2"
                  data-testid="progress-bankrolls-usage"
                />
              </div>
            </CardContent>
          </Card>

          {/* Upgrade Options */}
          {subscription?.currentPlan === 'free' && (
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  <span>Upgrade to Premium</span>
                </CardTitle>
                <CardDescription>
                  Unlock unlimited bets, advanced analytics, and more!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Premium Plan</p>
                    <p className="text-sm text-muted-foreground">$19.99/month • 14-day free trial</p>
                  </div>
                  <Button data-testid="button-upgrade-premium">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Upgrade Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Billing History */}
          <Card data-testid="card-billing-history">
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                View your past payments and invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No billing history available</p>
                <p className="text-sm">Your payment history will appear here once you have a paid subscription.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}