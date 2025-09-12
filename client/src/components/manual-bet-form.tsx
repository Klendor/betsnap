import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertBetSchema, type InsertBet } from "@shared/schema";
import { Calculator, DollarSign, TrendingUp, AlertCircle } from "lucide-react";

interface Bankroll {
  id: string;
  name: string;
  currency: string;
  unitMode: string;
  unitValue: string;
  startingBalance: string;
  maxBetPct: string;
  dailyLossLimitPct: string | null;
  weeklyLossLimitPct: string | null;
  kellyFraction: string;
  isActive: number;
}

interface ManualBetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Enhanced form schema with better validation and bankroll limits
const manualBetFormSchema = insertBetSchema.extend({
  sport: z.string().min(1, "Sport is required").max(50, "Sport must be 50 characters or less"),
  event: z.string().min(1, "Event description is required").max(200, "Event must be 200 characters or less"),
  betType: z.string().min(1, "Bet type is required").max(100, "Bet type must be 100 characters or less"),
  odds: z.string().min(1, "Odds are required").refine((val) => {
    // Accept American odds (+150, -110), Decimal odds (1.5, 2.0), or Fractional odds (3/2, 5/1)
    const americanOdds = /^[+-]\d+$/.test(val);
    const decimalOdds = /^\d+(\.\d+)?$/.test(val) && parseFloat(val) >= 1.0;
    const fractionalOdds = /^\d+\/\d+$/.test(val);
    return americanOdds || decimalOdds || fractionalOdds;
  }, "Invalid odds format. Use +150, -110, 1.5, or 3/2"),
  stake: z.string().min(1, "Stake is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Stake must be a positive number"),
  bankrollId: z.string().min(1, "Please select a bankroll"),
  notes: z.string().optional(),
});

type ManualBetFormData = z.infer<typeof manualBetFormSchema>;

// Common sports list
const SPORTS_LIST = [
  "Football (NFL)", "Football (NCAA)", "Basketball (NBA)", "Basketball (NCAA)",
  "Baseball (MLB)", "Hockey (NHL)", "Soccer", "Tennis", "Golf", "Boxing",
  "MMA", "UFC", "Cricket", "Rugby", "Volleyball", "Other"
];

// Common bet types
const BET_TYPES = [
  "Moneyline", "Point Spread", "Over/Under (Total)", "Prop Bet",
  "Parlay", "Teaser", "Future", "Live Bet", "Other"
];

