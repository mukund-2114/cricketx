import { useState, useEffect, useRef } from 'react';
import { Users, TrendingUp, DollarSign, Activity, CheckCircle, XCircle, Ban, Search, Plus, Minus, RefreshCw, Coins } from 'lucide-react';
import type { User } from '@/types';
import { supabase } from '@/lib/supabase';
import { mapProfileToUser } from '@/lib/supabase';
import { formatPoints, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdminPageProps {
  adminUser: User;
}

interface DbBet {
  id: string;
  match_name: string;
  runner_name: string;
  bet_type: string;
  matched_odds: number | null;
  stake: number;
  status: string;
  user_id: string;
}

interface DbWithdrawal {
  id: string;
  user_name: string;
  points: number;
  currency: string;
  status: string;
  requested_at: string;
  bank_details: string;
}

export default function AdminPage({ adminUser }: AdminPageProps) {
  const [tab, setTab] = useState<'dashboard' | 'users' | 'bets' | 'withdrawals'>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [bets, setBets] = useState<DbBet[]>([]);
  const [withdrawals, setWithdrawals] = useState<DbWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  // User search + points
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [customPoints, setCustomPoints] = useState('');
  const [pointsNote, setPointsNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Cricket sync
  const [syncing, setSyncing] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [usersRes, betsRes, withdrawalsRes] = await Promise.all([
      supabase.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false }),
      supabase.from('bets').select('*').order('placed_at', { ascending: false }).limit(100),
      supabase.from('withdrawals').select('*').order('requested_at', { ascending: false }),
    ]);

    if (usersRes.data) setUsers(usersRes.data.map(mapProfileToUser));
    if (betsRes.data) setBets(betsRes.data);
    if (withdrawalsRes.data) setWithdrawals(withdrawalsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const totalDeposited = users.reduce((s, u) => s + u.totalDeposited, 0);
  const openBets = bets.filter(b => b.status === 'matched' || b.status === 'open').length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const platformPnl = bets.filter(b => b.status === 'settled').reduce((s, b) => s + b.stake * 0.02, 0);

  const stats = [
    { label: 'Total Users', value: users.length, icon: <Users size={20} />, color: 'text-[hsl(213,90%,65%)]' },
    { label: 'Open Bets', value: openBets, icon: <Activity size={20} />, color: 'text-[hsl(var(--brand-gold))]' },
    { label: 'Total Deposited', value: formatPoints(totalDeposited), icon: <DollarSign size={20} />, color: 'text-[hsl(142,76%,55%)]' },
    { label: 'Platform P&L (2%)', value: formatPoints(Math.max(0, platformPnl)), icon: <TrendingUp size={20} />, color: 'text-[hsl(var(--brand-gold))]' },
  ];

  const handleBanUser = async (userId: string, makeActive: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_active: makeActive }).eq('id', userId);
    if (error) { toast.error('Failed to update user'); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: makeActive } : u));
    toast.success(makeActive ? 'User activated' : 'User suspended');
  };

  const handleBalanceAdjust = async (userId: string, amount: number, note?: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const newBalance = Math.max(0, target.pointsBalance + amount);

    const { error } = await supabase.from('profiles').update({ points_balance: newBalance }).eq('id', userId);
    if (error) { toast.error('Failed to adjust balance'); return; }

    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'admin_adjustment',
      points: amount,
      description: note || `Admin balance adjustment: ${amount > 0 ? '+' : ''}${formatPoints(amount)}`,
      balance_after: newBalance,
    });

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, pointsBalance: newBalance } : u));
    if (selectedUser?.id === userId) setSelectedUser(prev => prev ? { ...prev, pointsBalance: newBalance } : null);
    toast.success(`Balance adjusted by ${formatPoints(amount)}`);
  };

  const handleCustomPoints = async (type: 'add' | 'deduct') => {
    if (!selectedUser) { toast.error('Select a user first'); return; }
    const pts = parseInt(customPoints, 10);
    if (!pts || pts <= 0) { toast.error('Enter a valid amount'); return; }
    const amount = type === 'add' ? pts : -pts;
    setAdjusting(true);
    await handleBalanceAdjust(selectedUser.id, amount, pointsNote || undefined);
    setCustomPoints('');
    setPointsNote('');
    setAdjusting(false);
  };

  const handleCricketSync = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke('cricket-sync', {
      body: { mode: 'sync_matches' },
    });
    setSyncing(false);
    if (error) {
      toast.error('Sync failed: ' + error.message);
      return;
    }
    if (!data?.success) {
      toast.error('Sync error: ' + (data?.error ?? data?.message ?? 'Unknown'));
      return;
    }
    const msg = data.synced > 0
      ? `Synced ${data.synced} matches from SportBex`
      : (data.message ?? 'No new matches found');
    toast.success(msg);
    fetchAll();
  };

  const handleUpdateOdds = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke('cricket-sync', {
      body: { mode: 'update_odds' },
    });
    setSyncing(false);
    if (error) { toast.error('Odds update failed: ' + error.message); return; }
    toast.success(`Updated odds for ${data?.updated ?? 0} live markets`);
  };

  const filteredUsers = users.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q);
  });

  const handleWithdrawal = async (id: string, approve: boolean) => {
    const wr = withdrawals.find(w => w.id === id);
    if (!wr) return;
    const newStatus = approve ? 'approved' : 'rejected';

    const { error } = await supabase
      .from('withdrawals')
      .update({ status: newStatus, processed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) { toast.error('Failed to process withdrawal'); return; }

    setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: newStatus } : w));
    toast.success(approve ? 'Withdrawal approved' : 'Withdrawal rejected');
  };

  return (
    <div className="min-h-screen px-4 md:px-6 py-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Admin Panel
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdateOdds}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs bg-[hsl(142,40%,10%)] border border-[hsl(142,40%,20%)] text-[hsl(142,76%,55%)] px-3 py-1.5 rounded-lg hover:bg-[hsl(142,40%,16%)] transition-colors disabled:opacity-60"
          >
            <Activity size={12} className={syncing ? 'animate-spin' : ''} />
            Update Odds
          </button>
          <button
            onClick={handleCricketSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs bg-[hsl(213,60%,12%)] border border-[hsl(213,60%,22%)] text-[hsl(213,90%,65%)] px-3 py-1.5 rounded-lg hover:bg-[hsl(213,60%,18%)] transition-colors disabled:opacity-60"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Cricket'}
          </button>
          <div className="flex items-center gap-2 bg-[hsl(142,40%,10%)] border border-[hsl(142,40%,20%)] rounded-lg px-3 py-1.5">
            <span className="live-dot"></span>
            <span className="text-xs font-semibold text-[hsl(142,76%,55%)]">System Online</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[hsl(222,35%,12%)] p-1 rounded-lg mb-6 overflow-x-auto scrollbar-hide">
        {([
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'users', label: '👥 Users' },
          { id: 'bets', label: '🎯 Bets' },
          { id: 'withdrawals', label: `🏦 Withdrawals ${pendingWithdrawals.length > 0 ? `(${pendingWithdrawals.length})` : ''}` },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'flex-shrink-0 px-4 py-1.5 text-xs font-semibold rounded-md transition-all',
              tab === t.id ? 'gold-gradient text-[hsl(var(--brand-navy))]' : 'text-[hsl(var(--muted-foreground))] hover:text-white'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="card-glass rounded-xl h-24 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Dashboard */}
          {tab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.map(s => (
                  <div key={s.label} className="card-glass rounded-xl p-4">
                    <div className={cn('flex items-center gap-2 mb-2', s.color)}>
                      {s.icon}
                      <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{s.label}</span>
                    </div>
                    <div className="text-xl font-extrabold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              {pendingWithdrawals.length > 0 && (
                <div className="card-glass rounded-xl p-4 border border-[hsl(43,60%,30%)] bg-[hsl(43,40%,8%)]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[hsl(var(--brand-gold))] font-bold text-sm">
                      ⚠️ {pendingWithdrawals.length} Pending Withdrawal{pendingWithdrawals.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {pendingWithdrawals.slice(0, 3).map(w => (
                    <div key={w.id} className="flex items-center justify-between py-2 border-t border-[hsl(222,30%,15%)]">
                      <div className="text-sm text-white">{w.user_name} — {formatPoints(w.points)}</div>
                      <div className="flex gap-2">
                        <button onClick={() => handleWithdrawal(w.id, true)}
                          className="text-xs bg-[hsl(142,50%,15%)] text-[hsl(142,76%,55%)] px-3 py-1 rounded hover:bg-[hsl(142,50%,20%)] transition-colors">
                          Approve
                        </button>
                        <button onClick={() => handleWithdrawal(w.id, false)}
                          className="text-xs bg-[hsl(0,40%,15%)] text-[hsl(var(--destructive))] px-3 py-1 rounded hover:bg-[hsl(0,40%,20%)] transition-colors">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingWithdrawals.length > 3 && (
                    <button onClick={() => setTab('withdrawals')} className="text-xs text-[hsl(var(--brand-gold))] mt-2 hover:underline">
                      View all {pendingWithdrawals.length} →
                    </button>
                  )}
                </div>
              )}

              <div className="card-glass rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[hsl(222,30%,15%)]">
                  <h3 className="text-sm font-bold text-white">Recent Bets</h3>
                </div>
                <div className="divide-y divide-[hsl(222,30%,12%)]">
                  {bets.slice(0, 8).map(bet => (
                    <div key={bet.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-medium">{bet.runner_name}</div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">{bet.match_name}</div>
                      </div>
                      <div className="text-right">
                        <div className={cn('text-xs font-bold', bet.bet_type === 'back' ? 'text-[hsl(213,90%,65%)]' : 'text-[hsl(340,85%,65%)]')}>
                          {bet.bet_type.toUpperCase()} @ {bet.matched_odds}
                        </div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">{formatPoints(bet.stake)}</div>
                      </div>
                    </div>
                  ))}
                  {bets.length === 0 && (
                    <div className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))] text-sm">No bets placed yet</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {tab === 'users' && (
            <div className="space-y-4">
              {/* Search + Points Panel */}
              <div className="card-glass rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Coins size={16} className="text-[hsl(var(--brand-gold))]" />
                  <h3 className="text-sm font-bold text-white">Points Management</h3>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                  <input
                    ref={searchRef}
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search by name, email or phone..."
                    className="w-full bg-[hsl(222,35%,14%)] border border-[hsl(222,30%,22%)] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--brand-gold))] transition-colors"
                  />
                </div>

                {/* Filtered user list (search results) */}
                {userSearch && (
                  <div className="rounded-lg border border-[hsl(222,30%,18%)] overflow-hidden max-h-48 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-[hsl(var(--muted-foreground))] text-center">No users found</div>
                    ) : filteredUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedUser(u); setUserSearch(''); }}
                        className={cn(
                          'w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-[hsl(222,35%,14%)] transition-colors border-b border-[hsl(222,30%,12%)] last:border-0',
                          selectedUser?.id === u.id && 'bg-[hsl(43,40%,8%)]'
                        )}
                      >
                        <div>
                          <div className="text-sm font-medium text-white">{u.name || 'No name'}</div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">{u.email}</div>
                        </div>
                        <div className="text-sm font-bold text-[hsl(var(--brand-gold))]">{formatPoints(u.pointsBalance)}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected user card */}
                {selectedUser && !userSearch && (
                  <div className="bg-[hsl(222,40%,10%)] border border-[hsl(222,30%,20%)] rounded-lg p-3">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold text-white">{selectedUser.name || 'No name'}</div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">{selectedUser.email}</div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">{selectedUser.phone}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-[hsl(var(--brand-gold))]">{formatPoints(selectedUser.pointsBalance)}</div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">Current Balance</div>
                      </div>
                    </div>

                    {/* Custom amount input */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={customPoints}
                          onChange={e => setCustomPoints(e.target.value)}
                          placeholder="Enter points amount"
                          className="flex-1 bg-[hsl(222,35%,14%)] border border-[hsl(222,30%,22%)] rounded-lg px-3 py-2 text-sm text-white placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--brand-gold))] transition-colors"
                          min="1"
                        />
                      </div>
                      <input
                        type="text"
                        value={pointsNote}
                        onChange={e => setPointsNote(e.target.value)}
                        placeholder="Note / reason (optional)"
                        className="w-full bg-[hsl(222,35%,14%)] border border-[hsl(222,30%,22%)] rounded-lg px-3 py-2 text-sm text-white placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--brand-gold))] transition-colors"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCustomPoints('add')}
                          disabled={adjusting || !customPoints}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-[hsl(142,50%,12%)] text-[hsl(142,76%,55%)] border border-[hsl(142,50%,20%)] py-2 rounded-lg text-sm font-semibold hover:bg-[hsl(142,50%,18%)] transition-colors disabled:opacity-50"
                        >
                          <Plus size={14} /> Add Points
                        </button>
                        <button
                          onClick={() => handleCustomPoints('deduct')}
                          disabled={adjusting || !customPoints}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-[hsl(0,40%,12%)] text-[hsl(var(--destructive))] border border-[hsl(0,40%,20%)] py-2 rounded-lg text-sm font-semibold hover:bg-[hsl(0,40%,18%)] transition-colors disabled:opacity-50"
                        >
                          <Minus size={14} /> Deduct Points
                        </button>
                      </div>
                      {/* Quick presets */}
                      <div className="flex gap-1.5 flex-wrap">
                        {[500, 1000, 5000, 10000, 50000].map(amt => (
                          <button
                            key={amt}
                            onClick={() => setCustomPoints(String(amt))}
                            className="text-xs px-2.5 py-1 bg-[hsl(222,35%,16%)] border border-[hsl(222,30%,22%)] text-[hsl(var(--muted-foreground))] rounded-full hover:text-white hover:border-[hsl(var(--brand-gold))] transition-colors"
                          >
                            {amt >= 1000 ? `${amt / 1000}K` : amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedUser(null)}
                      className="mt-3 text-xs text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
                    >
                      ✕ Clear selection
                    </button>
                  </div>
                )}

                {!selectedUser && !userSearch && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-2">Search for a user to manage their points</p>
                )}
              </div>

              {/* All users list */}
              <div className="card-glass rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[hsl(222,30%,15%)]">
                  <h3 className="text-sm font-bold text-white">{users.length} Registered Users</h3>
                </div>
                {users.length === 0 ? (
                  <div className="py-12 text-center text-[hsl(var(--muted-foreground))]">No users registered yet</div>
                ) : (
                  <div className="divide-y divide-[hsl(222,30%,12%)] overflow-x-auto">
                    {users.map(u => (
                      <div key={u.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 min-w-[560px]">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-white">{u.name || u.email}</div>
                            {!u.isActive && <span className="text-xs bg-[hsl(0,40%,15%)] text-[hsl(var(--destructive))] px-1.5 py-0.5 rounded">BANNED</span>}
                          </div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">{u.email} · {u.currency}</div>
                        </div>
                        <div className="text-sm font-bold text-[hsl(var(--brand-gold))]">{formatPoints(u.pointsBalance)}</div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => { setSelectedUser(u); setTab('users'); setUserSearch(''); searchRef.current?.focus(); }}
                            className="text-xs bg-[hsl(43,40%,10%)] text-[hsl(var(--brand-gold))] border border-[hsl(43,40%,20%)] px-2.5 py-1 rounded hover:bg-[hsl(43,40%,15%)] transition-colors flex items-center gap-1"
                          >
                            <Coins size={11} /> Manage
                          </button>
                          <button onClick={() => handleBanUser(u.id, !u.isActive)}
                            className={cn(
                              'text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors',
                              u.isActive
                                ? 'bg-[hsl(0,40%,12%)] text-[hsl(var(--destructive))] hover:bg-[hsl(0,40%,18%)]'
                                : 'bg-[hsl(142,40%,12%)] text-[hsl(142,76%,55%)] hover:bg-[hsl(142,40%,18%)]'
                            )}>
                            {u.isActive ? <><Ban size={11} /> Ban</> : <><CheckCircle size={11} /> Unban</>}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bets */}
          {tab === 'bets' && (
            <div className="card-glass rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[hsl(222,30%,15%)]">
                <h3 className="text-sm font-bold text-white">{bets.length} Total Bets</h3>
              </div>
              {bets.length === 0 ? (
                <div className="py-12 text-center text-[hsl(var(--muted-foreground))]">No bets placed yet</div>
              ) : (
                <div className="divide-y divide-[hsl(222,30%,12%)] overflow-x-auto">
                  <div className="grid grid-cols-6 px-4 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] min-w-[700px]">
                    <span>User</span><span>Match</span><span>Runner</span><span>Type</span><span>Odds/Stake</span><span>Status</span>
                  </div>
                  {bets.map(bet => (
                    <div key={bet.id} className="grid grid-cols-6 px-4 py-3 text-xs min-w-[700px] items-center">
                      <span className="text-[hsl(var(--muted-foreground))] truncate">{bet.user_id.substring(0, 8)}</span>
                      <span className="text-white truncate">{bet.match_name.split(' vs ')[0]}</span>
                      <span className="text-white truncate">{bet.runner_name}</span>
                      <span className={cn('font-bold', bet.bet_type === 'back' ? 'text-[hsl(213,90%,65%)]' : 'text-[hsl(340,85%,65%)]')}>
                        {bet.bet_type.toUpperCase()}
                      </span>
                      <span className="text-[hsl(var(--brand-gold))]">{bet.matched_odds} / {formatPoints(bet.stake)}</span>
                      <span className={cn('font-medium', bet.status === 'matched' ? 'text-[hsl(142,76%,55%)]' : 'text-[hsl(var(--muted-foreground))]')}>
                        {bet.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Withdrawals */}
          {tab === 'withdrawals' && (
            <div className="card-glass rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[hsl(222,30%,15%)]">
                <h3 className="text-sm font-bold text-white">{withdrawals.length} Withdrawal Requests</h3>
              </div>
              {withdrawals.length === 0 ? (
                <div className="py-12 text-center text-[hsl(var(--muted-foreground))]">No withdrawal requests</div>
              ) : (
                <div className="divide-y divide-[hsl(222,30%,12%)]">
                  {withdrawals.map(w => (
                    <div key={w.id} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white">{w.user_name}</div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{formatDateTime(w.requested_at)}</div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(222,35%,12%)] rounded px-2 py-1 mt-1">
                          {w.bank_details}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[hsl(var(--brand-gold))]">{formatPoints(w.points)}</div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">{w.currency}</div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {w.status === 'pending' ? (
                          <>
                            <button onClick={() => handleWithdrawal(w.id, true)}
                              className="flex items-center gap-1 text-xs bg-[hsl(142,50%,12%)] text-[hsl(142,76%,55%)] px-3 py-1.5 rounded hover:bg-[hsl(142,50%,18%)] transition-colors">
                              <CheckCircle size={13} /> Approve
                            </button>
                            <button onClick={() => handleWithdrawal(w.id, false)}
                              className="flex items-center gap-1 text-xs bg-[hsl(0,40%,12%)] text-[hsl(var(--destructive))] px-3 py-1.5 rounded hover:bg-[hsl(0,40%,18%)] transition-colors">
                              <XCircle size={13} /> Reject
                            </button>
                          </>
                        ) : (
                          <span className={cn(
                            'text-xs font-bold px-3 py-1.5 rounded',
                            w.status === 'approved' ? 'bg-[hsl(142,40%,12%)] text-[hsl(142,76%,55%)]' : 'bg-[hsl(0,40%,12%)] text-[hsl(var(--destructive))]'
                          )}>
                            {w.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
