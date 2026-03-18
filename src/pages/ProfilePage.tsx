import { User as UserIcon, Mail, Phone, Shield, Calendar, MessageCircle } from 'lucide-react';
import type { User } from '@/types';
import { formatPoints, formatDate, pointsToCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ProfilePageProps {
  user: User;
}

export default function ProfilePage({ user }: ProfilePageProps) {
  const kycColors = {
    pending: 'text-[hsl(43,90%,60%)] bg-[hsl(43,40%,12%)] border-[hsl(43,40%,25%)]',
    verified: 'text-[hsl(142,76%,55%)] bg-[hsl(142,40%,12%)] border-[hsl(142,40%,25%)]',
    rejected: 'text-[hsl(var(--destructive))] bg-[hsl(0,40%,12%)] border-[hsl(0,40%,25%)]',
  };

  return (
    <div className="min-h-screen px-4 md:px-6 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-white mb-6" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        My Profile
      </h1>

      {/* Profile card */}
      <div className="card-glass rounded-2xl p-6 mb-4">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center text-2xl font-extrabold text-[hsl(var(--brand-navy))]">
            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{user.name || 'User'}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded border', kycColors[user.kycStatus])}>
                KYC: {user.kycStatus.toUpperCase()}
              </span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Member since {formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-0">
          {[
            { icon: <Mail size={14} />, label: 'Email', value: user.email },
            { icon: <Phone size={14} />, label: 'Phone', value: user.phone || '—' },
            { icon: <Shield size={14} />, label: 'Currency', value: user.currency },
            { icon: <Calendar size={14} />, label: 'Joined', value: formatDate(user.createdAt) },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 py-3 border-b border-[hsl(222,30%,15%)]">
              <div className="text-[hsl(var(--muted-foreground))] w-5">{item.icon}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] w-20">{item.label}</div>
              <div className="text-sm text-white font-medium">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Balance card */}
      <div className="card-glass rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Current Balance</div>
            <div className="text-2xl font-extrabold text-[hsl(var(--brand-gold))]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {formatPoints(user.pointsBalance)}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              ≈ {pointsToCurrency(user.pointsBalance, user.currency)}
            </div>
          </div>
          <UserIcon size={32} className="text-[hsl(var(--brand-gold))] opacity-40" />
        </div>
      </div>

      {/* Contact admin to add points */}
      <div className="card-glass rounded-xl p-4 mb-4 border border-[hsl(43,40%,25%)] bg-[hsl(43,30%,7%)]">
        <div className="flex items-start gap-3">
          <MessageCircle size={20} className="text-[hsl(var(--brand-gold))] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-[hsl(var(--brand-gold))] mb-1">Need to add points?</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Points are credited manually by admin after payment verification. Contact your admin with your payment details and account email to get points added to your account.
            </p>
          </div>
        </div>
      </div>

      {/* KYC notice */}
      {user.kycStatus === 'pending' && (
        <div className="card-glass rounded-xl p-4 border border-[hsl(43,40%,25%)] bg-[hsl(43,30%,8%)]">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📋</div>
            <div>
              <h3 className="text-sm font-bold text-[hsl(var(--brand-gold))] mb-1">KYC Verification Pending</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Contact admin to complete KYC verification. Required for large withdrawals.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
