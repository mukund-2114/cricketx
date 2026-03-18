import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Zap, Target, Wallet, User as UserIcon } from 'lucide-react';
import type { User } from '@/types';
import { useOpenBetsCount } from '@/hooks/useOpenBetsCount';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  user: User | null;
  onAuthRequired: () => void;
}

interface NavTab {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  requiresAuth?: boolean;
  isLive?: boolean;
}

export default function MobileNav({ user, onAuthRequired }: MobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const openBetsCount = useOpenBetsCount(user?.id);

  const tabs: NavTab[] = [
    {
      label: 'Home',
      path: '/',
      icon: <Home size={20} strokeWidth={2} />,
    },
    {
      label: 'Live',
      path: '/live',
      icon: <Zap size={20} strokeWidth={2} />,
      isLive: true,
    },
    {
      label: 'My Bets',
      path: '/my-bets',
      icon: <Target size={20} strokeWidth={2} />,
      badge: openBetsCount,
      requiresAuth: true,
    },
    {
      label: 'Wallet',
      path: '/wallet',
      icon: <Wallet size={20} strokeWidth={2} />,
      requiresAuth: true,
    },
    {
      label: user ? (user.name.split(' ')[0]) : 'Profile',
      path: user?.role === 'admin' ? '/admin' : '/profile',
      icon: user ? (
        <div className="w-5 h-5 rounded-full gold-gradient flex items-center justify-center text-[9px] font-extrabold text-[hsl(var(--brand-navy))]">
          {user.name.charAt(0).toUpperCase()}
        </div>
      ) : (
        <UserIcon size={20} strokeWidth={2} />
      ),
      requiresAuth: false, // handled inline — shows auth modal if not logged in
    },
  ];

  const handleTabPress = (tab: NavTab) => {
    if (tab.requiresAuth && !user) {
      onAuthRequired();
      return;
    }
    // Profile tab when not logged in → auth modal
    if (tab.path === '/profile' && !user) {
      onAuthRequired();
      return;
    }
    navigate(tab.path);
  };

  const isActive = (tab: NavTab) => {
    if (tab.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(tab.path);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
      style={{
        background: 'hsl(222,47%,7%)',
        borderTop: '1px solid hsl(222,30%,16%)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab);
        return (
          <button
            key={tab.path}
            onClick={() => handleTabPress(tab)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative min-h-[56px] transition-all duration-200 active:scale-95"
            aria-label={tab.label}
          >
            {/* Active indicator bar at top */}
            <div
              className={cn(
                'absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300',
                active ? 'w-8 bg-[hsl(var(--brand-gold))]' : 'w-0 bg-transparent'
              )}
            />

            {/* Icon container */}
            <div className="relative flex items-center justify-center">
              <span
                className={cn(
                  'transition-all duration-200',
                  active
                    ? 'text-[hsl(var(--brand-gold))] scale-110'
                    : 'text-[hsl(var(--muted-foreground))]'
                )}
              >
                {tab.icon}
              </span>

              {/* Live pulse for Live tab */}
              {tab.isLive && (
                <span className="absolute -top-0.5 -right-1 w-2 h-2">
                  <span className="live-dot" style={{ width: 7, height: 7 }} />
                </span>
              )}

              {/* Badge for open bets */}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center"
                  style={{
                    background: 'hsl(var(--brand-gold))',
                    color: 'hsl(var(--brand-navy))',
                    lineHeight: 1,
                  }}
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-[10px] font-semibold transition-all duration-200 leading-none truncate max-w-[52px]',
                active ? 'text-[hsl(var(--brand-gold))]' : 'text-[hsl(var(--muted-foreground))]'
              )}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
