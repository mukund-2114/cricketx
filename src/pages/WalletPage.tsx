import { useState, useEffect } from 'react';
import { ArrowUpRight, Wallet, RefreshCw, MessageCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { User, Currency } from '@/types';
import { formatPoints, pointsToCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WalletPageProps {
  user: User;
  onBalanceUpdate: (b: number) => void;
}

interface DbTransaction {
  id: string;
  type: string;
  points: number;
  currency: string | null;
  currency_amount: number | null;
  description: string;
  created_at: string;
  balance_after: number;
}

interface DbWithdrawal {
  id: string;
  points: number;
  currency: string;
  currency_amount: number;
  status: string;
  requested_at: string;
  bank_details: string;
}

const MIN_WITHDRAWAL_POINTS = 500;

export default function WalletPage({ user, onBalanceUpdate }: WalletPageProps) {
  const [tab, setTab] = useState<'overview' | 'withdraw' | 'history'>('overview');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawCurrency, setWithdrawCurrency] = useState<Currency>(user.currency);
  const [bankDetails, setBankDetails] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<DbWithdrawal[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [txResult, wrResult] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('withdrawals').select('*').eq('user_id', user.id).order('requested_at', { ascending: false }),
      ]);
      if (txResult.data) setTransactions(txResult.data);
      if (wrResult.data) setWithdrawals(wrResult.data);
    };
    fetchData();

    // Realtime balance updates
    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
        const newBal = Number((payload.new as Record<string, unknown>).points_balance ?? user.pointsBalance);
        onBalanceUpdate(newBal);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, (payload) => {
        setTransactions(prev => [payload.new as DbTransaction, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user.id, user.pointsBalance, onBalanceUpdate]);

  const withdrawPoints = withdrawAmount ? Math.floor(Number(withdrawAmount)) : 0;

  const handleWithdraw = async () => {
    if (!withdrawAmount || withdrawPoints <= 0) { toast.error('Enter valid points'); return; }
    if (withdrawPoints < MIN_WITHDRAWAL_POINTS) { toast.error(`Minimum withdrawal is ${MIN_WITHDRAWAL_POINTS} points`); return; }
    if (withdrawPoints > user.pointsBalance) { toast.error('Insufficient balance'); return; }
    if (!bankDetails.trim()) { toast.error('Enter bank/payment details'); return; }
    setIsProcessing(true);

    const rateMap: Record<Currency, number> = { CAD: 0.01, USD: 0.01, INR: 0.8 };
    const currencyAmount = +(withdrawPoints * rateMap[withdrawCurrency]).toFixed(2);
    const newBalance = user.pointsBalance - withdrawPoints;

    const { data: wr, error: wrErr } = await supabase.from('withdrawals').insert({
      user_id: user.id,
      user_name: user.name,
      points: withdrawPoints,
      currency: withdrawCurrency,
      currency_amount: currencyAmount,
      bank_details: bankDetails,
      status: 'pending',
    }).select().single();

    if (wrErr) { toast.error('Failed to submit withdrawal request'); setIsProcessing(false); return; }

    await supabase.from('profiles').update({ points_balance: newBalance }).eq('id', user.id);

    const { data: tx } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      points: -withdrawPoints,
      description: `Withdrawal request — ${formatPoints(withdrawPoints)} (pending admin approval)`,
      balance_after: newBalance,
    }).select().single();

    if (wr) setWithdrawals(prev => [wr, ...prev]);
    if (tx) setTransactions(prev => [tx, ...prev]);
    onBalanceUpdate(newBalance);
    setWithdrawAmount('');
    setBankDetails('');
    setIsProcessing(false);
    toast.success('Withdrawal request submitted. Admin will process within 24h.');
    setTab('overview');
  };

  const txIcon: Record<string, string> = {
    deposit: '💳', withdrawal: '🏦', bet_placed: '🎯', bet_won: '🏆', bet_lost: '❌', bonus: '🎁', admin_adjustment: '⚙️',
  };

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

  return (
    <div className="min-h-screen px-4 md:px-6 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-white mb-6" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        My Wallet
      </h1>

      {/* Balance card */}
      <div className="card-glass rounded-2xl p-6 mb-6 bg-gradient-to-br from-[hsl(222,40%,12%)] to-[hsl(222,40%,8%)]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Available Balance</p>
            <div className="text-4xl font-extrabold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {formatPoints(user.pointsBalance)}
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              ≈ {pointsToCurrency(user.pointsBalance, user.currency)}
            </p>
          </div>
          <Wallet size={32} className="text-[hsl(var(--brand-gold))] opacity-60" />
        </div>

        <div className="grid grid-cols-3 gap-3 text-center mt-2">
          {(['CAD', 'USD', 'INR'] as Currency[]).map((c) => {
            const sym = { CAD: 'CA$', USD: 'US$', INR: '₹' }[c];
            return (
              <div key={c} className={cn('rounded-lg px-2 py-2', user.currency === c ? 'bg-[hsl(43,50%,15%)] border border-[hsl(43,60%,30%)]' : 'bg-[hsl(222,35%,12%)]')}>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{sym}</div>
                <div className="text-sm font-bold text-white">{pointsToCurrency(user.pointsBalance, c)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Points notice */}
      <div className="card-glass rounded-xl p-4 mb-4 border border-[hsl(43,40%,25%)] bg-[hsl(43,30%,7%)]">
        <div className="flex items-start gap-3">
          <MessageCircle size={20} className="text-[hsl(var(--brand-gold))] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-[hsl(var(--brand-gold))] mb-1">Want to add points?</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Contact your admin to credit points to your account. Points are added manually after verification of your payment.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[hsl(222,35%,12%)] p-1 rounded-lg mb-4">
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'withdraw', label: 'Withdraw' },
          { id: 'history', label: 'History' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 py-2 text-xs font-semibold rounded-md transition-all',
              tab === t.id ? 'gold-gradient text-[hsl(var(--brand-navy))]' : 'text-[hsl(var(--muted-foreground))] hover:text-white'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-3">
          {pendingWithdrawals.length > 0 && (
            <div className="card-glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw size={14} className="text-[hsl(var(--brand-gold))] animate-spin" />
                <span className="text-sm font-semibold text-white">Pending Withdrawals</span>
              </div>
              {pendingWithdrawals.map(w => (
                <div key={w.id} className="flex justify-between text-xs text-[hsl(var(--muted-foreground))] py-1">
                  <span>{formatPoints(w.points)} → {w.currency}</span>
                  <span className="text-[hsl(43,96%,60%)]">Processing...</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="card-glass rounded-xl p-4">
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1 flex items-center gap-1">
                <Clock size={11} /> Pending Requests
              </div>
              <div className="text-xl font-bold text-[hsl(var(--brand-gold))]">{pendingWithdrawals.length}</div>
            </div>
            <div className="card-glass rounded-xl p-4">
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1 flex items-center gap-1">
                <CheckCircle size={11} /> Approved
              </div>
              <div className="text-xl font-bold text-[hsl(142,76%,55%)]">{withdrawals.filter(w => w.status === 'approved').length}</div>
            </div>
          </div>

          <button onClick={() => setTab('withdraw')}
            className="w-full border border-[hsl(var(--brand-gold))] text-[hsl(var(--brand-gold))] font-bold py-3 rounded-lg hover:bg-[hsl(43,50%,8%)] transition-colors flex items-center justify-center gap-2">
            <ArrowUpRight size={16} /> Request Withdrawal
          </button>
        </div>
      )}

      {/* Withdraw */}
      {tab === 'withdraw' && (
        <div className="card-glass rounded-xl p-5 space-y-4">
          <div className="bg-[hsl(43,40%,10%)] border border-[hsl(43,40%,20%)] rounded-lg px-3 py-2 text-xs text-[hsl(43,80%,65%)]">
            ⏱ Withdrawals processed within 24 hours by admin. Minimum {MIN_WITHDRAWAL_POINTS} points.
          </div>

          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Points to Withdraw</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              placeholder={`Min ${MIN_WITHDRAWAL_POINTS} points`}
              min={MIN_WITHDRAWAL_POINTS}
              max={user.pointsBalance}
              className="w-full bg-[hsl(222,35%,14%)] border border-[hsl(222,30%,22%)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--brand-gold))]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Receive in</label>
            <select
              value={withdrawCurrency}
              onChange={e => setWithdrawCurrency(e.target.value as Currency)}
              className="w-full bg-[hsl(222,35%,14%)] border border-[hsl(222,30%,22%)] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[hsl(var(--brand-gold))]"
            >
              <option value="CAD">🇨🇦 Canadian Dollar (CAD)</option>
              <option value="USD">🇺🇸 US Dollar (USD)</option>
              <option value="INR">🇮🇳 Indian Rupee (INR)</option>
            </select>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2">
            {[500, 1000, 5000, 10000].map(amt => (
              <button key={amt}
                onClick={() => setWithdrawAmount(String(Math.min(amt, user.pointsBalance)))}
                className="flex-1 py-2 text-xs rounded-lg bg-[hsl(222,35%,14%)] border border-[hsl(222,30%,22%)] text-[hsl(var(--muted-foreground))] hover:text-white hover:border-[hsl(var(--brand-gold))] transition-all">
                {amt >= 1000 ? `${amt / 1000}K` : amt}
              </button>
            ))}
          </div>

          {withdrawPoints > 0 && (
            <div className="bg-[hsl(222,35%,12%)] rounded-lg px-4 py-3 flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Approximate value:</span>
              <span className="font-bold text-white">
                {pointsToCurrency(withdrawPoints, withdrawCurrency)}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Bank / Payment Details</label>
            <textarea
              value={bankDetails}
              onChange={e => setBankDetails(e.target.value)}
              placeholder="Bank name, account number, routing number or UPI ID..."
              rows={3}
              className="w-full bg-[hsl(222,35%,14%)] border border-[hsl(222,30%,22%)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--brand-gold))] resize-none"
            />
          </div>

          <button
            onClick={handleWithdraw}
            disabled={isProcessing || withdrawPoints <= 0 || !bankDetails.trim()}
            className="w-full border border-[hsl(var(--brand-gold))] text-[hsl(var(--brand-gold))] font-bold py-3 rounded-lg hover:bg-[hsl(43,50%,8%)] transition-colors disabled:opacity-60"
          >
            {isProcessing ? 'Submitting...' : 'Request Withdrawal'}
          </button>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
              <div className="text-3xl mb-2">📜</div>
              <p>No transactions yet</p>
            </div>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className="card-glass rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="text-xl flex-shrink-0">{txIcon[tx.type] || '💰'}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{tx.description}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(tx.created_at).toLocaleString()}</div>
                </div>
                <div className={cn('text-sm font-bold text-right flex-shrink-0', tx.points >= 0 ? 'text-[hsl(142,76%,55%)]' : 'text-[hsl(var(--destructive))]')}>
                  {tx.points >= 0 ? '+' : ''}{formatPoints(tx.points)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
