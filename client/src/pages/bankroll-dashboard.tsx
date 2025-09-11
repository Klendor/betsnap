import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "wouter";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBankrollTransactionSchema, insertBankrollGoalSchema } from "@shared/schema";
import { z } from "zod";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Target, 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  Info,
  Activity,
  Calendar,
  Wallet,
  Plus,
  Edit,
  Trash2,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Form schemas
const transactionFormSchema = insertBankrollTransactionSchema.extend({
  amount: z.string().min(1, "Amount is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be a positive number"),
  reason: z.string().min(1, "Reason is required").max(200, "Reason must be 200 characters or less"),
});

const goalFormSchema = insertBankrollGoalSchema.extend({
  targetAmount: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Target amount must be a positive number"),
  targetProfit: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num);
  }, "Target profit must be a valid number"),
  targetDate: z.string().optional(),
});

const kellyFormSchema = z.object({
  winProbability: z.string().min(1, "Win probability is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num < 1;
  }, "Win probability must be between 0 and 1"),
  odds: z.string().min(1, "Odds are required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 1;
  }, "Odds must be greater than 1"),
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;
type GoalFormData = z.infer<typeof goalFormSchema>;
type KellyFormData = z.infer<typeof kellyFormSchema>;

// Type definitions
interface Bankroll {
  id: string;
  userId: string;
  name: string;
  currency: string;
  startingBalance: string;
  unitMode: string;
  unitValue: string;
  maxBetPct: string | null;
  dailyLossLimitPct: string | null;
  weeklyLossLimitPct: string | null;
  kellyFraction: string;
  isActive: number;
  createdAt: string;
}

interface BankrollTransaction {
  id: string;
  bankrollId: string;
  userId: string;
  type: string;
  amount: string;
  reason: string;
  refBetId: string | null;
  createdAt: string;
}

interface BankrollGoal {
  id: string;
  bankrollId: string;
  targetAmount: string | null;
  targetProfit: string | null;
  targetDate: string | null;
  status: string;
  createdAt: string;
}

interface BankrollAnalytics {
  currentBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  netProfitPercent: number;
  totalBets: number;
  winningBets: number;
  losingBets: number;
  winRate: number;
  avgWinAmount: number;
  avgLossAmount: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  currentDrawdown: number;
  currentDrawdownPercent: number;
  avgBetSize: number;
  avgBetSizeUnits: number;
  balanceHistory: Array<{
    date: string;
    balance: number;
    profit: number;
  }>;
  profitByType: Array<{
    type: string;
    profit: number;
    count: number;
  }>;
}

interface RiskMetrics {
  dailyLossCheck: {
    currentLoss: number;
    limit: number;
    limitExceeded: boolean;
    remainingAmount: number;
  };
  weeklyLossCheck: {
    currentLoss: number;
    limit: number;
    limitExceeded: boolean;
    remainingAmount: number;
  };
  maxBetSize: {
    amount: number;
    units: number;
  };
}

interface KellyCalculation {
  kellyPercent: number;
  suggestedBetSize: number;
  suggestedUnits: number;
  fractionalKellyBetSize: number;
  fractionalKellyUnits: number;
  edgePercent: number;
}

interface RiskLimitCheck {
  currentLoss: number;
  limit: number;
  limitExceeded: boolean;
  remainingAmount: number;
}

interface MaxBetSizeData {
  amount: number;
  units: number;
}

