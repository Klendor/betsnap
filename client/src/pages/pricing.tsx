import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, Zap, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string | null;
  stripePriceId?: string;
  features: string[];
  limitations?: string[];
  popular?: boolean;
}

interface Subscription {
  currentPlan: string;
  status: string;
  nextBillingDate?: string;
  cancelAtPeriodEnd?: boolean;
}

interface SetupIntentResponse {
  clientSecret: string;
}

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch available plans
  const { data: plans, isLoading: plansLoading } = useQuery<PricingPlan[]>({
    queryKey: ["/api/subscription/plans"],
  });

  // Fetch user's current subscription
  const { data: subscription } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
    enabled: isAuthenticated,
  });

  // Create subscription setup intent
  const setupIntentMutation = useMutation<SetupIntentResponse>({
    mutationFn: async () => {
      return await apiRequest("/api/subscription/setup-intent", { method: "POST" });
    },
    onSuccess: (data) => {
      // Redirect to payment form with client secret
      window.location.href = `/subscribe?client_secret=${data.clientSecret}&plan=${selectedPlan}`;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription process",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!isAuthenticated) {
      // Redirect to register with plan selection
      window.location.href = `/register?plan=${plan.id}`;
      return;
    }

    if (plan.id === 'free') {
      toast({
        title: "You're already on the free plan",
        description: "Upgrade to premium or enterprise for more features!",
      });
      return;
    }

    setSelectedPlan(plan.id);
    setIsProcessing(true);
    
    try {
      setupIntentMutation.mutate();
    } catch (error) {
      setIsProcessing(false);
    }
  };

  const getCurrentPlanStatus = (planId: string) => {
    if (!subscription) return null;
    
    if (subscription.currentPlan === planId) {
      if (subscription.cancelAtPeriodEnd) {
        return { status: 'canceling', message: 'Canceling at period end' };
      }
      return { status: 'current', message: 'Current plan' };
    }
    
    return null;
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Star className="h-6 w-6 text-gray-500" />;
      case 'premium':
        return <Zap className="h-6 w-6 text-blue-500" />;
      case 'enterprise':
        return <Crown className="h-6 w-6 text-purple-500" />;
      default:
        return null;
    }
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" data-testid="link-home">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">BS</span>
                </div>
                <span className="font-semibold text-lg">BetSnap</span>
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link href="/dashboard" data-testid="link-dashboard">
                  <Button variant="outline">Back to Dashboard</Button>
                </Link>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link href="/login" data-testid="link-login">
                    <Button variant="outline">Sign In</Button>
                  </Link>
                  <Link href="/register" data-testid="link-register">
                    <Button data-testid="button-get-started">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Start tracking your bets for free, or upgrade to unlock advanced features 
          and maximize your betting performance.
        </p>
        
        {subscription && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-md mx-auto mb-8">
            <p className="text-sm">
              <strong>Current plan:</strong> {subscription.currentPlan} 
              {subscription.status === 'trialing' && (
                <span className="ml-2 text-primary">(Trial)</span>
              )}
            </p>
            {subscription.nextBillingDate && (
              <p className="text-sm text-muted-foreground">
                Next billing: {new Date(subscription.nextBillingDate).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans?.map((plan: PricingPlan) => {
            const currentStatus = getCurrentPlanStatus(plan.id);
            const isCurrentPlan = currentStatus?.status === 'current';
            const isCanceling = currentStatus?.status === 'canceling';
            
            return (
              <Card 
                key={plan.id} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''} ${isCurrentPlan ? 'bg-primary/5 border-primary' : ''}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary" data-testid="badge-popular">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    {getPlanIcon(plan.id)}
                  </div>
                  <CardTitle className="text-2xl font-bold" data-testid={`text-plan-name-${plan.id}`}>
                    {plan.name}
                  </CardTitle>
                  <CardDescription data-testid={`text-plan-description-${plan.id}`}>
                    {plan.description}
                  </CardDescription>
                  <div className="text-center py-4">
                    <div className="text-4xl font-bold" data-testid={`text-plan-price-${plan.id}`}>
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                      {plan.interval && (
                        <span className="text-lg font-normal text-muted-foreground">
                          /{plan.interval}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                      Features Included:
                    </h4>
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {plan.limitations && plan.limitations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                        Limitations:
                      </h4>
                      {plan.limitations.map((limitation, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{limitation}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  {isCurrentPlan ? (
                    <div className="w-full text-center">
                      {isCanceling ? (
                        <Badge variant="secondary" data-testid={`badge-status-${plan.id}`}>
                          {currentStatus.message}
                        </Badge>
                      ) : (
                        <Badge variant="default" data-testid={`badge-status-${plan.id}`}>
                          Current Plan
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isProcessing && selectedPlan === plan.id}
                      data-testid={`button-select-${plan.id}`}
                    >
                      {isProcessing && selectedPlan === plan.id ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Setting up...</span>
                        </div>
                      ) : (
                        <>
                          {plan.price === 0 ? 'Get Started Free' : 'Upgrade Now'}
                          {plan.stripePriceId && subscription?.currentPlan === 'free' && (
                            <span className="ml-2 text-xs">(14-day free trial)</span>
                          )}
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-16 border-t">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Can I cancel my subscription anytime?</h3>
              <p className="text-muted-foreground">
                Yes, you can cancel your subscription at any time. Your subscription will remain active 
                until the end of your current billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-muted-foreground">
                We offer a 14-day free trial for all paid plans. If you're not satisfied within 
                the first 30 days, contact us for a full refund.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I upgrade or downgrade my plan?</h3>
              <p className="text-muted-foreground">
                Yes, you can change your plan at any time. Upgrades take effect immediately, 
                while downgrades take effect at the next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is my data secure?</h3>
              <p className="text-muted-foreground">
                Absolutely. We use industry-standard encryption and security measures to protect 
                your data. All payments are processed securely through Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}