import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SubscriptionPaymentForm from "@/components/subscription-payment-form.tsx";

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

export default function Subscribe() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get client secret and plan from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const clientSecretParam = urlParams.get('client_secret');
    const planParam = urlParams.get('plan');
    
    if (clientSecretParam && planParam) {
      setClientSecret(clientSecretParam);
      setSelectedPlan(planParam);
      setIsLoading(false);
    } else {
      // Redirect to pricing if no params
      setLocation('/pricing');
    }
  }, [setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Payment Unavailable</CardTitle>
            <CardDescription>
              Stripe is not configured. Please contact support to complete your subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/pricing')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const appearance = {
    theme: 'stripe' as const,
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">BS</span>
              </div>
              <span className="font-semibold text-lg">BetSnap</span>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation('/pricing')}
              data-testid="button-back-pricing"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pricing
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Complete Your Subscription</h1>
            <p className="text-muted-foreground">
              Welcome, {user?.name}! You're upgrading to the{' '}
              <span className="font-semibold capitalize">{selectedPlan}</span> plan.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>
                Start your 14-day free trial today. You won't be charged until the trial ends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientSecret && (
                <Elements options={options} stripe={stripePromise}>
                  <SubscriptionPaymentForm
                    clientSecret={clientSecret}
                    selectedPlan={selectedPlan}
                  />
                </Elements>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              By subscribing, you agree to our Terms of Service and Privacy Policy.
              You can cancel anytime from your account settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}