export default function BankrollDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [kellyDialogOpen, setKellyDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<BankrollGoal | null>(null);

  // Fetch bankroll data
  const { data: bankroll, isLoading: bankrollLoading } = useQuery<Bankroll>({
    queryKey: ['/api/bankrolls', id],
    enabled: !!user && !!id,
  });

  // Fetch bankroll analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<BankrollAnalytics>({
    queryKey: ['/api/bankrolls', id, 'analytics'],
    enabled: !!user && !!id,
  });

  // Fetch transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<BankrollTransaction[]>({
    queryKey: ['/api/bankrolls', id, 'transactions'],
    enabled: !!user && !!id,
  });

  // Fetch goals
  const { data: goals = [], isLoading: goalsLoading } = useQuery<BankrollGoal[]>({
    queryKey: ['/api/bankrolls', id, 'goals'],
    enabled: !!user && !!id,
  });

  // Fetch risk metrics
  const { data: dailyRisk } = useQuery<RiskLimitCheck>({
    queryKey: ['/api/bankrolls', id, 'risk', 'daily-limit'],
    enabled: !!user && !!id,
  });

  const { data: weeklyRisk } = useQuery<RiskLimitCheck>({
    queryKey: ['/api/bankrolls', id, 'risk', 'weekly-limit'],
    enabled: !!user && !!id,
  });

  const { data: maxBetData } = useQuery<MaxBetSizeData>({
    queryKey: ['/api/bankrolls', id, 'risk', 'max-bet-size'],
    enabled: !!user && !!id,
  });

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const submitData = {
        ...data,
        amount: data.amount,
        bankrollId: id,
        userId: user?.id,
      };
      const response = await apiRequest('POST', `/api/bankrolls/${id}/transactions`, submitData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bankrolls', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/bankrolls', id, 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bankrolls', id, 'transactions'] });
      setTransactionDialogOpen(false);
      transactionForm.reset();
      toast({
        title: "Success",
        description: "Transaction recorded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to record transaction",
        variant: "destructive",
      });
    },
  });

  // Create/update goal mutation
  const goalMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const submitData = {
        ...data,
        targetAmount: data.targetAmount || null,
        targetProfit: data.targetProfit || null,
        targetDate: data.targetDate || null,
        bankrollId: id,
      };
      
      let response;
      if (selectedGoal) {
        response = await apiRequest('PATCH', `/api/bankrolls/${id}/goals/${selectedGoal.id}`, submitData);
      } else {
        response = await apiRequest('POST', `/api/bankrolls/${id}/goals`, submitData);
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bankrolls', id, 'goals'] });
      setGoalDialogOpen(false);
      setSelectedGoal(null);
      goalForm.reset();
      toast({
        title: "Success",
        description: selectedGoal ? "Goal updated successfully" : "Goal created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save goal",
        variant: "destructive",
      });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const response = await apiRequest('DELETE', `/api/bankrolls/${id}/goals/${goalId}`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bankrolls', id, 'goals'] });
      toast({
        title: "Success",
        description: "Goal deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete goal",
        variant: "destructive",
      });
    },
  });

  // Kelly calculation mutation
  const [kellyResult, setKellyResult] = useState<KellyCalculation | null>(null);
  const calculateKellyMutation = useMutation<KellyCalculation, Error, KellyFormData>({
    mutationFn: async (data: KellyFormData) => {
      const submitData = {
        winProbability: parseFloat(data.winProbability),
        odds: parseFloat(data.odds),
      };
      const response = await apiRequest('POST', `/api/bankrolls/${id}/risk/kelly-bet-size`, submitData);
      return await response.json();
    },
    onSuccess: (result: KellyCalculation) => {
      setKellyResult(result);
      toast({
        title: "Kelly Calculation Complete",
        description: `Suggested bet size: ${formatCurrency(result.suggestedBetSize, bankroll?.currency)} (${result.suggestedUnits.toFixed(2)} units)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to calculate Kelly bet size",
        variant: "destructive",
      });
    },
  });

  // Form configurations
  const transactionForm = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "deposit",
      amount: "",
      reason: "",
    },
  });

  const goalForm = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      targetAmount: "",
      targetProfit: "",
      targetDate: "",
    },
  });

  const kellyForm = useForm<KellyFormData>({
    resolver: zodResolver(kellyFormSchema),
    defaultValues: {
      winProbability: "",
      odds: "",
    },
  });

  // Utility functions
  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'profit':
      case 'transfer_in':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
      case 'loss':
      case 'transfer_out':
        return <ArrowDownLeft className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'profit':
      case 'transfer_in':
        return 'text-green-600';
      case 'withdrawal':
      case 'loss':
      case 'transfer_out':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  // Event handlers
  const onTransactionSubmit = (data: TransactionFormData) => {
    createTransactionMutation.mutate(data);
  };

  const onGoalSubmit = (data: GoalFormData) => {
    goalMutation.mutate(data);
  };

  const onKellySubmit = (data: KellyFormData) => {
    calculateKellyMutation.mutate(data);
  };

  const openEditGoal = (goal: BankrollGoal) => {
    setSelectedGoal(goal);
    goalForm.reset({
      targetAmount: goal.targetAmount || "",
      targetProfit: goal.targetProfit || "",
      targetDate: goal.targetDate || "",
    });
    setGoalDialogOpen(true);
  };

  const openNewGoal = () => {
    setSelectedGoal(null);
    goalForm.reset();
    setGoalDialogOpen(true);
  };

  // Loading state
  if (bankrollLoading || analyticsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!bankroll) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Bankroll Not Found</h1>
            <Link href="/bankrolls">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bankrolls
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check for risk alerts
  const hasRiskAlerts = (dailyRisk?.limitExceeded || weeklyRisk?.limitExceeded);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-8">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <Link href="/bankrolls">
              <Button variant="outline" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="heading-bankroll-name">
                  {bankroll.name}
                </h1>
                {bankroll.isActive && (
                  <Badge variant="default" data-testid="badge-active">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                {bankroll.currency} • {bankroll.unitMode === 'fixed' ? 'Fixed Units' : 'Percent Units'}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-add-transaction">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Transaction</DialogTitle>
                  <DialogDescription>
                    Record a deposit, withdrawal, or manual adjustment to your bankroll
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...transactionForm}>
                  <form onSubmit={transactionForm.handleSubmit(onTransactionSubmit)} className="space-y-4">
                    <FormField
                      control={transactionForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transaction Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-transaction-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="deposit">Deposit</SelectItem>
                              <SelectItem value="withdrawal">Withdrawal</SelectItem>
                              <SelectItem value="adjustment">Adjustment</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={transactionForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ({bankroll.currency})</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="100.00" 
                              {...field} 
                              data-testid="input-transaction-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={transactionForm.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason / Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="e.g., Monthly bankroll top-up" 
                              {...field} 
                              data-testid="textarea-transaction-reason"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setTransactionDialogOpen(false)}
                        data-testid="button-cancel-transaction"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createTransactionMutation.isPending}
                        data-testid="button-submit-transaction"
                      >
                        {createTransactionMutation.isPending ? "Recording..." : "Record Transaction"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={kellyDialogOpen} onOpenChange={setKellyDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-kelly-calculator">
                  <Calculator className="h-4 w-4 mr-2" />
                  Kelly Calculator
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Kelly Criterion Calculator</DialogTitle>
                  <DialogDescription>
                    Calculate optimal bet size using the Kelly Criterion for a specific bet
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...kellyForm}>
                  <form onSubmit={kellyForm.handleSubmit(onKellySubmit)} className="space-y-4">
                    <FormField
                      control={kellyForm.control}
                      name="winProbability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Win Probability (0-1)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.55" 
                              {...field} 
                              data-testid="input-win-probability"
                            />
                          </FormControl>
                          <FormDescription>
                            Your estimated probability of winning (e.g., 0.55 = 55%)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={kellyForm.control}
                      name="odds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Decimal Odds</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="2.00" 
                              {...field} 
                              data-testid="input-odds"
                            />
                          </FormControl>
                          <FormDescription>
                            Decimal odds offered by bookmaker (e.g., 2.00 = +100)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {kellyResult && (
                      <div className="mt-6 p-4 bg-accent/20 rounded-lg">
                        <h4 className="font-semibold mb-3">Kelly Calculation Results</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Edge:</span>
                            <span className="font-medium">{kellyResult.edgePercent.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Kelly %:</span>
                            <span className="font-medium">{kellyResult.kellyPercent.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Full Kelly Bet:</span>
                            <span className="font-medium">
                              {formatCurrency(kellyResult.suggestedBetSize, bankroll.currency)} 
                              ({kellyResult.suggestedUnits.toFixed(2)} units)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Conservative ({(parseFloat(bankroll.kellyFraction) * 100).toFixed(0)}%):</span>
                            <span className="font-medium text-primary">
                              {formatCurrency(kellyResult.fractionalKellyBetSize, bankroll.currency)}
                              ({kellyResult.fractionalKellyUnits.toFixed(2)} units)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setKellyDialogOpen(false);
                          setKellyResult(null);
                        }}
                        data-testid="button-cancel-kelly"
                      >
                        Close
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={calculateKellyMutation.isPending}
                        data-testid="button-calculate-kelly"
                      >
                        {calculateKellyMutation.isPending ? "Calculating..." : "Calculate"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Risk Alerts */}
        {hasRiskAlerts && (
          <Alert className="mb-6 border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Risk Limits Exceeded</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                {dailyRisk?.limitExceeded && (
                  <div>Daily loss limit exceeded: {formatCurrency(dailyRisk.currentLoss, bankroll.currency)} / {formatCurrency(dailyRisk.limit, bankroll.currency)}</div>
                )}
                {weeklyRisk?.limitExceeded && (
                  <div>Weekly loss limit exceeded: {formatCurrency(weeklyRisk.currentLoss, bankroll.currency)} / {formatCurrency(weeklyRisk.limit, bankroll.currency)}</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
            <TabsTrigger value="goals" data-testid="tab-goals">Goals</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-current-balance">
                    {analytics ? formatCurrency(analytics.currentBalance, bankroll.currency) : '...'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Started with {formatCurrency(parseFloat(bankroll.startingBalance), bankroll.currency)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net P&L</CardTitle>
                  {analytics && analytics.netProfit >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${analytics && analytics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-net-pnl">
                    {analytics ? formatCurrency(analytics.netProfit, bankroll.currency) : '...'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics ? formatPercent(analytics.netProfitPercent) : '...'} return
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unit Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-unit-value">
                    {bankroll.unitMode === 'fixed' 
                      ? formatCurrency(parseFloat(bankroll.unitValue), bankroll.currency)
                      : `${(parseFloat(bankroll.unitValue) * 100).toFixed(2)}%`
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {bankroll.unitMode === 'fixed' ? 'Fixed amount' : 'Percentage based'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-win-rate">
                    {analytics ? `${analytics.winRate.toFixed(1)}%` : '...'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics ? `${analytics.winningBets}W / ${analytics.losingBets}L` : '...'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Balance Chart */}
            {analytics && analytics.balanceHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Balance Over Time</CardTitle>
                  <CardDescription>Track your bankroll performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.balanceHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date"
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(value, bankroll.currency)}
                        />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value: number) => [formatCurrency(value, bankroll.currency), 'Balance']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="balance" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Limits</CardTitle>
                  <CardDescription>Your current risk management status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dailyRisk && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Daily Loss Limit</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(dailyRisk.currentLoss, bankroll.currency)} / {formatCurrency(dailyRisk.limit, bankroll.currency)}
                        </p>
                      </div>
                      <Badge variant={dailyRisk.limitExceeded ? "destructive" : "secondary"}>
                        {dailyRisk.limitExceeded ? "Exceeded" : "OK"}
                      </Badge>
                    </div>
                  )}
                  
                  {weeklyRisk && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Weekly Loss Limit</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(weeklyRisk.currentLoss, bankroll.currency)} / {formatCurrency(weeklyRisk.limit, bankroll.currency)}
                        </p>
                      </div>
                      <Badge variant={weeklyRisk.limitExceeded ? "destructive" : "secondary"}>
                        {weeklyRisk.limitExceeded ? "Exceeded" : "OK"}
                      </Badge>
                    </div>
                  )}
                  
                  {maxBetData && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Max Bet Size</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(maxBetData.amount, bankroll.currency)} ({maxBetData.units.toFixed(2)} units)
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {bankroll.maxBetPct ? `${(parseFloat(bankroll.maxBetPct) * 100).toFixed(1)}%` : '5.0%'}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Drawdown Analysis</CardTitle>
                  <CardDescription>Track your risk exposure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics && (
                    <>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Current Drawdown</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(analytics.currentDrawdown, bankroll.currency)}
                          </p>
                        </div>
                        <Badge variant={analytics.currentDrawdownPercent > 10 ? "destructive" : "secondary"}>
                          {formatPercent(analytics.currentDrawdownPercent)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Max Drawdown</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(analytics.maxDrawdown, bankroll.currency)}
                          </p>
                        </div>
                        <Badge variant={analytics.maxDrawdownPercent > 20 ? "destructive" : analytics.maxDrawdownPercent > 10 ? "secondary" : "default"}>
                          {formatPercent(analytics.maxDrawdownPercent)}
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {analytics && (
              <>
                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Bets</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.totalBets}</div>
                      <p className="text-xs text-muted-foreground">
                        {analytics.winningBets}W / {analytics.losingBets}L
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avg Bet Size</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(analytics.avgBetSize, bankroll.currency)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {analytics.avgBetSizeUnits.toFixed(2)} units avg
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avg Win</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(analytics.avgWinAmount, bankroll.currency)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Per winning bet
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avg Loss</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(analytics.avgLossAmount, bankroll.currency)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Per losing bet
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Profit by Type Chart */}
                {analytics.profitByType.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Profit by Bet Type</CardTitle>
                      <CardDescription>Performance breakdown by category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              dataKey="profit"
                              data={analytics.profitByType}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="hsl(var(--primary))"
                              label={({ type, profit }) => `${type}: ${formatCurrency(profit, bankroll.currency)}`}
                            >
                              {analytics.profitByType.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={`hsl(${(index * 45) % 360}, 70%, 50%)`} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [formatCurrency(value, bankroll.currency), 'Profit']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>All deposits, withdrawals, and betting activity</CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Transactions</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by adding your first deposit or recording a betting transaction.
                    </p>
                    <Button onClick={() => setTransactionDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Transaction
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div 
                        key={transaction.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                        data-testid={`transaction-${transaction.id}`}
                      >
                        <div className="flex items-center space-x-3">
                          {getTransactionIcon(transaction.type)}
                          <div>
                            <p className="font-medium capitalize">{transaction.type.replace('_', ' ')}</p>
                            <p className="text-sm text-muted-foreground">{transaction.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                            {transaction.type.includes('withdrawal') || transaction.type.includes('loss') ? '-' : '+'}
                            {formatCurrency(parseFloat(transaction.amount), bankroll.currency)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Bankroll Goals</h2>
                <p className="text-muted-foreground">Set and track your betting objectives</p>
              </div>
              <Button onClick={openNewGoal} data-testid="button-add-goal">
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </div>

            {goalsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="h-40 bg-muted rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : goals.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Goals Set</h3>
                  <p className="text-muted-foreground mb-6">
                    Set specific targets to track your progress and stay motivated.
                  </p>
                  <Button onClick={openNewGoal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Goal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {goals.map((goal) => {
                  const currentBalance = analytics?.currentBalance || 0;
                  const targetAmount = goal.targetAmount ? parseFloat(goal.targetAmount) : null;
                  const targetProfit = goal.targetProfit ? parseFloat(goal.targetProfit) : null;
                  
                  let progress = 0;
                  let progressText = '';
                  
                  if (targetAmount) {
                    progress = (currentBalance / targetAmount) * 100;
                    progressText = `${formatCurrency(currentBalance, bankroll.currency)} / ${formatCurrency(targetAmount, bankroll.currency)}`;
                  } else if (targetProfit) {
                    const currentProfit = analytics?.netProfit || 0;
                    progress = targetProfit > 0 ? (currentProfit / targetProfit) * 100 : 0;
                    progressText = `${formatCurrency(currentProfit, bankroll.currency)} / ${formatCurrency(targetProfit, bankroll.currency)}`;
                  }
                  
                  return (
                    <Card key={goal.id} data-testid={`goal-${goal.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <CardTitle className="text-lg">
                                {targetAmount ? 'Balance Target' : 'Profit Target'}
                              </CardTitle>
                              <Badge variant={goal.status === 'met' ? 'default' : goal.status === 'missed' ? 'destructive' : 'secondary'}>
                                {goal.status}
                              </Badge>
                            </div>
                            {goal.targetDate && (
                              <CardDescription>
                                Target Date: {new Date(goal.targetDate).toLocaleDateString()}
                              </CardDescription>
                            )}
                          </div>
                          
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openEditGoal(goal)}
                              data-testid={`button-edit-goal-${goal.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this goal?")) {
                                  deleteGoalMutation.mutate(goal.id);
                                }
                              }}
                              data-testid={`button-delete-goal-${goal.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Progress</span>
                            <span>{progress.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            {progressText}
                          </p>
                        </div>
                        
                        {goal.targetDate && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(goal.targetDate) > new Date() 
                                ? `${Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining`
                                : 'Target date passed'
                              }
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Goal Dialog */}
            <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{selectedGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
                  <DialogDescription>
                    Set a specific target for your bankroll performance
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...goalForm}>
                  <form onSubmit={goalForm.handleSubmit(onGoalSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={goalForm.control}
                        name="targetAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Balance ({bankroll.currency})</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="2000.00" 
                                {...field} 
                                data-testid="input-target-amount"
                              />
                            </FormControl>
                            <FormDescription>
                              Specific balance amount to reach
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={goalForm.control}
                        name="targetProfit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Profit ({bankroll.currency})</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="500.00" 
                                {...field} 
                                data-testid="input-target-profit"
                              />
                            </FormControl>
                            <FormDescription>
                              Profit amount to achieve
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={goalForm.control}
                      name="targetDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Date (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              data-testid="input-target-date"
                            />
                          </FormControl>
                          <FormDescription>
                            When you want to achieve this goal
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setGoalDialogOpen(false);
                          setSelectedGoal(null);
                        }}
                        data-testid="button-cancel-goal"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={goalMutation.isPending}
                        data-testid="button-submit-goal"
                      >
                        {goalMutation.isPending ? "Saving..." : selectedGoal ? "Update Goal" : "Create Goal"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}