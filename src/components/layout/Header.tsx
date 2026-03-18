import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Wallet, Bell, ChevronDown, LogOut, User as UserIcon, Settings, Trophy, ShieldCheck } from 'lucide-react';
import type { User } from '@/types';
import { formatPoints, pointsToCurrency } from '@/lib/utils';
import { APP_NAME } from '@/constants';

interface HeaderProps {
  user: User | null;
  onMenuToggle: () => void;
  onAuthClick: () => void;
  onSignOut: () => void;
}

export default function Header({ user, onMenuToggle, onAuthClick, onSignOut }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Cricket', path: '/', icon: '🏏' },
    { label: 'Live', path: '/live', icon: '🔴' },
    { label: 'IPL 2026', path: '/?series=ipl', icon: '🏆' },
    { label: 'Casino', path: '/casino', icon: '🎰' },
    { label: 'Promotions', path: '/promotions', icon: '🎁' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 navy-gradient border-b border-[hsl(222,30%,18%)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 md:px-6 h-14">
        {/* Left: Logo + Mobile menu */}
        <div className="flex items-center gap-3">
          <button onClick={onMenuToggle} className="md:hidden text-[hsl(var(--muted-foreground))] hover:text-white p-1">
            <Menu size={22} />
          </button>
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center">
              <Trophy size={16} className="text-[hsl(var(--brand-navy))]" />
            </div>
            <span className="font-bold text-lg text-white hidden sm:block" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}>
              CRICKET<span className="text-[hsl(var(--brand-gold))]">X</span>
            </span>
          </button>
        </div>

        {/* Center: Nav Links (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                location.pathname === link.path
                  ? 'text-[hsl(var(--brand-gold))] bg-[hsl(222,35%,16%)]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(222,35%,14%)]'
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
              {link.label === 'Live' && (
                <span className="live-dot ml-1"></span>
              )}
            </button>
          ))}
          {/* Admin shortcut — only visible to admins */}
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold transition-all ${
                location.pathname === '/admin'
                  ? 'text-[hsl(var(--brand-gold))] bg-[hsl(222,35%,16%)]'
                  : 'text-[hsl(142,76%,55%)] hover:text-white hover:bg-[hsl(142,40%,12%)]'
              }`}
            >
              <ShieldCheck size={14} />
              Admin
            </button>
          )}
        </nav>

        {/* Right: Auth / User */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Balance */}
              <button
                onClick={() => navigate('/wallet')}
                className="hidden sm:flex items-center gap-2 bg-[hsl(222,35%,16%)] hover:bg-[hsl(222,35%,20%)] border border-[hsl(222,30%,22%)] px-3 py-1.5 rounded-lg transition-all"
              >
                <Wallet size={14} className="text-[hsl(var(--brand-gold))]" />
                <div className="text-left">
                  <div className="text-xs text-[hsl(var(--muted-foreground))] leading-none">Balance</div>
                  <div className="text-sm font-bold text-white leading-tight">{formatPoints(user.pointsBalance)}</div>
                </div>
              </button>

              {/* Admin pill — quick access for admins */}
              {user.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="hidden sm:flex items-center gap-1.5 bg-[hsl(142,40%,10%)] border border-[hsl(142,40%,22%)] text-[hsl(142,76%,55%)] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[hsl(142,40%,16%)] transition-colors"
                >
                  <ShieldCheck size={13} />
                  Admin Panel
                </button>
              )}

              {/* Notification */}
              <button className="relative p-2 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[hsl(var(--destructive))] rounded-full"></span>
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-[hsl(222,35%,16%)] hover:bg-[hsl(222,35%,20%)] px-3 py-1.5 rounded-lg transition-all"
                >
                  <div className="w-6 h-6 rounded-full gold-gradient flex items-center justify-center text-xs font-bold text-[hsl(var(--brand-navy))]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-white hidden md:block">{user.name.split(' ')[0]}</span>
                  <ChevronDown size={14} className="text-[hsl(var(--muted-foreground))]" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 card-glass rounded-lg shadow-xl border border-[hsl(222,30%,20%)] py-1 z-50">
                    <button onClick={() => { navigate(user.role === 'admin' ? '/admin' : '/profile'); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(222,35%,16%)] transition-colors">
                      <UserIcon size={14} />
                      {user.role === 'admin' ? 'Admin Panel' : 'My Profile'}
                    </button>
                    <button onClick={() => { navigate('/my-bets'); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(222,35%,16%)] transition-colors">
                      <Trophy size={14} />
                      My Bets
                    </button>
                    <button onClick={() => { navigate('/wallet'); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(222,35%,16%)] transition-colors">
                      <Wallet size={14} />
                      Wallet
                    </button>
                    {user.role === 'admin' && (
                      <button onClick={() => { navigate('/admin'); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(222,35%,16%)] transition-colors">
                        <Settings size={14} />
                        Admin Panel
                      </button>
                    )}
                    <div className="border-t border-[hsl(222,30%,18%)] my-1" />
                    <button onClick={() => { onSignOut(); navigate('/'); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(222,35%,16%)] transition-colors">
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onAuthClick}
                className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-white transition-colors px-3 py-1.5"
              >
                Login
              </button>
              <button
                onClick={onAuthClick}
                className="gold-gradient text-[hsl(var(--brand-navy))] text-sm font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Join Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sports category scrollbar */}
      <div className="md:hidden flex border-t border-[hsl(222,30%,15%)] overflow-x-auto scrollbar-hide">
        {navLinks.map(link => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className={`flex-shrink-0 flex items-center gap-1 px-4 py-2 text-xs font-medium transition-colors ${
              location.pathname === link.path
                ? 'text-[hsl(var(--brand-gold))] border-b-2 border-[hsl(var(--brand-gold))]'
                : 'text-[hsl(var(--muted-foreground))]'
            }`}
          >
            <span>{link.icon}</span>
            {link.label}
            {link.label === 'Live' && <span className="live-dot"></span>}
          </button>
        ))}
      </div>
    </header>
  );

}
