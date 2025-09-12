import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBankrollSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, TrendingUp, TrendingDown, DollarSign, Target, Wallet, MoreVertical, Eye, Trash2, Power, PowerOff } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// Enhanced form schema with validation
const createBankrollFormSchema = insertBankrollSchema.extend({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  startingBalance: z.string().min(1, "Starting balance is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Starting balance must be a positive number"),
  unitValue: z.string().min(1, "Unit value is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Unit value must be a positive number"),
  maxBetPct: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 1;
  }, "Max bet percentage must be between 0 and 1"),
  dailyLossLimitPct: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 1;
  }, "Daily loss limit must be between 0 and 1"),
  weeklyLossLimitPct: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 1;
  }, "Weekly loss limit must be between 0 and 1"),
  kellyFraction: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 1;
  }, "Kelly fraction must be between 0 and 1"),
});

type CreateBankrollFormData = z.infer<typeof createBankrollFormSchema>;

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

interface BankrollBalance {
  balance: number;
}

export default function Bankrolls() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch bankrolls
  const { data: bankrolls = [], isLoading } = useQuery<Bankroll[]>({
    queryKey: ['/api/bankrolls'],
    enabled: !!user,
  });

  // Fetch balances for all bankrolls
  const bankrollsWithBalances = useQuery({
    queryKey: ['/api/bankrolls', 'balances'],
    queryFn: async () => {
      if (!bankrolls.length) return [];
      
      const balancePromises = bankrolls.map(async (bankroll) => {
        const response = await apiRequest(`/api/bankrolls/${bankroll.id}/balance`) as BankrollBalance;
        return { ...bankroll, currentBalance: response.balance };
      });
      
      return Promise.all(balancePromises);
    },
    enabled: !!user && bankrolls.length > 0,
  });

  // Create bankroll mutation
  const createBankrollMutation = useMutation({
    mutationFn: (data: CreateBankrollFormData) => {
      // Convert string inputs to numbers for server schema compatibility
      const submitData = {
        name: data.name,
        currency: data.currency,
        unitMode: data.unitMode,
        startingBalance: parseFloat(data.startingBalance),
        unitValue: parseFloat(data.unitValue),
        maxBetPct: data.maxBetPct ? parseFloat(data.maxBetPct) : 0.05,
        dailyLossLimitPct: data.dailyLossLimitPct ? parseFloat(data.dailyLossLimitPct) : null,
        weeklyLossLimitPct: data.weeklyLossLimitPct ? parseFloat(data.weeklyLossLimitPct) : null,
        kellyFraction: data.kellyFraction ? parseFloat(data.kellyFraction) : 0.25,
      };
      return apiRequest('/api/bankrolls', {
        method: 'POST',
        body: JSON.stringify(submitData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bankrolls'] });
      setCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Bankroll created successfully",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create bankroll",
        variant: "destructive",
      });
    },
  });

  // Activate bankroll mutation
  const activateBankrollMutation = useMutation({
    mutationFn: (bankrollId: string) => apiRequest(`/api/bankrolls/${bankrollId}/activate`, {
      method: 'POST',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bankrolls'] });
      toast({
        title: "Success",
        description: "Bankroll activated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to activate bankroll",
        variant: "destructive",
      });
    },
  });

  // Delete bankroll mutation
  const deleteBankrollMutation = useMutation({
    mutationFn: (bankrollId: string) => apiRequest(`/api/bankrolls/${bankrollId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bankrolls'] });
      toast({
        title: "Success",
        description: "Bankroll deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete bankroll",
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<CreateBankrollFormData>({
    resolver: zodResolver(createBankrollFormSchema),
    defaultValues: {
      name: "",
      currency: "USD",
      startingBalance: "",
      unitMode: "fixed",
      unitValue: "",
      maxBetPct: "0.05",
      dailyLossLimitPct: "",
      weeklyLossLimitPct: "",
      kellyFraction: "0.25",
    },
  });

  const onSubmit = (data: CreateBankrollFormData) => {
    createBankrollMutation.mutate(data);
  };

  // Calculate performance metrics
  const calculatePerformance = (bankroll: Bankroll & { currentBalance?: number }) => {
    if (!bankroll.currentBalance) return { profit: 0, profitPercent: 0 };
    
    const startingBalance = parseFloat(bankroll.startingBalance);
    const profit = bankroll.currentBalance - startingBalance;
    const profitPercent = startingBalance > 0 ? (profit / startingBalance) * 100 : 0;
    
    return { profit, profitPercent };
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const bankrollsData = bankrollsWithBalances.data || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="heading-bankrolls">
              Bankroll Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your betting bankrolls with advanced risk management and analytics
            </p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-bankroll">
                <Plus className="h-4 w-4 mr-2" />
                Create Bankroll
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Bankroll</DialogTitle>
                <DialogDescription>
                  Set up a new betting bankroll with risk management parameters
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bankroll Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Main Bankroll" 
                              {...field} 
                              data-testid="input-bankroll-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-currency">
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                              <SelectItem value="CAD">CAD (C$)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startingBalance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Starting Balance</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="1000.00" 
                              {...field} 
                              data-testid="input-starting-balance"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="unitMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Mode</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-unit-mode">
                                <SelectValue placeholder="Select unit mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                              <SelectItem value="percent">Percentage</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {form.watch("unitMode") === "fixed" 
                              ? "1 unit = fixed dollar amount" 
                              : "1 unit = percentage of current balance"
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="unitValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Unit Value {form.watch("unitMode") === "percent" && "(as decimal, e.g. 0.01 = 1%)"}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step={form.watch("unitMode") === "percent" ? "0.0001" : "0.01"} 
                            placeholder={form.watch("unitMode") === "percent" ? "0.01" : "10.00"} 
                            {...field} 
                            data-testid="input-unit-value"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maxBetPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Bet % (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.05" 
                              {...field} 
                              data-testid="input-max-bet-pct"
                            />
                          </FormControl>
                          <FormDescription>
                            Max percentage of bankroll per bet (default: 5%)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="kellyFraction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kelly Fraction (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.25" 
                              {...field} 
                              data-testid="input-kelly-fraction"
                            />
                          </FormControl>
                          <FormDescription>
                            Conservative Kelly multiplier (default: 25%)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dailyLossLimitPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Daily Loss Limit % (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.10" 
                              {...field} 
                              data-testid="input-daily-loss-limit"
                            />
                          </FormControl>
                          <FormDescription>
                            Max daily loss as % of bankroll (e.g. 0.10 = 10%)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="weeklyLossLimitPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weekly Loss Limit % (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.25" 
                              {...field} 
                              data-testid="input-weekly-loss-limit"
                            />
                          </FormControl>
                          <FormDescription>
                            Max weekly loss as % of bankroll (e.g. 0.25 = 25%)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCreateDialogOpen(false)}
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createBankrollMutation.isPending}
                      data-testid="button-submit-create"
                    >
                      {createBankrollMutation.isPending ? "Creating..." : "Create Bankroll"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Bankrolls Grid */}
        {bankrollsData.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Bankrolls Found</h3>
              <p className="text-muted-foreground mb-6">
                Create your first bankroll to start managing your betting finances with advanced risk management.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-bankroll">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Bankroll
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bankrollsData.map((bankroll) => {
              const performance = calculatePerformance(bankroll);
              const isPositive = performance.profit >= 0;
              
              return (
                <Card 
                  key={bankroll.id} 
                  className={`relative hover:shadow-lg transition-shadow ${
                    bankroll.isActive ? 'ring-2 ring-primary' : ''
                  }`}
                  data-testid={`card-bankroll-${bankroll.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-lg">{bankroll.name}</CardTitle>
                          {bankroll.isActive && (
                            <Badge variant="default" className="text-xs" data-testid={`badge-active-${bankroll.id}`}>
                              Active
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm">
                          {bankroll.currency} • {bankroll.unitMode === 'fixed' ? 'Fixed Units' : 'Percent Units'}
                        </CardDescription>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`button-menu-${bankroll.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/bankrolls/${bankroll.id}`} data-testid={`link-view-${bankroll.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {!bankroll.isActive && (
                            <DropdownMenuItem 
                              onClick={() => activateBankrollMutation.mutate(bankroll.id)}
                              data-testid={`button-activate-${bankroll.id}`}
                            >
                              <Power className="h-4 w-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this bankroll? This action cannot be undone.")) {
                                deleteBankrollMutation.mutate(bankroll.id);
                              }
                            }}
                            className="text-destructive"
                            data-testid={`button-delete-${bankroll.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Balance Information */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Current Balance</span>
                        <span className="font-semibold" data-testid={`text-balance-${bankroll.id}`}>
                          {formatCurrency(bankroll.currentBalance || 0, bankroll.currency)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Starting Balance</span>
                        <span className="text-sm" data-testid={`text-starting-balance-${bankroll.id}`}>
                          {formatCurrency(parseFloat(bankroll.startingBalance), bankroll.currency)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">P&L</span>
                        <div className="flex items-center space-x-1">
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span 
                            className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                            data-testid={`text-pnl-${bankroll.id}`}
                          >
                            {formatCurrency(performance.profit, bankroll.currency)} ({formatPercent(performance.profitPercent)})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Unit Information */}
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Unit Value</span>
                        <span className="text-sm" data-testid={`text-unit-value-${bankroll.id}`}>
                          {bankroll.unitMode === 'fixed' 
                            ? formatCurrency(parseFloat(bankroll.unitValue), bankroll.currency)
                            : `${(parseFloat(bankroll.unitValue) * 100).toFixed(2)}%`
                          }
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Max Bet</span>
                        <span className="text-sm" data-testid={`text-max-bet-${bankroll.id}`}>
                          {bankroll.maxBetPct ? `${(parseFloat(bankroll.maxBetPct) * 100).toFixed(1)}%` : '5.0%'}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      asChild 
                      className="w-full" 
                      variant={bankroll.isActive ? "default" : "outline"}
                      data-testid={`button-manage-${bankroll.id}`}
                    >
                      <Link href={`/bankrolls/${bankroll.id}`}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Manage Bankroll
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}