export default function ManualBetForm({ open, onOpenChange }: ManualBetFormProps) {
  const [isCalculatingPayout, setIsCalculatingPayout] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ManualBetFormData>({
    resolver: zodResolver(manualBetFormSchema),
    defaultValues: {
      sport: "",
      event: "",
      betType: "",
      odds: "",
      stake: "",
      bankrollId: "",
      notes: "",
    },
  });

  // Fetch user's active bankrolls
  const { data: bankrolls = [], isLoading: bankrollsLoading } = useQuery<Bankroll[]>({
    queryKey: ['/api/bankrolls'],
    enabled: open,
  });

  const activeBankrolls = bankrolls.filter(b => b.isActive === 1);

  // Bankroll limit validation function
  const validateStakeAgainstBankroll = (stakeStr: string, bankrollId: string): { isValid: boolean; errorMessage?: string } => {
    const stake = parseFloat(stakeStr);
    if (isNaN(stake) || stake <= 0) {
      return { isValid: false, errorMessage: "Stake must be a positive number" };
    }

    const bankroll = activeBankrolls.find(b => b.id === bankrollId);
    if (!bankroll) {
      return { isValid: false, errorMessage: "Please select a bankroll first" };
    }

    const startingBalance = parseFloat(bankroll.startingBalance);
    const maxBetPct = parseFloat(bankroll.maxBetPct);
    const unitValue = parseFloat(bankroll.unitValue);

    if (isNaN(startingBalance) || isNaN(maxBetPct) || isNaN(unitValue)) {
      return { isValid: false, errorMessage: "Invalid bankroll configuration" };
    }

    // Calculate maximum allowed stake based on maxBetPct
    const maxAllowedStake = startingBalance * maxBetPct;

    if (stake > maxAllowedStake) {
      return { 
        isValid: false, 
        errorMessage: `Stake exceeds bankroll limit. Max allowed: ${bankroll.currency} ${maxAllowedStake.toFixed(2)} (${(maxBetPct * 100).toFixed(1)}% of bankroll)` 
      };
    }

    // Check minimum stake (should be at least one unit)
    if (stake < unitValue) {
      return { 
        isValid: false, 
        errorMessage: `Stake too small. Minimum: ${bankroll.currency} ${unitValue} (1 unit)` 
      };
    }

    return { isValid: true };
  };

  // Calculate potential payout
  const calculatePayout = (odds: string, stake: string): number => {
    const stakeNum = parseFloat(stake);
    if (isNaN(stakeNum) || stakeNum <= 0) return 0;

    // American odds
    if (odds.startsWith('+') || odds.startsWith('-')) {
      const oddsNum = parseInt(odds);
      if (oddsNum > 0) {
        // Positive odds: (odds / 100) * stake + stake
        return (oddsNum / 100) * stakeNum + stakeNum;
      } else {
        // Negative odds: (100 / abs(odds)) * stake + stake
        return (100 / Math.abs(oddsNum)) * stakeNum + stakeNum;
      }
    }
    
    // Fractional odds - Check BEFORE decimal to avoid "3/2" being parsed as "3"
    if (odds.includes('/')) {
      const [numerator, denominator] = odds.split('/').map(Number);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator > 0) {
        return (numerator / denominator) * stakeNum + stakeNum;
      }
    }
    
    // Decimal odds
    if (!isNaN(parseFloat(odds))) {
      const decimalOdds = parseFloat(odds);
      if (decimalOdds >= 1.0) {
        return decimalOdds * stakeNum;
      }
    }

    return 0;
  };

  // Calculate stake in units for selected bankroll
  const calculateStakeUnits = (stake: string, bankrollId: string): number => {
    const stakeNum = parseFloat(stake);
    if (isNaN(stakeNum)) return 0;

    const bankroll = activeBankrolls.find(b => b.id === bankrollId);
    if (!bankroll) return 0;

    const unitValue = parseFloat(bankroll.unitValue);
    if (isNaN(unitValue) || unitValue === 0) return 0;

    return stakeNum / unitValue;
  };

  // Watch form values for real-time calculations
  const watchedOdds = form.watch("odds");
  const watchedStake = form.watch("stake");
  const watchedBankrollId = form.watch("bankrollId");

  const potentialPayout = calculatePayout(watchedOdds, watchedStake);
  const profit = potentialPayout - parseFloat(watchedStake || "0");
  const stakeUnits = calculateStakeUnits(watchedStake, watchedBankrollId);
  const selectedBankroll = activeBankrolls.find(b => b.id === watchedBankrollId);

  // Real-time bankroll validation
  const stakeValidation = watchedStake && watchedBankrollId 
    ? validateStakeAgainstBankroll(watchedStake, watchedBankrollId)
    : { isValid: true };

  // Calculate max allowed stake for display
  const maxAllowedStake = selectedBankroll 
    ? parseFloat(selectedBankroll.startingBalance) * parseFloat(selectedBankroll.maxBetPct)
    : 0;

  // Create bet mutation
  const createBetMutation = useMutation({
    mutationFn: async (data: ManualBetFormData) => {
      const potentialPayout = calculatePayout(data.odds, data.stake);
      
      const betData: InsertBet = {
        ...data,
        potentialPayout: potentialPayout.toFixed(2),
      };
      
      return apiRequest('/api/bets', {
        method: 'POST',
        body: JSON.stringify(betData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/stats'] });
      form.reset();
      onOpenChange(false);
      toast({
        title: "Bet Added Successfully",
        description: "Your bet has been saved and added to your tracking.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Bet",
        description: error.message || "An error occurred while adding your bet.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ManualBetFormData) => {
    // Validate stake against bankroll limits before submission
    const validation = validateStakeAgainstBankroll(data.stake, data.bankrollId);
    if (!validation.isValid) {
      toast({
        title: "Stake Validation Failed",
        description: validation.errorMessage,
        variant: "destructive",
      });
      return;
    }

    // Type-safe data conversion before submission
    const betData: InsertBet = {
      userId: data.userId,
      bankrollId: data.bankrollId,
      sport: data.sport,
      event: data.event,
      betType: data.betType,
      odds: data.odds,
      stake: data.stake,
      potentialPayout: calculatePayout(data.odds, data.stake).toFixed(2),
      // Only include notes if it exists and is not empty
      ...(data.notes && { notes: data.notes }),
      // stakeUnits will be auto-calculated on the backend based on bankroll unitValue
    };

    createBetMutation.mutate(betData);
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="manual-bet-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Add New Bet
          </DialogTitle>
          <DialogDescription>
            Manually add a bet to your tracking. All fields are required except notes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Bankroll Selection */}
            <FormField
              control={form.control}
              name="bankrollId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bankroll *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} data-testid="select-bankroll">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bankroll" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankrollsLoading ? (
                        <SelectItem value="" disabled>Loading bankrolls...</SelectItem>
                      ) : activeBankrolls.length === 0 ? (
                        <SelectItem value="" disabled>No active bankrolls found</SelectItem>
                      ) : (
                        activeBankrolls.map((bankroll) => (
                          <SelectItem key={bankroll.id} value={bankroll.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{bankroll.name}</span>
                              <Badge variant="outline" className="ml-2">
                                {bankroll.currency}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedBankroll && (
                    <FormDescription className="flex items-center gap-1 text-xs">
                      <DollarSign className="h-3 w-3" />
                      Unit Value: {selectedBankroll.currency} {selectedBankroll.unitValue}
                      {selectedBankroll.unitMode === 'percent' && '%'}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sport */}
            <FormField
              control={form.control}
              name="sport"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sport *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} data-testid="select-sport">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sport" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SPORTS_LIST.map((sport) => (
                        <SelectItem key={sport} value={sport}>
                          {sport}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Event */}
            <FormField
              control={form.control}
              name="event"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Description *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Lakers vs Warriors, Super Bowl LIX"
                      {...field}
                      data-testid="input-event"
                    />
                  </FormControl>
                  <FormDescription>
                    Describe the game or event you're betting on
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bet Type */}
            <FormField
              control={form.control}
              name="betType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bet Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} data-testid="select-bet-type">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bet type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Odds and Stake Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="odds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Odds *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+150, -110, 2.5, 3/2"
                        {...field}
                        data-testid="input-odds"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      American (+/-), decimal, or fractional
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stake"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stake Amount *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-stake"
                      />
                    </FormControl>
                    {selectedBankroll && (
                      <FormDescription className="text-xs space-y-1">
                        {stakeUnits > 0 && (
                          <div>≈ {stakeUnits.toFixed(2)} units</div>
                        )}
                        <div className="text-muted-foreground">
                          Max allowed: {selectedBankroll.currency} {maxAllowedStake.toFixed(2)} 
                          ({(parseFloat(selectedBankroll.maxBetPct) * 100).toFixed(1)}% of bankroll)
                        </div>
                        {!stakeValidation.isValid && stakeValidation.errorMessage && (
                          <div className="text-red-600 dark:text-red-400 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {stakeValidation.errorMessage}
                          </div>
                        )}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payout Calculation Display */}
            {potentialPayout > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Calculated Payout</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Potential Payout:</span>
                    <p className="font-semibold" data-testid="calculated-payout">
                      {selectedBankroll?.currency || '$'} {potentialPayout.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Potential Profit:</span>
                    <p className={`font-semibold ${profit > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {profit >= 0 ? '+' : ''}{selectedBankroll?.currency || '$'} {profit.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional notes about this bet..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  createBetMutation.isPending || 
                  activeBankrolls.length === 0 || 
                  !stakeValidation.isValid ||
                  !watchedStake || 
                  !watchedBankrollId
                }
                data-testid="button-add-bet"
              >
                {createBetMutation.isPending ? "Adding..." : "Add Bet"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}