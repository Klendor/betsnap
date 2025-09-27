import { supabase } from '../supabase';

export interface Bankroll {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  starting_balance: number;
  unit_mode: 'fixed' | 'percent';
  unit_value: number;
  max_bet_pct?: number;
  daily_loss_limit_pct?: number;
  weekly_loss_limit_pct?: number;
  kelly_fraction?: number;
  is_active: boolean;
  created_at: string;
}

export interface BankrollTransaction {
  id: string;
  bankroll_id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'adjustment' | 'profit' | 'loss' | 'transfer_in' | 'transfer_out';
  amount: number;
  reason?: string;
  ref_bet_id?: string;
  created_at: string;
}

export const bankrollsService = {
  // Get all bankrolls for current user
  async getUserBankrolls(): Promise<Bankroll[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bankrolls')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get a single bankroll
  async getBankroll(bankrollId: string): Promise<Bankroll> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bankrolls')
      .select('*')
      .eq('id', bankrollId)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create a new bankroll
  async createBankroll(bankrollData: Omit<Bankroll, 'id' | 'user_id' | 'created_at'>): Promise<Bankroll> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bankrolls')
      .insert({
        ...bankrollData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a bankroll
  async updateBankroll(bankrollId: string, updates: Partial<Bankroll>): Promise<Bankroll> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bankrolls')
      .update(updates)
      .eq('id', bankrollId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a bankroll
  async deleteBankroll(bankrollId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('bankrolls')
      .delete()
      .eq('id', bankrollId)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  // Get bankroll transactions
  async getBankrollTransactions(bankrollId: string): Promise<BankrollTransaction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bankroll_transactions')
      .select('*')
      .eq('bankroll_id', bankrollId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add a transaction
  async addTransaction(transaction: Omit<BankrollTransaction, 'id' | 'user_id' | 'created_at'>): Promise<BankrollTransaction> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bankroll_transactions')
      .insert({
        ...transaction,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Calculate current balance
  async getCurrentBalance(bankrollId: string): Promise<number> {
    const bankroll = await this.getBankroll(bankrollId);
    const transactions = await this.getBankrollTransactions(bankrollId);

    let balance = parseFloat(bankroll.starting_balance.toString());

    for (const tx of transactions) {
      switch (tx.type) {
        case 'deposit':
        case 'profit':
        case 'transfer_in':
          balance += parseFloat(tx.amount.toString());
          break;
        case 'withdrawal':
        case 'loss':
        case 'transfer_out':
          balance -= parseFloat(tx.amount.toString());
          break;
        case 'adjustment':
          balance += parseFloat(tx.amount.toString()); // Can be positive or negative
          break;
      }
    }

    return balance;
  },
};