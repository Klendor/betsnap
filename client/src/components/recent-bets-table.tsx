import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowRight, Edit, Copy, Trash2, ChevronDown, ChevronRight, History, MoreHorizontal, CheckSquare, Square, Wallet } from "lucide-react";
import type { Bet, BetHistory } from "@shared/schema";

interface Bankroll {
  id: string;
  name: string;
  currency: string;
  unitMode: string;
  unitValue: string;
  isActive: number;
}

interface BulkAction {
  action: string;
  data?: any;
}

export default function RecentBetsTable() {
  const [selectedBets, setSelectedBets] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingBet, setEditingBet] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Bet>>({});
  const [showBulkToolbar, setShowBulkToolbar] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bets, isLoading, error } = useQuery<Bet[]>({
    queryKey: ['/api/bets'],
  });

  // Fetch user's bankrolls for editing
  const { data: bankrolls = [] } = useQuery<Bankroll[]>({
    queryKey: ['/api/bankrolls'],
  });

  // Helper function to get bankroll info
  const getBankrollInfo = (bankrollId: string) => {
    return bankrolls.find(b => b.id === bankrollId);
  };

  // Helper function to format currency
  const formatCurrency = (amount: number | string, currency: string = "USD") => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(numAmount);
  };

  // Update bet mutation
  const updateBetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Bet> }) => {
      return apiRequest(`/api/bets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bets'] });
      setEditingBet(null);
      setEditFormData({});
      toast({
        title: "Bet updated",
        description: "The bet has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update bet",
        variant: "destructive",
      });
    },
  });

  // Delete bet mutation
  const deleteBetMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/bets/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bets'] });
      toast({
        title: "Bet deleted",
        description: "The bet has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete bet",
        variant: "destructive",
      });
    },
  });

  // Duplicate bet mutation
  const duplicateBetMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/bets/${id}/duplicate`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bets'] });
      toast({
        title: "Bet duplicated",
        description: "The bet has been successfully duplicated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Duplicate failed",
        description: error.message || "Failed to duplicate bet",
        variant: "destructive",
      });
    },
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ betIds, action, data }: { betIds: string[]; action: string; data?: any }) => {
      return apiRequest('/api/bets/bulk', {
        method: 'POST',
        body: JSON.stringify({ betIds, action, data }),
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bets'] });
      setSelectedBets(new Set());
      setShowBulkToolbar(false);
      toast({
        title: "Bulk operation completed",
        description: `Successfully processed ${result.success} bets, ${result.failed} failed.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk operation failed",
        description: error.message || "Failed to perform bulk operation",
        variant: "destructive",
      });
    },
  });

  // Notes update mutation
  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return apiRequest(`/api/bets/${id}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bets'] });
      toast({
        title: "Notes updated",
        description: "The bet notes have been successfully updated.",
      });
    },
  });

  // Bet history query
  const { data: betHistory } = useQuery<BetHistory[]>({
    queryKey: editingBet ? [`/api/bets/${editingBet}/history`] : ['bet-history-disabled'],
    enabled: !!editingBet,
  });

  const handleSelectAll = () => {
    if (selectedBets.size === recentBets.length) {
      setSelectedBets(new Set());
    } else {
      setSelectedBets(new Set(recentBets.map(bet => bet.id)));
    }
  };

  const handleSelectBet = (betId: string) => {
    const newSelected = new Set(selectedBets);
    if (newSelected.has(betId)) {
      newSelected.delete(betId);
    } else {
      newSelected.add(betId);
    }
    setSelectedBets(newSelected);
    setShowBulkToolbar(newSelected.size > 0);
  };

  const toggleRowExpansion = (betId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(betId)) {
      newExpanded.delete(betId);
    } else {
      newExpanded.add(betId);
    }
    setExpandedRows(newExpanded);
  };

  const startEditing = (bet: Bet) => {
    setEditingBet(bet.id);
    setEditFormData(bet);
  };

  const cancelEditing = () => {
    setEditingBet(null);
    setEditFormData({});
  };

  const saveEdit = () => {
    if (editingBet && editFormData) {
      // Validate that actualPayout is provided when status is 'won'
      if (editFormData.status === 'won') {
        if (!editFormData.actualPayout) {
          toast({
            title: "Validation Error",
            description: "Actual payout is required when marking a bet as won",
            variant: "destructive",
          });
          return;
        }
        const payout = parseFloat(editFormData.actualPayout);
        if (isNaN(payout) || payout <= 0) {
          toast({
            title: "Validation Error", 
            description: "Actual payout must be a positive number",
            variant: "destructive",
          });
          return;
        }
      }
      updateBetMutation.mutate({ id: editingBet, data: editFormData });
    }
  };

  const handleBulkAction = (action: string, data?: any) => {
    if (selectedBets.size > 0) {
      bulkOperationMutation.mutate({
        betIds: Array.from(selectedBets),
        action,
        data,
      });
    }
  };

  const formatProfit = (bet: Bet) => {
    if (bet.status === 'pending') return { value: '--', color: 'text-muted-foreground' };
    
    if (bet.status === 'won' && bet.actualPayout) {
      const profit = parseFloat(bet.actualPayout) - parseFloat(bet.stake);
      return {
        value: `+$${profit.toFixed(2)}`,
        color: 'text-green-600 dark:text-green-400'
      };
    } else {
      return {
        value: `-$${parseFloat(bet.stake).toFixed(2)}`,
        color: 'text-red-600 dark:text-red-400'
      };
    }
  };

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'won':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300'
        };
      case 'lost':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300'
        };
      default:
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300'
        };
    }
  };

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

  if (error) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Bets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12" data-testid="error-state">
            <p className="text-destructive">Failed to load bets. Please try again.</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/bets'] })}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentBets = bets?.slice(0, 10) || [];

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

      {/* Bulk Operations Toolbar */}
      {showBulkToolbar && (
        <div className="p-4 bg-muted/50 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedBets.size} bet{selectedBets.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Select onValueChange={(value) => {
                if (value === 'won') {
                  handleBulkAction('markStatus', { status: 'won', actualPayout: '0' });
                } else if (value === 'lost') {
                  handleBulkAction('markStatus', { status: 'lost' });
                }
              }} data-testid="select-bulk-status">
                <SelectTrigger className="w-auto">
                  <SelectValue placeholder="Mark as..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="won">Mark as Won</SelectItem>
                  <SelectItem value="lost">Mark as Lost</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('duplicate')}
                disabled={bulkOperationMutation.isPending}
                data-testid="button-bulk-duplicate"
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                disabled={bulkOperationMutation.isPending}
                className="text-destructive hover:text-destructive"
                data-testid="button-bulk-delete"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedBets(new Set());
                  setShowBulkToolbar(false);
                }}
                data-testid="button-bulk-cancel"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <CardContent className="p-0">
        {recentBets.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-state">
            <p className="text-muted-foreground">No bets found. Upload a screenshot to get started!</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="w-8 py-3 px-4">
                      <Checkbox
                        checked={selectedBets.size === recentBets.length}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Event</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Odds</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Stake</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Bankroll</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">P&L</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentBets.map((bet) => (
                    <React.Fragment key={bet.id}>
                      <tr className="hover:bg-muted/20 transition-colors group" data-testid={`bet-row-${bet.id}`}>
                        <td className="py-4 px-4">
                          <Checkbox
                            checked={selectedBets.has(bet.id)}
                            onCheckedChange={() => handleSelectBet(bet.id)}
                            data-testid={`checkbox-select-${bet.id}`}
                          />
                        </td>
                        <td className="py-4 px-6 text-sm text-foreground">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => toggleRowExpansion(bet.id)}
                              data-testid={`button-expand-${bet.id}`}
                            >
                              {expandedRows.has(bet.id) ? 
                                <ChevronDown className="w-4 h-4" /> : 
                                <ChevronRight className="w-4 h-4" />
                              }
                            </Button>
                            {new Date(bet.createdAt!).toLocaleDateString(undefined, { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {editingBet === bet.id ? (
                            <Input
                              value={editFormData.event || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, event: e.target.value }))}
                              className="min-w-[200px]"
                            />
                          ) : (
                            <div>
                              <p className="text-sm font-medium text-foreground">{bet.event}</p>
                              <p className="text-xs text-muted-foreground">{bet.sport}</p>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-foreground">
                          {editingBet === bet.id ? (
                            <Input
                              value={editFormData.betType || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, betType: e.target.value }))}
                            />
                          ) : (
                            bet.betType
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-foreground">
                          {editingBet === bet.id ? (
                            <Input
                              value={editFormData.odds || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, odds: e.target.value }))}
                            />
                          ) : (
                            bet.odds
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-foreground">
                          {editingBet === bet.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editFormData.stake || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, stake: e.target.value }))}
                            />
                          ) : (
                            `$${bet.stake}`
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {editingBet === bet.id ? (
                            <div className="space-y-2">
                              <Select
                                value={editFormData.status || ''}
                                onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value as any }))}
                                data-testid="select-status"
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="won">Won</SelectItem>
                                  <SelectItem value="lost">Lost</SelectItem>
                                </SelectContent>
                              </Select>
                              {editFormData.status === 'won' && (
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Actual payout ($)"
                                  value={editFormData.actualPayout || ''}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, actualPayout: e.target.value }))}
                                  data-testid="input-actual-payout"
                                  className="mt-1"
                                />
                              )}
                            </div>
                          ) : (
                            <Badge 
                              {...getStatusBadgeProps(bet.status)}
                              data-testid={`status-${bet.status}`}
                            >
                              {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm font-medium" data-testid={`profit-${bet.id}`}>
                          {(() => {
                            const profit = formatProfit(bet);
                            return <span className={profit.color}>{profit.value}</span>;
                          })()}
                        </td>
                        <td className="py-4 px-6">
                          {editingBet === bet.id ? (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={saveEdit}
                                disabled={updateBetMutation.isPending}
                                data-testid="button-save-edit"
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelEditing}
                                data-testid="button-cancel-edit"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditing(bet)}
                                data-testid={`button-edit-${bet.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => duplicateBetMutation.mutate(bet.id)}
                                disabled={duplicateBetMutation.isPending}
                                data-testid={`button-duplicate-${bet.id}`}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteBetMutation.mutate(bet.id)}
                                disabled={deleteBetMutation.isPending}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-${bet.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {/* Expanded Row */}
                      {expandedRows.has(bet.id) && (
                        <tr>
                          <td colSpan={9} className="px-6 py-4 bg-muted/20">
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor={`notes-${bet.id}`}>Notes</Label>
                                <Textarea
                                  id={`notes-${bet.id}`}
                                  placeholder="Add notes about this bet..."
                                  defaultValue={bet.notes || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== bet.notes) {
                                      updateNotesMutation.mutate({
                                        id: bet.id,
                                        notes: e.target.value,
                                      });
                                    }
                                  }}
                                  data-testid={`textarea-notes-${bet.id}`}
                                />
                              </div>
                              {betHistory && betHistory.length > 0 && (
                                <div>
                                  <Label>History</Label>
                                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                                    {betHistory.map((entry) => (
                                      <div key={entry.id} className="flex items-center gap-2 text-sm">
                                        <History className="w-3 h-3" />
                                        <span className="font-medium">{entry.action}</span>
                                        <span className="text-muted-foreground">
                                          {new Date(entry.createdAt!).toLocaleString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4">
              {recentBets.map((bet) => (
                <Card key={bet.id} className="relative" data-testid={`bet-card-${bet.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedBets.has(bet.id)}
                          onCheckedChange={() => handleSelectBet(bet.id)}
                          data-testid={`checkbox-mobile-${bet.id}`}
                        />
                        <div>
                          <p className="font-medium text-sm">{bet.event}</p>
                          <p className="text-xs text-muted-foreground">{bet.sport} • {bet.betType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(bet.id)}
                          data-testid={`button-expand-mobile-${bet.id}`}
                        >
                          {expandedRows.has(bet.id) ? 
                            <ChevronDown className="w-4 h-4" /> : 
                            <ChevronRight className="w-4 h-4" />
                          }
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(bet)}
                          data-testid={`button-edit-mobile-${bet.id}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Odds</p>
                        <p className="font-medium">{bet.odds}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stake</p>
                        <p className="font-medium">${bet.stake}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge {...getStatusBadgeProps(bet.status)} className="text-xs">
                          {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">P&L</p>
                        {(() => {
                          const profit = formatProfit(bet);
                          return <p className={`font-medium ${profit.color}`}>{profit.value}</p>;
                        })()}
                      </div>
                    </div>

                    {expandedRows.has(bet.id) && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div>
                          <Label htmlFor={`notes-mobile-${bet.id}`}>Notes</Label>
                          <Textarea
                            id={`notes-mobile-${bet.id}`}
                            placeholder="Add notes about this bet..."
                            defaultValue={bet.notes || ''}
                            onBlur={(e) => {
                              if (e.target.value !== bet.notes) {
                                updateNotesMutation.mutate({
                                  id: bet.id,
                                  notes: e.target.value,
                                });
                              }
                            }}
                            data-testid={`textarea-notes-mobile-${bet.id}`}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateBetMutation.mutate(bet.id)}
                            disabled={duplicateBetMutation.isPending}
                            data-testid={`button-duplicate-mobile-${bet.id}`}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteBetMutation.mutate(bet.id)}
                            disabled={deleteBetMutation.isPending}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-mobile-${bet.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}