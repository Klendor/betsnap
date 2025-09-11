import { useState } from "react";
import { useLocation } from "wouter";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface SubscriptionPaymentFormProps {
  clientSecret: string;
  selectedPlan: string;
}

export default function SubscriptionPaymentForm({ clientSecret, selectedPlan }: SubscriptionPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/subscription?success=true`,
      },
      redirect: "if_required",
    });

    if (error) {
      setPaymentError(error.message || "An unexpected error occurred.");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      setPaymentSuccess(true);
      
      // Invalidate auth and subscription queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      
      toast({
        title: "Subscription Activated!",
        description: "Welcome to your new plan! Your free trial has started.",
      });

      // Redirect to subscription dashboard after a brief success message
      setTimeout(() => {
        setLocation("/subscription");
      }, 2000);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="space-y-6 text-center" data-testid="payment-success">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-green-700">Payment Successful!</h3>
          <p className="text-muted-foreground">
            Your subscription has been activated. Redirecting to your dashboard...
          </p>
        </div>
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="payment-form">
      {/* Plan Summary */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-semibold capitalize mb-2">
          {selectedPlan} Plan
        </h3>
        <div className="flex justify-between items-center text-sm">
          <span>14-day free trial</span>
          <span className="text-green-600 font-medium">$0.00 today</span>
        </div>
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Then {selectedPlan === 'premium' ? '$19.99' : '$49.99'}/month</span>
          <span>Cancel anytime</span>
        </div>
      </div>

      {/* Payment Element */}
      <div className="space-y-4">
        <h4 className="font-medium">Payment Method</h4>
        <PaymentElement 
          id="payment-element"
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {/* Error Display */}
      {paymentError && (
        <Alert variant="destructive" data-testid="payment-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{paymentError}</AlertDescription>
        </Alert>
      )}

      {/* Trial Information */}
      <Alert data-testid="trial-info">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>14-day free trial</strong> - You won't be charged until {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
          Cancel anytime before the trial ends to avoid being charged.
        </AlertDescription>
      </Alert>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || isProcessing}
        size="lg"
        data-testid="button-start-trial"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Start 14-Day Free Trial`
        )}
      </Button>

      <div className="text-center text-xs text-muted-foreground">
        <p>
          By clicking "Start 14-Day Free Trial", you agree to our Terms of Service 
          and acknowledge that you've read our Privacy Policy.
        </p>
      </div>
    </form>
  );
}