import { supabase } from '../supabase';

export interface Bet {
  id: string;
  user_id: string;
  bankroll_id: string;
  sport: string;
  event: string;
  bet_type: string;
  odds: string;
  stake: number;
  stake_units: number;
  potential_payout: number;
  status: 'pending' | 'won' | 'lost';
  actual_payout?: number;
  screenshot_url?: string;
  extracted_data?: any;
  notes?: string;
  sheet_row_id?: string;
  created_at: string;
  settled_at?: string;
}

export const betsService = {
  // Get all bets for current user
  async getUserBets(): Promise<Bet[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create a new bet
  async createBet(betData: Omit<Bet, 'id' | 'user_id' | 'created_at'>): Promise<Bet> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bets')
      .insert({
        ...betData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a bet
  async updateBet(betId: string, updates: Partial<Bet>): Promise<Bet> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bets')
      .update(updates)
      .eq('id', betId)
      .eq('user_id', user.id) // Ensure user owns this bet
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a bet
  async deleteBet(betId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('bets')
      .delete()
      .eq('id', betId)
      .eq('user_id', user.id); // Ensure user owns this bet

    if (error) throw error;
  },

  // Get bet statistics
  async getUserStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: bets, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    const totalBets = bets?.length || 0;
    const wonBets = bets?.filter(b => b.status === 'won').length || 0;
    const lostBets = bets?.filter(b => b.status === 'lost').length || 0;
    const pendingBets = bets?.filter(b => b.status === 'pending').length || 0;
    
    const totalStake = bets?.reduce((sum, bet) => sum + parseFloat(bet.stake), 0) || 0;
    const totalPayout = bets?.reduce((sum, bet) => sum + (bet.actual_payout || 0), 0) || 0;
    const totalProfit = totalPayout - totalStake;
    
    const winRate = totalBets > 0 ? (wonBets / (wonBets + lostBets)) * 100 : 0;

    return {
      totalBets,
      wonBets,
      lostBets,
      pendingBets,
      winRate,
      totalProfit,
      totalStake,
      totalPayout,
    };
  },

  // Settle a bet (mark as won/lost)
  async settleBet(betId: string, won: boolean, actualPayout?: number): Promise<Bet> {
    return this.updateBet(betId, {
      status: won ? 'won' : 'lost',
      actual_payout: actualPayout || 0,
      settled_at: new Date().toISOString(),
    });
  },
};