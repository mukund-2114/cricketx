import { useState, useEffect } from 'react';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import AuthModal from '@/components/features/AuthModal';
import Index from '@/pages/Index';
import MatchDetail from '@/pages/MatchDetail';
import WalletPage from '@/pages/WalletPage';
import MyBetsPage from '@/pages/MyBetsPage';
import AdminPage from '@/pages/AdminPage';
import CasinoPage from '@/pages/CasinoPage';
import PromotionsPage from '@/pages/PromotionsPage';
import ProfilePage from '@/pages/ProfilePage';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading, signOut, updateBalance } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.title = 'CricketX Exchange — IPL Betting';
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 gold-gradient rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <span className="text-xl font-extrabold text-[hsl(var(--brand-navy))]">X</span>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] text-sm">Loading CricketX...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={user}
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        onAuthClick={() => setShowAuth(true)}
        onSignOut={signOut}
      />

      {/* Content area with top padding for fixed header, bottom padding for mobile nav */}
      <div className="pt-[88px] md:pt-[56px] pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<Index onAuthRequired={() => setShowAuth(true)} />} />
          <Route path="/live" element={<Index onAuthRequired={() => setShowAuth(true)} />} />
          <Route path="/match/:id" element={<MatchDetail onAuthRequired={() => setShowAuth(true)} />} />
          <Route path="/casino" element={<CasinoPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/wallet" element={
            user ? <WalletPage user={user} onBalanceUpdate={updateBalance} /> : <Navigate to="/" replace />
          } />
          <Route path="/my-bets" element={
            user ? <MyBetsPage user={user} /> : <Navigate to="/" replace />
          } />
          <Route path="/profile" element={
            user ? <ProfilePage user={user} /> : <Navigate to="/" replace />
          } />
          <Route path="/admin" element={
            user?.role === 'admin' ? <AdminPage adminUser={user} /> : <Navigate to="/" replace />
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <MobileNav user={user} onAuthRequired={() => setShowAuth(true)} />

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
        />
      )}

      <Sonner position="top-right" theme="dark" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
